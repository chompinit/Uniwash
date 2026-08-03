// supabase/functions/omise-topup/index.ts
// Deploy: supabase functions deploy omise-topup
//
// Env vars ที่ต้องตั้งใน Supabase Dashboard → Settings → Edge Functions:
//   OMISE_SECRET_KEY   → sk_live_xxxx  หรือ sk_test_xxxx
//   SUPABASE_URL       → (auto-injected)
//   SUPABASE_SERVICE_ROLE_KEY → (auto-injected)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OMISE_API = 'https://api.omise.co'
const OMISE_SECRET = Deno.env.get('OMISE_SECRET_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const omiseAuth = 'Basic ' + btoa(OMISE_SECRET + ':')

// ── helpers ────────────────────────────────────────────────────────────────

function corsHeaders(origin = '*') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
}

// ── main ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  // ── Auth: ตรวจ JWT ของ user ──────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? ''
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (authErr || !user) {
    return json({ error: 'Unauthorized' }, 401)
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  const body = await req.json().catch(() => ({}))
  const { action, amount, charge_id } = body

  // ────────────────────────────────────────────────────────────────────────
  // ACTION: create — สร้าง Omise charge แบบ PromptPay QR
  // ────────────────────────────────────────────────────────────────────────
  if (action === 'create') {
    if (!amount || amount < 20 || amount > 150000) {
      return json({ error: 'amount ต้องอยู่ระหว่าง 20–150,000 บาท' }, 400)
    }

    // 1. สร้าง Omise Source (promptpay)
    const sourceRes = await fetch(`${OMISE_API}/sources`, {
      method: 'POST',
      headers: { Authorization: omiseAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        type: 'promptpay',
        amount: String(amount * 100),   // satang
        currency: 'thb',
      }),
    })
    const source = await sourceRes.json()
    if (source.object === 'error') {
      return json({ error: source.message }, 400)
    }

    // 2. สร้าง Charge
    const chargeRes = await fetch(`${OMISE_API}/charges`, {
      method: 'POST',
      headers: { Authorization: omiseAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        amount: String(amount * 100),
        currency: 'thb',
        source: source.id,
        // เก็บ metadata เพื่อ traceability
        'metadata[user_id]': user.id,
        'metadata[coins]': String(amount),
      }),
    })
    const charge = await chargeRes.json()
    if (charge.object === 'error') {
      return json({ error: charge.message }, 400)
    }

    // 3. ดึง QR image URL จาก source
    const qrUrl: string =
      charge.source?.scannable_code?.image?.download_uri ??
      charge.source?.scannable_code?.image?.uri ??
      source.scannable_code?.image?.download_uri ??
      source.scannable_code?.image?.uri ??
      ''

    // 4. บันทึก pending transaction ลง Supabase
    await supabase.from('coin_transactions').insert({
      user_id: user.id,
      charge_id: charge.id,
      amount: amount,
      status: 'pending',
    })

    return json({
      charge_id: charge.id,
      qr_url: qrUrl,
      expires_at: charge.expires_at,
    })
  }

  // ────────────────────────────────────────────────────────────────────────
  // ACTION: verify — ตรวจสอบสถานะ charge และเพิ่มเหรียญถ้าชำระแล้ว
  // ────────────────────────────────────────────────────────────────────────
  if (action === 'verify') {
    if (!charge_id) return json({ error: 'charge_id required' }, 400)

    // ตรวจว่า charge นี้เป็นของ user คนนี้จริงๆ
    const { data: txn } = await supabase
      .from('coin_transactions')
      .select('id, amount, status')
      .eq('charge_id', charge_id)
      .eq('user_id', user.id)
      .single()

    if (!txn) return json({ error: 'Transaction not found' }, 404)

    // ถ้า success แล้ว ไม่ต้อง query Omise ซ้ำ
    if (txn.status === 'success') {
      return json({ paid: true })
    }

    // Query Omise
    const chargeRes = await fetch(`${OMISE_API}/charges/${charge_id}`, {
      headers: { Authorization: omiseAuth },
    })
    const charge = await chargeRes.json()

    if (charge.object === 'error') {
      return json({ error: charge.message }, 400)
    }

    const paid = charge.paid === true && charge.status === 'successful'

    if (paid) {
      // Atomic: เพิ่มเหรียญ + อัปเดต transaction ใน transaction เดียว
      const { error: rpcErr } = await supabase.rpc('add_coins_and_confirm', {
        p_user_id: user.id,
        p_charge_id: charge_id,
        p_amount: txn.amount,
      })

      if (rpcErr) {
        return json({ error: rpcErr.message }, 500)
      }
    }

    return json({ paid })
  }

  return json({ error: 'invalid action' }, 400)
})
 

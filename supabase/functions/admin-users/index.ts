// supabase/functions/admin-users/index.ts
// Deploy: supabase functions deploy admin-users
//
// จัดการผู้ใช้ฝั่ง admin ที่ต้องใช้ service_role (สร้าง/ลบ account จริง)
// ฝั่ง client (anon key) ทำเองไม่ได้ จึงต้องผ่าน Edge Function นี้
//
// Env (auto-injected):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
//
// Actions (POST body { action, ...payload }):
//   create_employee { email, password, full_name, phone?, license_plate? }
//   delete_user     { user_id }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    // ── ตรวจสอบว่าผู้เรียกเป็น admin ───────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '')
    if (!jwt) return json({ error: 'ไม่ได้เข้าสู่ระบบ' }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE_KEY)

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
    if (userErr || !userData.user) return json({ error: 'token ไม่ถูกต้อง' }, 401)

    const { data: caller } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()
    if (caller?.role !== 'admin') return json({ error: 'ต้องเป็นผู้ดูแลระบบเท่านั้น' }, 403)

    const body = await req.json()
    const action = body?.action

    // ── สร้างพนักงานใหม่ (account จริง) ────────────────────────────
    if (action === 'create_employee') {
      const { email, password, full_name, phone, license_plate } = body
      if (!email || !password || !full_name) {
        return json({ error: 'กรุณากรอก อีเมล รหัสผ่าน และชื่อ ให้ครบ' })
      }
      if (String(password).length < 6) {
        return json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' })
      }

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: String(email).trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { full_name },
      })
      if (createErr || !created.user) {
        return json({ error: createErr?.message ?? 'สร้างผู้ใช้ไม่สำเร็จ' })
      }
      const newId = created.user.id

      // trigger on_auth_user_created สร้าง profile ให้แล้ว — อัปเดตข้อมูล + role
      const { error: profErr } = await admin
        .from('profiles')
        .update({ full_name, phone: phone ?? null, role: 'employee' })
        .eq('id', newId)
      if (profErr) {
        // เผื่อ trigger ยังไม่ทันสร้าง → upsert
        await admin.from('profiles').upsert({
          id: newId,
          email: String(email).trim().toLowerCase(),
          full_name,
          phone: phone ?? null,
          role: 'employee',
        })
      }

      const { error: riderErr } = await admin.from('riders').insert({
        profile_id: newId,
        phone: phone ?? '',
        license_plate: license_plate ?? '',
        status: 'active',
      })
      if (riderErr) {
        // rollback: ลบ user ที่เพิ่งสร้าง เพื่อไม่ให้ค้าง
        await admin.auth.admin.deleteUser(newId)
        return json({ error: riderErr.message })
      }

      return json({ ok: true, user_id: newId })
    }

    // ── ลบผู้ใช้ถาวร (account จริง) ─────────────────────────────────
    if (action === 'delete_user') {
      const { user_id } = body
      if (!user_id) return json({ error: 'ไม่พบ user_id' })
      if (user_id === userData.user.id) {
        return json({ error: 'ลบบัญชีตัวเองไม่ได้' })
      }

      // ลบข้อมูลที่อ้างถึงก่อน (กันกรณี FK ไม่ cascade)
      await admin.from('coin_transactions').delete().eq('user_id', user_id)
      await admin.from('riders').delete().eq('profile_id', user_id)
      await admin.from('addresses').delete().eq('user_id', user_id)
      await admin.from('profiles').delete().eq('id', user_id)

      const { error: delErr } = await admin.auth.admin.deleteUser(user_id)
      if (delErr) return json({ error: delErr.message })

      return json({ ok: true })
    }

    return json({ error: 'action ไม่ถูกต้อง' })
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500)
  }
})

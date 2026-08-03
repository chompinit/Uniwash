// app/(customer)/coins.tsx
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../../../lib/supabase'

// ─── Config ────────────────────────────────────────────────────────────────
// เปลี่ยน <PROJECT_REF> เป็น Supabase project ref ของคุณ
const EDGE_FN_URL = 'https://nrdbcslxudopahspzzwl.supabase.co/functions/v1/omise-topup'

const COIN_OPTIONS = [50, 100, 200, 300, 400, 500]

// ─── Types ──────────────────────────────────────────────────────────────────
type ModalStep =
  | 'idle'        // ปิด Modal
  | 'loading_qr'  // กำลังสร้าง charge + QR
  | 'show_qr'     // แสดง QR รอสแกน
  | 'polling'     // รอยืนยัน (polling Omise)
  | 'success'     // ชำระสำเร็จ
  | 'failed'      // หมดเวลา / error

type Transaction = {
  id: string
  amount: number
  status: 'pending' | 'success' | 'failed'
  created_at: string
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function CoinsScreen() {
  const [coins, setCoins]             = useState(0)
  const [selected, setSelected]       = useState(100)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Modal / payment state
  const [step, setStep]         = useState<ModalStep>('idle')
  const [qrUrl, setQrUrl]       = useState('')
  const [chargeId, setChargeId] = useState('')
  const [pollCount, setPollCount] = useState(0)
  const [timeLeft, setTimeLeft]  = useState(300) // 5 นาที countdown

  const pollTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollExpiry  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchData()
    return () => clearAllTimers()
  }, [])

  // ── Data ─────────────────────────────────────────────────────────────────

  const fetchData = async () => {
    setLoadingData(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, txnRes] = await Promise.all([
      supabase.from('profiles').select('coins').eq('id', user.id).single(),
      supabase.from('coin_transactions').select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    setCoins(profileRes.data?.coins ?? 0)
    setTransactions((txnRes.data as Transaction[]) ?? [])
    setLoadingData(false)
  }

  // ── Timer helpers ─────────────────────────────────────────────────────────

  const clearAllTimers = () => {
    if (pollTimer.current)    clearTimeout(pollTimer.current)
    if (pollExpiry.current)   clearTimeout(pollExpiry.current)
    if (countdownTimer.current) clearInterval(countdownTimer.current)
  }

  const startCountdown = (seconds: number) => {
    setTimeLeft(seconds)
    countdownTimer.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(countdownTimer.current!)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  const formatTimeLeft = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  // ── Step 1: สร้าง Charge + QR ─────────────────────────────────────────────

  const handleTopup = async () => {
    setStep('loading_qr')
    setQrUrl('')
    setChargeId('')
    setPollCount(0)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('กรุณาเข้าสู่ระบบใหม่')

      const res = await fetch(EDGE_FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'create', amount: selected }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setChargeId(data.charge_id)
      setQrUrl(data.qr_url ?? '')
      setStep('show_qr')

    } catch (err: any) {
      setStep('idle')
      Alert.alert('เกิดข้อผิดพลาด', err.message)
    }
  }

  // ── Step 2: ผู้ใช้กด "ฉันชำระแล้ว" → เริ่ม polling ──────────────────────

  const startPolling = () => {
    setStep('polling')
    setPollCount(0)
    startCountdown(300) // 5 นาที

    // หมดเวลาสูงสุด 5 นาที
    pollExpiry.current = setTimeout(() => {
      clearAllTimers()
      setStep('failed')
    }, 5 * 60 * 1000)

    scheduleNextPoll(0)
  }

  const scheduleNextPoll = (count: number) => {
    if (count >= 60) { // 60 × 5s = 5 นาที
      setStep('failed')
      return
    }
    pollTimer.current = setTimeout(() => pollCharge(count), 5000)
  }

  const pollCharge = async (count: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(EDGE_FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action: 'verify', charge_id: chargeId }),
      })
      const data = await res.json()

      if (data.error) throw new Error(data.error)

      if (data.paid) {
        clearAllTimers()
        await fetchData() // รีเฟรชยอดเหรียญ
        setStep('success')
        return
      }

      setPollCount(count + 1)
      scheduleNextPoll(count + 1)

    } catch {
      setPollCount(c => c + 1)
      scheduleNextPoll(count + 1)
    }
  }

  // ── ปิด Modal ─────────────────────────────────────────────────────────────

  const handleClose = () => {
    clearAllTimers()
    setStep('idle')
    setQrUrl('')
    setChargeId('')
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('th-TH', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })

  const txStatusStyle = (s: string) => {
    if (s === 'success') return { label: 'สำเร็จ',    color: '#1D9E75' }
    if (s === 'pending') return { label: 'รอยืนยัน', color: '#F59E0B' }
    return                      { label: 'ล้มเหลว',  color: '#E24B4A' }
  }

  // ── UI ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← กลับ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>เติมเหรียญ</Text>
        <TouchableOpacity onPress={fetchData}>
          <Text style={styles.refreshText}>↻</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* ยอดเหรียญ */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>ยอดเหรียญปัจจุบัน</Text>
          {loadingData
            ? <ActivityIndicator color="#fff" style={{ marginTop: 8 }} />
            : <Text style={styles.balanceAmount}>🪙 {coins} Coins</Text>
          }
          <Text style={styles.balanceNote}>1 Coin = 1 บาท</Text>
        </View>

        {/* เลือกจำนวนเหรียญ */}
        <Text style={styles.sectionTitle}>เลือกจำนวนเหรียญ</Text>
        <View style={styles.coinGrid}>
          {COIN_OPTIONS.map(amount => (
            <TouchableOpacity
              key={amount}
              style={[styles.coinOpt, selected === amount && styles.coinOptSelected]}
              onPress={() => setSelected(amount)}
              activeOpacity={0.7}
            >
              <Text style={styles.coinOptIcon}>🪙</Text>
              <Text style={[styles.coinOptAmount, selected === amount && styles.coinOptAmountSelected]}>
                {amount}
              </Text>
              <Text style={[styles.coinOptLabel, selected === amount && { color: '#1D9E75' }]}>
                Coins
              </Text>
              <Text style={[styles.coinOptPrice, selected === amount && { color: '#1D9E75' }]}>
                ฿{amount}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* สรุปยอด */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>เหรียญที่จะได้รับ</Text>
            <Text style={styles.summaryValue}>🪙 {selected} Coins</Text>
          </View>
          <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.summaryLabel}>ยอดชำระ</Text>
            <Text style={styles.summaryValueLarge}>฿{selected}</Text>
          </View>
        </View>

        {/* วิธีชำระ */}
        <View style={styles.payMethodBox}>
          <Text style={styles.payMethodTitle}>วิธีชำระเงิน</Text>
          <View style={styles.payMethodRow}>
            <View style={styles.payMethodIcon}>
              <Text style={{ fontSize: 22 }}>📱</Text>
            </View>
            <View>
              <Text style={styles.payMethodName}>PromptPay QR Code</Text>
              <Text style={styles.payMethodSub}>ผ่านแอปธนาคารทุกธนาคาร</Text>
            </View>
            <View style={styles.payMethodCheck}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
            </View>
          </View>
          <Text style={styles.secureNote}>🔒 ชำระเงินปลอดภัยผ่าน Omise Payment Gateway</Text>
        </View>

        {/* ประวัติ */}
        {transactions.length > 0 && (
          <View style={styles.histCard}>
            <Text style={styles.sectionTitle}>ประวัติการเติมเงิน</Text>
            {transactions.map(t => {
              const { label, color } = txStatusStyle(t.status)
              return (
                <View key={t.id} style={styles.histRow}>
                  <View style={[styles.histIcon, { backgroundColor: color + '20' }]}>
                    <Text style={{ fontSize: 18 }}>🪙</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.histAmount}>+{t.amount} Coins</Text>
                    <Text style={styles.histDate}>{formatDate(t.created_at)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: color + '15' }]}>
                    <Text style={[styles.statusText, { color }]}>{label}</Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Footer CTA */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnPrimary} onPress={handleTopup} activeOpacity={0.85}>
          <Text style={styles.btnText}>เติม {selected} Coins  →  ชำระ ฿{selected}</Text>
        </TouchableOpacity>
      </View>

      {/* ────── Payment Modal ────────────────────────────────────────────── */}
      <Modal
        visible={step !== 'idle'}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            {/* ── กำลังสร้าง QR ── */}
            {step === 'loading_qr' && (
              <View style={styles.modalCenter}>
                <ActivityIndicator size="large" color="#1D9E75" />
                <Text style={styles.modalLoadingText}>กำลังสร้าง QR Code...</Text>
                <Text style={styles.modalSub}>กรุณารอสักครู่</Text>
              </View>
            )}

            {/* ── แสดง QR ── */}
            {step === 'show_qr' && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>สแกน QR ชำระเงิน</Text>
                  <Text style={styles.modalSub}>฿{selected}  ({selected} Coins)</Text>
                </View>

                {/* QR Image */}
                {qrUrl ? (
                  <View style={styles.qrWrapper}>
                    <Image
                      source={{ uri: qrUrl }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                    <View style={styles.qrLabel}>
                      <Text style={styles.qrLabelText}>PromptPay  ฿{selected}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.qrPlaceholder}>
                    <Text style={{ fontSize: 48 }}>📱</Text>
                    <Text style={styles.qrPlaceholderText}>ไม่สามารถโหลด QR ได้</Text>
                    <Text style={styles.qrPlaceholderSub}>ลองกดเติมเหรียญใหม่อีกครั้ง</Text>
                  </View>
                )}

                {/* ขั้นตอน */}
                <View style={styles.stepsBox}>
                  <Text style={styles.stepsTitle}>วิธีชำระเงิน</Text>
                  {[
                    '① เปิดแอปธนาคารของคุณ',
                    '② เลือก "สแกน QR" หรือ "PromptPay"',
                    `③ สแกน QR แล้วชำระ ฿${selected}`,
                    '④ กลับมากด "ฉันชำระเงินแล้ว" ด้านล่าง',
                  ].map((s, i) => (
                    <Text key={i} style={styles.stepRow}>{s}</Text>
                  ))}
                </View>

                <Text style={styles.secureNote}>🔒 ชำระเงินปลอดภัยผ่าน Omise</Text>

                <TouchableOpacity style={styles.btnConfirmPay} onPress={startPolling} activeOpacity={0.85}>
                  <Text style={styles.btnText}>✅  ฉันชำระเงินแล้ว</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnCancelWrap} onPress={handleClose}>
                  <Text style={styles.btnCancelText}>ยกเลิก</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── กำลัง Polling ── */}
            {step === 'polling' && (
              <View style={styles.modalCenter}>
                <ActivityIndicator size="large" color="#1D9E75" />

                <Text style={styles.modalLoadingText}>กำลังตรวจสอบการชำระเงิน</Text>
                <Text style={styles.pollSubText}>รอการยืนยันจาก Omise...</Text>

                {/* Countdown */}
                <View style={styles.countdownBox}>
                  <Text style={styles.countdownLabel}>หมดเวลาใน</Text>
                  <Text style={[styles.countdownValue, timeLeft < 60 && { color: '#E24B4A' }]}>
                    {formatTimeLeft(timeLeft)}
                  </Text>
                </View>

                <Text style={styles.pollNote}>
                  หากสแกนและโอนเงินแล้ว ระบบจะยืนยันอัตโนมัติภายใน 10–30 วินาที
                </Text>

                <TouchableOpacity style={styles.btnCancelSmall} onPress={handleClose}>
                  <Text style={styles.btnCancelText}>ยกเลิกการรอ</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── ชำระสำเร็จ ── */}
            {step === 'success' && (
              <View style={styles.modalCenter}>
                <Text style={styles.successEmoji}>🎉</Text>
                <Text style={styles.successTitle}>ชำระเงินสำเร็จ!</Text>
                <Text style={styles.successSub}>เติม {selected} Coins เรียบร้อยแล้ว</Text>

                <View style={styles.newBalanceBox}>
                  <Text style={styles.newBalanceLabel}>ยอดเหรียญใหม่</Text>
                  <Text style={styles.newBalanceAmt}>🪙 {coins} Coins</Text>
                </View>

                <TouchableOpacity style={styles.btnConfirmPay} onPress={handleClose} activeOpacity={0.85}>
                  <Text style={styles.btnText}>เยี่ยม! ปิดหน้าต่างนี้</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── หมดเวลา ── */}
            {step === 'failed' && (
              <View style={styles.modalCenter}>
                <Text style={{ fontSize: 52, marginBottom: 12 }}>⏱️</Text>
                <Text style={styles.failTitle}>หมดเวลายืนยัน</Text>
                <Text style={styles.failSub}>
                  ไม่พบการชำระเงินภายในเวลาที่กำหนด{'\n'}
                  หากโอนเงินแล้ว เหรียญจะเพิ่มอัตโนมัติภายใน 1–5 นาที
                </Text>
                <TouchableOpacity style={styles.btnConfirmPay} onPress={handleClose} activeOpacity={0.85}>
                  <Text style={styles.btnText}>ปิด</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnCancelWrap} onPress={handleTopup}>
                  <Text style={[styles.btnCancelText, { color: '#1D9E75' }]}>ลองใหม่อีกครั้ง</Text>
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  // Header
  header: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0',
  },
  backText: { fontSize: 15, color: '#1D9E75' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#2C2C2A' },
  refreshText: { fontSize: 20, color: '#1D9E75' },
  content: { flex: 1, padding: 16 },

  // Balance card
  balanceCard: {
    backgroundColor: '#1D9E75', borderRadius: 18, padding: 24,
    alignItems: 'center', marginBottom: 22,
    shadowColor: '#1D9E75', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  balanceAmount: { fontSize: 32, fontWeight: '800', color: '#fff' },
  balanceNote: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 6 },

  // Coin grid
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#888780', marginBottom: 12 },
  coinGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  coinOpt: {
    width: '30%', backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 2, borderColor: '#E8E8E8', padding: 14, alignItems: 'center',
  },
  coinOptSelected: { borderColor: '#1D9E75', backgroundColor: '#E1F5EE' },
  coinOptIcon: { fontSize: 22, marginBottom: 4 },
  coinOptAmount: { fontSize: 20, fontWeight: '800', color: '#2C2C2A' },
  coinOptAmountSelected: { color: '#1D9E75' },
  coinOptLabel: { fontSize: 11, color: '#888780' },
  coinOptPrice: { fontSize: 12, color: '#888780', marginTop: 4, fontWeight: '500' },

  // Summary
  summaryBox: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0',
  },
  summaryLabel: { fontSize: 14, color: '#888780' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#2C2C2A' },
  summaryValueLarge: { fontSize: 22, fontWeight: '800', color: '#1D9E75' },

  // Pay method
  payMethodBox: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14,
  },
  payMethodTitle: { fontSize: 13, fontWeight: '600', color: '#888780', marginBottom: 12 },
  payMethodRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  payMethodIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#E1F5EE', alignItems: 'center', justifyContent: 'center',
  },
  payMethodName: { fontSize: 14, fontWeight: '600', color: '#2C2C2A' },
  payMethodSub: { fontSize: 12, color: '#888780', marginTop: 2 },
  payMethodCheck: {
    marginLeft: 'auto', width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#1D9E75', alignItems: 'center', justifyContent: 'center',
  },
  secureNote: { fontSize: 11, color: '#1D9E75', fontWeight: '500', marginTop: 10, textAlign: 'center' },

  // History
  histCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16 },
  histRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#F5F5F5',
  },
  histIcon: {
    width: 40, height: 40, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  histAmount: { fontSize: 14, fontWeight: '600', color: '#2C2C2A' },
  histDate: { fontSize: 11, color: '#888780', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },

  // Footer
  footer: {
    padding: 16, backgroundColor: '#fff',
    borderTopWidth: 0.5, borderTopColor: '#E0E0E0',
  },
  btnPrimary: {
    backgroundColor: '#1D9E75', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, alignItems: 'center',
    minHeight: 380,
  },
  modalCenter: { width: '100%', alignItems: 'center', paddingVertical: 12 },
  modalHeader: { alignItems: 'center', marginBottom: 16, width: '100%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#2C2C2A', marginBottom: 4 },
  modalSub: { fontSize: 14, color: '#888780' },
  modalLoadingText: { fontSize: 16, fontWeight: '600', color: '#2C2C2A', marginTop: 18 },

  // QR
  qrWrapper: { alignItems: 'center', marginBottom: 14 },
  qrImage: { width: 220, height: 220 },
  qrLabel: {
    backgroundColor: '#1D9E75', paddingHorizontal: 20, paddingVertical: 6,
    borderRadius: 20, marginTop: 8,
  },
  qrLabelText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  qrPlaceholder: {
    width: 220, height: 220, borderRadius: 14, backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  qrPlaceholderText: { color: '#2C2C2A', fontWeight: '600', marginTop: 10 },
  qrPlaceholderSub: { color: '#888780', fontSize: 12, marginTop: 4 },

  // Steps
  stepsBox: {
    backgroundColor: '#F0FBF6', borderRadius: 12, padding: 14,
    width: '100%', marginBottom: 10,
  },
  stepsTitle: { fontSize: 12, fontWeight: '700', color: '#1D9E75', marginBottom: 8 },
  stepRow: { fontSize: 13, color: '#2C2C2A', lineHeight: 22 },

  // Countdown
  countdownBox: {
    backgroundColor: '#F0FBF6', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14,
    alignItems: 'center', marginTop: 16, marginBottom: 10,
  },
  countdownLabel: { fontSize: 12, color: '#888780', marginBottom: 4 },
  countdownValue: { fontSize: 32, fontWeight: '800', color: '#1D9E75', letterSpacing: 2 },
  pollSubText: { fontSize: 13, color: '#888780', marginTop: 8 },
  pollNote: {
    fontSize: 12, color: '#888780', textAlign: 'center',
    paddingHorizontal: 12, lineHeight: 18, marginBottom: 8,
  },

  // Success
  successEmoji: { fontSize: 60, marginBottom: 10 },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#2C2C2A', marginBottom: 6 },
  successSub: { fontSize: 14, color: '#888780', marginBottom: 20 },
  newBalanceBox: {
    backgroundColor: '#E1F5EE', borderRadius: 14, padding: 18,
    alignItems: 'center', width: '100%', marginBottom: 20,
  },
  newBalanceLabel: { fontSize: 12, color: '#1D9E75', marginBottom: 4 },
  newBalanceAmt: { fontSize: 28, fontWeight: '800', color: '#1D9E75' },

  // Failed
  failTitle: { fontSize: 20, fontWeight: '700', color: '#2C2C2A', marginBottom: 8 },
  failSub: { fontSize: 13, color: '#888780', textAlign: 'center', lineHeight: 20, marginBottom: 24 },

  // Buttons in modal
  btnConfirmPay: {
    backgroundColor: '#1D9E75', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', width: '100%', marginBottom: 8,
  },
  btnCancelWrap: { paddingVertical: 10, alignItems: 'center', width: '100%' },
  btnCancelSmall: {
    marginTop: 20, paddingVertical: 10, paddingHorizontal: 28,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  btnCancelText: { fontSize: 14, color: '#888780' },
})
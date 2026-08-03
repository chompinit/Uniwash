import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../../../lib/supabase'
import { Brand, Spacing } from '../../constants/theme'

type Customer = { id: string; full_name: string; email: string; coins: number }
type Txn = { id: string; amount: number; type: string | null; created_at: string }

const typeLabel = (t: string | null) => {
  switch (t) {
    case 'topup': return 'เติมเหรียญ'
    case 'spend': return 'ใช้จ่าย'
    case 'refund': return 'คืนเงิน'
    case 'admin': return 'ปรับโดยแอดมิน'
    default: return t || 'รายการ'
  }
}

const fmtDate = (s: string) => {
  try {
    return new Date(s).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
  } catch { return s }
}

export default function TopupsView() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Customer | null>(null)
  const [txns, setTxns] = useState<Txn[]>([])
  const [txnLoading, setTxnLoading] = useState(false)

  useEffect(() => { fetchCustomers() }, [])

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, coins')
        .eq('role', 'customer')
        .order('coins', { ascending: false })
      if (error) throw error
      setCustomers((data as Customer[]) || [])
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  const openHistory = async (c: Customer) => {
    setSelected(c)
    setTxnLoading(true)
    try {
      const { data, error } = await supabase
        .from('coin_transactions')
        .select('id, amount, type, created_at')
        .eq('user_id', c.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setTxns((data as Txn[]) || [])
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setTxnLoading(false)
    }
  }

  const totalCoins = customers.reduce((s, c) => s + (c.coins || 0), 0)

  if (loading && customers.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Brand.primary} /></View>
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← กลับ</Text></TouchableOpacity>
        <Text style={styles.title}>ยอด & ประวัติเติมเหรียญ</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>เหรียญรวมในระบบ</Text>
        <Text style={styles.summaryValue}>🪙 {totalCoins.toLocaleString()}</Text>
      </View>

      <FlatList
        data={customers}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>ยังไม่มีลูกค้า</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openHistory(item)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.full_name || '(ไม่มีชื่อ)'}</Text>
              <Text style={styles.sub}>{item.email}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.coins}>🪙 {item.coins}</Text>
              <Text style={styles.viewLink}>ดูประวัติ ›</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <View>
                <Text style={styles.modalTitle}>{selected?.full_name}</Text>
                <Text style={styles.sub}>ยอดปัจจุบัน 🪙 {selected?.coins}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelected(null)}><Text style={styles.close}>✕</Text></TouchableOpacity>
            </View>
            {txnLoading ? (
              <ActivityIndicator color={Brand.primary} style={{ marginTop: 30 }} />
            ) : (
              <FlatList
                data={txns}
                keyExtractor={(i) => i.id}
                style={{ marginTop: 8 }}
                ListEmptyComponent={<Text style={styles.empty}>ยังไม่มีรายการ</Text>}
                renderItem={({ item }) => (
                  <View style={styles.txnRow}>
                    <View>
                      <Text style={styles.txnType}>{typeLabel(item.type)}</Text>
                      <Text style={styles.txnDate}>{fmtDate(item.created_at)}</Text>
                    </View>
                    <Text style={[styles.txnAmount, item.amount >= 0 ? styles.amtPos : styles.amtNeg]}>
                      {item.amount >= 0 ? '+' : ''}{item.amount}
                    </Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.three, backgroundColor: Brand.card, borderBottomWidth: 1, borderBottomColor: Brand.border },
  back: { color: Brand.primary, fontSize: 15, width: 50 },
  title: { fontSize: 17, fontWeight: '700', color: Brand.text },
  summary: { backgroundColor: Brand.primary, margin: Spacing.three, borderRadius: 14, padding: 18, alignItems: 'center' },
  summaryLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  summaryValue: { color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 4 },
  list: { paddingHorizontal: Spacing.three, paddingBottom: 40 },
  empty: { textAlign: 'center', color: Brand.textSecondary, marginTop: 40 },
  card: { flexDirection: 'row', backgroundColor: Brand.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Brand.border, alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: Brand.text },
  sub: { fontSize: 12, color: Brand.textSecondary, marginTop: 2 },
  coins: { fontSize: 16, color: Brand.gold, fontWeight: '800' },
  viewLink: { fontSize: 12, color: Brand.primary, marginTop: 2 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Brand.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.four, height: '70%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Brand.text },
  close: { fontSize: 20, color: Brand.textSecondary, padding: 4 },
  txnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Brand.border },
  txnType: { fontSize: 14, fontWeight: '600', color: Brand.text },
  txnDate: { fontSize: 12, color: Brand.textSecondary, marginTop: 2 },
  txnAmount: { fontSize: 16, fontWeight: '800' },
  amtPos: { color: Brand.success },
  amtNeg: { color: Brand.danger },
})

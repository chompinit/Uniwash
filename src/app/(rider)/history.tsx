import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../../../lib/supabase'
type Order = {
  id: string
  order_number: string
  total_price: number
  delivery_address: string
  delivered_at: string | null
}
export default function RiderHistoryScreen() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetchHistory()
  }, [])
  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('orders')
      .select('id, order_number, total_price, delivery_address, delivered_at')
      .eq('employee_id', user.id)
      .eq('status', 'delivered')
      .order('delivered_at', { ascending: false })
      .limit(50)
    setOrders((data as Order[]) ?? [])
    setLoading(false)
  }
  const formatDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString('th-TH', {
          day: '2-digit', month: 'short', year: '2-digit',
          hour: '2-digit', minute: '2-digit',
        })
      : '-'
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← กลับ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ประวัติงานที่ส่งแล้ว</Text>
        <View style={{ width: 40 }} />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#1C8A99" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.content}>
          <Text style={styles.sectionLabel}>ทั้งหมด {orders.length} งาน</Text>
          {orders.length === 0 ? (
            <Text style={styles.emptyText}>ยังไม่มีงานที่ส่งเสร็จ</Text>
          ) : (
            orders.map((o) => (
              <View key={o.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.orderNum}>#{o.order_number}</Text>
                  <Text style={styles.price}>{o.total_price} บาท</Text>
                </View>
                <Text style={styles.address} numberOfLines={1}>📍 {o.delivery_address}</Text>
                <Text style={styles.date}>✅ ส่งเมื่อ {formatDate(o.delivered_at)}</Text>
              </View>
            ))
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F5F7' },
  header: {
    backgroundColor: '#fff', padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0',
  },
  backText: { fontSize: 15, color: '#1C8A99' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#2C2C2A' },
  content: { flex: 1, padding: 16 },
  sectionLabel: { fontSize: 13, color: '#888780', marginBottom: 10 },
  emptyText: { fontSize: 13, color: '#B4B2A9', fontStyle: 'italic' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10 },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  orderNum: { fontSize: 14, fontWeight: '700', color: '#2C2C2A' },
  price: { fontSize: 14, fontWeight: '700', color: '#1C8A99' },
  address: { fontSize: 12, color: '#888780', marginBottom: 4 },
  date: { fontSize: 12, color: '#1C8A99' },
})

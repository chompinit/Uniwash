import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { supabase } from '../../../lib/supabase'

const STATUS_OPTIONS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'pending', label: 'รอ' },
  { key: 'washing', label: 'ซักอยู่' },
  { key: 'ready', label: 'รอส่ง' },
  { key: 'delivering', label: 'กำลังส่ง' },
  { key: 'delivered', label: 'ส่งแล้ว' },
  { key: 'cancelled', label: 'ยกเลิก' },
]

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B',
  washing: '#1D9E75',
  ready: '#3B82F6',
  delivering: '#8B5CF6',
  delivered: '#888780',
  cancelled: '#E24B4A',
}

export default function AdminOrdersScreen() {
  const [orders, setOrders] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchOrders() }, [])

  useEffect(() => {
    if (activeFilter === 'all') {
      setFiltered(orders)
    } else {
      setFiltered(orders.filter(o => o.status === activeFilter))
    }
  }, [activeFilter, orders])

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        profiles!orders_customer_id_fkey (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    setOrders(data || [])
    setLoading(false)
  }

  const updateStatus = async (orderId: string, newStatus: string) => {
    Alert.alert(
      'เปลี่ยนสถานะ',
      `เปลี่ยนเป็น "${STATUS_OPTIONS.find(s => s.key === newStatus)?.label}"?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ยืนยัน',
          onPress: async () => {
            await supabase
              .from('orders')
              .update({ status: newStatus })
              .eq('id', orderId)
            fetchOrders()
          },
        },
      ]
    )
  }

  const NEXT_STATUS: Record<string, string> = {
    pending: 'washing',
    washing: 'ready',
    ready: 'delivering',
    delivering: 'delivered',
  }

  const NEXT_LABEL: Record<string, string> = {
    pending: 'เริ่มซัก →',
    washing: 'ซักเสร็จ →',
    ready: 'ส่งออก →',
    delivering: 'ส่งแล้ว ✓',
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← กลับ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>จัดการออเดอร์</Text>
        <Text style={styles.countText}>{filtered.length} รายการ</Text>
      </View>

      {}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {STATUS_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.filterBtn,
              activeFilter === opt.key && styles.filterBtnActive,
            ]}
            onPress={() => setActiveFilter(opt.key)}
          >
            <Text style={[
              styles.filterText,
              activeFilter === opt.key && styles.filterTextActive,
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color="#1D9E75" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.content}>
          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>ไม่มีออเดอร์</Text>
            </View>
          ) : (
            filtered.map(order => (
              <View key={order.id} style={styles.orderCard}>

                {}
                <View style={styles.orderTop}>
                  <View>
                    <Text style={styles.orderNum}>#{order.order_number}</Text>
                    <Text style={styles.orderCustomer}>
                      👤 {order.profiles?.full_name || order.profiles?.email || 'ไม่ระบุ'}
                    </Text>
                    <Text style={styles.orderDate}>
                      {new Date(order.created_at).toLocaleDateString('th-TH', {
                        day: '2-digit', month: 'short', year: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: STATUS_COLOR[order.status] + '20' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: STATUS_COLOR[order.status] }
                      ]}>
                        {STATUS_OPTIONS.find(s => s.key === order.status)?.label}
                      </Text>
                    </View>
                    <Text style={styles.orderPrice}>฿{order.total_price}</Text>
                  </View>
                </View>

                {}
                {NEXT_STATUS[order.status] && (
                  <TouchableOpacity
                    style={styles.nextBtn}
                    onPress={() => updateStatus(order.id, NEXT_STATUS[order.status])}
                  >
                    <Text style={styles.nextBtnText}>
                      {NEXT_LABEL[order.status]}
                    </Text>
                  </TouchableOpacity>
                )}

                {}
                {order.status === 'pending' && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => updateStatus(order.id, 'cancelled')}
                  >
                    <Text style={styles.cancelBtnText}>ยกเลิกออเดอร์</Text>
                  </TouchableOpacity>
                )}

              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    backgroundColor: '#fff', padding: 16,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0',
  },
  backText: { fontSize: 15, color: '#1D9E75' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#2C2C2A' },
  countText: { fontSize: 13, color: '#888780' },
  filterBar: {
    backgroundColor: '#fff', paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0',
    maxHeight: 52,
  },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#f8f9fa',
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  filterBtnActive: { backgroundColor: '#1D9E75', borderColor: '#1D9E75' },
  filterText: { fontSize: 13, color: '#888780' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: '#888780' },
  orderCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 0.5, borderColor: '#E0E0E0',
  },
  orderTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderNum: { fontSize: 15, fontWeight: '700', color: '#2C2C2A' },
  orderCustomer: { fontSize: 13, color: '#888780', marginTop: 4 },
  orderDate: { fontSize: 11, color: '#B4B2A9', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  orderPrice: { fontSize: 16, fontWeight: '700', color: '#1D9E75' },
  nextBtn: {
    backgroundColor: '#1D9E75', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', marginTop: 4,
  },
  nextBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cancelBtn: {
    borderWidth: 1, borderColor: '#E24B4A', borderRadius: 10,
    paddingVertical: 8, alignItems: 'center', marginTop: 6,
  },
  cancelBtnText: { color: '#E24B4A', fontSize: 13, fontWeight: '500' },
})
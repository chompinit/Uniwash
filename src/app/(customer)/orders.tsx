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
  status: string
  total_price: number
  created_at: string
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'รอดำเนินการ',
  washing: 'กำลังซัก',
  delivered: 'จัดส่งแล้ว',
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B',
  washing: '#1D9E75',
  delivered: '#888780',
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })

    if (!error) setOrders(data || [])
    setLoading(false)
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('th-TH', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← กลับ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ออเดอร์ของฉัน</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1D9E75" style={{ marginTop: 40 }} />
      ) : orders.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🧺</Text>
          <Text style={styles.emptyText}>ยังไม่มีออเดอร์</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {orders.map(order => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => router.push({
                pathname: '/(customer)/status' as any,
                params: { orderId: order.id, orderNumber: order.order_number },
              })}
            >
              <View style={styles.orderTop}>
                <View style={styles.orderIcon}>
                  <Text style={{ fontSize: 20 }}>👕</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderNum}>#{order.order_number}</Text>
                  <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[order.status] + '20' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[order.status] }]}>
                    {STATUS_LABEL[order.status] || order.status}
                  </Text>
                </View>
              </View>
              <View style={styles.orderBottom}>
                <Text style={styles.priceLabel}>ยอดรวม</Text>
                <Text style={styles.priceValue}>{order.total_price} บาท</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    backgroundColor: '#fff', padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0',
  },
  backText: { fontSize: 15, color: '#1D9E75' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#2C2C2A' },
  content: { flex: 1, padding: 16 },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyEmoji: { fontSize: 60, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#888780' },
  orderCard: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 16, marginBottom: 10,
    borderWidth: 0.5, borderColor: '#E0E0E0',
  },
  orderTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  orderIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#E1F5EE',
    alignItems: 'center', justifyContent: 'center',
  },
  orderNum: { fontSize: 14, fontWeight: '600', color: '#2C2C2A' },
  orderDate: { fontSize: 12, color: '#888780', marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  orderBottom: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 0.5, borderTopColor: '#F0F0F0', paddingTop: 10,
  },
  priceLabel: { fontSize: 13, color: '#888780' },
  priceValue: { fontSize: 14, fontWeight: '700', color: '#1D9E75' },
})
import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
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
  pending: 'รอการรับผ้า',
  washing: 'กำลังซักผ้า',
  delivered: 'จัดส่งเรียบร้อยแล้ว',
  cancelled: 'ยกเลิกแล้ว',
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchOrders = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, status, total_price, created_at')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
    if (!error) setOrders(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchOrders()
    setRefreshing(false)
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('th-TH', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>สถานะรายการสั่งซัก</Text>
        <Text style={styles.headerSub}>รายการสั่งซักของคุณ</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#1C8A99" style={{ marginTop: 40 }} />
      ) : orders.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🧺</Text>
          <Text style={styles.emptyText}>ยังไม่มีอออเดอร์</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {orders.map(order => (
            <View key={order.id}>
              <Text style={styles.groupLabel}>{order.order_number}</Text>
              <View style={styles.orderCard}>
                <View style={styles.orderTop}>
                  <Text style={styles.orderName}>ผ้าของ {order.order_number}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                    <Text style={styles.orderStatus}>
                      {STATUS_LABEL[order.status] || order.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.orderBottom}>
                  <Text style={styles.priceValue}>{order.total_price} THB</Text>
                  <TouchableOpacity
                    style={styles.detailChip}
                    onPress={() => router.push({
                      pathname: '/(customer)/order-detail' as any,
                      params: { orderId: order.id },
                    })}
                  >
                    <Text style={styles.detailChipText}>ดูรายละเอียด</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F5F7' },
  header: { backgroundColor: '#fff', padding: 16 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1B1C2A' },
  headerSub: { fontSize: 12, color: '#8A8F98', marginTop: 3 },
  content: { flex: 1, padding: 16 },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyEmoji: { fontSize: 60, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#8A8F98' },
  groupLabel: { fontSize: 12, fontWeight: '700', color: '#8A8F98', marginBottom: 6 },
  orderCard: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 14, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  orderName: { fontSize: 14, fontWeight: '700', color: '#1B1C2A' },
  orderDate: { fontSize: 12, color: '#8A8F98' },
  orderStatus: { fontSize: 12, fontWeight: '600', color: '#1C8A99', marginTop: 2 },
  orderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceValue: { fontSize: 16, fontWeight: '700', color: '#1C8A99' },
  detailChip: { backgroundColor: '#E3F1F3', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  detailChipText: { fontSize: 12, color: '#1C8A99', fontWeight: '600' },
})

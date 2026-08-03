import { router, useLocalSearchParams } from 'expo-router'
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

type OrderDetail = {
  id: string
  order_number: string
  status: string
  total_price: number
  created_at: string
  order_items: {
    item_type: string
    quantity: number
    price_per_item: number
  }[]
}

const ITEM_LABELS: Record<string, string> = {
  shirt: 'เสื้อผ้า',
  pant: 'กางเกง',
  underwear: 'ชุดชั้นใน',
  bedsheet: 'ผ้าปูที่นอน',
}

const STEPS = [
  { key: 'pending', label: 'ชำระเงินเรียบร้อย', sub: 'สำเร็จแล้ว' },
  { key: 'washing', label: 'กำลังดำเนินการซัก', sub: 'กำลังดำเนินการ...' },
  { key: 'delivered', label: 'จัดส่งกลับเรียบร้อย', sub: 'เสร็จสิ้น' },
]

const STATUS_ORDER = ['pending', 'washing', 'delivered']

export default function StatusScreen() {
  const { orderId, orderNumber } = useLocalSearchParams()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrder()

    const interval = setInterval(fetchOrder, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchOrder = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single()

    if (!error) setOrder(data)
    setLoading(false)
  }

  const handleCancel = async () => {
    Alert.alert('ยืนยัน', 'ต้องการยกเลิกออเดอร์นี้?', [
      { text: 'ไม่', style: 'cancel' },
      {
        text: 'ยกเลิก', style: 'destructive',
        onPress: async () => {
          await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', orderId)
          router.replace('/(customer)/packages' as any)
        },
      },
    ])
  }

  const currentStepIndex = STATUS_ORDER.indexOf(order?.status || 'pending')

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1D9E75" style={{ marginTop: 40 }} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ติดตามออเดอร์</Text>
        <TouchableOpacity onPress={() => router.push('/(customer)/orders' as any)}>
          <Text style={styles.allOrderText}>ดูทั้งหมด</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>

        {}
        <View style={styles.card}>
          <Text style={styles.orderNum}>ออเดอร์ #{order?.order_number || orderNumber}</Text>
          <Text style={styles.orderDate}>
            {order?.created_at
              ? new Date(order.created_at).toLocaleDateString('th-TH', {
                  day: '2-digit', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })
              : ''}
          </Text>
        </View>

        {}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>STATUS</Text>
          {STEPS.map((step, index) => {
            const isDone = index < currentStepIndex
            const isActive = index === currentStepIndex
            const isPending = index > currentStepIndex

            return (
              <View key={step.key}>
                <View style={styles.stepItem}>
                  <View style={[
                    styles.dot,
                    isDone && styles.dotDone,
                    isActive && styles.dotActive,
                    isPending && styles.dotPending,
                  ]} />
                  <View>
                    <Text style={[
                      styles.stepTitle,
                      isActive && { color: '#1D9E75' },
                      isPending && { opacity: 0.4 },
                    ]}>
                      {step.label}
                    </Text>
                    <Text style={[styles.stepSub, isPending && { opacity: 0.4 }]}>
                      {step.sub}
                    </Text>
                  </View>
                </View>
                {index < STEPS.length - 1 && (
                  <View style={[styles.stepLine, isDone && styles.stepLineDone]} />
                )}
              </View>
            )
          })}
        </View>

        {}
        {order?.order_items && order.order_items.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>รายการ</Text>
            {order.order_items.map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <Text style={styles.itemLabel}>
                  {ITEM_LABELS[item.item_type] || item.item_type}
                </Text>
                <Text style={styles.itemQty}>{item.quantity} ชิ้น</Text>
                <Text style={styles.itemPrice}>
                  {item.quantity * item.price_per_item} บาท
                </Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>รวม</Text>
              <Text style={styles.totalPrice}>{order.total_price} บาท</Text>
            </View>
          </View>
        )}

      </ScrollView>

      {}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.btnHome}
          onPress={() => router.replace('/(customer)/packages' as any)}
        >
          <Text style={styles.btnHomeText}>กลับหน้าหลัก</Text>
        </TouchableOpacity>

        {order?.status === 'pending' && (
          <TouchableOpacity style={styles.btnCancel} onPress={handleCancel}>
            <Text style={styles.btnCancelText}>ยกเลิกออเดอร์</Text>
          </TouchableOpacity>
        )}
      </View>
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#2C2C2A' },
  allOrderText: { fontSize: 13, color: '#1D9E75' },
  content: { flex: 1, padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 16, marginBottom: 12,
  },
  cardTitle: { fontSize: 12, fontWeight: '600', color: '#888780', marginBottom: 14, textAlign: 'center' },
  orderNum: { fontSize: 16, fontWeight: '700', color: '#2C2C2A' },
  orderDate: { fontSize: 12, color: '#888780', marginTop: 4 },
  stepItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 4 },
  dot: { width: 14, height: 14, borderRadius: 7, marginTop: 2, flexShrink: 0 },
  dotDone: { backgroundColor: '#1D9E75' },
  dotActive: { backgroundColor: '#1D9E75', shadowColor: '#1D9E75', shadowRadius: 6, shadowOpacity: 0.5, elevation: 4 },
  dotPending: { backgroundColor: '#E0E0E0' },
  stepLine: { width: 2, height: 24, backgroundColor: '#E0E0E0', marginLeft: 6, marginVertical: 2 },
  stepLineDone: { backgroundColor: '#1D9E75' },
  stepTitle: { fontSize: 14, fontWeight: '600', color: '#2C2C2A' },
  stepSub: { fontSize: 12, color: '#888780', marginTop: 2 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0',
  },
  itemLabel: { flex: 1, fontSize: 13, color: '#2C2C2A' },
  itemQty: { fontSize: 13, color: '#888780', marginRight: 16 },
  itemPrice: { fontSize: 13, fontWeight: '500', color: '#2C2C2A' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 },
  totalLabel: { fontSize: 14, fontWeight: '600', color: '#2C2C2A' },
  totalPrice: { fontSize: 16, fontWeight: '700', color: '#1D9E75' },
  footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#E0E0E0', gap: 8 },
  btnHome: {
    backgroundColor: '#1D9E75', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  btnHomeText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnCancel: {
    backgroundColor: 'transparent', borderRadius: 12, borderWidth: 1.5,
    borderColor: '#E24B4A', paddingVertical: 12, alignItems: 'center',
  },
  btnCancelText: { color: '#E24B4A', fontSize: 14, fontWeight: '600' },
})
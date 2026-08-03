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
  shirt: 'à¹€à¸ªà¸·à¹‰à¸­à¸œà¹‰à¸²',
  pant: 'à¸à¸²à¸‡à¹€à¸à¸‡',
  underwear: 'à¸Šà¸¸à¸”à¸Šà¸±à¹‰à¸™à¹ƒà¸™',
  bedsheet: 'à¸œà¹‰à¸²à¸›à¸¹à¸—à¸µà¹ˆà¸™à¸­à¸™',
}
const STEPS = [
  { key: 'pending', label: 'à¸Šà¸³à¸£à¸°à¹€à¸‡à¸´à¸™à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§' },
  { key: 'washing', label: 'à¸à¸³à¸¥à¸±à¸‡à¸‹à¸±à¸à¸œà¹‰à¸²' },
  { key: 'delivered', label: 'à¸ˆà¸±à¸”à¸ªà¹ˆà¸‡à¸œà¹‰à¸²à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§' },
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
    Alert.alert('à¸¢à¸·à¸™à¸¢à¸±à¸™', 'à¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸¢à¸à¹€à¸¥à¸´à¸à¸­à¸­à¹€à¸”à¸­à¸£à¹Œà¸™à¸µà¹‰?', [
      { text: 'à¹„à¸¡à¹ˆ', style: 'cancel' },
      {
        text: 'à¸¢à¸à¹€à¸¥à¸´à¸', style: 'destructive',
        onPress: async () => {
          // à¹ƒà¸Šà¹‰ RPC à¹€à¸žà¸·à¹ˆà¸­à¸„à¸·à¸™à¹€à¸«à¸£à¸µà¸¢à¸à¸—à¸µà¹ˆà¸ˆà¹ˆà¸²à¸¢à¹„à¸›à¹à¸¥à¹‰à¸§à¸”à¹‰à¸§à¸¢
          const { error } = await supabase.rpc('cancel_order_refund', {
            p_order_id: orderId,
          })
          if (error) {
            Alert.alert('à¸¢à¸à¹€à¸¥à¸´à¸à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ', error.message)
            return
          }
          router.replace('/(customer)/packages' as any)
        },
      },
    ])
  }
  const currentStepIndex = STATUS_ORDER.indexOf(order?.status || 'pending')
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1C8A99" style={{ marginTop: 40 }} />
      </SafeAreaView>
    )
  }
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backChip} onPress={() => router.back()}>
          <Text style={styles.backChipText}>â€¹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>à¸•à¸´à¸”à¸•à¸²à¸¡à¸ªà¸–à¸²à¸™à¸°</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView style={styles.content}>
        {}
        <View style={styles.orderHead}>
          <Text style={styles.orderNum}>à¸œà¹‰à¸²à¸‚à¸­à¸‡ #{order?.order_number || orderNumber}</Text>
          <Text style={styles.orderDate}>
            Orderd. At{' '}
            {order?.created_at
              ? new Date(order.created_at).toLocaleDateString('th-TH', {
                  day: '2-digit', month: '2-digit', year: '2-digit',
                  hour: '2-digit', minute: '2-digit',
                })
              : ''}{' '}à¸™.
          </Text>
          {order?.order_items?.map((item, i) => (
            <Text key={i} style={styles.orderItem}>
              {item.quantity}x {ITEM_LABELS[item.item_type] || item.item_type}
            </Text>
          ))}
        </View>
        {}
        <View style={styles.statusZone}>
          <Text style={styles.watermark}>STATUS</Text>
          <View style={styles.timeline}>
            {STEPS.map((step, index) => {
              const isDone = index < currentStepIndex
              const isActive = index === currentStepIndex
              const reached = isDone || isActive
              return (
                <View key={step.key}>
                  <View style={styles.stepItem}>
                    <View style={[styles.dot, reached ? styles.dotActive : styles.dotPending]} />
                    <Text style={[styles.stepTitle, !reached && styles.stepTitleDim]}>
                      {step.label}
                    </Text>
                  </View>
                  {index < STEPS.length - 1 && (
                    <View style={[styles.stepLine, isDone && styles.stepLineDone]} />
                  )}
                </View>
              )
            })}
          </View>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.btnHome}
          onPress={() => router.replace('/(customer)/packages' as any)}
        >
          <Text style={styles.btnHomeText}>à¸à¸¥à¸±à¸šà¸ªà¸¹à¹ˆà¸«à¸™à¹‰à¸²à¸«à¸¥à¸±à¸</Text>
        </TouchableOpacity>
        {order?.status === 'pending' && (
          <TouchableOpacity style={styles.btnCancel} onPress={handleCancel}>
            <Text style={styles.btnCancelText}>à¸¢à¸à¹€à¸¥à¸´à¸à¸­à¸­à¹€à¸”à¸­à¸£à¹Œ</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#fff', padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 0.5, borderBottomColor: '#E6E8EB',
  },
  backChip: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF1F4',
    alignItems: 'center', justifyContent: 'center',
  },
  backChipText: { fontSize: 22, color: '#1B1C2A', fontWeight: '600', marginTop: -2 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#1B1C2A' },
  content: { flex: 1, padding: 20 },
  orderHead: { marginBottom: 8 },
  orderNum: { fontSize: 15, fontWeight: '700', color: '#1B1C2A' },
  orderDate: { fontSize: 12, color: '#8A8F98', marginTop: 3, marginBottom: 6 },
  orderItem: { fontSize: 12, color: '#8A8F98', lineHeight: 18 },
  statusZone: { paddingTop: 10 },
  watermark: {
    fontSize: 44, fontWeight: '800', color: '#E6E8EB',
    letterSpacing: 6, textAlign: 'center', marginVertical: 24,
  },
  timeline: { paddingLeft: 28 },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dot: { width: 18, height: 18, borderRadius: 9 },
  dotActive: { backgroundColor: '#F08A24' },
  dotPending: { backgroundColor: '#E6E8EB' },
  stepLine: {
    width: 3, height: 38, backgroundColor: '#E6E8EB',
    marginLeft: 7.5, marginVertical: 3,
  },
  stepLineDone: { backgroundColor: '#F08A24' },
  stepTitle: { fontSize: 14, fontWeight: '600', color: '#1B1C2A' },
  stepTitleDim: { color: '#B4B2A9' },
  footer: { padding: 16, gap: 8 },
  btnHome: {
    backgroundColor: '#16161F', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  btnHomeText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnCancel: {
    backgroundColor: 'transparent', borderRadius: 12, borderWidth: 1.5,
    borderColor: '#E2574C', paddingVertical: 12, alignItems: 'center',
  },
  btnCancelText: { color: '#E2574C', fontSize: 14, fontWeight: '600' },
})
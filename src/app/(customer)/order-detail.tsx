import { router, useLocalSearchParams } from 'expo-router'
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

const ITEM_LABELS: Record<string, string> = {
  shirt: 'เสื้อผ้า',
  pant: 'กางเกง',
  underwear: 'ชุดชั้นใน',
  bedsheet: 'ผ้าปูที่นอน',
}

const TRACK_STEPS = [
  { key: 'pending', label: 'ดำเนินการรับผ้า' },
  { key: 'washing', label: 'กำลังซักผ้า' },
  { key: 'delivered', label: 'จัดส่งผ้าเรียบร้อยแล้ว' },
]

const STATUS_ORDER = ['pending', 'washing', 'delivered']

type OrderDetail = {
  id: string
  order_number: string
  status: string
  total_price: number
  delivery_address: string
  delivery_lat: number | null
  delivery_lng: number | null
  created_at: string
  order_items: { item_type: string; quantity: number; price_per_item: number }[]
}

export default function OrderDetailScreen() {
  const { orderId } = useLocalSearchParams()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrder()
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

  if (loading || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1C8A99" style={{ marginTop: 40 }} />
      </SafeAreaView>
    )
  }

  const currentStepIndex =
    order.status === 'cancelled' ? -1 : STATUS_ORDER.indexOf(order.status)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backChip} onPress={() => router.back()}>
          <Text style={styles.backChipText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>รายละเอียดค่าสั่งซื้อ</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.content}>

        {/* เลขที่สั่งซื้อ + ปุ่มดูภาพถ่าย */}
        <View style={[styles.card, styles.orderNoCard]}>
          <View>
            <Text style={styles.cardTitle}>เลขที่สั่งซื้อ</Text>
            <Text style={styles.orderNum}>{order.order_number}</Text>
            <Text style={styles.orderDate}>
              {new Date(order.created_at).toLocaleDateString('th-TH', {
                day: '2-digit', month: '2-digit', year: 'numeric',
              })}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.photoBtn}
            onPress={() => router.push({
              pathname: '/(customer)/delivery-photos' as any,
              params: { orderId: order.id },
            })}
          >
            <Text style={styles.photoBtnText}>ดูภาพถ่าย</Text>
          </TouchableOpacity>
        </View>

        {/* ข้อมูลรายการ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ข้อมูลรายการ</Text>
          <View style={styles.tableHead}>
            <Text style={[styles.thText, { flex: 1 }]}>ชนิด</Text>
            <Text style={[styles.thText, { width: 50, textAlign: 'center' }]}>จำนวน</Text>
            <Text style={[styles.thText, { width: 64, textAlign: 'right' }]}>ราคา</Text>
          </View>
          {order.order_items.map((item, i) => (
            <View key={i} style={styles.sumRow}>
              <Text style={styles.sumLabel}>{ITEM_LABELS[item.item_type] || item.item_type}</Text>
              <Text style={styles.sumQty}>{item.quantity}</Text>
              <Text style={styles.sumPrice}>{item.quantity * item.price_per_item} THB</Text>
            </View>
          ))}
        </View>

        {/* ข้อมูลการรับส่ง */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ข้อมูลการรับส่ง</Text>
          <View style={styles.addrRow}>
            <View style={styles.addrIcon}>
              <Text style={{ fontSize: 16 }}>🏠</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addrLabel}>บ้าน (ค่าเริ่มต้น)</Text>
              <Text style={styles.addressText}>{order.delivery_address}</Text>
              {order.delivery_lat && order.delivery_lng ? (
                <Text style={styles.coordText}>
                  {order.delivery_lat.toFixed(5)}, {order.delivery_lng.toFixed(5)}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* ติดตามสถานะ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ติดตามสถานะ</Text>
          {order.status === 'cancelled' ? (
            <Text style={styles.cancelledText}>❌ ออเดอร์นี้ถูกยกเลิกแล้ว</Text>
          ) : (
            TRACK_STEPS.map((step, index) => {
              const reached = index <= currentStepIndex
              return (
                <View key={step.key} style={styles.trackRow}>
                  <View style={[styles.radio, reached && styles.radioActive]}>
                    {reached && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.trackLabel, !reached && styles.trackLabelDim]}>
                    {step.label}
                  </Text>
                </View>
              )
            })
          )}
        </View>

        {/* สรุปค่าสั่งซื้อ */}
        <View style={[styles.card, styles.totalCard]}>
          <Text style={styles.totalCardTitle}>สรุปค่าสั่งซื้อ</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>ราคารวม</Text>
            <Text style={styles.totalPrice}>{order.total_price} THB</Text>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F5F7' },
  header: {
    backgroundColor: '#fff', padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  backChip: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF1F4',
    alignItems: 'center', justifyContent: 'center',
  },
  backChipText: { fontSize: 22, color: '#1B1C2A', fontWeight: '600', marginTop: -2 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#1B1C2A' },
  content: { flex: 1, padding: 16 },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#1B1C2A', marginBottom: 8 },

  orderNoCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  orderNum: { fontSize: 16, fontWeight: '800', color: '#1B1C2A' },
  orderDate: { fontSize: 12, color: '#8A8F98', marginTop: 2 },
  photoBtn: {
    borderWidth: 1.5, borderColor: '#F08A24', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  photoBtnText: { fontSize: 12, fontWeight: '700', color: '#F08A24' },

  tableHead: {
    flexDirection: 'row', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: '#E6E8EB',
  },
  thText: { fontSize: 11.5, color: '#8A8F98', fontWeight: '600' },
  sumRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0',
  },
  sumLabel: { flex: 1, fontSize: 13, color: '#1B1C2A' },
  sumQty: { width: 50, textAlign: 'center', fontSize: 13, color: '#8A8F98' },
  sumPrice: { width: 64, textAlign: 'right', fontSize: 13, fontWeight: '500', color: '#1B1C2A' },

  addrRow: { flexDirection: 'row', gap: 12 },
  addrIcon: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#E3F1F3',
    alignItems: 'center', justifyContent: 'center',
  },
  addrLabel: { fontSize: 13, fontWeight: '600', color: '#1B1C2A' },
  addressText: { fontSize: 12, color: '#8A8F98', lineHeight: 17, marginTop: 2 },
  coordText: { fontSize: 11, color: '#1C8A99', marginTop: 3 },

  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: '#D5D8DC',
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: '#1C8A99' },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1C8A99' },
  trackLabel: { fontSize: 13, color: '#1B1C2A', fontWeight: '500' },
  trackLabelDim: { color: '#B4B2A9' },
  cancelledText: { fontSize: 13, color: '#E2574C', fontWeight: '600' },

  totalCard: { backgroundColor: '#fff' },
  totalCardTitle: { fontSize: 13, fontWeight: '700', color: '#8A8F98', marginBottom: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1B1C2A' },
  totalPrice: { fontSize: 18, fontWeight: '800', color: '#15707D' },
})

import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
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
type OrderDetail = {
  id: string
  order_number: string
  status: string
  total_price: number
  delivery_address: string
  delivery_note: string | null
  delivery_lat: number | null
  delivery_lng: number | null
  customer_id: string
  employee_id: string | null
  created_at: string
  order_items: { item_type: string; quantity: number; price_per_item: number }[]
}
type Customer = { full_name: string | null; phone: string | null }
export default function RiderJobScreen() {
  const { orderId } = useLocalSearchParams()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [myId, setMyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  useEffect(() => {
    fetchOrder()
  }, [])
  const fetchOrder = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setMyId(user.id)
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single()
    if (error || !data) {
      Alert.alert('Error', error?.message ?? 'ไม่พบออเดอร์')
      setLoading(false)
      return
    }
    setOrder(data)
    const { data: prof } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', data.customer_id)
      .single()
    setCustomer(prof)
    setLoading(false)
  }
  // รับงาน — อันแรกงานอันดี้วยเงื่อนไขไข employee_id ยังว่าง
  const handleAccept = async () => {
    setActing(true)
    const { data, error } = await supabase
      .from('orders')
      .update({ employee_id: myId })
      .eq('id', orderId)
      .is('employee_id', null)
      .select()
    setActing(false)
    if (error) {
      Alert.alert('Error', error.message)
      return
    }
    if (!data || data.length === 0) {
      Alert.alert('ไม่สำเร็จ', 'งานนี้มีคนรับไปแล้ว')
      router.back()
      return
    }
    fetchOrder()
  }
  const handlePickup = async () => {
    setActing(true)
    const { error } = await supabase
      .from('orders')
      .update({ status: 'washing', pickup_confirmed_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('employee_id', myId)
    setActing(false)
    if (error) {
      Alert.alert('Error', error.message)
      return
    }
    fetchOrder()
  }
  const handleDelivered = () => {
    Alert.alert('ยืนยัน', 'ส่งผ้าคืนลูกค้าเรียบร้อยแล้ว?', [
      { text: 'ยังไม่ส่ง', style: 'cancel' },
      {
        text: 'ส่งแล้ว ✓',
        onPress: async () => {
          setActing(true)
          const { error } = await supabase
            .from('orders')
            .update({ status: 'delivered', delivered_at: new Date().toISOString() })
            .eq('id', orderId)
            .eq('employee_id', myId)
          setActing(false)
          if (error) {
            Alert.alert('Error', error.message)
            return
          }
          router.replace('/(rider)/dashboard' as any)
        },
      },
    ])
  }
  const openMap = () => {
    if (!order) return
    const url = order.delivery_lat && order.delivery_lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${order.delivery_lat},${order.delivery_lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`
    Linking.openURL(url)
  }
  const callCustomer = () => {
    if (customer?.phone) Linking.openURL(`tel:${customer.phone}`)
  }
  if (loading || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1C8A99" style={{ marginTop: 40 }} />
      </SafeAreaView>
    )
  }
  const isMine = order.employee_id === myId
  const isUnassigned = !order.employee_id
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← กลับ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>#{order.order_number}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.content}>
        {}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 ลูกค้า</Text>
          <Text style={styles.custName}>{customer?.full_name || 'ไม่ระบุชื่อ'}</Text>
          {customer?.phone ? (
            <TouchableOpacity style={styles.callBtn} onPress={callCustomer}>
              <Text style={styles.callBtnText}>📞 โทร {customer.phone}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.noPhone}>ไม่มีเบอร์โทรติดต่อ</Text>
          )}
        </View>
        {}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 ที่อยู่จัดส่ง</Text>
          <Text style={styles.addressText}>{order.delivery_address}</Text>
          {order.delivery_note ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>📝 {order.delivery_note}</Text>
            </View>
          ) : null}
          <TouchableOpacity style={styles.mapBtn} onPress={openMap}>
            <Text style={styles.mapBtnText}>🗺️ นำทางด้วย Google Maps</Text>
          </TouchableOpacity>
        </View>
        {}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧺 รายการ</Text>
          {order.order_items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <Text style={styles.itemLabel}>{ITEM_LABELS[item.item_type] || item.item_type}</Text>
              <Text style={styles.itemQty}>{item.quantity} ชิ้น</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>ยอดรวม</Text>
            <Text style={styles.totalPrice}>{order.total_price} บาท</Text>
          </View>
        </View>
      </ScrollView>
      {}
      <View style={styles.footer}>
        {isUnassigned && order.status === 'pending' && (
          <TouchableOpacity
            style={[styles.btnPrimary, acting && styles.btnDisabled]}
            onPress={handleAccept}
            disabled={acting}
          >
            {acting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>รับงานนี้ ✓</Text>}
          </TouchableOpacity>
        )}
        {isMine && order.status === 'pending' && (
          <TouchableOpacity
            style={[styles.btnPrimary, acting && styles.btnDisabled]}
            onPress={handlePickup}
            disabled={acting}
          >
            {acting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>รับผ้าจากลูกค้าแล้ว 🧺</Text>}
          </TouchableOpacity>
        )}
        {isMine && order.status === 'washing' && (
          <TouchableOpacity
            style={[styles.btnPrimary, acting && styles.btnDisabled]}
            onPress={handleDelivered}
            disabled={acting}
          >
            {acting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>ส่งผ้าคืนเรียบร้อย ✓</Text>}
          </TouchableOpacity>
        )}
        {order.status === 'delivered' && (
          <View style={styles.doneBox}>
            <Text style={styles.doneText}>✅ งานนี้เสร็จสิ้นแล้ว</Text>
          </View>
        )}
      </View>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#2C2C2A' },
  content: { flex: 1, padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#888780', marginBottom: 10 },
  custName: { fontSize: 16, fontWeight: '600', color: '#2C2C2A', marginBottom: 10 },
  callBtn: {
    borderWidth: 1.5, borderColor: '#1C8A99', borderRadius: 10,
    paddingVertical: 11, alignItems: 'center',
  },
  callBtnText: { fontSize: 14, color: '#1C8A99', fontWeight: '600' },
  noPhone: { fontSize: 13, color: '#B4B2A9', fontStyle: 'italic' },
  addressText: { fontSize: 14, color: '#2C2C2A', lineHeight: 20, marginBottom: 10 },
  noteBox: {
    backgroundColor: '#FEF3E2', borderRadius: 10, padding: 10, marginBottom: 10,
  },
  noteText: { fontSize: 13, color: '#8a6914', lineHeight: 19 },
  mapBtn: {
    borderWidth: 1.5, borderColor: '#1C8A99', borderRadius: 10,
    paddingVertical: 11, alignItems: 'center',
  },
  mapBtnText: { fontSize: 14, color: '#1C8A99', fontWeight: '600' },
  itemRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0',
  },
  itemLabel: { fontSize: 13, color: '#2C2C2A' },
  itemQty: { fontSize: 13, color: '#888780' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 },
  totalLabel: { fontSize: 14, fontWeight: '600', color: '#2C2C2A' },
  totalPrice: { fontSize: 16, fontWeight: '700', color: '#1C8A99' },
  footer: {
    padding: 16, backgroundColor: '#fff',
    borderTopWidth: 0.5, borderTopColor: '#E0E0E0',
  },
  btnPrimary: {
    backgroundColor: '#1C8A99', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  doneBox: { alignItems: 'center', paddingVertical: 8 },
  doneText: { fontSize: 15, fontWeight: '600', color: '#1C8A99' },
})

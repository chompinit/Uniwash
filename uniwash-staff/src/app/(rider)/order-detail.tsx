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

const ITEM_LABELS: Record<string, string> = {
  shirt: 'เสื้อผ้า',
  pant: 'กางเกง',
  underwear: 'ชุดชั้นใน',
  bedsheet: 'ผ้าปูที่นอน',
}

const NEXT_STATUS: Record<string, { status: string; label: string; color: string }> = {
  washing: { status: 'ready', label: '✅ ซักเสร็จแล้ว', color: '#3B82F6' },
  ready: { status: 'delivering', label: '🚴 ออกจัดส่ง', color: '#8B5CF6' },
}

export default function RiderOrderDetail() {
  const { orderId } = useLocalSearchParams()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => { fetchOrder() }, [])

  const fetchOrder = async () => {
    const { data } = await supabase
      .from('orders')
      .select(`*, profiles!orders_customer_id_fkey(full_name, email, phone), packages(name, description), order_items(*)`)
      .eq('id', orderId)
      .single()
    setOrder(data)
    setLoading(false)
  }

  const handleUpdateStatus = async () => {
    const next = NEXT_STATUS[order.status]
    if (!next) return
    Alert.alert('ยืนยัน', `เปลี่ยนเป็น "${next.label}"?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ยืนยัน', onPress: async () => {
          setUpdating(true)
          const { data: { user } } = await supabase.auth.getUser()
          await supabase.from('orders')
            .update({ status: next.status, employee_id: user?.id })
            .eq('id', orderId)
          setUpdating(false)
          fetchOrder()
        },
      },
    ])
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1D9E75" style={{ marginTop: 40 }} />
      </SafeAreaView>
    )
  }

  const next = NEXT_STATUS[order?.status]

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← กลับ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>#{order?.order_number}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 ข้อมูลลูกค้า</Text>
          <Text style={styles.infoText}>ชื่อ: {order?.profiles?.full_name || 'ไม่ระบุ'}</Text>
          <Text style={styles.infoText}>อีเมล: {order?.profiles?.email}</Text>
          {order?.profiles?.phone && (
            <Text style={[styles.infoText, { color: '#1D9E75' }]}>📞 {order.profiles.phone}</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📦 แพ็กเกจ</Text>
          <Text style={styles.infoText}>{order?.packages?.name}</Text>
          <Text style={styles.infoSubText}>{order?.packages?.description}</Text>
        </View>

        {order?.order_items?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🧺 รายการผ้า</Text>
            {order.order_items.map((item: any, i: number) => (
              <View key={i} style={styles.itemRow}>
                <Text style={styles.itemLabel}>{ITEM_LABELS[item.item_type] || item.item_type}</Text>
                <Text style={styles.itemQty}>{item.quantity} ชิ้น</Text>
                <Text style={styles.itemPrice}>฿{item.quantity * item.price_per_item}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>รวม</Text>
              <Text style={styles.totalPrice}>฿{order.total_price}</Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 สถานะ: {order?.status?.toUpperCase()}</Text>
          <Text style={styles.infoSubText}>
            สั่งเมื่อ: {new Date(order?.created_at).toLocaleString('th-TH')}
          </Text>
          {order?.delivered_at && (
            <Text style={styles.infoSubText}>
              ส่งแล้วเมื่อ: {new Date(order.delivered_at).toLocaleString('th-TH')}
            </Text>
          )}
        </View>

        {order?.note && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📝 หมายเหตุ</Text>
            <Text style={styles.infoText}>{order.note}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {order?.status === 'pending' && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#1D9E75' }]}
            onPress={() => router.push({
              pathname: '/(rider)/confirm-pickup' as any,
              params: { orderId: order.id, orderNumber: order.order_number, type: 'pickup' },
            })}
          >
            <Text style={styles.actionBtnText}>📦 ยืนยันรับผ้าจากลูกค้า</Text>
          </TouchableOpacity>
        )}

        {next && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: next.color }, updating && { opacity: 0.6 }]}
            onPress={handleUpdateStatus}
            disabled={updating}
          >
            {updating
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.actionBtnText}>{next.label}</Text>
            }
          </TouchableOpacity>
        )}

        {order?.status === 'delivering' && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
            onPress={() => router.push({
              pathname: '/(rider)/confirm-pickup' as any,
              params: { orderId: order.id, orderNumber: order.order_number, type: 'deliver' },
            })}
          >
            <Text style={styles.actionBtnText}>✅ ยืนยันส่งผ้าคืนลูกค้า</Text>
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
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0',
  },
  backText: { fontSize: 15, color: '#1D9E75' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#2C2C2A' },
  content: { flex: 1, padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#888780', marginBottom: 10 },
  infoText: { fontSize: 14, color: '#2C2C2A', marginBottom: 4 },
  infoSubText: { fontSize: 12, color: '#888780', marginTop: 4 },
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
  footer: {
    padding: 16, backgroundColor: '#fff',
    borderTopWidth: 0.5, borderTopColor: '#E0E0E0', gap: 8,
  },
  actionBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
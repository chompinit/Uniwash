import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { supabase } from '../../../lib/supabase'

export default function ConfirmPickupScreen() {
  const { orderId, orderNumber, type } = useLocalSearchParams<{
    orderId: string
    orderNumber: string
    type: 'pickup' | 'deliver'
    // pickup = ไปรับผ้าจากลูกค้า
    // deliver = ส่งผ้าคืนลูกค้า
  }>()

  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const isPickup = type === 'pickup'

  const title = isPickup ? '📦 ยืนยันรับผ้า' : '✅ ยืนยันส่งผ้าคืน'
  const desc = isPickup
    ? 'กดยืนยันเมื่อรับผ้าจากลูกค้าแล้ว'
    : 'กดยืนยันเมื่อส่งผ้าคืนลูกค้าแล้ว'
  const newStatus = isPickup ? 'washing' : 'delivered'
  const btnLabel = isPickup ? 'ยืนยันรับผ้าแล้ว ✓' : 'ยืนยันส่งผ้าคืนแล้ว ✓'
  const btnColor = isPickup ? '#1D9E75' : '#3B82F6'

  const handleConfirm = async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    const updateData: any = {
      status: newStatus,
      employee_id: user?.id,
    }

    if (!isPickup) {
      // ส่งคืน — บันทึกเวลา
      updateData.delivered_at = new Date().toISOString()
      updateData.pickup_confirmed_at = new Date().toISOString()
    }

    if (note.trim()) {
      updateData.note = note.trim()
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)

    setLoading(false)

    if (error) {
      Alert.alert('เกิดข้อผิดพลาด', error.message)
      return
    }

    Alert.alert(
      '✅ สำเร็จ',
      isPickup
        ? 'รับผ้าเรียบร้อย เริ่มซักได้เลย!'
        : 'ส่งผ้าคืนลูกค้าเรียบร้อย!',
      [{ text: 'กลับหน้าหลัก', onPress: () => router.replace('/(rider)/dashboard' as any) }]
    )
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← กลับ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>

        {/* ข้อมูลออเดอร์ */}
        <View style={styles.orderCard}>
          <Text style={styles.orderLabel}>ออเดอร์</Text>
          <Text style={styles.orderNum}>#{orderNumber}</Text>
        </View>

        {/* คำอธิบาย */}
        <View style={[styles.infoCard, { borderLeftColor: btnColor }]}>
          <Text style={styles.infoTitle}>{title}</Text>
          <Text style={styles.infoDesc}>{desc}</Text>
        </View>

        {/* Checklist */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isPickup ? '📋 เช็คลิสต์ก่อนรับผ้า' : '📋 เช็คลิสต์ก่อนส่งผ้า'}
          </Text>
          {(isPickup
            ? [
                'นับจำนวนผ้าตรงกับออเดอร์',
                'ตรวจสอบสภาพผ้าก่อนรับ',
                'แจ้งลูกค้าว่ารับผ้าแล้ว',
                'บันทึกเวลารับผ้า',
              ]
            : [
                'ผ้าสะอาดและพับเรียบร้อย',
                'นับจำนวนผ้าครบถ้วน',
                'ส่งถึงมือลูกค้าโดยตรง',
                'ให้ลูกค้าตรวจสอบผ้า',
              ]
          ).map((item, i) => (
            <View key={i} style={styles.checkItem}>
              <Text style={styles.checkIcon}>☑️</Text>
              <Text style={styles.checkText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* หมายเหตุ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📝 หมายเหตุ (ถ้ามี)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="เช่น ผ้ามีรอยเปื้อนก่อนรับ, ลูกค้าไม่อยู่บ้าน..."
            placeholderTextColor="#B4B2A9"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* เวลา */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🕐 เวลาดำเนินการ</Text>
          <Text style={styles.timeText}>
            {new Date().toLocaleString('th-TH', {
              day: '2-digit', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>

      </ScrollView>

      {/* ปุ่มยืนยัน */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            { backgroundColor: btnColor },
            loading && { opacity: 0.6 },
          ]}
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.confirmBtnText}>{btnLabel}</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelBtnText}>ยกเลิก</Text>
        </TouchableOpacity>
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
  orderCard: {
    backgroundColor: '#2C2C2A', borderRadius: 14,
    padding: 16, marginBottom: 12, alignItems: 'center',
  },
  orderLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
  orderNum: { fontSize: 24, fontWeight: '700', color: '#fff' },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    marginBottom: 12, borderLeftWidth: 4,
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#2C2C2A', marginBottom: 4 },
  infoDesc: { fontSize: 13, color: '#888780' },
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 16, marginBottom: 12,
  },
  cardTitle: {
    fontSize: 13, fontWeight: '600', color: '#888780', marginBottom: 12,
  },
  checkItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0',
  },
  checkIcon: { fontSize: 16 },
  checkText: { fontSize: 13, color: '#2C2C2A', flex: 1 },
  noteInput: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#2C2C2A',
    backgroundColor: '#FAFAFA', minHeight: 80,
  },
  timeText: { fontSize: 14, color: '#2C2C2A', fontWeight: '500' },
  footer: {
    padding: 16, backgroundColor: '#fff',
    borderTopWidth: 0.5, borderTopColor: '#E0E0E0', gap: 8,
  },
  confirmBtn: {
    borderRadius: 12, paddingVertical: 15, alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingVertical: 10, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, color: '#888780' },
})
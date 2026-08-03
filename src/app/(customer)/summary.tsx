import * as Location from 'expo-location'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../../../lib/supabase'
import { pickPhoto, uploadOrderPhoto } from '../../../lib/uploadPhoto'

const ITEM_LABELS: Record<string, string> = {
  shirt: 'เสื้อผ้า',
  pant: 'กางเกง',
  underwear: 'ชุดชั้นใน',
  bedsheet: 'ผ้าปูที่นอน',
}

const ITEM_PRICES: Record<string, number> = {
  shirt: 9, pant: 9, underwear: 3, bedsheet: 20,
}

const PRODUCT_NAMES: Record<string, string> = {
  p1: 'น้ำยาซักของร้าน',
  p2: 'Bleach',
  p3: 'Comfort',
}

const PRODUCT_PRICES: Record<string, number> = {
  p1: 10, p2: 10, p3: 15,
}

export default function SummaryScreen() {
  const { packageId, quantities, productId, totalPrice } = useLocalSearchParams()

  const parsedQty: Record<string, number> = quantities
    ? JSON.parse(quantities as string)
    : {}

  const [address, setAddress]           = useState('')
  const [noteText, setNoteText]         = useState('')
  const [lat, setLat]                   = useState<number | null>(null)
  const [lng, setLng]                   = useState<number | null>(null)
  const [locLoading, setLocLoading]     = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [draftAddress, setDraftAddress] = useState('')
  const [photoUri, setPhotoUri]         = useState<string | null>(null)

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSavedAddress()
  }, [])

  const loadSavedAddress = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('profiles')
      .select('default_address, default_lat, default_lng')
      .eq('id', user.id)
      .single()

    if (data?.default_address) {
      setAddress(data.default_address)
      setLat(data.default_lat ?? null)
      setLng(data.default_lng ?? null)
    }
  }

  const handleUseGPS = async () => {
    setLocLoading(true)
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync()
      if (!servicesEnabled) {
        Alert.alert(
          'GPS ปิดอยู่',
          'กรุณาเปิด Location Services ในการตั้งค่าเครื่องก่อนใช้งาน',
          [
            { text: 'ยกเลิก', style: 'cancel' },
            { text: 'เปิดการตั้งค่า', onPress: () => Linking.openSettings() },
          ]
        )
        setLocLoading(false)
        return
      }

      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'ไม่ได้รับอนุญาต',
          'กรุณาอนุญาตให้แอปเข้าถึงตำแหน่งในการตั้งค่า',
          [
            { text: 'ยกเลิก', style: 'cancel' },
            { text: 'เปิดการตั้งค่า', onPress: () => Linking.openSettings() },
          ]
        )
        setLocLoading(false)
        return
      }

      let loc = await Location.getLastKnownPositionAsync()
      if (!loc) {
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Lowest,
        })
      }
      const { latitude, longitude } = loc.coords
      setLat(latitude)
      setLng(longitude)

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=th`,
          { headers: { 'User-Agent': 'UniWashApp/1.0' } }
        )
        const json = await res.json()
        if (json?.display_name) {
          setAddress(json.display_name)
        } else {
          setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
        }
      } catch {
        setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
      }
    } catch (err: any) {
      Alert.alert('เกิดข้อผิดพลาด', err?.message ?? String(err))
    }
    setLocLoading(false)
  }

  const saveAddressToProfile = async (addr: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('profiles')
      .update({
        default_address: addr,
        default_lat: lat,
        default_lng: lng,
      })
      .eq('id', user.id)
  }

  const handleEditConfirm = async () => {
    const trimmed = draftAddress.trim()
    if (!trimmed) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกที่อยู่')
      return
    }
    setAddress(trimmed)
    setLat(null)
    setLng(null)
    setEditModalVisible(false)
    await saveAddressToProfile(trimmed)
  }

  const handlePickPhoto = async () => {
    try {
      const uri = await pickPhoto(false)
      if (uri) setPhotoUri(uri)
    } catch (err: any) {
      Alert.alert('เกิดข้อผิดพลาด', err?.message ?? String(err))
    }
  }

  const handleConfirm = async () => {
    if (!address.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณากำหนดที่อยู่จัดส่งก่อน')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      Alert.alert('Error', 'กรุณาเข้าสู่ระบบใหม่')
      setLoading(false)
      return
    }

    const orderNumber = 'OD' + Date.now().toString().slice(-4)

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: user.id,
        package_id: packageId,
        status: 'pending',
        total_price: Number(totalPrice),
        delivery_address: address.trim(),
        delivery_note: noteText.trim() || null,
        delivery_lat: lat,
        delivery_lng: lng,
      })
      .select()
      .single()

    if (error) {
      Alert.alert('Error', error.message)
      setLoading(false)
      return
    }

    const items = Object.entries(parsedQty)
      .filter(([_, qty]) => qty > 0)
      .map(([type, qty]) => ({
        order_id: order.id,
        item_type: type,
        quantity: qty,
        price_per_item: ITEM_PRICES[type] || 0,
      }))

    await supabase.from('order_items').insert(items)

    // หักเหรียญแบบ atomic ฝั่ง DB — ถ้าเหรียญไม่พอจะ error และยกเลิกออเดอร์
    const { error: payErr } = await supabase.rpc('pay_order_with_coins', {
      p_order_id: order.id,
    })

    if (payErr) {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
      setLoading(false)
      Alert.alert('ชำระเงินไม่สำเร็จ', payErr.message, [
        { text: 'ปิด', style: 'cancel' },
        { text: '🪙 ไปเติมเหรียญ', onPress: () => router.push('/(customer)/coins' as any) },
      ])
      return
    }

    // อัปโหลดรูปตะกร้าผ้าของลูกค้า (ถ้ามี) — พลาดได้โดยไม่ล้มออเดอร์
    if (photoUri) {
      try {
        await uploadOrderPhoto(order.id, 'customer', photoUri)
      } catch {}
    }

    await saveAddressToProfile(address.trim())

    setLoading(false)

    router.replace({
      pathname: '/(customer)/status' as any,
      params: { orderId: order.id, orderNumber },
    })
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backChip} onPress={() => router.back()}>
          <Text style={styles.backChipText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>สรุปรายการ</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.content}>

        {/* รายละเอียดแพ็กเกจ — ตารางตามม็อกอัป */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>รายละเอียดแพ็กเกจ</Text>
          <View style={styles.tableHead}>
            <Text style={[styles.thText, { flex: 1 }]}>ชนิด</Text>
            <Text style={[styles.thText, { width: 56, textAlign: 'center' }]}>จำนวน</Text>
            <Text style={[styles.thText, { width: 64, textAlign: 'right' }]}>ราคา</Text>
          </View>
          {Object.entries(parsedQty)
            .filter(([_, qty]) => qty > 0)
            .map(([type, qty]) => (
              <View key={type} style={styles.sumRow}>
                <Text style={styles.sumLabel}>{ITEM_LABELS[type]}</Text>
                <Text style={styles.sumQty}>{qty}</Text>
                <Text style={styles.sumPrice}>{qty * ITEM_PRICES[type]} THB</Text>
              </View>
            ))}
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>{PRODUCT_NAMES[productId as string]}</Text>
            <Text style={styles.sumQty}>1</Text>
            <Text style={styles.sumPrice}>{PRODUCT_PRICES[productId as string]} THB</Text>
          </View>
        </View>

        {/* เพิ่มรายละเอียด */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>เพิ่ม รายละเอียด</Text>
          <Text style={styles.cardSub}>โปรดระบุรายละเอียดที่ต้องการเพิ่มเติม</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="เช่น ห้อง 302 ชั้น 3 กดกริ่งหน้าประตู"
            placeholderTextColor="#B4B2A9"
            value={noteText}
            onChangeText={setNoteText}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* อัพโหลดรูปภาพ ตามม็อกอัป */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>อัพโหลดรูปภาพ</Text>
          <Text style={styles.cardSub}>ถ่ายรูปตะกร้าผ้าของคุณเพื่อยืนยันจำนวน</Text>
          <TouchableOpacity style={styles.uploadCircleWrap} onPress={handlePickPhoto}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.uploadPreview} />
            ) : (
              <View style={styles.uploadCircle}>
                <Text style={{ fontSize: 22 }}>📷</Text>
                <Text style={styles.uploadCircleText}>เพิ่ม</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ที่อยู่ */}
        <View style={styles.card}>
          <View style={styles.addrHeader}>
            <Text style={{ fontSize: 16 }}>📍</Text>
            <Text style={styles.cardTitle}>ที่อยู่</Text>
          </View>

          {address ? (
            <View style={styles.addrRow}>
              <View style={styles.addrIcon}>
                <Text style={{ fontSize: 18 }}>🏠</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addrLabel}>บ้าน (ค่าเริ่มต้น)</Text>
                <Text style={styles.addressText} numberOfLines={2}>{address}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.addressPlaceholder}>ยังไม่ได้กำหนดที่อยู่</Text>
          )}

          <TouchableOpacity
            style={styles.changeAddrBtn}
            onPress={() => {
              setDraftAddress(address)
              setEditModalVisible(true)
            }}
          >
            <Text style={styles.changeAddrText}>เปลี่ยนที่อยู่จัดส่ง</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gpsBtn} onPress={handleUseGPS} disabled={locLoading}>
            {locLoading
              ? <ActivityIndicator color="#1C8A99" size="small" />
              : <Text style={styles.gpsBtnText}>📡 ใช้ตำแหน่งปัจจุบัน (GPS)</Text>
            }
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <Text style={styles.footerLabel}>สรุปค่าใช้จ่าย{'\n'}ยอดรวมทั้งสิ้น</Text>
          <Text style={styles.footerPrice}>{totalPrice} THB</Text>
        </View>
        <TouchableOpacity
          style={[styles.btnPrimary, (loading || !address) && styles.btnDisabled]}
          onPress={handleConfirm}
          disabled={loading || !address}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>ยืนยัน</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Modal แก้ที่อยู่ */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>กรอกที่อยู่จัดส่ง</Text>
            <Text style={styles.modalSub}>
              พิมพ์ชื่ออาคาร ห้อง ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="เช่น 123 ถ.รัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพฯ 10400"
              placeholderTextColor="#B4B2A9"
              value={draftAddress}
              onChangeText={setDraftAddress}
              multiline
              numberOfLines={4}
              autoFocus
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnConfirm}
                onPress={handleEditConfirm}
              >
                <Text style={styles.modalBtnConfirmText}>บันทึก</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#1B1C2A' },
  cardSub: { fontSize: 11.5, color: '#8A8F98', marginTop: 2, marginBottom: 10 },

  tableHead: {
    flexDirection: 'row', paddingVertical: 8, marginTop: 8,
    borderBottomWidth: 1, borderBottomColor: '#E6E8EB',
  },
  thText: { fontSize: 11.5, color: '#8A8F98', fontWeight: '600' },
  sumRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0',
  },
  sumLabel: { flex: 1, fontSize: 13, color: '#1B1C2A' },
  sumQty: { width: 56, textAlign: 'center', fontSize: 13, color: '#8A8F98' },
  sumPrice: { width: 64, textAlign: 'right', fontSize: 13, fontWeight: '500', color: '#1B1C2A' },

  noteInput: {
    borderWidth: 1, borderColor: '#E6E8EB', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, color: '#1B1C2A', backgroundColor: '#FAFAFA',
    textAlignVertical: 'top', minHeight: 70,
  },

  uploadCircleWrap: { alignItems: 'center', paddingVertical: 6 },
  uploadCircle: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#EEF1F4', borderWidth: 1.5, borderColor: '#E6E8EB',
    alignItems: 'center', justifyContent: 'center',
  },
  uploadCircleText: { fontSize: 11, color: '#8A8F98', marginTop: 2 },
  uploadPreview: { width: 120, height: 120, borderRadius: 14 },

  addrHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  addrRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  addrIcon: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#E3F1F3',
    alignItems: 'center', justifyContent: 'center',
  },
  addrLabel: { fontSize: 13, fontWeight: '600', color: '#1B1C2A' },
  addressText: { fontSize: 12, color: '#8A8F98', lineHeight: 17, marginTop: 2 },
  addressPlaceholder: {
    fontSize: 13, color: '#B4B2A9', marginBottom: 12, fontStyle: 'italic',
  },
  changeAddrBtn: {
    backgroundColor: '#F5A04C', borderRadius: 20,
    paddingVertical: 9, alignItems: 'center', marginBottom: 8,
  },
  changeAddrText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  gpsBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#1C8A99', borderRadius: 10,
    paddingVertical: 10,
  },
  gpsBtnText: { fontSize: 13, color: '#1C8A99', fontWeight: '600' },

  footer: {
    padding: 16, backgroundColor: '#fff',
    borderTopWidth: 0.5, borderTopColor: '#E6E8EB',
  },
  footerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  footerLabel: { fontSize: 12, color: '#8A8F98', lineHeight: 18 },
  footerPrice: { fontSize: 20, fontWeight: '800', color: '#1B1C2A' },
  btnPrimary: { backgroundColor: '#1C8A99', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1B1C2A', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#8A8F98', marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5, borderColor: '#E6E8EB', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#1B1C2A', backgroundColor: '#FAFAFA',
    textAlignVertical: 'top', minHeight: 90, marginBottom: 20,
  },
  modalBtnRow: { flexDirection: 'row', gap: 10 },
  modalBtnCancel: {
    flex: 1, borderWidth: 1.5, borderColor: '#E6E8EB',
    borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  modalBtnCancelText: { fontSize: 15, color: '#8A8F98' },
  modalBtnConfirm: {
    flex: 1, backgroundColor: '#1C8A99',
    borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  modalBtnConfirmText: { fontSize: 15, color: '#fff', fontWeight: '600' },
})

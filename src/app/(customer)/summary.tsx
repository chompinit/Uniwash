import * as Location from 'expo-location'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
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
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← กลับ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>สรุปการสั่ง</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>

        {}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>รายละเอียดแพ็กเกจ</Text>
          {Object.entries(parsedQty)
            .filter(([_, qty]) => qty > 0)
            .map(([type, qty]) => (
              <View key={type} style={styles.sumRow}>
                <Text style={styles.sumLabel}>{ITEM_LABELS[type]}</Text>
                <Text style={styles.sumQty}>{qty} ชิ้น</Text>
                <Text style={styles.sumPrice}>{qty * ITEM_PRICES[type]} บาท</Text>
              </View>
            ))}
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>{PRODUCT_NAMES[productId as string]}</Text>
            <Text style={styles.sumQty}>1</Text>
            <Text style={styles.sumPrice}>{PRODUCT_PRICES[productId as string]} บาท</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>ยอดรวม</Text>
            <Text style={styles.totalPrice}>{totalPrice} บาท</Text>
          </View>
        </View>

        {}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>📍 ที่อยู่จัดส่ง</Text>
            {address ? (
              <TouchableOpacity
                onPress={() => {
                  setDraftAddress(address)
                  setEditModalVisible(true)
                }}
              >
                <Text style={styles.editLink}>แก้ไข</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {}
          {address ? (
            <View style={styles.addressBox}>
              <Text style={styles.addressText}>{address}</Text>
              {lat && lng ? (
                <Text style={styles.coordText}>
                  📌 {lat.toFixed(5)}, {lng.toFixed(5)}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.addressPlaceholder}>ยังไม่ได้กำหนดที่อยู่</Text>
          )}

          {}
          <TouchableOpacity
            style={styles.gpsBtn}
            onPress={handleUseGPS}
            disabled={locLoading}
          >
            {locLoading
              ? <ActivityIndicator color="#1D9E75" size="small" />
              : <Text style={styles.gpsBtnText}>📡 ใช้ตำแหน่งปัจจุบัน (GPS)</Text>
            }
          </TouchableOpacity>

          {}
          <TouchableOpacity
            style={styles.typeBtn}
            onPress={() => {
              setDraftAddress(address)
              setEditModalVisible(true)
            }}
          >
            <Text style={styles.typeBtnText}>✏️ พิมพ์ที่อยู่เอง</Text>
          </TouchableOpacity>

          {}
          <Text style={[styles.cardTitle, { marginTop: 14, marginBottom: 6 }]}>
            หมายเหตุสำหรับคนส่ง (ไม่บังคับ)
          </Text>
          <TextInput
            style={styles.noteInput}
            placeholder="เช่น ห้อง 302 ชั้น 3 กดกริ่งหน้าประตู"
            placeholderTextColor="#B4B2A9"
            value={noteText}
            onChangeText={setNoteText}
            multiline
            numberOfLines={2}
          />
        </View>

        {}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 ชำระด้วย</Text>
          <Text style={styles.payText}>เหรียญในระบบ</Text>
        </View>

      </ScrollView>

      {}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <Text style={styles.footerLabel}>ยอดชำระ</Text>
          <Text style={styles.footerPrice}>{totalPrice} บาท</Text>
        </View>
        <TouchableOpacity
          style={[styles.btnPrimary, (loading || !address) && styles.btnDisabled]}
          onPress={handleConfirm}
          disabled={loading || !address}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>ยืนยันการสั่งซื้อ ✓</Text>
          }
        </TouchableOpacity>
      </View>

      {}
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
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    backgroundColor: '#fff', padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0',
  },
  backText: { fontSize: 15, color: '#1D9E75' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#2C2C2A' },
  content: { flex: 1, padding: 16 },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#888780' },
  editLink: { fontSize: 13, color: '#1D9E75', fontWeight: '600' },

  sumRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0',
  },
  sumLabel: { flex: 1, fontSize: 13, color: '#2C2C2A' },
  sumQty: { fontSize: 13, color: '#888780', marginRight: 16 },
  sumPrice: { fontSize: 13, fontWeight: '500', color: '#2C2C2A' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 },
  totalLabel: { fontSize: 15, fontWeight: '600', color: '#2C2C2A' },
  totalPrice: { fontSize: 18, fontWeight: '700', color: '#1D9E75' },

  addressBox: {
    backgroundColor: '#F0FBF6', borderRadius: 10, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#B2DFCF',
  },
  addressText: { fontSize: 14, color: '#2C2C2A', lineHeight: 20 },
  coordText: { fontSize: 11, color: '#1D9E75', marginTop: 4 },
  addressPlaceholder: {
    fontSize: 13, color: '#B4B2A9', marginBottom: 10,
    fontStyle: 'italic',
  },
  gpsBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#1D9E75', borderRadius: 10,
    paddingVertical: 11, marginBottom: 8,
  },
  gpsBtnText: { fontSize: 14, color: '#1D9E75', fontWeight: '600' },
  typeBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10,
    paddingVertical: 11,
  },
  typeBtnText: { fontSize: 14, color: '#888780', fontWeight: '500' },
  noteInput: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, color: '#2C2C2A', backgroundColor: '#FAFAFA',
    textAlignVertical: 'top',
  },
  
  payText: { fontSize: 14, color: '#2C2C2A' },

  footer: {
    padding: 16, backgroundColor: '#fff',
    borderTopWidth: 0.5, borderTopColor: '#E0E0E0',
  },
  footerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  footerLabel: { fontSize: 14, color: '#888780' },
  footerPrice: { fontSize: 22, fontWeight: '700', color: '#1D9E75' },
  btnPrimary: { backgroundColor: '#1D9E75', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#2C2C2A', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#888780', marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#2C2C2A', backgroundColor: '#FAFAFA',
    textAlignVertical: 'top', minHeight: 90, marginBottom: 20,
  },
  modalBtnRow: { flexDirection: 'row', gap: 10 },
  modalBtnCancel: {
    flex: 1, borderWidth: 1.5, borderColor: '#E0E0E0',
    borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  modalBtnCancelText: { fontSize: 15, color: '#888780' },
  modalBtnConfirm: {
    flex: 1, backgroundColor: '#1D9E75',
    borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  modalBtnConfirmText: { fontSize: 15, color: '#fff', fontWeight: '600' },
})

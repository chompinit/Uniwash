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
type LaundryItem = { id: string; name: string; price: number }
type ClothingItem = { id: string; name: string; price: number }
type SavedAddress = { id: string; label: string; address: string; latitude: number | null; longitude: number | null }
type CurrentLoc = { address: string; lat: number; lng: number }

const LABEL_TH: Record<string, string> = { HOME: 'บ้าน', WORK: 'ที่ทำงาน' }

export default function SummaryScreen() {
  const { packageId, quantities, laundryId, softenerId, totalPrice } = useLocalSearchParams()
  const parsedQty: Record<string, number> = quantities
    ? JSON.parse(quantities as string)
    : {}
  const [clothingItems, setClothingItems] = useState<Record<string, ClothingItem>>({})
  const [laundryItem, setLaundryItem] = useState<LaundryItem | null>(null)
  const [softenerItem, setSoftenerItem] = useState<LaundryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddrId, setSelectedAddrId] = useState<string>('')
  const [currentLoc, setCurrentLoc] = useState<CurrentLoc | null>(null)
  const [locating, setLocating] = useState(false)
  const [coins, setCoins] = useState(0)
  const [noteText, setNoteText] = useState('')
  const [photo, setPhoto] = useState<{ uri: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'qr' | 'coins'>('qr')
  useEffect(() => {
    fetchProducts()
  }, [])
  const fetchProducts = async () => {
    try {
      // Get clothing items
      const clothingIds = Object.keys(parsedQty).filter(id => parsedQty[id] > 0)
      if (clothingIds.length > 0) {
        const { data: clothingData } = await supabase
          .from('clothing_items')
          .select('id, name, price')
          .in('id', clothingIds)
        const clothingMap: Record<string, ClothingItem> = {}
        clothingData?.forEach(item => {
          clothingMap[item.id] = item
        })
        setClothingItems(clothingMap)
      }
      // Get laundry item (น้ำยาซักผ้า)
      if (laundryId) {
        const { data: laundryData } = await supabase
          .from('laundry_items')
          .select('id, name, price')
          .eq('id', laundryId as string)
          .single()
        if (laundryData) {
          setLaundryItem(laundryData)
        }
      }
      // Get softener item (น้ำยาปรับผ้านุ่ม)
      if (softenerId) {
        const { data: softenerData } = await supabase
          .from('laundry_items')
          .select('id, name, price')
          .eq('id', softenerId as string)
          .single()
        if (softenerData) {
          setSoftenerItem(softenerData)
        }
      }
      // ที่อยู่จากโปรไฟล์ + ยอดเหรียญ
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const [addrRes, profRes] = await Promise.all([
          supabase.from('addresses').select('id, label, address, latitude, longitude, is_default')
            .eq('user_id', user.id).order('is_default', { ascending: false }),
          supabase.from('profiles').select('coins').eq('id', user.id).single(),
        ])
        const addrs = (addrRes.data as (SavedAddress & { is_default: boolean })[]) || []
        setSavedAddresses(addrs)
        if (addrs.length > 0) setSelectedAddrId(addrs[0].id)
        setCoins(profRes.data?.coins ?? 0)
      }
    } catch (error: any) {
      Alert.alert('Error', error.message)
    } finally {
      setLoading(false)
    }
  }
  const handleAddPhoto = async () => {
    try {
      const result = await pickPhoto()
      if (result) {
        setPhoto({ uri: result })
      }
    } catch (error: any) {
      Alert.alert('Error', error.message)
    }
  }

  const useCurrentLocation = async () => {
    setLocating(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('ไม่ได้รับอนุญาต', 'กรุณาอนุญาตการเข้าถึงตำแหน่ง')
        return
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      let addrText = `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`
      try {
        const geo = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude, longitude: loc.coords.longitude,
        })
        const g = geo?.[0]
        if (g) {
          const parts = [g.name, g.street, (g as any).subdistrict ?? g.district, g.city, g.region].filter(Boolean)
          if (parts.length) addrText = parts.join(' ')
        }
      } catch {}
      setCurrentLoc({ address: addrText, lat: loc.coords.latitude, lng: loc.coords.longitude })
      setSelectedAddrId('current')
    } catch (e: any) {
      Alert.alert('Error', 'ดึงตำแหน่งไม่สำเร็จ: ' + e.message)
    } finally {
      setLocating(false)
    }
  }

  const getDelivery = (): { address: string; lat: number | null; lng: number | null } | null => {
    if (selectedAddrId === 'current') {
      return currentLoc ? { address: currentLoc.address, lat: currentLoc.lat, lng: currentLoc.lng } : null
    }
    const a = savedAddresses.find(x => x.id === selectedAddrId)
    return a ? { address: a.address, lat: a.latitude, lng: a.longitude } : null
  }
  // ตรวจก่อนเปิดหน้าชำระเงิน: ต้องมีรูป 1 รูป + ที่อยู่
  const validateBeforePay = () => {
    if (!photo) {
      Alert.alert('ต้องมีรูปถ่าย', 'กรุณาถ่ายหรือเลือกรูปตะกร้าผ้า 1 รูปก่อนสั่งซื้อ')
      return false
    }
    const d = getDelivery()
    if (!d || !d.address.trim()) {
      Alert.alert('ต้องมีที่อยู่', 'กรุณาเลือกที่อยู่จัดส่ง')
      return false
    }
    return true
  }

  const handleConfirmOrder = async () => {
    const d = getDelivery()
    if (!photo || !d) { validateBeforePay(); return }
    try {
      setUploading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const total = parseInt(totalPrice as string)

      // ชำระด้วยเหรียญ → หักก่อนสร้างออเดอร์
      if (paymentMethod === 'coins') {
        if (coins < total) {
          Alert.alert('เหรียญไม่พอ', `ต้องใช้ ${total} เหรียญ แต่มี ${coins}`)
          setUploading(false)
          return
        }
        const { data: paid, error: payErr } = await supabase.rpc('deduct_coins', { p_user_id: user.id, p_amount: total })
        if (payErr || paid === false) {
          Alert.alert('ชำระไม่สำเร็จ', payErr?.message ?? 'เหรียญไม่เพียงพอ')
          setUploading(false)
          return
        }
      }

      const orderNumber = 'UW' + Date.now().toString().slice(-9)
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          customer_id: user.id,
          package_id: packageId,
          order_number: orderNumber,
          total_price: total,
          status: 'pending',
          delivery_address: d.address,
          delivery_note: noteText || null,
          delivery_lat: d.lat,
          delivery_lng: d.lng,
          paid_at: new Date().toISOString(),
        }])
        .select()
        .single()
      if (orderError) throw orderError

      // รายการ: เสื้อผ้า + น้ำยาซักผ้า + น้ำยาปรับผ้านุ่ม
      const items: any[] = Object.entries(parsedQty)
        .filter(([, qty]) => qty > 0)
        .map(([itemId, qty]) => ({
          order_id: orderData.id,
          item_type: clothingItems[itemId]?.name ?? 'เสื้อผ้า',
          quantity: qty,
          price_per_item: clothingItems[itemId]?.price ?? 0,
        }))
      if (laundryItem) items.push({ order_id: orderData.id, item_type: laundryItem.name, quantity: 1, price_per_item: laundryItem.price })
      if (softenerItem) items.push({ order_id: orderData.id, item_type: softenerItem.name, quantity: 1, price_per_item: softenerItem.price })

      const { error: itemsError } = await supabase.from('order_items').insert(items)
      if (itemsError) throw itemsError

      // อัปโหลดรูปตะกร้าผ้า (บังคับ — ผ่าน validate แล้ว)
      try {
        await uploadOrderPhoto(orderData.id, 'customer', photo.uri)
      } catch (photoErr: any) {
        console.error('Photo upload error:', photoErr)
      }

      setModalVisible(false)
      Alert.alert('สำเร็จ', 'สร้างออเดอร์เรียบร้อย', [
        {
          text: 'ดูรายละเอียด',
          onPress: () =>
            router.replace({
              pathname: '/(customer)/order-detail' as any,
              params: { orderId: orderData.id },
            }),
        },
      ])
    } catch (error: any) {
      Alert.alert('Error', error.message)
    } finally {
      setUploading(false)
    }
  }
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1C8A99" />
      </View>
    )
  }
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>สรุปรายการ</Text>
          <View style={{ width: 30 }} />
        </View>
        {}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>รูปถ่ายตะกร้าผ้า (จำเป็น)</Text>
          {photo ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photo.uri }} style={styles.photo} />
              <TouchableOpacity
                style={styles.deletePhotoBtn}
                onPress={() => setPhoto(null)}
              >
                <Text style={styles.deletePhotoBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addPhotoBtn}
              onPress={handleAddPhoto}
            >
              <Text style={styles.addPhotoBtnText}>📷 เพิ่มรูปถ่าย</Text>
            </TouchableOpacity>
          )}
        </View>
        {}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>เสื้อกางเกง</Text>
          {Object.entries(parsedQty).map(([itemId, qty]) =>
            qty > 0 && clothingItems[itemId] ? (
              <View key={itemId} style={styles.itemRow}>
                <Text style={styles.itemName}>{clothingItems[itemId].name}</Text>
                <View style={styles.itemQtyPrice}>
                  <Text style={styles.qty}>x{qty}</Text>
                  <Text style={styles.price}>
                    ฿{clothingItems[itemId].price * qty}
                  </Text>
                </View>
              </View>
            ) : null
          )}
        </View>
        {}
        {(laundryItem || softenerItem) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>น้ำยา</Text>
            {laundryItem && (
              <View style={styles.itemRow}>
                <Text style={styles.itemName}>น้ำยาซักผ้า: {laundryItem.name}</Text>
                <Text style={styles.price}>฿{laundryItem.price}</Text>
              </View>
            )}
            {softenerItem && (
              <View style={styles.itemRow}>
                <Text style={styles.itemName}>ปรับผ้านุ่ม: {softenerItem.name}</Text>
                <Text style={styles.price}>฿{softenerItem.price}</Text>
              </View>
            )}
          </View>
        )}
        {}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ที่อยู่จัดส่ง</Text>
          {savedAddresses.map(a => (
            <TouchableOpacity
              key={a.id}
              style={[styles.addrOption, selectedAddrId === a.id && styles.addrOptionSel]}
              onPress={() => setSelectedAddrId(a.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.radioOuter, selectedAddrId === a.id && styles.radioOuterSel]}>
                {selectedAddrId === a.id && <View style={styles.radioDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addrLabel}>{LABEL_TH[a.label] || a.label}</Text>
                <Text style={styles.addrText}>{a.address}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {currentLoc && (
            <TouchableOpacity
              style={[styles.addrOption, selectedAddrId === 'current' && styles.addrOptionSel]}
              onPress={() => setSelectedAddrId('current')}
              activeOpacity={0.7}
            >
              <View style={[styles.radioOuter, selectedAddrId === 'current' && styles.radioOuterSel]}>
                {selectedAddrId === 'current' && <View style={styles.radioDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addrLabel}>📍 ตำแหน่งปัจจุบัน</Text>
                <Text style={styles.addrText}>{currentLoc.address}</Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.gpsBtn} onPress={useCurrentLocation} disabled={locating}>
            <Text style={styles.gpsBtnText}>{locating ? 'กำลังดึงตำแหน่ง...' : '📍 ใช้ตำแหน่งปัจจุบัน'}</Text>
          </TouchableOpacity>
          {savedAddresses.length === 0 && !currentLoc && (
            <Text style={styles.addrHint}>ยังไม่มีที่อยู่ที่บันทึกไว้ — เพิ่มที่หน้าโปรไฟล์ หรือกดใช้ตำแหน่งปัจจุบัน</Text>
          )}
        </View>
        {}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>หมายเหตุ (ไม่บังคับ)</Text>
          <TextInput
            style={styles.input}
            placeholder="เช่น อยากใช้น้ำอย่าง, หลีกเลี่ยงการตากแดด"
            value={noteText}
            onChangeText={setNoteText}
            multiline
          />
        </View>
        {}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>รวมทั้งสิ้น</Text>
            <Text style={styles.totalPrice}>฿{totalPrice}</Text>
          </View>
        </View>
        {}
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={() => { if (validateBeforePay()) setModalVisible(true) }}
          disabled={uploading}
        >
          <Text style={styles.confirmBtnText}>
            {uploading ? 'กำลังบันทึก...' : 'ยืนยันการสั่งซื้อ'}
          </Text>
        </TouchableOpacity>
        <View style={{ height: 30 }} />
      </ScrollView>
      {}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>เลือกวิธีชำระเงิน</Text>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'qr' && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod('qr')}
            >
              <Text style={styles.paymentOptionText}>QR Code (PayPromptPay)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'coins' && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod('coins')}
            >
              <Text style={styles.paymentOptionText}>คอยน์ของฉัน</Text>
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handleConfirmOrder}
              >
                <Text style={styles.modalBtnConfirmText}>ตกลง</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1C8A99',
  },
  backText: { fontSize: 26, color: '#fff', fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '600', color: '#fff' },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12, color: '#333' },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  itemName: { fontSize: 13, color: '#666' },
  itemQtyPrice: { flexDirection: 'row', gap: 12 },
  qty: { fontSize: 13, color: '#999' },
  price: { fontSize: 13, fontWeight: '600', color: '#1C8A99' },
  addPhotoBtn: {
    backgroundColor: '#e3f1f3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addPhotoBtnText: { fontSize: 16, color: '#1C8A99', fontWeight: '600' },
  photoContainer: { position: 'relative' },
  photo: { width: '100%', height: 200, borderRadius: 8 },
  deletePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ff6b6b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePhotoBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    fontSize: 13,
  },
  addrOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#E6E8EB', borderRadius: 10,
    padding: 12, marginBottom: 8,
  },
  addrOptionSel: { borderColor: '#1C8A99', backgroundColor: '#E3F1F3' },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D5D8DC',
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterSel: { borderColor: '#1C8A99' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1C8A99' },
  addrLabel: { fontSize: 14, fontWeight: '700', color: '#1B1C2A' },
  addrText: { fontSize: 12, color: '#8A8F98', marginTop: 2 },
  gpsBtn: {
    backgroundColor: '#E3F1F3', borderRadius: 10, paddingVertical: 12,
    alignItems: 'center', marginTop: 4,
  },
  gpsBtnText: { color: '#1C8A99', fontWeight: '700', fontSize: 13 },
  addrHint: { fontSize: 12, color: '#8A8F98', marginTop: 8 },
  totalSection: { padding: 16, backgroundColor: '#f5f5f5' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#333' },
  totalPrice: { fontSize: 24, fontWeight: '700', color: '#1C8A99' },
  confirmBtn: {
    backgroundColor: '#15707D',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 20, color: '#333' },
  paymentOption: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  paymentOptionSelected: { borderColor: '#1C8A99', backgroundColor: '#e3f1f3' },
  paymentOptionText: { fontSize: 16, color: '#333', fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
  },
  modalBtnText: { fontSize: 16, fontWeight: '600', color: '#333' },
  modalBtnConfirm: { backgroundColor: '#1C8A99' },
  modalBtnConfirmText: { fontSize: 16, fontWeight: '600', color: '#fff' },
})

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
export default function SummaryScreen() {
  const { packageId, quantities, laundryId, totalPrice } = useLocalSearchParams()
  const parsedQty: Record<string, number> = quantities
    ? JSON.parse(quantities as string)
    : {}
  const [clothingItems, setClothingItems] = useState<Record<string, ClothingItem>>({})
  const [laundryItem, setLaundryItem] = useState<LaundryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [address, setAddress] = useState('')
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
      // Get laundry item
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
  const handleConfirmOrder = async () => {
    if (!address.trim()) {
      Alert.alert('Required', 'กรุณากรอกที่อยู่')
      return
    }
    try {
      setUploading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      // Upload photo will be handled after order is created
      let photoUrl = ''
      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          customer_id: user.id,
          package_id: packageId,
          total_price: parseInt(totalPrice as string),
          status: 'pending',
          pickup_address: address,
          notes: noteText,
        }])
        .select()
        .single()
      if (orderError) throw orderError
      // Add order items
      const items = Object.entries(parsedQty)
        .filter(([_, qty]) => qty > 0)
        .map(([itemId, qty]) => ({
          order_id: orderData.id,
          item_type: 'clothing',
          item_id: itemId,
          quantity: qty,
        }))
      if (laundryId) {
        items.push({
          order_id: orderData.id,
          item_type: 'laundry',
          item_id: laundryId as string,
          quantity: 1,
        })
      }
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(items)
      if (itemsError) throw itemsError
      // Upload delivery photo if exists
      if (photo) {
        try {
          photoUrl = await uploadOrderPhoto(orderData.id, 'customer', photo.uri)
        } catch (photoErr: any) {
          console.error('Photo upload error:', photoErr)
        }
      }
      Alert.alert('Success', 'ออเดอร์สำเร็จ', [
        {
          text: 'ดูรายละเอียด',
          onPress: () =>
            router.push({
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
          <Text style={styles.sectionTitle}>รูปถ่ายตะกร้าผ้า</Text>
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
        {laundryItem && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>น้ำยา</Text>
            <View style={styles.itemRow}>
              <Text style={styles.itemName}>{laundryItem.name}</Text>
              <Text style={styles.price}>฿{laundryItem.price}</Text>
            </View>
          </View>
        )}
        {}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ที่อยู่ส่ง</Text>
          <TextInput
            style={styles.input}
            placeholder="ป้อนที่อยู่"
            value={address}
            onChangeText={setAddress}
            multiline
          />
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
          onPress={() => setModalVisible(true)}
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

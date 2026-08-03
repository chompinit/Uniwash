import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../../../lib/supabase'
type LaundryItem = {
  id: string
  name: string
  image_url: string
  price: number
  category: string
}
type ClothingItem = {
  id: string
  name: string
  image_url: string
  price: number
}
export default function SelectScreen() {
  const { packageId } = useLocalSearchParams()
  const [laundryItems, setLaundryItems] = useState<LaundryItem[]>([])
  const [clothingItems, setClothingItems] = useState<ClothingItem[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [selectedDetergent, setSelectedDetergent] = useState<string>('')
  const [selectedSoftener, setSelectedSoftener] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const detergents = laundryItems.filter(l => l.category === 'detergent')
  const softeners = laundryItems.filter(l => l.category === 'softener')
  useEffect(() => {
    fetchProducts()
  }, [])
  const fetchProducts = async () => {
    try {
      const pkgId = Array.isArray(packageId) ? packageId[0] : packageId

      const [laundryRes, clothingRes] = await Promise.all([
        supabase
          .from('laundry_items')
          .select('id, name, image_url, price, category')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        // โชว์เฉพาะผ้าที่ผูกกับแพ็กเกจที่เลือก
        supabase
          .from('package_clothing_items')
          .select('clothing_items (id, name, image_url, price, is_active)')
          .eq('package_id', pkgId),
      ])
      if (laundryRes.error) throw laundryRes.error
      if (clothingRes.error) throw clothingRes.error

      const clothing: ClothingItem[] = (clothingRes.data || [])
        .map((r: any) => (Array.isArray(r.clothing_items) ? r.clothing_items[0] : r.clothing_items))
        .filter((c: any) => c && c.is_active)

      const laundry = (laundryRes.data || []) as LaundryItem[]
      setLaundryItems(laundry)
      setClothingItems(clothing)
      // Set default selections (เลือกตัวแรกของแต่ละประเภทให้อัตโนมัติ)
      const firstDetergent = laundry.find(l => l.category === 'detergent')
      const firstSoftener = laundry.find(l => l.category === 'softener')
      if (firstDetergent) setSelectedDetergent(firstDetergent.id)
      if (firstSoftener) setSelectedSoftener(firstSoftener.id)
      // Initialize quantities
      const initQties: Record<string, number> = {}
      clothing.forEach((item) => {
        initQties[item.id] = 0
      })
      setQuantities(initQties)
    } catch (error: any) {
      Alert.alert('Error', error.message)
    } finally {
      setLoading(false)
    }
  }
  const changeQty = (id: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta),
    }))
  }
  const totalPrice =
    clothingItems.reduce((sum, item) => sum + (quantities[item.id] || 0) * item.price, 0) +
    (laundryItems.find(p => p.id === selectedDetergent)?.price || 0) +
    (laundryItems.find(p => p.id === selectedSoftener)?.price || 0)
  const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0)

  const renderLaundryRow = (list: LaundryItem[], selectedId: string, onSelect: (id: string) => void) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
      {list.length === 0 ? (
        <Text style={styles.emptyClothing}>ยังไม่มีรายการ</Text>
      ) : list.map(prod => (
        <TouchableOpacity
          key={prod.id}
          style={[styles.prodCard, selectedId === prod.id && styles.prodCardSelected]}
          onPress={() => onSelect(selectedId === prod.id ? '' : prod.id)}
          activeOpacity={0.85}
        >
          {prod.image_url ? (
            <Image source={{ uri: prod.image_url }} style={styles.prodImage} />
          ) : (
            <View style={styles.prodImage}>
              <Text style={{ fontSize: 34 }}>🧴</Text>
            </View>
          )}
          <Text style={styles.prodName} numberOfLines={1}>{prod.name}</Text>
          <View style={styles.typeRow}>
            <Text style={styles.typeRowLabel}>ราคา</Text>
            <Text style={styles.typeRowValue}>฿{prod.price}</Text>
          </View>
          {selectedId === prod.id && (
            <View style={styles.prodCheck}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  )

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1C8A99" />
      </View>
    )
  }
  return (
    <SafeAreaView style={styles.container}>
      {}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.deliverTo}>DELIVER TO</Text>
          <Text style={styles.deliverName}>Uniwash office ▾</Text>
        </View>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>เลือกเสื้อกางเกงและจำนวน</Text>
        {}
        <Text style={styles.sectionTitle}>เสื้อกางเกง</Text>
        {clothingItems.length === 0 ? (
          <Text style={styles.emptyClothing}>ยังไม่มีชนิดผ้าในแพ็กเกจนี้</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {clothingItems.map(item => (
              <View key={item.id} style={styles.typeCard}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.typeImage} />
                ) : (
                  <View style={styles.typeImage}>
                    <Text style={{ fontSize: 44 }}>👕</Text>
                  </View>
                )}
                <Text style={styles.typeName}>{item.name}</Text>
                <View style={styles.typeRow}>
                  <Text style={styles.typeRowLabel}>ราคา</Text>
                  <Text style={styles.typeRowValue}>฿{item.price}</Text>
                </View>
                <View style={styles.typeRow}>
                  <Text style={styles.typeRowLabel}>จำนวน</Text>
                  <View style={styles.qtyControl}>
                    <TouchableOpacity onPress={() => changeQty(item.id, -1)} hitSlop={8}>
                      <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyNum}>{quantities[item.id] || 0}</Text>
                    <TouchableOpacity onPress={() => changeQty(item.id, 1)} hitSlop={8}>
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
        {}
        <Text style={styles.heading}>เลือกน้ำยา</Text>
        <Text style={styles.sectionTitle}>น้ำยาซักผ้า</Text>
        {renderLaundryRow(detergents, selectedDetergent, setSelectedDetergent)}
        <Text style={styles.sectionTitle}>น้ำยาปรับผ้านุ่ม</Text>
        {renderLaundryRow(softeners, selectedSoftener, setSelectedSoftener)}
        <View style={{ height: 16 }} />
      </ScrollView>
      {}
      <View style={styles.footer}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>รวม:</Text>
          <Text style={styles.priceValue}>฿{totalPrice}</Text>
        </View>
        <TouchableOpacity
          style={[styles.btnPrimary, (totalItems === 0 || !selectedDetergent) && styles.btnDisabled]}
          disabled={totalItems === 0 || !selectedDetergent}
          onPress={() =>
            router.push({
              pathname: '/(customer)/summary' as any,
              params: {
                packageId,
                quantities: JSON.stringify(quantities),
                laundryId: selectedDetergent,
                softenerId: selectedSoftener,
                totalPrice,
              },
            })
          }
        >
          <Text style={styles.btnText}>สรุปรายการ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#1C8A99', paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center',
  },
  backText: { fontSize: 26, color: '#fff', fontWeight: '600' },
  deliverTo: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5 },
  deliverName: { fontSize: 13, fontWeight: '600', color: '#fff', marginTop: 1 },
  content: { flex: 1, paddingHorizontal: 16 },
  heading: { fontSize: 16, fontWeight: '700', color: '#1B1C2A', marginTop: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#8A8F98', marginBottom: 10 },
  emptyClothing: { fontSize: 13, color: '#8A8F98', textAlign: 'center', paddingVertical: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  typeCard: {
    width: 150, backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#E6E8EB', padding: 12, marginRight: 10,
  },
  typeImage: {
    height: 90, borderRadius: 10, backgroundColor: '#EEF1F4',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  typeName: { fontSize: 14, fontWeight: '700', color: '#1B1C2A', marginBottom: 3 },
  typeDesc: { fontSize: 10.5, color: '#8A8F98', lineHeight: 14, marginBottom: 8, minHeight: 28 },
  typeRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  typeRowLabel: { fontSize: 12, color: '#8A8F98' },
  typeRowValue: { fontSize: 12.5, fontWeight: '700', color: '#1B1C2A' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtnText: { fontSize: 17, color: '#1C8A99', fontWeight: '700' },
  qtyNum: { fontSize: 14, fontWeight: '700', color: '#1B1C2A', minWidth: 18, textAlign: 'center' },
  prodCard: {
    width: 120, backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#E6E8EB', padding: 10, marginRight: 10,
  },
  prodCardSelected: { borderColor: '#1C8A99', backgroundColor: '#E3F1F3' },
  prodImage: {
    height: 70, borderRadius: 10, backgroundColor: '#EEF1F4',
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  prodName: { fontSize: 12, fontWeight: '700', color: '#1B1C2A', marginBottom: 4 },
  prodCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#1C8A99',
    alignItems: 'center', justifyContent: 'center',
  },
  footer: {
    padding: 16, backgroundColor: '#fff',
    borderTopWidth: 0.5, borderTopColor: '#E6E8EB',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8A8F98',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C8A99',
  },
  btnPrimary: {
    backgroundColor: '#15707D', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
})

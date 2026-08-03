import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

const ITEMS = [
  { type: 'shirt', label: 'เสื้อผ้า', desc: 'เช่น เสื้อยืด เสื้อเชิ้ต ครึ่งแขนหรือแขนยาว', price: 9, emoji: '👕' },
  { type: 'pant', label: 'กางเกง', desc: 'เช่น กางเกงขาสั้น ขายาว ครึ่งตัวหรือเต็มตัว', price: 9, emoji: '👖' },
  { type: 'underwear', label: 'ชุดชั้นใน', desc: 'เช่น ชุดชั้นในทุกชนิด', price: 3, emoji: '🩱' },
  { type: 'bedsheet', label: 'ผ้าปูที่นอน', desc: 'เช่น ผ้าปูที่นอน ปลอกหมอน ผ้าห่ม', price: 20, emoji: '🛏️' },
]

const PRODUCTS = [
  { id: 'p1', name: 'น้ำยาซักของร้าน', price: 10, emoji: '🧴', group: 'น้ำยาซักผ้า' },
  { id: 'p2', name: 'Bleach', price: 10, emoji: '🫧', group: 'น้ำยาซักผ้า' },
  { id: 'p3', name: 'Comfort', price: 15, emoji: '💧', group: 'น้ำยาปรับผ้านุ่ม' },
]

const GROUPS = ['น้ำยาซักผ้า', 'น้ำยาปรับผ้านุ่ม']

export default function SelectScreen() {
  const { packageId } = useLocalSearchParams()
  const [quantities, setQuantities] = useState<Record<string, number>>({
    shirt: 0, pant: 0, underwear: 0, bedsheet: 0,
  })
  const [selectedProduct, setSelectedProduct] = useState('p1')

  const changeQty = (type: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [type]: Math.max(0, (prev[type] || 0) + delta),
    }))
  }

  const totalPrice =
    ITEMS.reduce((sum, item) => sum + (quantities[item.type] || 0) * item.price, 0) +
    (PRODUCTS.find(p => p.id === selectedProduct)?.price || 0)

  const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0)

  return (
    <SafeAreaView style={styles.container}>

      {/* Header teal ตามม็อกอัป */}
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

        <Text style={styles.heading}>เลือกชนิดและจำนวนผ้าที่ต้องการ</Text>

        {/* ชนิดผ้า — การ์ดคู่ตามม็อกอัป */}
        <Text style={styles.sectionTitle}>ชนิดผ้า</Text>
        <View style={styles.grid}>
          {ITEMS.map(item => (
            <View key={item.type} style={styles.typeCard}>
              <View style={styles.typeImage}>
                <Text style={{ fontSize: 44 }}>{item.emoji}</Text>
              </View>
              <Text style={styles.typeName}>{item.label}</Text>
              <Text style={styles.typeDesc} numberOfLines={2}>{item.desc}</Text>
              <View style={styles.typeRow}>
                <Text style={styles.typeRowLabel}>ราคา</Text>
                <Text style={styles.typeRowValue}>{item.price} THB</Text>
              </View>
              <View style={styles.typeRow}>
                <Text style={styles.typeRowLabel}>จำนวน</Text>
                <View style={styles.qtyControl}>
                  <TouchableOpacity onPress={() => changeQty(item.type, -1)} hitSlop={8}>
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyNum}>{quantities[item.type] || 0}</Text>
                  <TouchableOpacity onPress={() => changeQty(item.type, 1)} hitSlop={8}>
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* ผลิตภัณฑ์ — แถวเลื่อนข้างตามม็อกอัป */}
        <Text style={styles.heading}>เลือกผลิตภัณฑ์ที่ต้องการ</Text>
        {GROUPS.map(group => (
          <View key={group}>
            <Text style={styles.sectionTitle}>{group}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {PRODUCTS.filter(p => p.group === group).map(prod => (
                <TouchableOpacity
                  key={prod.id}
                  style={[styles.prodCard, selectedProduct === prod.id && styles.prodCardSelected]}
                  onPress={() => setSelectedProduct(prod.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.prodImage}>
                    <Text style={{ fontSize: 34 }}>{prod.emoji}</Text>
                  </View>
                  <Text style={styles.prodName} numberOfLines={1}>{prod.name}</Text>
                  <View style={styles.typeRow}>
                    <Text style={styles.typeRowLabel}>ราคา</Text>
                    <Text style={styles.typeRowValue}>{prod.price} THB</Text>
                  </View>
                  {selectedProduct === prod.id && (
                    <View style={styles.prodCheck}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ))}

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btnPrimary, totalItems === 0 && styles.btnDisabled]}
          disabled={totalItems === 0}
          onPress={() =>
            router.push({
              pathname: '/(customer)/summary' as any,
              params: {
                packageId,
                quantities: JSON.stringify(quantities),
                productId: selectedProduct,
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

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  typeCard: {
    width: '47.5%', backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#E6E8EB', padding: 12,
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
  btnPrimary: {
    backgroundColor: '#15707D', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
})

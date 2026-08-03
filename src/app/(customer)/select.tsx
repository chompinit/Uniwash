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
  { type: 'shirt', label: 'เสื้อผ้า', price: 9, emoji: '👕' },
  { type: 'pant', label: 'กางเกง', price: 9, emoji: '👖' },
  { type: 'underwear', label: 'ชุดชั้นใน', price: 3, emoji: '🩱' },
  { type: 'bedsheet', label: 'ผ้าปูที่นอน', price: 20, emoji: '🛏️' },
]

const PRODUCTS = [
  { id: 'p1', name: 'น้ำยาซักของร้าน', price: 10, emoji: '🧴' },
  { id: 'p2', name: 'Bleach', price: 10, emoji: '🫧' },
  { id: 'p3', name: 'Comfort', price: 15, emoji: '💧' },
]

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

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← กลับ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>เลือกผ้า</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>

        {/* เลือกจำนวนผ้า */}
        <Text style={styles.sectionTitle}>เลือกชนิดและจำนวนผ้า</Text>
        {ITEMS.map(item => (
          <View key={item.type} style={styles.itemRow}>
            <Text style={styles.itemEmoji}>{item.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.label}</Text>
              <Text style={styles.itemPrice}>{item.price} บาท/ชิ้น</Text>
            </View>
            <View style={styles.qtyControl}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => changeQty(item.type, -1)}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyNum}>{quantities[item.type] || 0}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => changeQty(item.type, 1)}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* เลือกน้ำยา */}
        <Text style={styles.sectionTitle}>เลือกน้ำยาซักผ้า</Text>
        {PRODUCTS.map(prod => (
          <TouchableOpacity
            key={prod.id}
            style={[
              styles.productRow,
              selectedProduct === prod.id && styles.productRowSelected,
            ]}
            onPress={() => setSelectedProduct(prod.id)}
          >
            <Text style={{ fontSize: 24 }}>{prod.emoji}</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.productName}>{prod.name}</Text>
              <Text style={styles.productPrice}>{prod.price} บาท</Text>
            </View>
            {selectedProduct === prod.id && (
              <Text style={{ color: '#1D9E75', fontWeight: '700' }}>✓</Text>
            )}
          </TouchableOpacity>
        ))}

      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>รวม {totalItems} ชิ้น</Text>
          <Text style={styles.totalPrice}>{totalPrice} บาท</Text>
        </View>
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
          <Text style={styles.btnText}>สรุปการสั่งซื้อ →</Text>
        </TouchableOpacity>
      </View>

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
  sectionTitle: {
    fontSize: 13, fontWeight: '600',
    color: '#888780', marginBottom: 10, marginTop: 8,
  },
  itemRow: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 8, gap: 12,
  },
  itemEmoji: { fontSize: 28 },
  itemName: { fontSize: 14, fontWeight: '500', color: '#2C2C2A' },
  itemPrice: { fontSize: 12, color: '#1D9E75', marginTop: 2 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#E1F5EE',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 18, color: '#1D9E75', fontWeight: '700' },
  qtyNum: { fontSize: 16, fontWeight: '600', color: '#2C2C2A', minWidth: 24, textAlign: 'center' },
  productRow: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent',
  },
  productRowSelected: { borderColor: '#1D9E75', backgroundColor: '#E1F5EE' },
  productName: { fontSize: 14, fontWeight: '500', color: '#2C2C2A' },
  productPrice: { fontSize: 12, color: '#1D9E75', marginTop: 2 },
  footer: {
    padding: 16, backgroundColor: '#fff',
    borderTopWidth: 0.5, borderTopColor: '#E0E0E0',
  },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  totalLabel: { fontSize: 14, color: '#888780' },
  totalPrice: { fontSize: 20, fontWeight: '700', color: '#1D9E75' },
  btnPrimary: {
    backgroundColor: '#1D9E75', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
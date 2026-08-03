import { router } from 'expo-router'
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

type Package = {
  id: string
  name: string
  description: string
  min_items: number
  max_items: number
  delivery_km: number
}

export default function PackagesScreen() {
  const [packages, setPackages] = useState<Package[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPackages()
  }, [])

  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)

    if (error) {
      Alert.alert('Error', error.message)
    } else {
      setPackages(data || [])
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/(auth)/login' as any)
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>เลือกแพ็กเกจ</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={() => router.push('/(customer)/orders' as any)}>
            <Text style={styles.navText}>ออเดอร์</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(customer)/coins' as any)}>
            <Text style={styles.navText}>🪙 เติมเงิน</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>ออก</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1D9E75" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.content}>
          <Text style={styles.sectionLabel}>กรุณาเลือกแพ็กเกจ</Text>

          {packages.map((pkg) => (
            <TouchableOpacity
              key={pkg.id}
              style={[
                styles.pkgCard,
                selectedId === pkg.id && styles.pkgCardSelected,
              ]}
              onPress={() => setSelectedId(pkg.id)}
            >
              <View style={styles.pkgHeader}>
                <Text style={styles.pkgName}>👕 {pkg.name}</Text>
                {selectedId === pkg.id && (
                  <View style={styles.checkCircle}>
                    <Text style={{ color: 'white', fontWeight: '700' }}>✓</Text>
                  </View>
                )}
              </View>
              <Text style={styles.pkgDesc}>{pkg.description}</Text>
              <Text style={styles.pkgInfo}>
                จำนวน {pkg.min_items}–{pkg.max_items} ชิ้น
                {'  ·  '}
                รัศมี {pkg.delivery_km} กม.
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btnPrimary, !selectedId && styles.btnDisabled]}
          disabled={!selectedId}
          onPress={() =>
            router.push({
              pathname: '/(customer)/select' as any,
              params: { packageId: selectedId },
            })
          }
        >
          <Text style={styles.btnText}>เลือกแพ็กเกจนี้ →</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#2C2C2A' },
  logoutText: { fontSize: 13, color: '#E24B4A' },
  // 👇 เพิ่มโค้ดสไตล์จากรูปภาพตรงนี้ครับ
  navText: { 
    fontSize: 13, 
    color: '#1D9E75', 
    fontWeight: '500' 
  },
  content: { flex: 1, padding: 16 },
  sectionLabel: { fontSize: 13, color: '#888780', marginBottom: 12 },
  pkgCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 16,
    marginBottom: 12,
  },
  pkgCardSelected: {
    borderColor: '#1D9E75',
    backgroundColor: '#E1F5EE',
  },
  pkgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pkgName: { fontSize: 15, fontWeight: '600', color: '#2C2C2A' },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#1D9E75',
    alignItems: 'center', justifyContent: 'center',
  },
  pkgDesc: { fontSize: 13, color: '#888780', marginBottom: 6 },
  pkgInfo: { fontSize: 12, color: '#1D9E75', fontWeight: '500' },
  footer: {
    padding: 16, backgroundColor: '#fff',
    borderTopWidth: 0.5, borderTopColor: '#E0E0E0',
  },
  btnPrimary: {
    backgroundColor: '#1D9E75',
    borderRadius: 12, paddingVertical: 15, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
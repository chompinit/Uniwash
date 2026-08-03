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
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPackages()
    fetchProfile()
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

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    setName(data?.full_name ?? '')
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* Header: DELIVER TO ตามม็อกอัป */}
      <View style={styles.header}>
        <View>
          <Text style={styles.deliverTo}>DELIVER TO</Text>
          <Text style={styles.deliverName}>Uniwash office ▾</Text>
        </View>
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => router.push('/(customer)/profile' as any)}
        >
          <Text style={{ fontSize: 18 }}>{name ? name.charAt(0) : '👤'}</Text>
        </TouchableOpacity>
      </View>

      {/* พื้น teal + การ์ดขาวตามม็อกอัป */}
      <View style={styles.body}>
        <Text style={styles.heading}>กรุณาเลือกแพ็กเก็จ</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {packages.map((pkg) => (
              <TouchableOpacity
                key={pkg.id}
                style={[styles.pkgCard, selectedId === pkg.id && styles.pkgCardSelected]}
                onPress={() => setSelectedId(pkg.id)}
                activeOpacity={0.85}
              >
                <Text style={styles.pkgName}>{pkg.name}</Text>
                <Text style={styles.pkgDesc}>{pkg.description}</Text>
                <Text style={styles.pkgInfo}>
                  จำนวน {pkg.min_items}–{pkg.max_items} ชิ้น · รัศมี {pkg.delivery_km} กม.
                  {'\n'}สามารถเพิ่มจำนวนได้
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.btnConfirm, !selectedId && styles.btnDisabled]}
              disabled={!selectedId}
              onPress={() =>
                router.push({
                  pathname: '/(customer)/select' as any,
                  params: { packageId: selectedId },
                })
              }
            >
              <Text style={styles.btnText}>ยืนยันแพ็กเก็จ</Text>
            </TouchableOpacity>

            <View style={{ height: 24 }} />
          </ScrollView>
        )}
      </View>

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  deliverTo: { fontSize: 11, fontWeight: '700', color: '#1C8A99', letterSpacing: 0.5 },
  deliverName: { fontSize: 14, fontWeight: '600', color: '#2C2C2A', marginTop: 2 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#E3F1F3',
    alignItems: 'center', justifyContent: 'center',
  },

  body: {
    flex: 1, backgroundColor: '#5FA8B3',
    borderTopLeftRadius: 4, borderTopRightRadius: 4,
    paddingHorizontal: 18, paddingTop: 16,
  },
  heading: { fontSize: 20, fontWeight: '700', color: '#1B1C2A', marginBottom: 14 },

  pkgCard: {
    backgroundColor: '#fff', borderRadius: 22,
    padding: 18, marginBottom: 14,
    borderWidth: 2.5, borderColor: 'transparent',
  },
  pkgCardSelected: { borderColor: '#15707D', backgroundColor: '#E3F1F3' },
  pkgName: { fontSize: 16, fontWeight: '800', color: '#1B1C2A', marginBottom: 8 },
  pkgDesc: { fontSize: 13, color: '#8A8F98', lineHeight: 19, marginBottom: 6 },
  pkgInfo: { fontSize: 12.5, color: '#8A8F98', lineHeight: 19 },

  btnConfirm: {
    backgroundColor: '#15707D', borderRadius: 16,
    paddingVertical: 17, alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
})

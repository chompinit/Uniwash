import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
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
import { Brand } from '../../constants/theme'
import { supabase } from '../../../lib/supabase'

type Address = {
  id: string
  label: string | null
  address: string
}

const LABEL_ICON: Record<string, string> = {
  HOME: '🏠', WORK: '🏢', บ้าน: '🏠', ที่ทำงาน: '🏢',
}

export default function AddressesScreen() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(useCallback(() => { fetchAddresses() }, []))

  const fetchAddresses = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('addresses')
      .select('id, label, address')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    setAddresses((data as Address[]) ?? [])
    setLoading(false)
  }

  const handleDelete = (id: string) => {
    Alert.alert('ลบที่อยู่', 'ต้องการลบที่อยู่นี้?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ', style: 'destructive',
        onPress: async () => {
          await supabase.from('addresses').delete().eq('id', id)
          fetchAddresses()
        },
      },
    ])
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Text style={styles.iconText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ที่อยู่ของฉัน</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Brand.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.content}>
          {addresses.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>📍</Text>
              <Text style={styles.emptyText}>ยังไม่มีที่อยู่ที่บันทึกไว้</Text>
            </View>
          ) : addresses.map(a => (
            <View key={a.id} style={styles.card}>
              <Text style={styles.cardIcon}>{LABEL_ICON[a.label ?? ''] ?? '📍'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardLabel}>{a.label || 'ที่อยู่'}</Text>
                <Text style={styles.cardAddress} numberOfLines={2}>{a.address}</Text>
              </View>
              <TouchableOpacity
                style={styles.smallBtn}
                onPress={() => router.push({ pathname: '/(customer)/add-address' as any, params: { id: a.id } })}
              >
                <Text style={styles.smallBtnIcon}>✎</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallBtn} onPress={() => handleDelete(a.id)}>
                <Text style={[styles.smallBtnIcon, { color: Brand.danger }]}>🗑</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.push('/(customer)/add-address' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>เพิ่มที่อยู่ใหม่</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.card },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Brand.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 22, color: Brand.text, lineHeight: 24 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Brand.text },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },

  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyText: { fontSize: 15, color: Brand.textSecondary },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Brand.bg, borderRadius: 14, padding: 16, marginBottom: 12,
  },
  cardIcon: { fontSize: 22 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: Brand.text, marginBottom: 4 },
  cardAddress: { fontSize: 13, color: Brand.textSecondary, lineHeight: 18 },
  smallBtn: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Brand.card,
    alignItems: 'center', justifyContent: 'center',
  },
  smallBtnIcon: { fontSize: 15, color: Brand.primary },

  footer: { padding: 20 },
  btnPrimary: {
    backgroundColor: Brand.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})

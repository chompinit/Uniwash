import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Brand } from '../../constants/theme'
import { supabase } from '../../../lib/supabase'
type Profile = {
  full_name: string | null
  coins: number | null
  avatar_url: string | null
}
export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetchProfile() }, [])
  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('full_name, coins, avatar_url')
      .eq('id', user.id)
      .single()
    setProfile(data as Profile)
    setLoading(false)
  }
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/(auth)/login' as any)
  }
  return (
    <SafeAreaView style={styles.container}>
      {}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Text style={styles.iconText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>โปรไฟล์ ส่วนตัว</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Text style={styles.iconText}>⋯</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={Brand.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.content}>
          {}
          <View style={styles.avatarWrap}>
            <View style={styles.avatar} />
            <Text style={styles.name}>{profile?.full_name || 'ผู้ใช้ Uniwash'}</Text>
          </View>
          {}
          <View style={styles.coinsCard}>
            <Text style={styles.coinsText}>🪙 {profile?.coins ?? 0} เหรียญ</Text>
            <TouchableOpacity onPress={() => router.push('/(customer)/coins' as any)}>
              <Text style={styles.coinsTopup}>เติมเงิน</Text>
            </TouchableOpacity>
          </View>
          {}
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push('/(customer)/edit-profile' as any)}
            >
              <Text style={styles.menuIcon}>👤</Text>
              <Text style={styles.menuLabel}>Personal Info</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push('/(customer)/addresses' as any)}
            >
              <Text style={styles.menuIcon}>🗺️</Text>
              <Text style={styles.menuLabel}>Addresses</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          </View>
          {}
          <TouchableOpacity style={styles.logoutCard} onPress={handleLogout}>
            <Text style={styles.logoutIcon}>⤴</Text>
            <Text style={styles.logoutLabel}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.card },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: Brand.divider,
  },
  iconBtn: { padding: 8 },
  iconText: { fontSize: 18, color: Brand.text, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Brand.text },
  content: { flex: 1, paddingHorizontal: 16 },
  avatarWrap: { alignItems: 'center', marginVertical: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Brand.primary, marginBottom: 12,
  },
  name: { fontSize: 18, fontWeight: '700', color: Brand.text },
  coinsCard: {
    backgroundColor: Brand.primary, borderRadius: 16,
    padding: 16, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginVertical: 20,
  },
  coinsText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  coinsTopup: { fontSize: 14, fontWeight: '600', color: '#fff', textDecorationLine: 'underline' },
  menuCard: { backgroundColor: Brand.card, borderRadius: 12, marginVertical: 12 },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
  },
  menuIcon: { fontSize: 20 },
  menuLabel: { flex: 1, fontSize: 15, color: Brand.text, fontWeight: '500' },
  menuArrow: { fontSize: 16, color: Brand.textSecondary },
  divider: { height: 0.5, backgroundColor: Brand.divider, marginHorizontal: 16 },
  logoutCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: '#ffebee', borderRadius: 12, marginVertical: 24, gap: 12,
  },
  logoutIcon: { fontSize: 20 },
  logoutLabel: { fontSize: 15, fontWeight: '600', color: '#c62828' },
})

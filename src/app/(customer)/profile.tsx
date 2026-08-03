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
      {/* Header */}
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

          {/* Avatar + name */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatar} />
            <Text style={styles.name}>{profile?.full_name || 'ผู้ใช้ Uniwash'}</Text>
          </View>

          {/* Coins card */}
          <View style={styles.coinsCard}>
            <Text style={styles.coinsText}>🪙 {profile?.coins ?? 0} เหรียญ</Text>
            <TouchableOpacity onPress={() => router.push('/(customer)/coins' as any)}>
              <Text style={styles.coinsTopup}>เติมเงิน</Text>
            </TouchableOpacity>
          </View>

          {/* Menu list */}
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
              <Text style={styles.menuIcon}>📖</Text>
              <Text style={styles.menuLabel}>Addresses</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutCard} onPress={handleLogout}>
            <Text style={styles.logoutIcon}>↩</Text>
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
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Brand.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 22, color: Brand.text, lineHeight: 24 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Brand.text },
  content: { flex: 1, paddingHorizontal: 20 },

  avatarWrap: { alignItems: 'center', marginTop: 12, marginBottom: 20 },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#AED9DF', marginBottom: 12,
  },
  name: { fontSize: 18, fontWeight: '700', color: Brand.text },

  coinsCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Brand.bg, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16,
    marginBottom: 16,
  },
  coinsText: { fontSize: 16, fontWeight: '700', color: Brand.text },
  coinsTopup: { fontSize: 14, fontWeight: '600', color: Brand.primary },

  menuCard: {
    backgroundColor: Brand.bg, borderRadius: 14, paddingHorizontal: 16, marginBottom: 16,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 14 },
  menuIcon: { fontSize: 18 },
  menuLabel: { flex: 1, fontSize: 15, color: Brand.text },
  menuArrow: { fontSize: 22, color: Brand.textSecondary },
  divider: { height: 1, backgroundColor: Brand.border },

  logoutCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Brand.bg, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16,
    marginTop: 8,
  },
  logoutIcon: { fontSize: 18, color: Brand.danger },
  logoutLabel: { fontSize: 15, fontWeight: '600', color: Brand.danger },
})

import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../../../lib/supabase'

type Profile = {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: string
  coins: number
  created_at: string
}

const ROLE_OPTIONS = [
  { key: 'customer', label: '👤 ลูกค้า', color: '#3B82F6' },
  { key: 'employee', label: '🚴 Rider', color: '#8B5CF6' },
  { key: 'admin', label: '👑 Admin', color: '#F59E0B' },
]

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<Profile[]>([])
  const [filtered, setFiltered] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeRole, setActiveRole] = useState('all')

  useEffect(() => { fetchUsers() }, [])

  useEffect(() => {
    let result = [...users]
    if (activeRole !== 'all') {
      result = result.filter(u => u.role === activeRole)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(u =>
        u.email?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.phone?.includes(q)
      )
    }
    setFiltered(result)
  }, [users, search, activeRole])

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setUsers(data || [])
    setLoading(false)
  }

  const handleChangeRole = (user: Profile) => {
    Alert.alert(
      `เปลี่ยน Role`,
      `${user.full_name || user.email}\nRole ปัจจุบัน: ${user.role}`,
      [
        ...ROLE_OPTIONS
          .filter(r => r.key !== user.role)
          .map(r => ({
            text: r.label,
            onPress: async () => {
              const { error } = await supabase.rpc('admin_set_role', {
                p_user_id: user.id,
                p_role: r.key,
              })
              if (error) {
                Alert.alert('เกิดข้อผิดพลาด', error.message)
              } else {
                Alert.alert('✅ สำเร็จ', `เปลี่ยนเป็น ${r.label} แล้ว`)
                fetchUsers()
              }
            },
          })),
        { text: 'ยกเลิก', style: 'cancel' },
      ]
    )
  }

  const handleAdjustCoins = (user: Profile) => {
    Alert.alert(
      `🪙 จัดการเหรียญ`,
      `${user.full_name || user.email}\nยอดปัจจุบัน: ${user.coins} เหรียญ`,
      [
        {
          text: '+ เพิ่ม 100 เหรียญ',
          onPress: async () => {
            const { error } = await supabase.rpc('admin_adjust_coins', {
              p_user_id: user.id,
              p_amount: 100,
            })
            if (error) Alert.alert('เกิดข้อผิดพลาด', error.message)
            fetchUsers()
          },
        },
        {
          text: '− ลด 100 เหรียญ',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc('admin_adjust_coins', {
              p_user_id: user.id,
              p_amount: -100,
            })
            if (error) Alert.alert('เกิดข้อผิดพลาด', error.message)
            fetchUsers()
          },
        },
        { text: 'ยกเลิก', style: 'cancel' },
      ]
    )
  }

  const getRoleStyle = (role: string) => {
    const found = ROLE_OPTIONS.find(r => r.key === role)
    return { color: found?.color || '#888780', label: found?.label || role }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('th-TH', {
      day: '2-digit', month: 'short', year: '2-digit',
    })

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← กลับ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ผู้ใช้งาน</Text>
        <Text style={styles.countText}>{filtered.length} คน</Text>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 ค้นหา ชื่อ / อีเมล / เบอร์"
          placeholderTextColor="#B4B2A9"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}
      >
        {[{ key: 'all', label: 'ทั้งหมด' }, ...ROLE_OPTIONS].map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.filterBtn, activeRole === opt.key && styles.filterBtnActive]}
            onPress={() => setActiveRole(opt.key)}
          >
            <Text style={[styles.filterText, activeRole === opt.key && styles.filterTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color="#1D9E75" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.content}>
          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>ไม่พบผู้ใช้</Text>
            </View>
          ) : (
            filtered.map(user => {
              const roleStyle = getRoleStyle(user.role)
              return (
                <View key={user.id} style={styles.userCard}>
                  <View style={styles.userTop}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>
                        {(user.full_name || user.email || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>
                        {user.full_name || 'ไม่ระบุชื่อ'}
                      </Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                      {user.phone ? (
                        <Text style={styles.userPhone}>📞 {user.phone}</Text>
                      ) : null}
                      <Text style={styles.userDate}>
                        สมัคร: {formatDate(user.created_at)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={[
                        styles.roleBadge,
                        { backgroundColor: roleStyle.color + '20' },
                      ]}>
                        <Text style={[styles.roleText, { color: roleStyle.color }]}>
                          {roleStyle.label}
                        </Text>
                      </View>
                      <Text style={styles.coinText}>🪙 {user.coins}</Text>
                    </View>
                  </View>

                  <View style={styles.userActions}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleChangeRole(user)}
                    >
                      <Text style={styles.actionBtnText}>🔄 เปลี่ยน Role</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#FFF9E6' }]}
                      onPress={() => handleAdjustCoins(user)}
                    >
                      <Text style={[styles.actionBtnText, { color: '#856404' }]}>
                        🪙 จัดการเหรียญ
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    backgroundColor: '#fff', padding: 16,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0',
  },
  backText: { fontSize: 15, color: '#1D9E75' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#2C2C2A' },
  countText: { fontSize: 13, color: '#888780' },
  searchBox: {
    backgroundColor: '#fff', padding: 12,
    borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    backgroundColor: '#f8f9fa', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#2C2C2A',
  },
  filterBar: {
    backgroundColor: '#fff', maxHeight: 50,
    borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0',
  },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#E0E0E0',
  },
  filterBtnActive: { backgroundColor: '#1D9E75', borderColor: '#1D9E75' },
  filterText: { fontSize: 13, color: '#888780' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: '#888780' },
  userCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 0.5, borderColor: '#E0E0E0',
  },
  userTop: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#E1F5EE',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#1D9E75' },
  userName: { fontSize: 14, fontWeight: '600', color: '#2C2C2A' },
  userEmail: { fontSize: 12, color: '#888780', marginTop: 2 },
  userPhone: { fontSize: 12, color: '#1D9E75', marginTop: 2 },
  userDate: { fontSize: 11, color: '#B4B2A9', marginTop: 2 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  roleText: { fontSize: 11, fontWeight: '600' },
  coinText: { fontSize: 12, color: '#856404', fontWeight: '500' },
  userActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, backgroundColor: '#E1F5EE', borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
  },
  actionBtnText: { fontSize: 12, color: '#1D9E75', fontWeight: '500' },
})
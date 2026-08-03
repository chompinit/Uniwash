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
import { Brand, Spacing } from '../../constants/theme'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalCustomers: 0,
    totalRiders: 0,
    totalProducts: 0,
    totalClothing: 0,
    pendingOrders: 0,
  })
  const [loading, setLoading] = useState(true)
  const [adminName, setAdminName] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      if (profile?.full_name) {
        setAdminName(profile.full_name)
      }

      const { count: orderCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .eq('is_active', true)

      const { count: customerCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('role', 'customer')

      const { count: riderCount } = await supabase
        .from('riders')
        .select('id', { count: 'exact' })
        .eq('status', 'active')

      const { count: productCount } = await supabase
        .from('laundry_items')
        .select('id', { count: 'exact' })
        .eq('is_active', true)

      const { count: clothingCount } = await supabase
        .from('clothing_items')
        .select('id', { count: 'exact' })
        .eq('is_active', true)

      const { count: pendingCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .eq('status', 'pending')

      setStats({
        totalOrders: orderCount || 0,
        totalCustomers: customerCount || 0,
        totalRiders: riderCount || 0,
        totalProducts: productCount || 0,
        totalClothing: clothingCount || 0,
        pendingOrders: pendingCount || 0,
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      Alert.alert('Error', 'ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.replace('/(auth)/login' as any)
    } catch (error) {
      Alert.alert('Error', 'ไม่สามารถออกจากระบบได้')
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.card }}>
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>ยินดีต้อนรับ</Text>
            <Text style={styles.adminName}>{adminName || 'Admin'}</Text>
          </View>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
          >
            <Text style={styles.logoutBtnText}>ออกจากระบบ</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>สถิติอย่างรวดเร็ว</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalOrders}</Text>
            <Text style={styles.statLabel}>ออเดอร์ทั้งหมด</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.pendingOrders}</Text>
            <Text style={styles.statLabel}>รอจัดส่ง</Text>
          </View>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalCustomers}</Text>
            <Text style={styles.statLabel}>ลูกค้า</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalRiders}</Text>
            <Text style={styles.statLabel}>พนักงาน</Text>
          </View>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalProducts}</Text>
            <Text style={styles.statLabel}>น้ำยา</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalClothing}</Text>
            <Text style={styles.statLabel}>เสื้อกางเกง</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>ดำเนินการด่วน</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(admin)/laundry' as any)}
        >
          <Text style={styles.actionButtonText}>จัดการน้ำยา</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(admin)/clothing' as any)}
        >
          <Text style={styles.actionButtonText}>จัดการเสื้อกางเกง</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(admin)/riders' as any)}
        >
          <Text style={styles.actionButtonText}>จัดการพนักงาน</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>💡 เคล็ดลับ</Text>
          <Text style={styles.infoText}>
            คุณสามารถเพิ่ม อัปเดต และลบน้ำยา เสื้อกางเกง และพนักงานได้จากเมนูด่วนข้างบน
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.card,
  },
  content: {
    padding: Spacing.three,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 14,
    color: Brand.textSecondary,
    marginBottom: 5,
  },
  adminName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Brand.text,
  },
  logoutBtn: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Brand.text,
    marginBottom: 15,
    marginTop: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Brand.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  actionButton: {
    backgroundColor: Brand.primary,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#e7f5ff',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: Brand.primary,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.primary,
    marginBottom: 5,
  },
  infoText: {
    fontSize: 13,
    color: Brand.text,
    lineHeight: 20,
  },
})

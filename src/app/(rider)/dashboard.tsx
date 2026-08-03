import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../../../lib/supabase'

type Order = {
  id: string
  order_number: string
  status: string
  total_price: number
  delivery_address: string
  created_at: string
  employee_id: string | null
}

export default function RiderDashboard() {
  const [newJobs, setNewJobs] = useState<Order[]>([])
  const [myJobs, setMyJobs] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchJobs = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [newRes, mineRes] = await Promise.all([
      // งานใหม่ = จ่ายแล้ว ยังไม่มีคนรับ
      supabase.from('orders').select('*')
        .eq('status', 'pending')
        .is('employee_id', null)
        .not('paid_at', 'is', null)
        .order('created_at', { ascending: true }),
      // งานของฉัน = รับแล้ว ยังไม่ส่งเสร็จ
      supabase.from('orders').select('*')
        .eq('employee_id', user.id)
        .in('status', ['pending', 'washing'])
        .order('created_at', { ascending: true }),
    ])

    setNewJobs((newRes.data as Order[]) ?? [])
    setMyJobs((mineRes.data as Order[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, 30000)
    return () => clearInterval(interval)
  }, [fetchJobs])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchJobs()
    setRefreshing(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/(auth)/login' as any)
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('th-TH', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    })

  const renderJob = (order: Order, isMine: boolean) => (
    <TouchableOpacity
      key={order.id}
      style={styles.jobCard}
      onPress={() =>
        router.push({
          pathname: '/(rider)/job' as any,
          params: { orderId: order.id },
        })
      }
    >
      <View style={styles.jobHeader}>
        <Text style={styles.jobNumber}>#{order.order_number}</Text>
        <View style={[styles.badge, isMine ? styles.badgeMine : styles.badgeNew]}>
          <Text style={[styles.badgeText, isMine ? styles.badgeTextMine : styles.badgeTextNew]}>
            {isMine
              ? order.status === 'washing' ? 'กำลังซัก' : 'รอรับผ้า'
              : 'งานใหม่'}
          </Text>
        </View>
      </View>
      <Text style={styles.jobAddress} numberOfLines={2}>📍 {order.delivery_address}</Text>
      <View style={styles.jobFooter}>
        <Text style={styles.jobDate}>{formatDate(order.created_at)}</Text>
        <Text style={styles.jobPrice}>{order.total_price} บาท</Text>
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛵 งานส่งผ้า</Text>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <TouchableOpacity onPress={() => router.push('/(rider)/history' as any)}>
            <Text style={styles.navText}>ประวัติ</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>ออก</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1C8A99" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.sectionLabel}>งานของฉัน ({myJobs.length})</Text>
          {myJobs.length === 0 ? (
            <Text style={styles.emptyText}>ยังไม่มีงานที่รับไว้</Text>
          ) : (
            myJobs.map((o) => renderJob(o, true))
          )}

          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
            งานใหม่รอรับ ({newJobs.length})
          </Text>
          {newJobs.length === 0 ? (
            <Text style={styles.emptyText}>ยังไม่มีงานใหม่ — ดึงลงเพื่อรีเฟรช</Text>
          ) : (
            newJobs.map((o) => renderJob(o, false))
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F5F7' },
  header: {
    backgroundColor: '#fff', padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#2C2C2A' },
  navText: { fontSize: 13, color: '#1C8A99', fontWeight: '500' },
  logoutText: { fontSize: 13, color: '#E24B4A' },
  content: { flex: 1, padding: 16 },
  sectionLabel: { fontSize: 13, color: '#888780', marginBottom: 10, fontWeight: '600' },
  emptyText: { fontSize: 13, color: '#B4B2A9', fontStyle: 'italic', marginBottom: 8 },

  jobCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
  },
  jobHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  jobNumber: { fontSize: 15, fontWeight: '700', color: '#2C2C2A' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeNew: { backgroundColor: '#FEF3E2' },
  badgeMine: { backgroundColor: '#E3F1F3' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextNew: { color: '#F5A623' },
  badgeTextMine: { color: '#1C8A99' },
  jobAddress: { fontSize: 13, color: '#2C2C2A', lineHeight: 19, marginBottom: 8 },
  jobFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  jobDate: { fontSize: 12, color: '#888780' },
  jobPrice: { fontSize: 14, fontWeight: '700', color: '#1C8A99' },
})

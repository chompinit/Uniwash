import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../../../lib/supabase'
const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B',
  washing: '#1D9E75',
  ready: '#3B82F6',
  delivering: '#8B5CF6',
  delivered: '#888780',
  cancelled: '#E24B4A',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'รอดำเนินการ',
  washing: 'กำลังซัก',
  ready: 'รอจัดส่ง',
  delivering: 'กำลังจัดส่ง',
  delivered: 'ส่งแล้ว',
  cancelled: 'ยกเลิก',
}
export default function EmployeeDashboard() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [allOrders, setAllOrders] = useState<any[]>([])
  const [tab, setTab] = useState<'pending' | 'accepted' | 'completed'>('pending')
  useEffect(() => {
    fetchData()
    const subscription = supabase
      .channel('orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchData()
      })
      .subscribe()
    return () => {
      subscription.unsubscribe()
    }
  }, [])
  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(prof)
      const { data: orders } = await supabase
        .from('orders')
        .select(`*, profiles!orders_customer_id_fkey(full_name, email, phone)`)
        .order('created_at', { ascending: false })
      if (orders) {
        setAllOrders(orders)
      }
    } catch (error) {
      console.error('Error fetching:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }
  const handleAcceptOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'washing', assigned_rider_id: profile?.id })
        .eq('id', orderId)
      if (error) throw error
      Alert.alert('Success', 'รับงานสำเร็จ')
      fetchData()
    } catch (error: any) {
      Alert.alert('Error', error.message)
    }
  }
  const handleCompleteOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', orderId)
      if (error) throw error
      Alert.alert('Success', 'งานเสร็จแล้ว')
      fetchData()
    } catch (error: any) {
      Alert.alert('Error', error.message)
    }
  }
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/(auth)/login' as any)
  }
  const pendingOrders = allOrders.filter(o => o.status === 'pending')
  const acceptedOrders = allOrders.filter(o =>
    ['washing', 'ready', 'delivering'].includes(o.status)
  )
  const completedOrders = allOrders.filter(o => o.status === 'delivered')
  const displayOrders =
    tab === 'pending'
      ? pendingOrders
      : tab === 'accepted'
        ? acceptedOrders
        : completedOrders
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1C8A99" style={{ marginTop: 40 }} />
      </SafeAreaView>
    )
  }
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🚴 Rider Dashboard</Text>
          <Text style={styles.headerSub}>
            {profile?.full_name || profile?.email || 'Rider'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>ออกจากระบบ</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              fetchData()
            }}
            tintColor="#1C8A99"
          />
        }
      >
        {}
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{pendingOrders.length}</Text>
            <Text style={styles.summaryLabel}>งานใหม่</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: '#1C8A99' }]}>
              {acceptedOrders.length}
            </Text>
            <Text style={styles.summaryLabel}>กำลังดำเนิน</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: '#888780' }]}>
              {completedOrders.length}
            </Text>
            <Text style={styles.summaryLabel}>เสร็จแล้ว</Text>
          </View>
        </View>
        {}
        <View style={styles.tabRow}>
          {['pending', 'accepted', 'completed'].map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t as any)}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === t && styles.tabTextActive,
                ]}
              >
                {t === 'pending'
                  ? `งานใหม่ (${pendingOrders.length})`
                  : t === 'accepted'
                    ? `กำลังดำเนิน (${acceptedOrders.length})`
                    : `เสร็จแล้ว (${completedOrders.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {}
        {displayOrders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>
              {tab === 'pending' ? '🔭' : tab === 'accepted' ? '🎯' : '✅'}
            </Text>
            <Text style={styles.emptyText}>
              {tab === 'pending'
                ? 'ไม่มีงานใหม่'
                : tab === 'accepted'
                  ? 'ไม่มีงานกำลังดำเนิน'
                  : 'ไม่มีงานเสร็จ'}
            </Text>
          </View>
        ) : (
          displayOrders.map(order => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderNum}>
                    ออเดอร์ #{order.order_number}
                  </Text>
                  <Text style={styles.orderDate}>
                    {new Date(order.created_at).toLocaleDateString('th-TH')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        (STATUS_COLOR[order.status] || '#888') + '20',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: STATUS_COLOR[order.status] || '#888' },
                    ]}
                  >
                    {STATUS_LABEL[order.status]}
                  </Text>
                </View>
              </View>
              <View style={styles.orderInfo}>
                <Text style={styles.customerName}>
                  👤 {order.profiles?.full_name || order.profiles?.email}
                </Text>
                {order.profiles?.phone && (
                  <Text style={styles.customerPhone}>
                    📞 {order.profiles.phone}
                  </Text>
                )}
                {order.pickup_address && (
                  <Text style={styles.address}>
                    📍 {order.pickup_address}
                  </Text>
                )}
                <Text style={styles.price}>
                  ฿{order.total_price}
                </Text>
              </View>
              {tab === 'pending' && (
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => handleAcceptOrder(order.id)}
                >
                  <Text style={styles.acceptBtnText}>รับงาน</Text>
                </TouchableOpacity>
              )}
              {tab === 'accepted' && (
                <TouchableOpacity
                  style={styles.completeBtn}
                  onPress={() => handleCompleteOrder(order.id)}
                >
                  <Text style={styles.completeBtnText}>เสร็จแล้ว</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  )
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#1C8A99',
    padding: 16,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  logoutText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  content: { flex: 1, padding: 16 },
  summary: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { fontSize: 28, fontWeight: '700', color: '#1C8A99' },
  summaryLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  summaryDivider: { width: 1, height: 40, backgroundColor: '#e0e0e0' },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: { backgroundColor: '#1C8A99' },
  tabText: { fontSize: 12, color: '#888', fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1C8A99',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNum: { fontSize: 16, fontWeight: '700', color: '#1B1C2A' },
  orderDate: { fontSize: 12, color: '#888', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  orderInfo: { marginBottom: 12 },
  customerName: { fontSize: 14, fontWeight: '600', color: '#1B1C2A', marginTop: 8 },
  customerPhone: { fontSize: 13, color: '#1C8A99', marginTop: 4, fontWeight: '600' },
  address: { fontSize: 13, color: '#888', marginTop: 4 },
  price: { fontSize: 18, fontWeight: '700', color: '#1C8A99', marginTop: 8 },
  acceptBtn: {
    backgroundColor: '#1C8A99',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  completeBtn: {
    backgroundColor: '#15707D',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#888' },
})

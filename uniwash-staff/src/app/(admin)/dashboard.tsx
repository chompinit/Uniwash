// src/app/(staff)/dashboard.tsx
// หน้ารวม Admin + Rider เลือกได้จากไอคอนด้านล่าง

import { router } from 'expo-router'
import { useEffect, useState } from 'react'
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

type Tab = 'admin' | 'rider'

// ── Admin types ──────────────────────────────────────────────────────────────
type Stats = {
  totalOrders: number
  pendingOrders: number
  washingOrders: number
  deliveredOrders: number
  totalRevenue: number
  totalUsers: number
}

// ── Shared constants ─────────────────────────────────────────────────────────
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

// ── Component ────────────────────────────────────────────────────────────────
export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('admin')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  // Admin state
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0, pendingOrders: 0, washingOrders: 0,
    deliveredOrders: 0, totalRevenue: 0, totalUsers: 0,
  })
  const [recentOrders, setRecentOrders] = useState<any[]>([])

  // Rider state
  const [allOrders, setAllOrders] = useState<any[]>([])
  const [riderTab, setRiderTab] = useState<'active' | 'done'>('active')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: prof } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    // fetch orders
    const { data: orders } = await supabase
      .from('orders')
      .select(`*, profiles!orders_customer_id_fkey(full_name, email, phone), packages(name)`)
      .order('created_at', { ascending: false })

    const { count: userCount } = await supabase
      .from('profiles').select('*', { count: 'exact', head: true })

    if (orders) {
      // admin stats
      setStats({
        totalOrders: orders.length,
        pendingOrders: orders.filter(o => o.status === 'pending').length,
        washingOrders: orders.filter(o => o.status === 'washing').length,
        deliveredOrders: orders.filter(o => o.status === 'delivered').length,
        totalRevenue: orders
          .filter(o => o.status !== 'cancelled')
          .reduce((sum, o) => sum + (o.total_price || 0), 0),
        totalUsers: userCount || 0,
      })
      setRecentOrders(orders.slice(0, 5))
      setAllOrders(orders)
    }

    setLoading(false)
    setRefreshing(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login' as any)
  }

  const activeRiderOrders = allOrders.filter(o =>
    ['pending', 'washing', 'ready', 'delivering'].includes(o.status)
  )
  const doneRiderOrders = allOrders.filter(o => o.status === 'delivered')
  const displayRiderOrders = riderTab === 'active' ? activeRiderOrders : doneRiderOrders

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1D9E75" style={{ marginTop: 40 }} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: activeTab === 'admin' ? '#1D9E75' : '#2C2C2A' }]}>
        <View>
          <Text style={styles.headerTitle}>
            {activeTab === 'admin' ? '👑 Admin Dashboard' : '🚴 Rider Dashboard'}
          </Text>
          <Text style={styles.headerSub}>
            {profile?.full_name || profile?.email || 'Staff'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>ออกจากระบบ</Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData() }}
            tintColor="#1D9E75"
          />
        }
      >

        {/* ════ ADMIN TAB ════ */}
        {activeTab === 'admin' && (
          <>
            {/* Stats grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: '#E1F5EE' }]}>
                <Text style={styles.statNum}>{stats.totalOrders}</Text>
                <Text style={styles.statLabel}>ออเดอร์ทั้งหมด</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#FFF3CD' }]}>
                <Text style={[styles.statNum, { color: '#856404' }]}>{stats.pendingOrders}</Text>
                <Text style={styles.statLabel}>รอดำเนินการ</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#E1F5EE' }]}>
                <Text style={[styles.statNum, { color: '#1D9E75' }]}>{stats.washingOrders}</Text>
                <Text style={styles.statLabel}>กำลังซัก</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#F3F4F6' }]}>
                <Text style={[styles.statNum, { color: '#888780' }]}>{stats.deliveredOrders}</Text>
                <Text style={styles.statLabel}>ส่งแล้ว</Text>
              </View>
            </View>

            {/* Revenue + Users */}
            <View style={styles.bigCard}>
              <View style={styles.bigCardItem}>
                <Text style={styles.bigCardNum}>฿{stats.totalRevenue.toLocaleString()}</Text>
                <Text style={styles.bigCardLabel}>รายได้รวม</Text>
              </View>
              <View style={styles.bigCardDivider} />
              <View style={styles.bigCardItem}>
                <Text style={styles.bigCardNum}>{stats.totalUsers}</Text>
                <Text style={styles.bigCardLabel}>ผู้ใช้ทั้งหมด</Text>
              </View>
            </View>

            {/* Menu */}
            <Text style={styles.sectionTitle}>จัดการระบบ</Text>
            <View style={styles.menuGrid}>
              {[
                { icon: '📋', label: 'ออเดอร์ทั้งหมด', path: '/(admin)/order' },
                { icon: '👥', label: 'ผู้ใช้งาน', path: '/(admin)/users' },
                { icon: '📦', label: 'แพ็กเกจ', path: '/(admin)/packages' },
              ].map((menu, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.menuCard}
                  onPress={() => router.push(menu.path as any)}
                >
                  <Text style={styles.menuIcon}>{menu.icon}</Text>
                  <Text style={styles.menuLabel}>{menu.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recent orders */}
            <Text style={styles.sectionTitle}>ออเดอร์ล่าสุด</Text>
            {recentOrders.map(order => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderRow}
                onPress={() => router.push('/(admin)/order' as any)}
              >
                <View>
                  <Text style={styles.orderNum}>#{order.order_number}</Text>
                  <Text style={styles.orderDate}>
                    {new Date(order.created_at).toLocaleDateString('th-TH')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[order.status] || '#888') + '20' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[order.status] || '#888' }]}>
                      {STATUS_LABEL[order.status] || order.status}
                    </Text>
                  </View>
                  <Text style={styles.orderPrice}>฿{order.total_price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ════ RIDER TAB ════ */}
        {activeTab === 'rider' && (
          <>
            {/* Summary */}
            <View style={styles.riderSummary}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{activeRiderOrders.length}</Text>
                <Text style={styles.summaryLabel}>งานที่ต้องทำ</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: '#888780' }]}>{doneRiderOrders.length}</Text>
                <Text style={styles.summaryLabel}>ส่งแล้ว</Text>
              </View>
            </View>

            {/* Sub tabs */}
            <View style={styles.subTabRow}>
              <TouchableOpacity
                style={[styles.subTab, riderTab === 'active' && styles.subTabActive]}
                onPress={() => setRiderTab('active')}
              >
                <Text style={[styles.subTabText, riderTab === 'active' && styles.subTabTextActive]}>
                  งานที่ต้องทำ ({activeRiderOrders.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTab, riderTab === 'done' && styles.subTabActive]}
                onPress={() => setRiderTab('done')}
              >
                <Text style={[styles.subTabText, riderTab === 'done' && styles.subTabTextActive]}>
                  เสร็จแล้ว ({doneRiderOrders.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Orders */}
            {displayRiderOrders.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>{riderTab === 'active' ? '🎉' : '📭'}</Text>
                <Text style={styles.emptyText}>
                  {riderTab === 'active' ? 'ไม่มีงานค้างอยู่' : 'ยังไม่มีงานเสร็จ'}
                </Text>
              </View>
            ) : (
              displayRiderOrders.map(order => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderRow}
                  onPress={() => router.push({
                    pathname: '/(rider)/order-detail' as any,
                    params: { orderId: order.id },
                  })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderNum}>#{order.order_number}</Text>
                    <Text style={styles.orderCustomer}>
                      👤 {order.profiles?.full_name || order.profiles?.email}
                    </Text>
                    {order.profiles?.phone && (
                      <Text style={styles.orderPhone}>📞 {order.profiles.phone}</Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[order.status] || '#888') + '20' }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLOR[order.status] || '#888' }]}>
                        {STATUS_LABEL[order.status] || order.status}
                      </Text>
                    </View>
                    <Text style={styles.orderPrice}>฿{order.total_price}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── Bottom Tab Bar ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.bottomTab, activeTab === 'admin' && styles.bottomTabActive]}
          onPress={() => setActiveTab('admin')}
        >
          <Text style={styles.bottomTabIcon}>👑</Text>
          <Text style={[styles.bottomTabLabel, activeTab === 'admin' && styles.bottomTabLabelActive]}>
            Admin
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bottomTab, activeTab === 'rider' && styles.bottomTabActive]}
          onPress={() => setActiveTab('rider')}
        >
          <Text style={styles.bottomTabIcon}>🚴</Text>
          <Text style={[styles.bottomTabLabel, activeTab === 'rider' && styles.bottomTabLabelActive]}>
            Rider
          </Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    padding: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  logoutText: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  content: { flex: 1, padding: 16 },

  // Admin stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  statCard: { width: '47%', borderRadius: 14, padding: 16, alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '700', color: '#2C2C2A' },
  statLabel: { fontSize: 12, color: '#888780', marginTop: 4 },
  bigCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    flexDirection: 'row', marginBottom: 20,
  },
  bigCardItem: { flex: 1, alignItems: 'center' },
  bigCardNum: { fontSize: 24, fontWeight: '700', color: '#1D9E75' },
  bigCardLabel: { fontSize: 12, color: '#888780', marginTop: 4 },
  bigCardDivider: { width: 1, backgroundColor: '#E0E0E0', marginHorizontal: 8 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  menuCard: {
    width: '30%', backgroundColor: '#fff', borderRadius: 14,
    padding: 16, alignItems: 'center',
    borderWidth: 0.5, borderColor: '#E0E0E0',
  },
  menuIcon: { fontSize: 28, marginBottom: 6 },
  menuLabel: { fontSize: 11, fontWeight: '500', color: '#2C2C2A', textAlign: 'center' },

  // Rider summary
  riderSummary: {
    backgroundColor: '#fff', flexDirection: 'row',
    borderRadius: 14, padding: 16, marginBottom: 12,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { fontSize: 28, fontWeight: '700', color: '#1D9E75' },
  summaryLabel: { fontSize: 12, color: '#888780', marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: '#E0E0E0' },
  subTabRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 14, marginBottom: 12, overflow: 'hidden',
  },
  subTab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  subTabActive: { borderBottomWidth: 2, borderBottomColor: '#1D9E75' },
  subTabText: { fontSize: 13, color: '#888780' },
  subTabTextActive: { color: '#1D9E75', fontWeight: '600' },

  // Shared
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#888780', marginBottom: 10 },
  orderRow: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
    borderWidth: 0.5, borderColor: '#E0E0E0',
  },
  orderNum: { fontSize: 14, fontWeight: '600', color: '#2C2C2A' },
  orderDate: { fontSize: 12, color: '#888780', marginTop: 2 },
  orderCustomer: { fontSize: 13, color: '#888780', marginTop: 4 },
  orderPhone: { fontSize: 13, color: '#1D9E75', marginTop: 2 },
  orderPrice: { fontSize: 14, fontWeight: '700', color: '#1D9E75' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },
  emptyBox: { alignItems: 'center', marginTop: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#888780' },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderTopWidth: 0.5, borderTopColor: '#E0E0E0',
    paddingBottom: 8,
  },
  bottomTab: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
  },
  bottomTabActive: {
    borderTopWidth: 2, borderTopColor: '#1D9E75',
  },
  bottomTabIcon: { fontSize: 22 },
  bottomTabLabel: { fontSize: 11, color: '#888780', marginTop: 2 },
  bottomTabLabelActive: { color: '#1D9E75', fontWeight: '600' },
})

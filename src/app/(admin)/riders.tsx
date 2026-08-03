import { useState, useEffect } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../../../lib/supabase'
import { Brand, Spacing } from '../../constants/theme'

type Rider = {
  id: string
  profile_id: string
  phone: string
  license_plate: string
  status: string
  rating: number
  total_deliveries: number
  profiles: {
    full_name: string
    avatar_url: string
  }
}

type AvailableUser = {
  id: string
  full_name: string
  email: string
}

export default function RidersManagement() {
  const [riders, setRiders] = useState<Rider[]>([])
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    profile_id: '',
    phone: '',
    license_plate: '',
  })

  useEffect(() => {
    fetchRiders()
  }, [])

  const fetchRiders = async () => {
    try {
      const { data, error } = await supabase
        .from('riders')
        .select(`
          id,
          profile_id,
          phone,
          license_plate,
          status,
          rating,
          total_deliveries,
          profiles (full_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      const typedData = (data || []).map(item => ({
        ...item,
        profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
      })) as Rider[]
      setRiders(typedData)
      await fetchAvailableUsers()
    } catch (error: any) {
      Alert.alert('Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'customer')
      if (usersError) throw usersError
      const { data: existingRiders } = await supabase
        .from('riders')
        .select('profile_id')
      const existingIds = new Set(existingRiders?.map(r => r.profile_id) || [])
      const available = (allUsers || []).filter(u => !existingIds.has(u.id))
      setAvailableUsers(available)
    } catch (error: any) {
      console.error('Error fetching available users:', error)
    }
  }

  const handleAddRider = async () => {
    if (!form.profile_id) {
      Alert.alert('Validation', 'กรุณาเลือกผู้ใช้')
      return
    }
    if (!form.phone.trim()) {
      Alert.alert('Validation', 'กรุณากรอกเบอร์โทรศัพท์')
      return
    }
    try {
      setLoading(true)
      const { error: riderError } = await supabase
        .from('riders')
        .insert([{
          profile_id: form.profile_id,
          phone: form.phone,
          license_plate: form.license_plate,
          status: 'active',
        }])
      if (riderError) throw riderError
      const { error: roleError } = await supabase
        .rpc('admin_set_role', {
          p_user_id: form.profile_id,
          p_role: 'employee',
        })
      if (roleError) throw roleError
      Alert.alert('Success', 'เพิ่มพนักงานสำเร็จ')
      setForm({ profile_id: '', phone: '', license_plate: '' })
      setShowForm(false)
      fetchRiders()
    } catch (error: any) {
      Alert.alert('Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (riderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('riders')
        .update({ status: newStatus })
        .eq('id', riderId)
      if (error) throw error
      Alert.alert('Success', 'อัปเดตสถานะสำเร็จ')
      fetchRiders()
    } catch (error: any) {
      Alert.alert('Error', error.message)
    }
  }

  const handleDeleteRider = async (riderId: string, profileId: string) => {
    Alert.alert('Confirm', 'ลบพนักงานนี้ใช่หรือไม่?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            setLoading(true)
            const { error: deleteError } = await supabase
              .from('riders')
              .delete()
              .eq('id', riderId)
            if (deleteError) throw deleteError
            const { error: roleError } = await supabase
              .rpc('admin_set_role', {
                p_user_id: profileId,
                p_role: 'customer',
              })
            if (roleError) throw roleError
            Alert.alert('Success', 'ลบพนักงานสำเร็จ')
            fetchRiders()
          } catch (error: any) {
            Alert.alert('Error', error.message)
          } finally {
            setLoading(false)
          }
        },
      },
    ])
  }

  if (loading && riders.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.card }}>
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {!showForm ? (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>จัดการพนักงาน</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowForm(true)}
            >
              <Text style={styles.addButtonText}>+ เพิ่มใหม่</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={riders}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.riderCard}>
                <View style={styles.riderInfo}>
                  <Text style={styles.riderName}>{item.profiles.full_name}</Text>
                  <Text style={styles.riderPhone}>เบอร์: {item.phone}</Text>
                  {item.license_plate && (
                    <Text style={styles.riderPlate}>ทะเบียน: {item.license_plate}</Text>
                  )}
                  <View style={styles.riderStats}>
                    <Text style={styles.stat}>⭐ {item.rating.toFixed(1)}</Text>
                    <Text style={styles.stat}>📦 {item.total_deliveries}</Text>
                  </View>
                </View>
                <View style={styles.statusContainer}>
                  <Text style={styles.statusLabel}>สถานะ:</Text>
                  {['active', 'inactive', 'suspended'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusButton,
                        item.status === status && styles.statusButtonActive,
                      ]}
                      onPress={() => handleUpdateStatus(item.id, status)}
                    >
                      <Text
                        style={[
                          styles.statusButtonText,
                          item.status === status && styles.statusButtonTextActive,
                        ]}
                      >
                        {status === 'active' ? 'ปกติ' : status === 'inactive' ? 'หยุด' : 'ระงับ'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteRider(item.id, item.profile_id)}
                >
                  <Text style={styles.deleteBtnText}>ลบ</Text>
                </TouchableOpacity>
              </View>
            )}
            scrollEnabled={true}
          />
        </>
      ) : (
        <View style={styles.form}>
          <Text style={styles.formTitle}>เพิ่มพนักงานใหม่</Text>
          <View style={styles.selectContainer}>
            <Text style={styles.label}>เลือกผู้ใช้:</Text>
            <View style={styles.selectWrapper}>
              {availableUsers.length > 0 ? (
                availableUsers.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={[
                      styles.userOption,
                      form.profile_id === user.id && styles.userOptionSelected,
                    ]}
                    onPress={() => setForm({ ...form, profile_id: user.id })}
                  >
                    <View>
                      <Text
                        style={[
                          styles.userName,
                          form.profile_id === user.id && styles.userNameSelected,
                        ]}
                      >
                        {user.full_name}
                      </Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                    </View>
                    {form.profile_id === user.id && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noUsers}>ไม่มีผู้ใช้ที่พร้อมใช้งาน</Text>
              )}
            </View>
          </View>
          <TextInput
            style={styles.input}
            placeholder="เบอร์โทรศัพท์"
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={(text) => setForm({ ...form, phone: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="ทะเบียนรถ (ไม่บังคับ)"
            value={form.license_plate}
            onChangeText={(text) => setForm({ ...form, license_plate: text })}
          />
          <View style={styles.formActions}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleAddRider}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'กำลังบันทึก...' : 'บันทึก'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowForm(false)
                setForm({ profile_id: '', phone: '', license_plate: '' })
              }}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.card },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.three, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  title: { fontSize: 20, fontWeight: 'bold', color: Brand.text },
  addButton: { backgroundColor: Brand.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  addButtonText: { color: 'white', fontWeight: '600' },
  listContent: { padding: Spacing.three, paddingBottom: 100 },
  riderCard: { backgroundColor: 'white', borderRadius: 10, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#e0e0e0' },
  riderInfo: { marginBottom: 15 },
  riderName: { fontSize: 16, fontWeight: 'bold', color: Brand.text, marginBottom: 5 },
  riderPhone: { fontSize: 13, color: Brand.textSecondary },
  riderPlate: { fontSize: 13, color: Brand.textSecondary },
  riderStats: { flexDirection: 'row', gap: 15, marginTop: 8 },
  stat: { fontSize: 14, color: Brand.primary, fontWeight: '600' },
  statusContainer: { marginBottom: 12 },
  statusLabel: { fontSize: 12, fontWeight: '600', color: Brand.text, marginBottom: 8 },
  statusButton: { backgroundColor: '#f0f0f0', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, marginBottom: 6, borderWidth: 1, borderColor: '#e0e0e0' },
  statusButtonActive: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  statusButtonText: { fontSize: 13, color: Brand.text, fontWeight: '500', textAlign: 'center' },
  statusButtonTextActive: { color: 'white' },
  deleteBtn: { backgroundColor: '#ff6b6b', paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  deleteBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },
  form: { flex: 1, padding: Spacing.three },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: Brand.text, marginBottom: 20 },
  selectContainer: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: Brand.text, marginBottom: 10 },
  selectWrapper: { backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  userOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  userOptionSelected: { backgroundColor: '#f5f5ff' },
  userName: { fontSize: 14, fontWeight: '600', color: Brand.text, marginBottom: 4 },
  userNameSelected: { color: Brand.primary },
  userEmail: { fontSize: 12, color: Brand.textSecondary },
  checkmark: { fontSize: 18, color: Brand.primary, fontWeight: 'bold' },
  noUsers: { padding: 15, textAlign: 'center', color: Brand.textSecondary },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, fontSize: 14, color: Brand.text },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  saveButton: { flex: 1, backgroundColor: Brand.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: 'white', fontWeight: '600' },
  cancelButton: { flex: 1, backgroundColor: '#e0e0e0', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelButtonText: { color: Brand.text, fontWeight: '600' },
})

import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../../../lib/supabase'
import { Brand, Spacing } from '../../constants/theme'

type Employee = {
  id: string
  email: string
  full_name: string
  phone: string | null
  rider?: { license_plate: string | null; status: string } | null
}

export default function EmployeesManagement() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '', license_plate: '' })

  useEffect(() => { fetchEmployees() }, [])

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, riders (license_plate, status)')
        .eq('role', 'employee')
        .order('created_at', { ascending: false })
      if (error) throw error
      const mapped = (data || []).map((d: any) => ({
        ...d,
        rider: Array.isArray(d.riders) ? d.riders[0] : d.riders,
      })) as Employee[]
      setEmployees(mapped)
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!form.email.trim() || !form.password || !form.full_name.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอก อีเมล รหัสผ่าน และชื่อ ให้ครบ'); return
    }
    if (form.password.length < 6) {
      Alert.alert('แจ้งเตือน', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return
    }
    setSaving(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'create_employee',
          email: form.email.trim().toLowerCase(),
          password: form.password,
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          license_plate: form.license_plate.trim(),
        },
      })
      if (error) throw error
      if ((data as any)?.error) throw new Error((data as any).error)
      Alert.alert('สำเร็จ', 'สร้างบัญชีพนักงานแล้ว')
      setForm({ email: '', password: '', full_name: '', phone: '', license_plate: '' })
      setShowForm(false)
      fetchEmployees()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (emp: Employee) => {
    Alert.alert('ยืนยันการลบ', `ลบบัญชีพนักงาน "${emp.full_name}" ถาวร?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบถาวร', style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true)
            const { data, error } = await supabase.functions.invoke('admin-users', {
              body: { action: 'delete_user', user_id: emp.id },
            })
            if (error) throw error
            if ((data as any)?.error) throw new Error((data as any).error)
            Alert.alert('สำเร็จ', 'ลบบัญชีพนักงานแล้ว')
            fetchEmployees()
          } catch (e: any) {
            Alert.alert('Error', e.message)
            setLoading(false)
          }
        },
      },
    ])
  }

  if (loading && employees.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Brand.primary} /></View>
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← กลับ</Text></TouchableOpacity>
        <Text style={styles.title}>จัดการพนักงาน</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Text style={styles.addBtnText}>+ เพิ่ม</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={employees}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>ยังไม่มีพนักงาน</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.full_name || '(ไม่มีชื่อ)'}</Text>
              <Text style={styles.sub}>{item.email}</Text>
              {item.phone ? <Text style={styles.sub}>📞 {item.phone}</Text> : null}
              {item.rider?.license_plate ? <Text style={styles.sub}>🛵 {item.rider.license_plate}</Text> : null}
              {item.rider?.status ? (
                <Text style={[styles.status, item.rider.status === 'active' ? styles.statusOn : styles.statusOff]}>
                  {item.rider.status === 'active' ? '● ปฏิบัติงาน' : '○ ' + item.rider.status}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
              <Text style={styles.delBtnText}>ลบ</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBg}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>เพิ่มพนักงานใหม่</Text>
              <Text style={styles.label}>อีเมล *</Text>
              <TextInput style={styles.input} value={form.email} autoCapitalize="none" keyboardType="email-address"
                onChangeText={(t) => setForm({ ...form, email: t })} placeholder="email@example.com" />
              <Text style={styles.label}>รหัสผ่าน * (อย่างน้อย 6 ตัว)</Text>
              <TextInput style={styles.input} value={form.password} secureTextEntry
                onChangeText={(t) => setForm({ ...form, password: t })} placeholder="รหัสผ่าน" />
              <Text style={styles.label}>ชื่อ-นามสกุล *</Text>
              <TextInput style={styles.input} value={form.full_name}
                onChangeText={(t) => setForm({ ...form, full_name: t })} placeholder="ชื่อพนักงาน" />
              <Text style={styles.label}>เบอร์โทร</Text>
              <TextInput style={styles.input} value={form.phone} keyboardType="phone-pad"
                onChangeText={(t) => setForm({ ...form, phone: t })} placeholder="เบอร์โทร" />
              <Text style={styles.label}>ทะเบียนรถ (ไม่บังคับ)</Text>
              <TextInput style={styles.input} value={form.license_plate}
                onChangeText={(t) => setForm({ ...form, license_plate: t })} placeholder="ทะเบียนรถ" />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)} disabled={saving}>
                  <Text style={styles.cancelBtnText}>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={saving}>
                  <Text style={styles.saveBtnText}>{saving ? 'กำลังสร้าง...' : 'สร้างบัญชี'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.three, backgroundColor: Brand.card, borderBottomWidth: 1, borderBottomColor: Brand.border },
  back: { color: Brand.primary, fontSize: 15 },
  title: { fontSize: 18, fontWeight: '700', color: Brand.text },
  addBtn: { backgroundColor: Brand.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  list: { padding: Spacing.three, paddingBottom: 40 },
  empty: { textAlign: 'center', color: Brand.textSecondary, marginTop: 40 },
  card: { flexDirection: 'row', backgroundColor: Brand.card, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Brand.border, alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: Brand.text },
  sub: { fontSize: 12, color: Brand.textSecondary, marginTop: 2 },
  status: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  statusOn: { color: Brand.success },
  statusOff: { color: Brand.textSecondary },
  delBtn: { backgroundColor: '#FCE8E6', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  delBtnText: { color: Brand.danger, fontWeight: '700', fontSize: 13 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Brand.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.four, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Brand.text, marginBottom: 16 },
  label: { fontSize: 13, color: Brand.textSecondary, marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: Brand.inputBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Brand.text },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, backgroundColor: Brand.inputBg, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { color: Brand.text, fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: Brand.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
})

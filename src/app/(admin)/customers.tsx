import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../../../lib/supabase'
import { Brand, Spacing } from '../../constants/theme'

type Customer = {
  id: string
  email: string
  full_name: string
  phone: string | null
  coins: number
}

export default function CustomersManagement() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState({ full_name: '', phone: '', coins: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchCustomers() }, [])

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, coins')
        .eq('role', 'customer')
        .order('created_at', { ascending: false })
      if (error) throw error
      setCustomers((data as Customer[]) || [])
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (c: Customer) => {
    setEditing(c)
    setForm({ full_name: c.full_name || '', phone: c.phone || '', coins: String(c.coins ?? 0) })
  }

  const handleSave = async () => {
    if (!editing) return
    if (!form.full_name.trim()) { Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่อ'); return }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: form.full_name.trim(), phone: form.phone.trim() || null })
        .eq('id', editing.id)
      if (error) throw error

      // ปรับเหรียญผ่าน RPC (ถ้าเปลี่ยน)
      const newCoins = parseInt(form.coins, 10)
      if (!isNaN(newCoins) && newCoins !== editing.coins) {
        const delta = newCoins - editing.coins
        const { error: coinErr } = await supabase.rpc('admin_adjust_coins', {
          p_user_id: editing.id,
          p_amount: delta,
        })
        if (coinErr) throw coinErr
      }
      Alert.alert('สำเร็จ', 'บันทึกข้อมูลลูกค้าแล้ว')
      setEditing(null)
      fetchCustomers()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (c: Customer) => {
    Alert.alert('ยืนยันการลบ', `ลบบัญชี "${c.full_name}" ถาวร?\nข้อมูลทั้งหมดจะหายและกู้คืนไม่ได้`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบถาวร', style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true)
            const { data, error } = await supabase.functions.invoke('admin-users', {
              body: { action: 'delete_user', user_id: c.id },
            })
            if (error) throw error
            if ((data as any)?.error) throw new Error((data as any).error)
            Alert.alert('สำเร็จ', 'ลบบัญชีแล้ว')
            fetchCustomers()
          } catch (e: any) {
            Alert.alert('Error', e.message)
            setLoading(false)
          }
        },
      },
    ])
  }

  if (loading && customers.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Brand.primary} /></View>
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← กลับ</Text></TouchableOpacity>
        <Text style={styles.title}>จัดการลูกค้า</Text>
        <View style={{ width: 50 }} />
      </View>

      <FlatList
        data={customers}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>ยังไม่มีลูกค้า</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.full_name || '(ไม่มีชื่อ)'}</Text>
              <Text style={styles.sub}>{item.email}</Text>
              {item.phone ? <Text style={styles.sub}>📞 {item.phone}</Text> : null}
              <Text style={styles.coins}>🪙 {item.coins} เหรียญ</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                <Text style={styles.editBtnText}>แก้ไข</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                <Text style={styles.delBtnText}>ลบ</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>แก้ไขข้อมูลลูกค้า</Text>
            <Text style={styles.label}>ชื่อ-นามสกุล</Text>
            <TextInput style={styles.input} value={form.full_name}
              onChangeText={(t) => setForm({ ...form, full_name: t })} placeholder="ชื่อ" />
            <Text style={styles.label}>เบอร์โทร</Text>
            <TextInput style={styles.input} value={form.phone} keyboardType="phone-pad"
              onChangeText={(t) => setForm({ ...form, phone: t })} placeholder="เบอร์โทร" />
            <Text style={styles.label}>เหรียญ (coins)</Text>
            <TextInput style={styles.input} value={form.coins} keyboardType="number-pad"
              onChangeText={(t) => setForm({ ...form, coins: t })} placeholder="0" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)} disabled={saving}>
                <Text style={styles.cancelBtnText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.three, backgroundColor: Brand.card, borderBottomWidth: 1, borderBottomColor: Brand.border },
  back: { color: Brand.primary, fontSize: 15, width: 50 },
  title: { fontSize: 18, fontWeight: '700', color: Brand.text },
  list: { padding: Spacing.three, paddingBottom: 40 },
  empty: { textAlign: 'center', color: Brand.textSecondary, marginTop: 40 },
  card: { flexDirection: 'row', backgroundColor: Brand.card, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Brand.border, alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: Brand.text },
  sub: { fontSize: 12, color: Brand.textSecondary, marginTop: 2 },
  coins: { fontSize: 13, color: Brand.gold, fontWeight: '700', marginTop: 4 },
  actions: { gap: 8 },
  editBtn: { backgroundColor: Brand.primaryLight, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  editBtnText: { color: Brand.primary, fontWeight: '700', fontSize: 13 },
  delBtn: { backgroundColor: '#FCE8E6', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  delBtnText: { color: Brand.danger, fontWeight: '700', fontSize: 13 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Brand.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.four },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Brand.text, marginBottom: 16 },
  label: { fontSize: 13, color: Brand.textSecondary, marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: Brand.inputBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Brand.text },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, backgroundColor: Brand.inputBg, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { color: Brand.text, fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: Brand.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
})

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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../../../lib/supabase'
import { Brand, Spacing } from '../../constants/theme'

type Pkg = {
  id: string
  name: string
  description: string | null
  min_items: number | null
  max_items: number | null
  delivery_km: number | null
  is_active: boolean
}

const emptyForm = { name: '', description: '', min_items: '', max_items: '', delivery_km: '', is_active: true }

export default function PackagesManagement() {
  const [packages, setPackages] = useState<Pkg[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchPackages() }, [])

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('id, name, description, min_items, max_items, delivery_km, is_active')
        .order('created_at', { ascending: true })
      if (error) throw error
      setPackages((data as Pkg[]) || [])
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  const openNew = () => { setEditingId(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (p: Pkg) => {
    setEditingId(p.id)
    setForm({
      name: p.name || '',
      description: p.description || '',
      min_items: p.min_items != null ? String(p.min_items) : '',
      max_items: p.max_items != null ? String(p.max_items) : '',
      delivery_km: p.delivery_km != null ? String(p.delivery_km) : '',
      is_active: p.is_active,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่อแพ็กเกจ'); return }
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      min_items: form.min_items ? parseInt(form.min_items, 10) : null,
      max_items: form.max_items ? parseInt(form.max_items, 10) : null,
      delivery_km: form.delivery_km ? parseInt(form.delivery_km, 10) : null,
      is_active: form.is_active,
    }
    try {
      if (editingId) {
        const { error } = await supabase.from('packages').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('packages').insert(payload)
        if (error) throw error
      }
      Alert.alert('สำเร็จ', editingId ? 'แก้ไขแพ็กเกจแล้ว' : 'เพิ่มแพ็กเกจแล้ว')
      setShowForm(false)
      fetchPackages()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (p: Pkg) => {
    Alert.alert('ยืนยันการลบ', `ลบแพ็กเกจ "${p.name}"?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ', style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('packages').delete().eq('id', p.id)
            if (error) throw error
            fetchPackages()
          } catch (e: any) { Alert.alert('Error', e.message) }
        },
      },
    ])
  }

  if (loading && packages.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Brand.primary} /></View>
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← กลับ</Text></TouchableOpacity>
        <Text style={styles.title}>จัดการแพ็กเกจ</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Text style={styles.addBtnText}>+ เพิ่ม</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={packages}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>ยังไม่มีแพ็กเกจ</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={[styles.badge, item.is_active ? styles.badgeOn : styles.badgeOff]}>
                <Text style={[styles.badgeText, item.is_active ? styles.badgeTextOn : styles.badgeTextOff]}>
                  {item.is_active ? 'เปิดใช้' : 'ปิด'}
                </Text>
              </View>
            </View>
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
            <Text style={styles.meta}>
              จำนวน {item.min_items ?? '-'}–{item.max_items ?? '-'} ชิ้น · ส่งฟรี {item.delivery_km ?? '-'} กม.
            </Text>
            <View style={styles.cardActions}>
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

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBg}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>{editingId ? 'แก้ไขแพ็กเกจ' : 'เพิ่มแพ็กเกจ'}</Text>
              <Text style={styles.label}>ชื่อแพ็กเกจ *</Text>
              <TextInput style={styles.input} value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })} placeholder="เช่น แพ็กเกจมาตรฐาน" />
              <Text style={styles.label}>รายละเอียด</Text>
              <TextInput style={[styles.input, { height: 80 }]} value={form.description} multiline
                onChangeText={(t) => setForm({ ...form, description: t })} placeholder="รายละเอียดแพ็กเกจ" />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>ชิ้นต่ำสุด</Text>
                  <TextInput style={styles.input} value={form.min_items} keyboardType="number-pad"
                    onChangeText={(t) => setForm({ ...form, min_items: t })} placeholder="0" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>ชิ้นสูงสุด</Text>
                  <TextInput style={styles.input} value={form.max_items} keyboardType="number-pad"
                    onChangeText={(t) => setForm({ ...form, max_items: t })} placeholder="0" />
                </View>
              </View>
              <Text style={styles.label}>ระยะส่งฟรี (กม.)</Text>
              <TextInput style={styles.input} value={form.delivery_km} keyboardType="number-pad"
                onChangeText={(t) => setForm({ ...form, delivery_km: t })} placeholder="0" />
              <View style={styles.switchRow}>
                <Text style={styles.label}>เปิดใช้งานแพ็กเกจ</Text>
                <Switch value={form.is_active} onValueChange={(v) => setForm({ ...form, is_active: v })}
                  trackColor={{ true: Brand.primary }} />
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)} disabled={saving}>
                  <Text style={styles.cancelBtnText}>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                  <Text style={styles.saveBtnText}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Text>
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
  card: { backgroundColor: Brand.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Brand.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: Brand.text, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeOn: { backgroundColor: Brand.primaryLight },
  badgeOff: { backgroundColor: '#F0F0F0' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextOn: { color: Brand.primary },
  badgeTextOff: { color: Brand.textSecondary },
  desc: { fontSize: 13, color: Brand.textSecondary, marginTop: 6 },
  meta: { fontSize: 12, color: Brand.text, marginTop: 8 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  editBtn: { flex: 1, backgroundColor: Brand.primaryLight, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  editBtnText: { color: Brand.primary, fontWeight: '700', fontSize: 13 },
  delBtn: { flex: 1, backgroundColor: '#FCE8E6', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  delBtnText: { color: Brand.danger, fontWeight: '700', fontSize: 13 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Brand.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.four, maxHeight: '88%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Brand.text, marginBottom: 12 },
  label: { fontSize: 13, color: Brand.textSecondary, marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: Brand.inputBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Brand.text, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, backgroundColor: Brand.inputBg, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { color: Brand.text, fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: Brand.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
})

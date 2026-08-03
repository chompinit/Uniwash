import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Modal,
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

type Package = {
  id: string
  name: string
  description: string
  min_items: number
  max_items: number
  delivery_km: number
  is_active: boolean
}

const EMPTY_FORM = {
  name: '',
  description: '',
  min_items: '',
  max_items: '',
  delivery_km: '',
  is_active: true,
}

export default function AdminPackagesScreen() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => { fetchPackages() }, [])

  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .order('created_at', { ascending: true })

    if (!error) setPackages(data || [])
    setLoading(false)
  }

  // เปิด Modal เพิ่มใหม่
  const handleAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  // เปิด Modal แก้ไข
  const handleEdit = (pkg: Package) => {
    setEditingId(pkg.id)
    setForm({
      name: pkg.name,
      description: pkg.description,
      min_items: String(pkg.min_items),
      max_items: String(pkg.max_items),
      delivery_km: String(pkg.delivery_km),
      is_active: pkg.is_active,
    })
    setShowModal(true)
  }

  // Validate form
  const validate = () => {
    if (!form.name.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่อแพ็กเกจ')
      return false
    }
    if (!form.min_items || !form.max_items || !form.delivery_km) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบ')
      return false
    }
    if (Number(form.min_items) > Number(form.max_items)) {
      Alert.alert('แจ้งเตือน', 'จำนวนขั้นต่ำต้องน้อยกว่าจำนวนสูงสุด')
      return false
    }
    return true
  }

  // บันทึก (เพิ่ม/แก้ไข)
  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      min_items: Number(form.min_items),
      max_items: Number(form.max_items),
      delivery_km: Number(form.delivery_km),
      is_active: form.is_active,
    }

    if (editingId) {
      // แก้ไข
      const { error } = await supabase
        .from('packages')
        .update(payload)
        .eq('id', editingId)

      if (error) {
        Alert.alert('เกิดข้อผิดพลาด', error.message)
      } else {
        Alert.alert('✅ สำเร็จ', 'แก้ไขแพ็กเกจแล้ว')
        setShowModal(false)
        fetchPackages()
      }
    } else {
      // เพิ่มใหม่
      const { error } = await supabase
        .from('packages')
        .insert(payload)

      if (error) {
        Alert.alert('เกิดข้อผิดพลาด', error.message)
      } else {
        Alert.alert('✅ สำเร็จ', 'เพิ่มแพ็กเกจแล้ว')
        setShowModal(false)
        fetchPackages()
      }
    }

    setSaving(false)
  }

  // ลบแพ็กเกจ
  const handleDelete = (pkg: Package) => {
    Alert.alert(
      'ลบแพ็กเกจ',
      `ต้องการลบ "${pkg.name}" ใช่ไหม?\nออเดอร์ที่ใช้แพ็กเกจนี้อยู่จะไม่ได้รับผลกระทบ`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('packages')
              .delete()
              .eq('id', pkg.id)

            if (error) {
              Alert.alert('เกิดข้อผิดพลาด', error.message)
            } else {
              fetchPackages()
            }
          },
        },
      ]
    )
  }

  // เปิด/ปิดแพ็กเกจเร็ว
  const toggleActive = async (pkg: Package) => {
    await supabase
      .from('packages')
      .update({ is_active: !pkg.is_active })
      .eq('id', pkg.id)
    fetchPackages()
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← กลับ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>จัดการแพ็กเกจ</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Text style={styles.addBtnText}>+ เพิ่ม</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1D9E75" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.content}>
          {packages.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyText}>ยังไม่มีแพ็กเกจ</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={handleAdd}>
                <Text style={styles.emptyBtnText}>+ เพิ่มแพ็กเกจแรก</Text>
              </TouchableOpacity>
            </View>
          ) : (
            packages.map(pkg => (
              <View key={pkg.id} style={styles.pkgCard}>

                {/* ส่วนบน — ชื่อ + toggle */}
                <View style={styles.pkgTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pkgName}>{pkg.name}</Text>
                    <Text style={styles.pkgDesc}>{pkg.description}</Text>
                  </View>
                  <Switch
                    value={pkg.is_active}
                    onValueChange={() => toggleActive(pkg)}
                    trackColor={{ false: '#E0E0E0', true: '#1D9E75' }}
                    thumbColor="#fff"
                  />
                </View>

                {/* ข้อมูล */}
                <View style={styles.pkgInfo}>
                  <View style={styles.infoChip}>
                    <Text style={styles.infoChipText}>
                      📦 {pkg.min_items}–{pkg.max_items} ชิ้น
                    </Text>
                  </View>
                  <View style={styles.infoChip}>
                    <Text style={styles.infoChipText}>
                      🚴 {pkg.delivery_km} กม.
                    </Text>
                  </View>
                  <View style={[
                    styles.infoChip,
                    { backgroundColor: pkg.is_active ? '#E1F5EE' : '#F3F4F6' }
                  ]}>
                    <Text style={[
                      styles.infoChipText,
                      { color: pkg.is_active ? '#1D9E75' : '#888780' }
                    ]}>
                      {pkg.is_active ? '✅ เปิดใช้งาน' : '⏸ ปิดใช้งาน'}
                    </Text>
                  </View>
                </View>

                {/* ปุ่ม */}
                <View style={styles.pkgActions}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => handleEdit(pkg)}
                  >
                    <Text style={styles.editBtnText}>✏️ แก้ไข</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(pkg)}
                  >
                    <Text style={styles.deleteBtnText}>🗑 ลบ</Text>
                  </TouchableOpacity>
                </View>

              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Modal เพิ่ม/แก้ไข */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>

              <Text style={styles.modalTitle}>
                {editingId ? '✏️ แก้ไขแพ็กเกจ' : '➕ เพิ่มแพ็กเกจใหม่'}
              </Text>

              <Text style={styles.inputLabel}>ชื่อแพ็กเกจ *</Text>
              <TextInput
                style={styles.input}
                placeholder="เช่น แพ็กเกจซักทั่วไป"
                placeholderTextColor="#B4B2A9"
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
              />

              <Text style={styles.inputLabel}>คำอธิบาย</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="รายละเอียดแพ็กเกจ"
                placeholderTextColor="#B4B2A9"
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
                multiline
                numberOfLines={3}
              />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>จำนวนขั้นต่ำ (ชิ้น) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="เช่น 7"
                    placeholderTextColor="#B4B2A9"
                    value={form.min_items}
                    onChangeText={v => setForm(f => ({ ...f, min_items: v }))}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>จำนวนสูงสุด (ชิ้น) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="เช่น 50"
                    placeholderTextColor="#B4B2A9"
                    value={form.max_items}
                    onChangeText={v => setForm(f => ({ ...f, max_items: v }))}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>รัศมีจัดส่ง (กม.) *</Text>
              <TextInput
                style={styles.input}
                placeholder="เช่น 1"
                placeholderTextColor="#B4B2A9"
                value={form.delivery_km}
                onChangeText={v => setForm(f => ({ ...f, delivery_km: v }))}
                keyboardType="number-pad"
              />

              <View style={styles.switchRow}>
                <Text style={styles.inputLabel}>เปิดใช้งาน</Text>
                <Switch
                  value={form.is_active}
                  onValueChange={v => setForm(f => ({ ...f, is_active: v }))}
                  trackColor={{ false: '#E0E0E0', true: '#1D9E75' }}
                  thumbColor="#fff"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>
                      {editingId ? 'บันทึกการแก้ไข' : 'เพิ่มแพ็กเกจ'}
                    </Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelBtnText}>ยกเลิก</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>

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
  addBtn: {
    backgroundColor: '#1D9E75', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  emptyBox: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#888780', marginBottom: 16 },
  emptyBtn: {
    backgroundColor: '#1D9E75', borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  pkgCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 0.5, borderColor: '#E0E0E0',
  },
  pkgTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 10,
  },
  pkgName: { fontSize: 15, fontWeight: '700', color: '#2C2C2A', marginBottom: 4 },
  pkgDesc: { fontSize: 12, color: '#888780', lineHeight: 18 },
  pkgInfo: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12,
  },
  infoChip: {
    backgroundColor: '#F3F4F6', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  infoChipText: { fontSize: 11, color: '#888780', fontWeight: '500' },
  pkgActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    flex: 1, backgroundColor: '#E1F5EE', borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
  },
  editBtnText: { fontSize: 13, color: '#1D9E75', fontWeight: '500' },
  deleteBtn: {
    flex: 1, backgroundColor: '#FEE2E2', borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
  },
  deleteBtnText: { fontSize: 13, color: '#E24B4A', fontWeight: '500' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18, fontWeight: '700', color: '#2C2C2A',
    marginBottom: 20,
  },
  inputLabel: { fontSize: 13, color: '#888780', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#2C2C2A',
    backgroundColor: '#FAFAFA', marginBottom: 14,
  },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  rowInputs: { flexDirection: 'row' },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  saveBtn: {
    backgroundColor: '#1D9E75', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, color: '#888780' },
})
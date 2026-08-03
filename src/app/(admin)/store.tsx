import * as Location from 'expo-location'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

export default function StoreSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', latitude: '', longitude: '' })

  useEffect(() => { fetchSettings() }, [])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('name, address, latitude, longitude')
        .eq('id', 1)
        .single()
      if (error) throw error
      setForm({
        name: data?.name || '',
        address: data?.address || '',
        latitude: data?.latitude != null ? String(data.latitude) : '',
        longitude: data?.longitude != null ? String(data.longitude) : '',
      })
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  const useCurrentLocation = async () => {
    setLocating(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('ไม่ได้รับอนุญาต', 'กรุณาอนุญาตการเข้าถึงตำแหน่ง')
        return
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      setForm((f) => ({
        ...f,
        latitude: loc.coords.latitude.toFixed(6),
        longitude: loc.coords.longitude.toFixed(6),
      }))
    } catch (e: any) {
      Alert.alert('Error', 'ดึงตำแหน่งไม่สำเร็จ: ' + e.message)
    } finally {
      setLocating(false)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่อร้าน'); return }
    const lat = form.latitude ? parseFloat(form.latitude) : null
    const lng = form.longitude ? parseFloat(form.longitude) : null
    if ((form.latitude && isNaN(lat as number)) || (form.longitude && isNaN(lng as number))) {
      Alert.alert('แจ้งเตือน', 'พิกัดไม่ถูกต้อง'); return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('store_settings')
        .update({
          name: form.name.trim(),
          address: form.address.trim() || null,
          latitude: lat,
          longitude: lng,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1)
      if (error) throw error
      Alert.alert('สำเร็จ', 'บันทึกข้อมูลร้านแล้ว')
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Brand.primary} /></View>
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← กลับ</Text></TouchableOpacity>
        <Text style={styles.title}>ที่อยู่ร้าน</Text>
        <View style={{ width: 50 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>ชื่อร้าน *</Text>
          <TextInput style={styles.input} value={form.name}
            onChangeText={(t) => setForm({ ...form, name: t })} placeholder="ชื่อร้าน" />

          <Text style={styles.label}>ที่อยู่</Text>
          <TextInput style={[styles.input, { height: 90 }]} value={form.address} multiline
            onChangeText={(t) => setForm({ ...form, address: t })} placeholder="ที่อยู่ร้าน" />

          <Text style={styles.label}>พิกัด GPS</Text>
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1 }]} value={form.latitude} keyboardType="numbers-and-punctuation"
              onChangeText={(t) => setForm({ ...form, latitude: t })} placeholder="latitude" />
            <TextInput style={[styles.input, { flex: 1 }]} value={form.longitude} keyboardType="numbers-and-punctuation"
              onChangeText={(t) => setForm({ ...form, longitude: t })} placeholder="longitude" />
          </View>

          <TouchableOpacity style={styles.gpsBtn} onPress={useCurrentLocation} disabled={locating}>
            <Text style={styles.gpsBtnText}>{locating ? 'กำลังดึงตำแหน่ง...' : '📍 ใช้ตำแหน่งปัจจุบัน'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.three, backgroundColor: Brand.card, borderBottomWidth: 1, borderBottomColor: Brand.border },
  back: { color: Brand.primary, fontSize: 15, width: 50 },
  title: { fontSize: 18, fontWeight: '700', color: Brand.text },
  content: { padding: Spacing.three, paddingBottom: 40 },
  label: { fontSize: 13, color: Brand.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Brand.inputBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Brand.text, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  gpsBtn: { backgroundColor: Brand.primaryLight, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 14 },
  gpsBtnText: { color: Brand.primary, fontWeight: '700' },
  saveBtn: { backgroundColor: Brand.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})

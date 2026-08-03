import * as Location from 'expo-location'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Brand } from '../../constants/theme'
import { supabase } from '../../../lib/supabase'
const LABELS = ['HOME', 'WORK', 'à¸­à¸·à¹ˆà¸™ à¹†']
export default function AddAddressScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const isEdit = !!id
  const [label, setLabel]     = useState('HOME')
  const [address, setAddress] = useState('')
  const [lat, setLat]         = useState<number | null>(null)
  const [lng, setLng]         = useState<number | null>(null)
  const [gpsLoading, setGps]  = useState(false)
  const [saving, setSaving]   = useState(false)
  useEffect(() => { if (isEdit) loadExisting() }, [])
  const loadExisting = async () => {
    const { data } = await supabase
      .from('addresses')
      .select('label, address, lat, lng')
      .eq('id', id)
      .single()
    if (data) {
      setLabel(data.label ?? 'HOME')
      setAddress(data.address ?? '')
      setLat(data.lat ?? null)
      setLng(data.lng ?? null)
    }
  }
  const handleUseGPS = async () => {
    setGps(true)
    try {
      const enabled = await Location.hasServicesEnabledAsync()
      if (!enabled) {
        Alert.alert('GPS à¸›à¸´à¸”à¸­à¸¢à¸¹à¹ˆ', 'à¸à¸£à¸¸à¸“à¸²à¹€à¸›à¸´à¸” Location Services à¸à¹ˆà¸­à¸™à¹ƒà¸Šà¹‰à¸‡à¸²à¸™', [
          { text: 'à¸¢à¸à¹€à¸¥à¸´à¸', style: 'cancel' },
          { text: 'à¹€à¸›à¸´à¸”à¸à¸²à¸£à¸•à¸±à¹‰à¸‡à¸„à¹ˆà¸²', onPress: () => Linking.openSettings() },
        ])
        setGps(false); return
      }
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸£à¸±à¸šà¸­à¸™à¸¸à¸à¸²à¸•', 'à¸à¸£à¸¸à¸“à¸²à¸­à¸™à¸¸à¸à¸²à¸•à¹ƒà¸«à¹‰à¹à¸­à¸›à¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡à¸•à¸³à¹à¸«à¸™à¹ˆà¸‡', [
          { text: 'à¸¢à¸à¹€à¸¥à¸´à¸', style: 'cancel' },
          { text: 'à¹€à¸›à¸´à¸”à¸à¸²à¸£à¸•à¸±à¹‰à¸‡à¸„à¹ˆà¸²', onPress: () => Linking.openSettings() },
        ])
        setGps(false); return
      }
      let loc = await Location.getLastKnownPositionAsync()
      if (!loc) loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest })
      const { latitude, longitude } = loc.coords
      setLat(latitude); setLng(longitude)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=th`,
          { headers: { 'User-Agent': 'UniWashApp/1.0' } }
        )
        const json = await res.json()
        setAddress(json?.display_name ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
      } catch {
        setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
      }
    } catch (err: any) {
      Alert.alert('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”', err?.message ?? String(err))
    }
    setGps(false)
  }
  const handleSave = async () => {
    if (!address.trim()) { Alert.alert('à¹à¸ˆà¹‰à¸‡à¹€à¸•à¸·à¸­à¸™', 'à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆ'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const payload = { user_id: user.id, label, address: address.trim(), lat, lng }
    const { error } = isEdit
      ? await supabase.from('addresses').update(payload).eq('id', id)
      : await supabase.from('addresses').insert(payload)
    setSaving(false)
    if (error) { Alert.alert('à¸šà¸±à¸™à¸—à¸¶à¸à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ', error.message); return }
    router.back()
  }
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Text style={styles.iconText}>â€¹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'à¹à¸à¹‰à¹„à¸‚à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆ' : 'à¹€à¸žà¸´à¹ˆà¸¡à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆà¹ƒà¸«à¸¡à¹ˆ'}</Text>
        <View style={{ width: 36 }} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {}
          <TouchableOpacity style={styles.gpsBanner} onPress={handleUseGPS} disabled={gpsLoading} activeOpacity={0.85}>
            {gpsLoading
              ? <ActivityIndicator color={Brand.primary} />
              : <>
                  <Text style={styles.gpsIcon}>ðŸ“</Text>
                  <Text style={styles.gpsText}>à¹ƒà¸Šà¹‰à¸•à¸³à¹à¸«à¸™à¹ˆà¸‡à¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™ (GPS)</Text>
                </>}
          </TouchableOpacity>
          {lat && lng ? (
            <Text style={styles.coord}>à¸žà¸´à¸à¸±à¸”: {lat.toFixed(5)}, {lng.toFixed(5)}</Text>
          ) : null}
          {}
          <Text style={styles.label}>à¸›à¸£à¸°à¹€à¸ à¸—à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆ</Text>
          <View style={styles.chipRow}>
            {LABELS.map(l => (
              <TouchableOpacity
                key={l}
                style={[styles.chip, label === l && styles.chipOn]}
                onPress={() => setLabel(l)}
              >
                <Text style={[styles.chipText, label === l && styles.chipTextOn]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {}
          <Text style={styles.label}>à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆ</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={address}
            onChangeText={setAddress}
            placeholder="à¸šà¹‰à¸²à¸™à¹€à¸¥à¸‚à¸—à¸µà¹ˆ à¸«à¸¡à¸¹à¹ˆ à¸–à¸™à¸™ à¸•à¸³à¸šà¸¥ à¸­à¸³à¹€à¸ à¸­ à¸ˆà¸±à¸‡à¸«à¸§à¸±à¸” à¸£à¸«à¸±à¸ªà¹„à¸›à¸£à¸©à¸“à¸µà¸¢à¹Œ"
            placeholderTextColor={Brand.textSecondary}
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity
            style={[styles.btnPrimary, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>à¸šà¸±à¸™à¸—à¸¶à¸</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.card },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Brand.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 22, color: Brand.text, lineHeight: 24 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Brand.text },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  gpsBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Brand.primaryLight, borderRadius: 14,
    paddingVertical: 22, marginTop: 8, marginBottom: 8,
    borderWidth: 1.5, borderColor: Brand.primary, borderStyle: 'dashed',
  },
  gpsIcon: { fontSize: 22 },
  gpsText: { fontSize: 15, fontWeight: '600', color: Brand.primary },
  coord: { fontSize: 12, color: Brand.textSecondary, marginBottom: 8 },
  label: { fontSize: 13, color: Brand.textSecondary, marginBottom: 8, marginTop: 14 },
  chipRow: { flexDirection: 'row', gap: 10 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10,
    backgroundColor: Brand.inputBg,
  },
  chipOn: { backgroundColor: Brand.primary },
  chipText: { fontSize: 14, color: Brand.textSecondary, fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  input: {
    backgroundColor: Brand.inputBg, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: Brand.text,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  btnPrimary: {
    backgroundColor: Brand.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 28,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
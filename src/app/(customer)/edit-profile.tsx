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
import { Brand } from '../../constants/theme'
import { supabase } from '../../../lib/supabase'
export default function EditProfileScreen() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [phone, setPhone]       = useState('')
  const [bio, setBio]           = useState('')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  useEffect(() => { load() }, [])
  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setEmail(user.email ?? '')
    const { data } = await supabase
      .from('profiles')
      .select('full_name, phone, bio')
      .eq('id', user.id)
      .single()
    if (data) {
      setFullName(data.full_name ?? '')
      setPhone(data.phone ?? '')
      setBio(data.bio ?? '')
    }
    setLoading(false)
  }
  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim(), bio: bio.trim() })
      .eq('id', user.id)
    setSaving(false)
    if (error) { Alert.alert('à¸šà¸±à¸™à¸—à¸¶à¸à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ', error.message); return }
    Alert.alert('à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', 'à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§', [
      { text: 'à¸•à¸à¸¥à¸‡', onPress: () => router.back() },
    ])
  }
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Text style={styles.iconText}>â€¹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>à¹à¸à¹‰à¹„à¸‚ à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œ</Text>
        <View style={{ width: 36 }} />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={Brand.primary} style={{ marginTop: 40 }} />
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {}
            <View style={styles.avatarWrap}>
              <View style={styles.avatar} />
              <View style={styles.editBadge}>
                <Text style={{ color: '#fff', fontSize: 14 }}>âœŽ</Text>
              </View>
            </View>
            <Text style={styles.label}>à¸Šà¸·à¹ˆà¸­</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="à¸Šà¸·à¹ˆà¸­-à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥"
              placeholderTextColor={Brand.textSecondary}
            />
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={email}
              editable={false}
            />
            <Text style={styles.label}>à¹€à¸šà¸­à¸£à¹Œà¹‚à¸—à¸£à¸¨à¸±à¸žà¸—à¹Œ</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="0xx-xxx-xxxx"
              placeholderTextColor={Brand.textSecondary}
              keyboardType="phone-pad"
            />
            <Text style={styles.label}>BIO</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={bio}
              onChangeText={setBio}
              placeholder="à¹à¸™à¸°à¸™à¸³à¸•à¸±à¸§à¸ªà¸±à¹‰à¸™ à¹†"
              placeholderTextColor={Brand.textSecondary}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              style={[styles.btnPrimary, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>à¸šà¸±à¸™à¸—à¸¶à¸</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
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
  avatarWrap: { alignSelf: 'center', marginTop: 8, marginBottom: 24 },
  avatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#AED9DF' },
  editBadge: {
    position: 'absolute', right: 2, bottom: 2,
    width: 34, height: 34, borderRadius: 17, backgroundColor: Brand.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Brand.card,
  },
  label: { fontSize: 13, color: Brand.textSecondary, marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: Brand.inputBg, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: Brand.text,
  },
  inputDisabled: { color: Brand.textSecondary },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  btnPrimary: {
    backgroundColor: Brand.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 28,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
import { router } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Brand } from '../../constants/theme'
import { supabase } from '../../../lib/supabase'
export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกอีเมลและรหัสผ่าน')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)
    if (error) {
      Alert.alert('ไม่สำเร็จ', error.message)
    }
  }
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          {}
          <Text style={styles.appName}>Uniwash</Text>
          <Text style={styles.welcome}>ยินดีต้อนรับ</Text>
          <Text style={styles.desc}>กรุณาเข้าสู่ระบบเพื่อใช้งาน</Text>
          {}
          <Text style={styles.label}>อีเมล</Text>
          <TextInput
            style={styles.input}
            placeholder="example@gmail.com"
            placeholderTextColor={Brand.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {}
          <Text style={styles.label}>รหัสผ่าน</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="••••••••••"
              placeholderTextColor={Brand.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          {}
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.rememberWrap}
              onPress={() => setRemember(!remember)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, remember && styles.checkboxOn]}>
                {remember && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
              <Text style={styles.rememberText}>จดจำฉัน</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.forgotText}>ลืมรหัสผ่าน ?</Text>
            </TouchableOpacity>
          </View>
          {}
          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>เข้าสู่ระบบ</Text>
            }
          </TouchableOpacity>
          {}
          <TouchableOpacity
            style={styles.registerWrap}
            onPress={() => router.push('/(auth)/register' as any)}
          >
            <Text style={styles.registerText}>
              ยังไม่มีบัญชีใช่หรือ?{' '}
              <Text style={styles.registerLink}>สมัครสมาชิก</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.card },
  content: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },
  appName: {
    fontSize: 34, fontWeight: '800',
    color: Brand.primary, textAlign: 'center', letterSpacing: 0.5,
  },
  welcome: {
    fontSize: 22, fontWeight: '800',
    color: Brand.text, textAlign: 'center', marginTop: 18,
  },
  desc: {
    fontSize: 13, color: Brand.textSecondary,
    textAlign: 'center', marginTop: 6, marginBottom: 32,
  },
  label: { fontSize: 14, color: Brand.text, marginBottom: 8, marginTop: 4 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 15,
    fontSize: 15, color: Brand.text,
    backgroundColor: Brand.inputBg, marginBottom: 16,
  },
  passwordRow: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 6, padding: 12, bottom: 6 },
  eyeIcon: { fontSize: 18 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 28, marginTop: 2,
  },
  rememberWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 1.5, borderColor: Brand.textSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  checkboxTick: { color: '#fff', fontSize: 12, fontWeight: '800' },
  rememberText: { fontSize: 14, color: Brand.textSecondary },
  forgotText: { fontSize: 14, color: Brand.primary, fontWeight: '600' },
  btnPrimary: {
    backgroundColor: Brand.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  registerWrap: { marginTop: 22, alignItems: 'center' },
  registerText: { fontSize: 14, color: Brand.textSecondary },
  registerLink: { color: Brand.danger, fontWeight: '700' },
})

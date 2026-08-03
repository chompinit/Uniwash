import { router } from 'expo-router'
import { useState } from 'react'
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

export default function RegisterScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const validate = () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบทุกช่อง')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      Alert.alert('แจ้งเตือน', 'รูปแบบอีเมลไม่ถูกต้อง')
      return false
    }
    if (password.length < 6) {
      Alert.alert('แจ้งเตือน', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return false
    }
    if (password !== confirmPassword) {
      Alert.alert('แจ้งเตือน', 'รหัสผ่านไม่ตรงกัน')
      return false
    }
    return true
  }

  const handleRegister = async () => {
    if (!validate()) return
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
    })

    setLoading(false)

    if (error) {
      if (error.message.includes('already registered')) {
        Alert.alert('แจ้งเตือน', 'อีเมลนี้ถูกใช้ไปแล้ว')
      } else {
        Alert.alert('สมัครไม่สำเร็จ', error.message)
      }
      return
    }

    router.push({
      pathname: '/(auth)/otp' as any,
      params: {
        email: email.trim().toLowerCase(),
        type: 'signup',
      },
    })
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← กลับ</Text>
          </TouchableOpacity>

          <Text style={styles.appName}>UNIWASH</Text>
          <Text style={styles.title}>สร้างบัญชีผู้ใช้</Text>
          <Text style={styles.desc}>กรอกข้อมูลเพื่อลงทะเบียนใช้บริการ</Text>

          <Text style={styles.label}>อีเมล</Text>
          <TextInput
            style={styles.input}
            placeholder="email@example.com"
            placeholderTextColor="#B4B2A9"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>รหัสผ่าน</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder="อย่างน้อย 6 ตัวอักษร"
              placeholderTextColor="#B4B2A9"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>ยืนยันรหัสผ่าน</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder="พิมพ์รหัสผ่านอีกครั้ง"
              placeholderTextColor="#B4B2A9"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowConfirm(!showConfirm)}
            >
              <Text>{showConfirm ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {confirmPassword.length > 0 && (
            <Text style={{
              fontSize: 12,
              color: password === confirmPassword ? '#1C8A99' : '#E24B4A',
              marginTop: -10,
              marginBottom: 12,
            }}>
              {password === confirmPassword
                ? '✓ รหัสผ่านตรงกัน'
                : '✗ รหัสผ่านไม่ตรงกัน'}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>สมัครสมาชิก</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginWrap} onPress={() => router.back()}>
            <Text style={styles.loginText}>
              มีบัญชีอยู่แล้ว?{' '}
              <Text style={styles.loginLink}>เข้าสู่ระบบ</Text>
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 40 },
  backBtn: { marginBottom: 20, marginTop: 8 },
  backText: { fontSize: 15, color: '#1C8A99' },
  appName: {
    fontSize: 26, fontWeight: '700',
    color: '#1C8A99', letterSpacing: 2,
    textAlign: 'center', marginBottom: 8,
  },
  title: {
    fontSize: 20, fontWeight: '600',
    color: '#2C2C2A', textAlign: 'center',
  },
  desc: {
    fontSize: 13, color: '#B4B2A9',
    textAlign: 'center', marginTop: 6, marginBottom: 28,
  },
  label: { fontSize: 13, color: '#888780', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 13, fontSize: 14,
    color: '#2C2C2A', backgroundColor: '#FAFAFA',
    marginBottom: 14,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  inputFlex: { flex: 1, marginBottom: 0 },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  btnPrimary: {
    backgroundColor: '#1C8A99', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loginWrap: { marginTop: 18, alignItems: 'center' },
  loginText: { fontSize: 13, color: '#888780' },
  loginLink: { color: '#1C8A99', fontWeight: '600' },
})
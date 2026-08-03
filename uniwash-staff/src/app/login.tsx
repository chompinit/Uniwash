import { router } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, SafeAreaView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { supabase } from '../../lib/supabase'

export default function StaffLoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกอีเมลและรหัสผ่าน')
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      setLoading(false)
      Alert.alert('เข้าสู่ระบบไม่สำเร็จ', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง')
      return
    }

    // เช็ค role ว่าเป็น staff จริงไหม
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    setLoading(false)

    if (profileError || !profile) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณาลองใหม่')
      await supabase.auth.signOut()
      return
    }

    if (profile.role === 'customer') {
      await supabase.auth.signOut()
      Alert.alert('ไม่มีสิทธิ์เข้าใช้', 'บัญชีนี้ไม่ใช่บัญชี Staff')
      return
    }

    if (profile.role === 'admin') {
      router.replace('/(admin)/dashboard' as any)
    } else if (profile.role === 'employee') {
      router.replace('/(rider)/dashboard' as any)
    } else {
      Alert.alert('ไม่มีสิทธิ์เข้าใช้', 'บัญชีนี้ไม่ใช่บัญชี Staff')
      await supabase.auth.signOut()
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>⚙️</Text>
          </View>
          <Text style={styles.appName}>UNIWASH</Text>
          <Text style={styles.subtitle}>Staff Portal</Text>
          <Text style={styles.desc}>เข้าสู่ระบบสำหรับเจ้าหน้าที่เท่านั้น</Text>

          <Text style={styles.label}>อีเมล</Text>
          <TextInput
            style={styles.input}
            placeholder="staff@uniwash.com"
            placeholderTextColor="#B4B2A9"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>รหัสผ่าน</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#B4B2A9"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.btnPrimary, loading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>เข้าสู่ระบบ</Text>
            }
          </TouchableOpacity>

          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              🔒 ระบบนี้สำหรับ Admin และ Rider เท่านั้น
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 28, justifyContent: 'center' },
  logoBox: {
    width: 80, height: 80, backgroundColor: '#2C2C2A',
    borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 16,
  },
  logoEmoji: { fontSize: 36 },
  appName: {
    fontSize: 28, fontWeight: '700', color: '#2C2C2A',
    textAlign: 'center', letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16, color: '#888780',
    textAlign: 'center', marginTop: 4,
  },
  desc: {
    fontSize: 12, color: '#B4B2A9',
    textAlign: 'center', marginTop: 4, marginBottom: 36,
  },
  label: { fontSize: 13, color: '#888780', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, color: '#2C2C2A',
    backgroundColor: '#FAFAFA', marginBottom: 14,
  },
  btnPrimary: {
    backgroundColor: '#2C2C2A', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  noteBox: {
    marginTop: 24, backgroundColor: '#F3F4F6',
    borderRadius: 10, padding: 12,
  },
  noteText: { fontSize: 12, color: '#888780', textAlign: 'center' },
})
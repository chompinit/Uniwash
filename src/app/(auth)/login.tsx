import { router } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../../../lib/supabase'

// ─────────────────────────────────────────────────────
// คีย์เวิร์ดลับที่พิมพ์ในช่องอีเมลเพื่อเข้าโหมดสตาฟฟ์
// เปลี่ยนตรงนี้ได้เลยถ้าต้องการเปลี่ยนรหัสลับ
// ─────────────────────────────────────────────────────
const STAFF_KEYWORD = 'Rider'

type StaffRole = 'admin' | 'rider'

export default function LoginScreen() {
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)

  // โหมดสตาฟฟ์
  const [staffMode, setStaffMode]       = useState(false)
  const [staffRole, setStaffRole]       = useState<StaffRole | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)

  // ─── ตรวจจับคีย์เวิร์ดลับ ───────────────────────────
  const handleEmailChange = (text: string) => {
    setEmail(text)

    if (text === STAFF_KEYWORD) {
      setStaffMode(true)
      setShowRoleModal(true)
      setEmail('')          // ล้างช่องอีเมลหลังตรวจเจอ
    } else {
      setStaffMode(false)
      setStaffRole(null)
    }
  }

  // ─── เลือก role จาก modal ───────────────────────────
  const handleSelectRole = (role: StaffRole) => {
    setStaffRole(role)
    setShowRoleModal(false)
  }

  // ─── Login ──────────────────────────────────────────
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกอีเมลและรหัสผ่าน')
      return
    }
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (error) {
      Alert.alert('ไม่สำเร็จ', error.message)
      return
    }

    if (!data.session) return

    if (staffMode && staffRole) {
      // ─ สตาฟฟ์: ตรวจ role จาก profiles ว่าตรงกับที่เลือกไหม
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.session.user.id)
        .single()

      const expectedRole = staffRole === 'admin' ? 'admin' : 'employee'

      if (profile?.role !== expectedRole) {
        await supabase.auth.signOut()
        Alert.alert(
          'ไม่มีสิทธิ์',
          `บัญชีนี้ไม่ใช่ ${staffRole === 'admin' ? 'Admin' : 'Rider'}`
        )
        return
      }

      Alert.alert(
        'กรุณาใช้แอพ Staff',
        'Admin และ Rider ต้องเข้าใช้งานผ่านแอพ Uniwash Staff โดยเฉพาะ'
      )
      await supabase.auth.signOut()
      setStaffMode(false)
      setStaffRole(null)
    } else {
      // ─ ลูกค้าทั่วไป
      router.replace('/(customer)/packages' as any)
    }
  }

  // ─── ป้าย role ที่เลือกอยู่ ─────────────────────────
  const roleBadge = () => {
    if (!staffRole) return null
    const isAdmin = staffRole === 'admin'
    return (
      <View style={[styles.roleBadge, { backgroundColor: isAdmin ? '#1D9E7520' : '#8B5CF620' }]}>
        <Text style={[styles.roleBadgeText, { color: isAdmin ? '#1D9E75' : '#8B5CF6' }]}>
          {isAdmin ? '👑 Admin Mode' : '🚴 Rider Mode'}
        </Text>
        <TouchableOpacity onPress={() => setShowRoleModal(true)}>
          <Text style={[styles.roleBadgeChange, { color: isAdmin ? '#1D9E75' : '#8B5CF6' }]}>
            เปลี่ยน
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>

          {/* Logo */}
          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>👕</Text>
          </View>
          <Text style={styles.appName}>Uniwash</Text>
          <Text style={styles.tagline}>บันดัลแจ้ง</Text>

          {/* Badge role (โชว์เฉพาะโหมดสตาฟฟ์) */}
          {staffMode && staffRole ? roleBadge() : (
            <Text style={styles.desc}>กรุณาเข้าสู่ระบบเพื่อใช้งาน</Text>
          )}

          {/* อีเมล */}
          <Text style={styles.label}>อีเมล</Text>
          <TextInput
            style={styles.input}
            placeholder="email@example.com"
            placeholderTextColor="#B4B2A9"
            value={email}
            onChangeText={handleEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* รหัสผ่าน */}
          <Text style={styles.label}>รหัสผ่าน</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="••••••••"
              placeholderTextColor="#B4B2A9"
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

          <TouchableOpacity style={styles.forgotWrap}>
            <Text style={styles.forgotText}>ลืมรหัสผ่าน?</Text>
          </TouchableOpacity>

          {/* ปุ่ม Login */}
          <TouchableOpacity
            style={[
              styles.btnPrimary,
              loading && styles.btnDisabled,
              staffMode && staffRole === 'rider' && styles.btnRider,
            ]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>
                  {staffMode
                    ? staffRole === 'admin' ? '👑 เข้าสู่ระบบ Admin' : '🚴 เข้าสู่ระบบ Rider'
                    : 'เข้าสู่ระบบ'}
                </Text>
            }
          </TouchableOpacity>

          {/* สมัครสมาชิก (ซ่อนในโหมดสตาฟฟ์) */}
          {!staffMode && (
            <TouchableOpacity
              style={styles.registerWrap}
              onPress={() => router.push('/(auth)/register' as any)}
            >
              <Text style={styles.registerText}>
                ยังไม่มีบัญชีผู้ใช้?{' '}
                <Text style={styles.registerLink}>สมัครสมาชิก</Text>
              </Text>
            </TouchableOpacity>
          )}

          {/* ออกจากโหมดสตาฟฟ์ */}
          {staffMode && (
            <TouchableOpacity
              style={styles.exitStaffWrap}
              onPress={() => { setStaffMode(false); setStaffRole(null); setEmail('') }}
            >
              <Text style={styles.exitStaffText}>← กลับหน้าลูกค้าทั่วไป</Text>
            </TouchableOpacity>
          )}

        </View>
      </KeyboardAvoidingView>

      {/* ─── Modal เลือก Role ─────────────────────────── */}
      <Modal
        visible={showRoleModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowRoleModal(false)
          if (!staffRole) { setStaffMode(false) }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>เลือกประเภทบัญชี</Text>
            <Text style={styles.modalSub}>คุณต้องการเข้าสู่ระบบในฐานะอะไร?</Text>

            <TouchableOpacity
              style={[styles.roleBtn, styles.roleBtnAdmin]}
              onPress={() => handleSelectRole('admin')}
            >
              <View style={styles.roleIconWrap}>
                <Text style={styles.roleIconText}>👑</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleName}>Admin</Text>
                <Text style={styles.roleDesc}>จัดการระบบ ออเดอร์ ผู้ใช้งาน</Text>
              </View>
              <Text style={styles.roleArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleBtn, styles.roleBtnRider]}
              onPress={() => handleSelectRole('rider')}
            >
              <View style={[styles.roleIconWrap, { backgroundColor: '#EDE9FE' }]}>
                <Text style={styles.roleIconText}>🚴</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.roleName, { color: '#6D28D9' }]}>Rider</Text>
                <Text style={styles.roleDesc}>รับ-ส่งผ้า อัปเดตสถานะงาน</Text>
              </View>
              <Text style={[styles.roleArrow, { color: '#8B5CF6' }]}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => {
                setShowRoleModal(false)
                setStaffMode(false)
                setStaffRole(null)
              }}
            >
              <Text style={styles.modalCancelText}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  )
}

// ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  logoBox: {
    width: 80, height: 80,
    backgroundColor: '#E1F5EE',
    borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 14,
  },
  logoEmoji: { fontSize: 38 },
  appName: {
    fontSize: 30, fontWeight: '700',
    color: '#1D9E75', textAlign: 'center', letterSpacing: 2,
  },
  tagline: { fontSize: 14, color: '#888780', textAlign: 'center', marginTop: 4 },
  desc: {
    fontSize: 12, color: '#B4B2A9',
    textAlign: 'center', marginTop: 4, marginBottom: 36,
  },

  // Role badge (แถบสีบนช่องกรอก)
  roleBadge: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, marginTop: 8, marginBottom: 28,
  },
  roleBadgeText: { fontSize: 14, fontWeight: '600' },
  roleBadgeChange: { fontSize: 13, fontWeight: '500', textDecorationLine: 'underline' },

  label: { fontSize: 13, color: '#888780', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, color: '#2C2C2A',
    backgroundColor: '#FAFAFA', marginBottom: 14,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  passwordInput: { flex: 1, marginBottom: 0 },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  eyeIcon: { fontSize: 18 },
  forgotWrap: { alignSelf: 'flex-end', marginBottom: 24, marginTop: 6 },
  forgotText: { fontSize: 13, color: '#1D9E75' },

  btnPrimary: {
    backgroundColor: '#1D9E75', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  btnRider: { backgroundColor: '#8B5CF6' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  registerWrap: { marginTop: 18, alignItems: 'center' },
  registerText: { fontSize: 13, color: '#888780' },
  registerLink: { color: '#1D9E75', fontWeight: '600' },

  exitStaffWrap: { marginTop: 18, alignItems: 'center' },
  exitStaffText: { fontSize: 13, color: '#B4B2A9' },

  // ─── Modal ───────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 28,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: 24, width: '100%',
  },
  modalTitle: {
    fontSize: 20, fontWeight: '700',
    color: '#2C2C2A', textAlign: 'center', marginBottom: 4,
  },
  modalSub: {
    fontSize: 13, color: '#888780',
    textAlign: 'center', marginBottom: 20,
  },

  roleBtn: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 14, borderWidth: 1.5,
    marginBottom: 10, gap: 12,
  },
  roleBtnAdmin: { borderColor: '#1D9E75', backgroundColor: '#F0FBF6' },
  roleBtnRider: { borderColor: '#8B5CF6', backgroundColor: '#F5F3FF' },
  roleIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#E1F5EE',
    alignItems: 'center', justifyContent: 'center',
  },
  roleIconText: { fontSize: 22 },
  roleName: { fontSize: 15, fontWeight: '700', color: '#1D9E75' },
  roleDesc: { fontSize: 12, color: '#888780', marginTop: 2 },
  roleArrow: { fontSize: 18, color: '#1D9E75', fontWeight: '700' },

  modalCancel: { marginTop: 6, alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 14, color: '#888780' },
})

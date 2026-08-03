import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../../../lib/supabase'

export default function OTPScreen() {
  const { email, type } = useLocalSearchParams<{
    email: string
    type: 'signup' | 'recovery'
  }>()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const inputRefs = useRef<(TextInput | null)[]>([])

  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 300)
  }, [])

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true)
      return
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleChange = (text: string, index: number) => {
    const cleaned = text.replace(/[^0-9]/g, '')
    if (cleaned.length === 6) {
      setOtp(cleaned.split(''))
      inputRefs.current[5]?.focus()
      return
    }
    const newOtp = [...otp]
    newOtp[index] = cleaned.slice(-1)
    setOtp(newOtp)
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length < 6) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอก OTP ให้ครบ 6 หลัก')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email: email,
      token: code,
      type: type === 'signup' ? 'signup' : 'recovery',
    })
    setLoading(false)
    if (error) {
      Alert.alert('OTP ไม่ถูกต้อง', 'กรุณาตรวจสอบ OTP หรือขอใหม่')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      return
    }
    if (type === 'signup') {
      Alert.alert('สำเร็จ! 🎉', 'ยืนยันตัวตนเรียบร้อยแล้ว', [
        {
          text: 'เริ่มใช้งาน',
          onPress: () => router.replace('/(customer)/packages' as any),
        },
      ])
    } else {
      router.replace('/(auth)/login' as any)
    }
  }

  const handleResend = async () => {
    if (!canResend) return
    setLoading(true)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    })
    setLoading(false)
    if (error) {
      Alert.alert('เกิดข้อผิดพลาด', error.message)
      return
    }
    setOtp(['', '', '', '', '', ''])
    setCountdown(60)
    setCanResend(false)
    inputRefs.current[0]?.focus()
    Alert.alert('ส่งแล้ว ✉️', `ส่ง OTP ใหม่ไปที่ ${email} แล้ว`)
  }

  const otpComplete = otp.join('').length === 6

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← กลับ</Text>
        </TouchableOpacity>
        <Text style={styles.appName}>UNIWASH</Text>
        <Text style={styles.title}>ยืนยันอีเมล</Text>
        <Text style={styles.desc}>เรารับส่งรหัส OTP 6 หลักไปที่</Text>
        <Text style={styles.emailText}>{email}</Text>

        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => { inputRefs.current[index] = ref }}
              style={[
                styles.otpBox,
                digit ? styles.otpBoxFilled : null,
                otpComplete ? styles.otpBoxComplete : null,
              ]}
              value={digit}
              onChangeText={text => handleChange(text, index)}
              onKeyPress={e => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={6}
              selectTextOnFocus
              textAlign="center"
            />
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.btnPrimary,
            (!otpComplete || loading) && styles.btnDisabled,
          ]}
          onPress={handleVerify}
          disabled={!otpComplete || loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>ยืนยัน OTP ✓</Text>
          }
        </TouchableOpacity>

        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>ไม่ได้รับ OTP? </Text>
          {canResend ? (
            <TouchableOpacity onPress={handleResend} disabled={loading}>
              <Text style={styles.resendLink}>ส่งอีกครั้ง</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.countdown}>
              ส่งอีกครั้งใน {countdown} วิ
            </Text>
          )}
        </View>

        <View style={styles.tipBox}>
          <Text style={styles.tipText}>
            💡 ถ้าไม่เจอ อีเมล ลองเช็คกล่อง Spam หรือ Junk Mail
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 24 },
  backBtn: { marginBottom: 20, marginTop: 8 },
  backText: { fontSize: 15, color: '#1C8A99' },
  appName: {
    fontSize: 26, fontWeight: '700',
    color: '#1C8A99', letterSpacing: 2,
    textAlign: 'center', marginBottom: 12,
  },
  title: {
    fontSize: 22, fontWeight: '600',
    color: '#2C2C2A', textAlign: 'center',
  },
  desc: {
    fontSize: 14, color: '#888780',
    textAlign: 'center', marginTop: 8,
  },
  emailText: {
    fontSize: 15, fontWeight: '600',
    color: '#1C8A99', textAlign: 'center',
    marginTop: 4, marginBottom: 36,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 32,
  },
  otpBox: {
    width: 48, height: 58,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
    color: '#2C2C2A',
    backgroundColor: '#FAFAFA',
  },
  otpBoxFilled: {
    borderColor: '#1C8A99',
    backgroundColor: '#E3F1F3',
  },
  otpBoxComplete: {
    borderColor: '#1C8A99',
  },
  btnPrimary: {
    backgroundColor: '#1C8A99',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  resendLabel: { fontSize: 13, color: '#888780' },
  resendLink: { fontSize: 13, color: '#1C8A99', fontWeight: '600' },
  countdown: { fontSize: 13, color: '#E24B4A' },
  tipBox: {
    marginTop: 24,
    backgroundColor: '#FFF9E6',
    borderRadius: 10,
    padding: 12,
  },
  tipText: { fontSize: 12, color: '#856404', textAlign: 'center' },
})

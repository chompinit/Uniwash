import { router, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Brand } from '../constants/theme'
import { supabase } from '../../lib/supabase'

// ─────────────────────────────────────────────────────
// แอปเดียว แยกสิทธิ์ตาม role ใน profiles.role
//   admin     → (admin)
//   employee  → (rider)      (พนักงานส่งผ้า)
//   อื่น ๆ    → (customer)    (ลูกค้าทั่วไป / null / 'customer')
// ─────────────────────────────────────────────────────
function routeByRole(role?: string | null) {
  if (role === 'admin') {
    router.replace('/(admin)/dashboard' as any)
  } else if (role === 'employee') {
    router.replace('/(rider)/dashboard' as any)
  } else {
    router.replace('/(customer)/packages' as any)
  }
}

export default function RootLayout() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setLoading(false)
          router.replace('/(auth)/login' as any)
          return
        }

        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          if (!session) {
            setLoading(false)
            router.replace('/(auth)/login' as any)
            return
          }

          const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

          setLoading(false)
          routeByRole(data?.role)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.card }}>
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    )
  }

  return <Stack screenOptions={{ headerShown: false }} />
}

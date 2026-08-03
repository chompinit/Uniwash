import { router, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { supabase } from '../../lib/supabase'

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

        if (event === 'INITIAL_SESSION') {
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

          // Customer app — ถ้าเป็น admin หรือ employee ให้ออก
          if (data?.role === 'admin' || data?.role === 'employee') {
            await supabase.auth.signOut()
            router.replace('/(auth)/login' as any)
          } else {
            router.replace('/(customer)/packages' as any)
          }
        }

      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1D9E75" />
      </View>
    )
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
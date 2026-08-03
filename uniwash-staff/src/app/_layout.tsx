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
          router.replace('/login' as any)
          return
        }

        if (event === 'INITIAL_SESSION') {
          if (!session) {
            setLoading(false)
            router.replace('/login' as any)
            return
          }

          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

          setLoading(false)

          if (error || !data) {
            // query ล้มเหลว (network, RLS) — ไม่ sign out แค่ให้ login ใหม่
            router.replace('/login' as any)
            return
          }

          if (data.role === 'customer') {
            await supabase.auth.signOut()
            router.replace('/login' as any)
          } else if (data.role === 'admin') {
            router.replace('/(admin)/dashboard' as any)
          } else if (data.role === 'employee') {
            router.replace('/(rider)/dashboard' as any)
          } else {
            // role ไม่ตรงกับที่รู้จัก — ให้ login ใหม่
            router.replace('/login' as any)
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2C2C2A" />
      </View>
    )
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
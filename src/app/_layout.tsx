import { router, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Brand } from '../constants/theme'
import { supabase } from '../../lib/supabase'

function routeByRole(role?: string | null) {
  try {
    if (role === 'admin') {
      router.replace('/(admin)/dashboard' as any)
    } else if (role === 'employee') {
      router.replace('/(employee)/dashboard' as any)
    } else {
      router.replace('/(customer)/packages' as any)
    }
  } catch (err) {
    console.error('Navigation error:', err)
  }
}

export default function RootLayout() {
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      try {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!isMounted) return

            try {
              console.log('Auth event:', event)

              if (event === 'SIGNED_OUT') {
                setLoading(false)
                setInitialized(true)
                if (isMounted) {
                  router.replace('/(auth)/login' as any)
                }
                return
              }

              if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
                if (!session) {
                  setLoading(false)
                  setInitialized(true)
                  if (isMounted) {
                    router.replace('/(auth)/login' as any)
                  }
                  return
                }

                try {
                  const { data, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single()

                  if (error) {
                    console.error('Profile fetch error:', error)
                    if (isMounted) {
                      setLoading(false)
                      setInitialized(true)
                      routeByRole(null)
                    }
                    return
                  }

                  if (isMounted) {
                    setLoading(false)
                    setInitialized(true)
                    routeByRole(data?.role)
                  }
                } catch (err) {
                  console.error('Profile fetch exception:', err)
                  if (isMounted) {
                    setLoading(false)
                    setInitialized(true)
                    routeByRole(null)
                  }
                }
              }
            } catch (err) {
              console.error('Auth state change error:', err)
              if (isMounted) {
                setLoading(false)
                setInitialized(true)
                router.replace('/(auth)/login' as any)
              }
            }
          }
        )

        return () => {
          isMounted = false
          subscription.unsubscribe()
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
        if (isMounted) {
          setLoading(false)
          setInitialized(true)
          router.replace('/(auth)/login' as any)
        }
      }
    }

    initAuth()

    return () => {
      isMounted = false
    }
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

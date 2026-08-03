import { router, Tabs } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { supabase } from '../../../lib/supabase'
import { Brand } from '../../constants/theme'

export default function AdminLayout() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAdminRole()
  }, [])

  const checkAdminRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/(auth)/login' as any)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin') {
        setIsAdmin(true)
      } else {
        router.replace('/(customer)/packages' as any)
      }
    } catch (error) {
      console.error('Error checking admin role:', error)
      router.replace('/(auth)/login' as any)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.card }}>
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    )
  }

  if (!isAdmin) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.card }}>
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    )
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Brand.primary,
        tabBarInactiveTintColor: Brand.textSecondary,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'หน้าหลัก',
        }}
      />
      <Tabs.Screen
        name="laundry"
        options={{
          title: 'น้ำยา',
          tabBarLabel: 'น้ำยา',
        }}
      />
      <Tabs.Screen
        name="clothing"
        options={{
          title: 'เสื้อกางเกง',
          tabBarLabel: 'เสื้อกางเกง',
        }}
      />
      <Tabs.Screen
        name="riders"
        options={{
          title: 'พนักงาน',
          tabBarLabel: 'พนักงาน',
        }}
      />
    </Tabs>
  )
}

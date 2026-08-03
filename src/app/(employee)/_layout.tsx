import { router, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { supabase } from '../../../lib/supabase'
export default function EmployeeLayout() {
  const [isEmployee, setIsEmployee] = useState(false)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    checkEmployeeRole()
  }, [])
  const checkEmployeeRole = async () => {
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
      if (profile?.role === 'employee') {
        setIsEmployee(true)
      } else {
        router.replace('/(auth)/login' as any)
      }
    } catch (error) {
      console.error('Error checking employee role:', error)
      router.replace('/(auth)/login' as any)
    } finally {
      setLoading(false)
    }
  }
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1C8A99" />
      </View>
    )
  }
  if (!isEmployee) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1C8A99" />
      </View>
    )
  }
  return <Stack screenOptions={{ headerShown: false }} />
}
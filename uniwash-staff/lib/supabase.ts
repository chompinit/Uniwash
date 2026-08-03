import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'

const SUPABASE_URL = 'https://nrdbcslxudopahspzzwl.supabase.co'

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yZGJjc2x4dWRvcGFoc3B6endsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NzQyNzQsImV4cCI6MjA5NTM1MDI3NH0.yR-t7P0CYbVhS8P_lL4wWJPJB_kvWs62DOQBw-cNUnE'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})
import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { supabase } from '../../../lib/supabase'

type Address = {
  id: string
  label: string
  address: string
}

const LABEL_ICON: Record<string, string> = {
  HOME: 'Home',
  WORK: 'Work',
}

export default function AddressesScreen() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ label: 'HOME', address: '' })

  useEffect(() => { fetchAddresses() }, [])

  const fetchAddresses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setAddresses(data || [])
    } catch (error: any) {
      Alert.alert('Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.address.trim()) {
      Alert.alert('Required', 'Please enter address')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('addresses')
        .insert([{
          user_id: user.id,
          label: form.label,
          address: form.address,
        }])

      if (error) throw error
      Alert.alert('Success', 'Address added')
      setForm({ label: 'HOME', address: '' })
      setShowForm(false)
      fetchAddresses()
    } catch (error: any) {
      Alert.alert('Error', error.message)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.label}>{LABEL_ICON[item.label] || item.label}</Text>
            <Text style={styles.address}>{item.address}</Text>
          </View>
        )}
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowForm(!showForm)}
          >
            <Text style={styles.addBtnText}>+ Add Address</Text>
          </TouchableOpacity>
        }
      />

      {showForm && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Address"
            value={form.address}
            onChangeText={(text) => setForm({ ...form, address: text })}
            multiline
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  card: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  label: { fontSize: 14, fontWeight: '600' },
  address: { fontSize: 13, color: '#666', marginTop: 4 },
  addBtn: { backgroundColor: '#1C8A99', padding: 16, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '600' },
  form: { padding: 16, backgroundColor: '#f5f5f5' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12 },
  saveBtn: { backgroundColor: '#1C8A99', padding: 12, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
})

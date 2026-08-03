import { router } from 'expo-router'
import { useState, useEffect } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../../lib/supabase'
import { Brand, Spacing } from '../../constants/theme'

type ClothingItem = {
  id: string
  name: string
  description: string
  image_url: string
  price: number
  category: string
  size: string
  color: string
  is_active: boolean
}

export default function ClothingManagement() {
  const [items, setItems] = useState<ClothingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'casual',
    size: '',
    color: '',
    image_url: '',
  })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('clothing_items')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setItems(data || [])
    } catch (error: any) {
      Alert.alert('Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const pickImage = async () => {
    try {
      Alert.alert('เลือกวิธีการ', 'เลือกวิธีการหารูป', [
        {
          text: 'แกลเลอรี่',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
              if (status !== 'granted') {
                Alert.alert('ขออนุญาต', 'กรุณาอนุญาตให้เข้าแกลเลอรี่')
                return
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
              })
              if (!result.canceled && result.assets?.[0]) {
                await uploadImage(result.assets[0].uri)
              }
            } catch (err: any) {
              Alert.alert('Error', `แกลเลอรี่: ${err.message}`)
            }
          },
        },
        {
          text: 'กล้อง',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync()
              if (status !== 'granted') {
                Alert.alert('ขออนุญาต', 'กรุณาอนุญาตให้ใช้กล้อง')
                return
              }
              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
              })
              if (!result.canceled && result.assets?.[0]) {
                await uploadImage(result.assets[0].uri)
              }
            } catch (err: any) {
              Alert.alert('Error', `กล้อง: ${err.message}`)
            }
          },
        },
        { text: 'ยกเลิก', style: 'cancel' },
      ])
    } catch (error: any) {
      Alert.alert('Error', error.message)
    }
  }

  const uploadImage = async (uri: string) => {
    try {
      setUploading(true)
      const filename = `clothing_${Date.now()}.jpg`
      const response = await fetch(uri)
      const blob = await response.blob()
      const { data, error } = await supabase.storage
        .from('products')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        })
      if (error) throw error
      const { data: urlData } = supabase.storage
        .from('products')
        .getPublicUrl(filename)
      setForm({ ...form, image_url: urlData.publicUrl })
      Alert.alert('Success', 'อัปโหลดรูปสำเร็จ')
    } catch (error: any) {
      Alert.alert('Upload Error', error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'กรุณากรอกชื่อเสื้อกางเกง')
      return
    }
    if (!form.price.trim()) {
      Alert.alert('Validation', 'กรุณากรอกราคา')
      return
    }
    try {
      setLoading(true)
      const data = {
        name: form.name,
        description: form.description,
        price: parseInt(form.price),
        category: form.category,
        size: form.size,
        color: form.color,
        image_url: form.image_url,
      }
      if (editingId) {
        const { error } = await supabase
          .from('clothing_items')
          .update(data)
          .eq('id', editingId)
        if (error) throw error
        Alert.alert('Success', 'อัปเดตสำเร็จ')
      } else {
        const { error } = await supabase
          .from('clothing_items')
          .insert([data])
        if (error) throw error
        Alert.alert('Success', 'เพิ่มสำเร็จ')
      }
      resetForm()
      fetchItems()
    } catch (error: any) {
      Alert.alert('Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (item: ClothingItem) => {
    setEditingId(item.id)
    setForm({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      size: item.size,
      color: item.color,
      image_url: item.image_url,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    Alert.alert('Confirm', 'ลบเสื้อกางเกงนี้ใช่หรือไม่?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('clothing_items')
              .delete()
              .eq('id', id)
            if (error) throw error
            Alert.alert('Success', 'ลบสำเร็จ')
            fetchItems()
          } catch (error: any) {
            Alert.alert('Error', error.message)
          }
        },
      },
    ])
  }

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      price: '',
      category: 'casual',
      size: '',
      color: '',
      image_url: '',
    })
    setEditingId(null)
    setShowForm(false)
  }

  if (loading && items.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.card }}>
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {!showForm ? (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>จัดการเสื้อกางเกง</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                resetForm()
                setShowForm(true)
              }}
            >
              <Text style={styles.addButtonText}>+ เพิ่มใหม่</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                {item.image_url && (
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.itemImage}
                  />
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.description && (
                    <Text style={styles.itemDesc}>{item.description}</Text>
                  )}
                  <View style={styles.itemTags}>
                    {item.size && <Text style={styles.tag}>ไซส์: {item.size}</Text>}
                    {item.color && <Text style={styles.tag}>สี: {item.color}</Text>}
                  </View>
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemPrice}>฿{item.price}</Text>
                    <Text style={styles.itemCategory}>{item.category}</Text>
                  </View>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => handleEdit(item)}
                  >
                    <Text style={styles.actionBtnText}>แก้ไข</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Text style={styles.actionBtnText}>ลบ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            scrollEnabled={true}
          />
        </>
      ) : (
        <View style={styles.form}>
          <Text style={styles.formTitle}>
            {editingId ? 'แก้ไขเสื้อกางเกง' : 'เพิ่มเสื้อกางเกงใหม่'}
          </Text>
          {form.image_url && (
            <Image
              source={{ uri: form.image_url }}
              style={styles.previewImage}
            />
          )}
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickImage}
            disabled={uploading}
          >
            <Text style={styles.uploadButtonText}>
              {uploading ? 'กำลังอัปโหลด...' : 'เลือกรูปภาพ'}
            </Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="ชื่อเสื้อกางเกง"
            value={form.name}
            onChangeText={(text) => setForm({ ...form, name: text })}
          />
          <TextInput
            style={[styles.input, { minHeight: 80 }]}
            placeholder="รายละเอียด (ไม่บังคับ)"
            multiline
            value={form.description}
            onChangeText={(text) => setForm({ ...form, description: text })}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="ไซส์"
              value={form.size}
              onChangeText={(text) => setForm({ ...form, size: text })}
            />
            <TextInput
              style={[styles.input, { flex: 1, marginLeft: 10 }]}
              placeholder="สี"
              value={form.color}
              onChangeText={(text) => setForm({ ...form, color: text })}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="ราคา (บาท)"
            keyboardType="numeric"
            value={form.price}
            onChangeText={(text) => setForm({ ...form, price: text })}
          />
          <View style={styles.categoryContainer}>
            <Text style={styles.label}>หมวดหมู่:</Text>
            {['casual', 'formal', 'sports', 'uniform'].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  form.category === cat && styles.categoryButtonActive,
                ]}
                onPress={() => setForm({ ...form, category: cat })}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    form.category === cat && styles.categoryButtonTextActive,
                  ]}
                >
                  {cat === 'casual' ? 'สบายๆ' : cat === 'formal' ? 'ทำงาน' : cat === 'sports' ? 'กีฬา' : 'ยูนิฟอร์ม'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.formActions}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'กำลังบันทึก...' : 'บันทึก'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={resetForm}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.card },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.three, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  title: { fontSize: 20, fontWeight: 'bold', color: Brand.text },
  addButton: { backgroundColor: Brand.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  addButtonText: { color: 'white', fontWeight: '600' },
  listContent: { padding: Spacing.three, paddingBottom: 100 },
  itemCard: { backgroundColor: 'white', borderRadius: 10, marginBottom: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#e0e0e0' },
  itemImage: { width: '100%', height: 150, backgroundColor: '#f0f0f0' },
  itemInfo: { padding: 12 },
  itemName: { fontSize: 16, fontWeight: '600', color: Brand.text, marginBottom: 5 },
  itemDesc: { fontSize: 13, color: Brand.textSecondary, marginBottom: 8 },
  itemTags: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tag: { fontSize: 12, backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, color: Brand.textSecondary },
  itemMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemPrice: { fontSize: 18, fontWeight: 'bold', color: Brand.primary },
  itemCategory: { fontSize: 12, backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, color: Brand.textSecondary },
  itemActions: { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  editBtn: { flex: 1, backgroundColor: Brand.primary, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  deleteBtn: { flex: 1, backgroundColor: '#ff6b6b', paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  actionBtnText: { color: 'white', fontWeight: '600', fontSize: 12 },
  form: { flex: 1, padding: Spacing.three },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: Brand.text, marginBottom: 20 },
  previewImage: { width: '100%', height: 200, borderRadius: 10, marginBottom: 15, backgroundColor: '#f0f0f0' },
  uploadButton: { backgroundColor: Brand.primary, padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 15 },
  uploadButtonText: { color: 'white', fontWeight: '600' },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, fontSize: 14, color: Brand.text },
  row: { flexDirection: 'row' },
  label: { fontSize: 14, fontWeight: '600', color: Brand.text, marginBottom: 8 },
  categoryContainer: { marginBottom: 15 },
  categoryButton: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e0e0e0', padding: 10, borderRadius: 6, marginBottom: 8 },
  categoryButtonActive: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  categoryButtonText: { color: Brand.text, textAlign: 'center', fontWeight: '500' },
  categoryButtonTextActive: { color: 'white' },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  saveButton: { flex: 1, backgroundColor: Brand.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: 'white', fontWeight: '600' },
  cancelButton: { flex: 1, backgroundColor: '#e0e0e0', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelButtonText: { color: Brand.text, fontWeight: '600' },
})

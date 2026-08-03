import * as ImagePicker from 'expo-image-picker'
import { Alert } from 'react-native'
import { supabase } from './supabase'

// เลือกรูปจากกล้องหรือแกลเลอรี → คืน local uri (null = ผู้ใช้ยกเลิก)
export async function pickPhoto(useCamera = false): Promise<string | null> {
  if (useCamera) {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('ไม่ได้รับอนุญาต', 'กรุณาอนุญาตให้แอปใช้กล้องในการตั้งค่า')
      return null
    }
  }

  const result = useCamera
    ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
    : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.6,
      })

  if (result.canceled || !result.assets?.length) return null
  return result.assets[0].uri
}

// อัปโหลด local uri เข้า bucket delivery-photos + บันทึกตาราง order_photos
export async function uploadOrderPhoto(
  orderId: string,
  photoType: 'customer' | 'rider',
  uri: string,
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('กรุณาเข้าสู่ระบบใหม่')

  const res = await fetch(uri)
  const body = await res.arrayBuffer()

  const path = `${orderId}/${photoType}-${Date.now()}.jpg`
  const { error: upErr } = await supabase.storage
    .from('delivery-photos')
    .upload(path, body, { contentType: 'image/jpeg' })
  if (upErr) throw new Error(upErr.message)

  const { data: { publicUrl } } = supabase.storage
    .from('delivery-photos')
    .getPublicUrl(path)

  const { error: dbErr } = await supabase.from('order_photos').insert({
    order_id: orderId,
    url: publicUrl,
    uploaded_by: user.id,
    photo_type: photoType,
  })
  if (dbErr) throw new Error(dbErr.message)

  return publicUrl
}

// เลือกแล้วอัปโหลดในขั้นตอนเดียว (ใช้ฝั่ง rider ที่มี orderId อยู่แล้ว)
export async function pickAndUploadOrderPhoto(
  orderId: string,
  photoType: 'customer' | 'rider',
  useCamera = false,
): Promise<string | null> {
  const uri = await pickPhoto(useCamera)
  if (!uri) return null
  return uploadOrderPhoto(orderId, photoType, uri)
}

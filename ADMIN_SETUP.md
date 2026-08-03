# Uniwash Admin System - Setup Guide

## ✅ สิ่งที่สร้างเสร็จแล้ว

### 1. **Admin Pages (4 หน้า)**
- **Dashboard** (`src/app/(admin)/dashboard.tsx`)
  - สถิติอย่างรวดเร็ว (total orders, pending orders, customers, riders, products)
  - ปุ่ม quick actions ไปยัง management pages
  
- **Laundry Items Management** (`src/app/(admin)/laundry.tsx`)
  - ดู/เพิ่ม/แก้ไข/ลบ น้ำยาซัก
  - อัปโหลดรูปภาพจริง (ไม่ใช่ icon)
  - เลือกหมวดหมู่ (standard, premium, specialty)

- **Clothing Items Management** (`src/app/(admin)/clothing.tsx`)
  - ดู/เพิ่ม/แก้ไข/ลบ เสื้อกางเกง
  - อัปโหลดรูปภาพจริง
  - ระบุไซส์ สี หมวดหมู่

- **Riders Management** (`src/app/(admin)/riders.tsx`)
  - เลือกผู้ใช้ (customer) มาเป็นพนักงาน
  - จัดการสถานะ (active, inactive, suspended)
  - ดูการประเมิน (rating) และจำนวนการส่ง

### 2. **Database Schema**
ไฟล์: `supabase/schema_products.sql`
- `laundry_items` table
- `clothing_items` table
- `riders` table
- RLS (Row Level Security) policies
- Storage bucket สำหรับรูปภาพ

### 3. **Customer Updates**
- **Select Page** (`src/app/(customer)/select.tsx`)
  - ดึงเสื้อกางเกงจาก `clothing_items` table
  - ดึงน้ำยาจาก `laundry_items` table
  - แสดงรูปภาพจริง (ไม่ใช่ emoji)

- **Summary Page** (`src/app/(customer)/summary.tsx`)
  - ใช้ `clothing_items` และ `laundry_items` จาก database
  - สนับสนุนการอัปโหลดรูปถ่าย

### 4. **Role-Based Access Control**
- **admin**: ดูได้เฉพาะหน้า admin (dashboard, laundry, clothing, riders)
- **employee** (rider): ดูได้เฉพาะหน้า rider
- **customer**: ดูได้เฉพาะหน้า customer

---

## 🔧 ขั้นตอนการติดตั้ง

### **ขั้นตอน 1: รัน Database Schema**

1. ไปที่ **Supabase Dashboard** → **SQL Editor**
2. คัดลอกโค้ดทั้งหมดจาก `supabase/schema_products.sql`
3. รันสคริปต์

> สิ่งที่เกิดขึ้น:
> - สร้าง 3 tables: `laundry_items`, `clothing_items`, `riders`
> - สร้าง storage bucket: `products`
> - ตั้งค่า RLS policies

### **ขั้นตอน 2: ทำให้ผู้ใช้ปกติกลายเป็น Admin**

รัน SQL นี้ใน Supabase:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
```

### **ขั้นตอน 3: ทดสอบระบบ**

1. **เข้าระบบด้วย admin account**
   - ควรเห็น tab bar: Dashboard | น้ำยา | เสื้อกางเกง | พนักงาน

2. **เพิ่มน้ำยาซัก**
   - ไปที่ "น้ำยา" tab
   - กด "+ เพิ่มใหม่"
   - ป้อนข้อมูล + อัปโหลดรูป

3. **เพิ่มเสื้อกางเกง**
   - ไปที่ "เสื้อกางเกง" tab
   - กด "+ เพิ่มใหม่"
   - ป้อนข้อมูล + อัปโหลดรูป

4. **เพิ่มพนักงาน**
   - ไปที่ "พนักงาน" tab
   - กด "+ เพิ่มใหม่"
   - เลือกผู้ใช้ (customer)
   - ป้อนเบอร์โทรศัพท์

5. **ทดสอบ Customer**
   - เข้าระบบด้วย customer account
   - ไปที่ "สั่งซัก"
   - ควรเห็นน้ำยา และ เสื้อกางเกงที่ admin เพิ่ม

---

## 📋 Checklist ก่อน Go Live

- [ ] รัน `schema_products.sql` สำเร็จ
- [ ] มี admin account พร้อม
- [ ] เพิ่มน้ำยาอย่างน้อย 1 ชนิด
- [ ] เพิ่มเสื้อกางเกงอย่างน้อย 1 ชนิด
- [ ] เพิ่มพนักงานอย่างน้อย 1 คน (ให้ role = employee)
- [ ] ทดสอบเข้าระบบด้วย customer
- [ ] ทดสอบดูน้ำยา เสื้อกางเกงจาก customer หน้า
- [ ] ทดสอบเข้าระบบด้วย rider
- [ ] ตรวจสอบว่า rider ไม่เห็นหน้า admin

---

## 🔍 Troubleshooting

### ❌ Admin ไม่เห็น tab bar
**วิธีแก้**: ตรวจสอบ `profiles` table
```sql
SELECT id, email, role FROM profiles LIMIT 10;
```
ต้อง role = 'admin'

### ❌ ไม่สามารถอัปโหลดรูป
**วิธีแก้**: ตรวจสอบ Supabase storage permissions
- ไปที่ Storage → products bucket
- ตรวจสอบ RLS policies

### ❌ Customer ไม่เห็นน้ำยา/เสื้อกางเกง
**วิธีแก้**: ตรวจสอบว่า `is_active = true`
```sql
SELECT id, name, is_active FROM laundry_items;
SELECT id, name, is_active FROM clothing_items;
```

---

## 📞 Support
สำหรับช่วยเหลือ ติดต่อ: chompinit@tr.ac.th

---

**Created**: 2026-06-15  
**Status**: Ready to Deploy

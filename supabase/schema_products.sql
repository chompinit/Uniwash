-- ════════════════════════════════════════════════════════════════════════
-- Uniwash — Schema สำหรับ Products (น้ำยา, เสื้อกางเกง) + Riders
-- รันใน Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────
-- 1) ตาราง Laundry Items (น้ำยาซัก)
-- ────────────────────────────────────────────────
create table if not exists public.laundry_items (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  image_url    text,
  price        integer not null,  -- ราคาต่อหน่วย (บาท)
  category     text not null default 'standard',  -- standard, premium, specialty
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists laundry_items_active_idx on public.laundry_items (is_active);
create index if not exists laundry_items_category_idx on public.laundry_items (category);

-- ────────────────────────────────────────────────
-- 2) ตาราง Clothing Items (เสื้อกางเกง)
-- ────────────────────────────────────────────────
create table if not exists public.clothing_items (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  image_url    text,
  price        integer not null,  -- ราคาต่อชิ้น (บาท)
  category     text not null default 'casual',  -- casual, formal, sports, etc
  size         text,  -- S, M, L, XL, etc (optional)
  color        text,  -- สี (optional)
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists clothing_items_active_idx on public.clothing_items (is_active);
create index if not exists clothing_items_category_idx on public.clothing_items (category);

-- ────────────────────────────────────────────────
-- 3) ตาราง Riders (พนักงาน)
-- ────────────────────────────────────────────────
create table if not exists public.riders (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null unique references public.profiles(id) on delete cascade,
  phone        text not null,
  license_plate text,
  status       text not null default 'active',  -- active, inactive, suspended
  rating       float default 5.0,
  total_deliveries integer default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists riders_profile_id_idx on public.riders (profile_id);
create index if not exists riders_status_idx on public.riders (status);

-- ────────────────────────────────────────────────
-- 4) Storage Buckets
-- ────────────────────────────────────────────────
-- Bucket สำหรับรูปน้ำยาและเสื้อกางเกง
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

-- ────────────────────────────────────────────────
-- 5) RLS POLICIES
-- ────────────────────────────────────────────────

-- ── laundry_items (ทุกคนอ่าน / admin จัดการ) ───────────────────────────
alter table public.laundry_items enable row level security;

drop policy if exists "laundry_items_select_active" on public.laundry_items;
drop policy if exists "laundry_items_admin_manage" on public.laundry_items;

create policy "laundry_items_select_active" on public.laundry_items
  for select to authenticated using (is_active = true);
create policy "laundry_items_select_admin" on public.laundry_items
  for select using (public.get_my_role() = 'admin');
create policy "laundry_items_admin_manage" on public.laundry_items
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- ── clothing_items (ทุกคนอ่าน / admin จัดการ) ──────────────────────────
alter table public.clothing_items enable row level security;

drop policy if exists "clothing_items_select_active" on public.clothing_items;
drop policy if exists "clothing_items_admin_manage" on public.clothing_items;

create policy "clothing_items_select_active" on public.clothing_items
  for select to authenticated using (is_active = true);
create policy "clothing_items_select_admin" on public.clothing_items
  for select using (public.get_my_role() = 'admin');
create policy "clothing_items_admin_manage" on public.clothing_items
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- ── riders (admin จัดการทั้งหมด / employee ดูตัวเอง) ──────────────────────
alter table public.riders enable row level security;

drop policy if exists "riders_select_own" on public.riders;
drop policy if exists "riders_select_all_for_order" on public.riders;
drop policy if exists "riders_admin_manage" on public.riders;

create policy "riders_select_own" on public.riders
  for select using (auth.uid() = profile_id);
create policy "riders_select_all_for_order" on public.riders
  for select using (public.get_my_role() in ('admin', 'employee'));
create policy "riders_admin_manage" on public.riders
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- ────────────────────────────────────────────────
-- 6) Storage Policies
-- ────────────────────────────────────────────────
drop policy if exists "products_upload" on storage.objects;
drop policy if exists "products_read" on storage.objects;

create policy "products_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'products' and public.get_my_role() = 'admin');

create policy "products_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'products');

-- ════════════════════════════════════════════════════════════════════════
-- สำเร็จ — ตรวจสอบ:
-- select * from pg_policies where schemaname='public';
-- select * from storage.buckets;
-- ════════════════════════════════════════════════════════════════════════

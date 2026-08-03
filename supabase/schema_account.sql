-- ════════════════════════════════════════════════════════════════
-- Uniwash — schema สำหรับหน้า Account (โปรไฟล์ + ที่อยู่)
-- รันใน Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════════════════════

-- 1) เพิ่มคอลัมน์ในตาราง profiles (ถ้ายังไม่มี)
alter table public.profiles add column if not exists full_name  text;
alter table public.profiles add column if not exists phone      text;
alter table public.profiles add column if not exists bio        text;
alter table public.profiles add column if not exists avatar_url text;

-- 2) ตารางที่อยู่จัดส่งหลายรายการต่อผู้ใช้
create table if not exists public.addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  label      text,                    -- HOME / WORK / อื่น ๆ
  address    text not null,
  lat        double precision,
  lng        double precision,
  created_at timestamptz not null default now()
);

create index if not exists addresses_user_id_idx on public.addresses (user_id);

-- 3) เปิด Row Level Security — เจ้าของเห็น/แก้ได้เฉพาะของตัวเอง
alter table public.addresses enable row level security;

drop policy if exists "own addresses - select" on public.addresses;
create policy "own addresses - select" on public.addresses
  for select using (auth.uid() = user_id);

drop policy if exists "own addresses - insert" on public.addresses;
create policy "own addresses - insert" on public.addresses
  for insert with check (auth.uid() = user_id);

drop policy if exists "own addresses - update" on public.addresses;
create policy "own addresses - update" on public.addresses
  for update using (auth.uid() = user_id);

drop policy if exists "own addresses - delete" on public.addresses;
create policy "own addresses - delete" on public.addresses
  for delete using (auth.uid() = user_id);

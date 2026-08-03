-- ============================================================
-- Admin features schema: store settings (singleton)
-- รันบน Supabase SQL Editor หรือ `supabase db push`
-- ============================================================

-- ตารางตั้งค่าร้าน (มีแถวเดียว id=1)
create table if not exists public.store_settings (
  id          int primary key default 1,
  name        text not null default 'UNIWASH',
  address     text,
  latitude    double precision,
  longitude   double precision,
  updated_at  timestamptz default now(),
  constraint store_settings_singleton check (id = 1)
);

-- แถวเริ่มต้น
insert into public.store_settings (id, name)
values (1, 'UNIWASH')
on conflict (id) do nothing;

alter table public.store_settings enable row level security;

-- ใครก็อ่านได้ (ลูกค้าต้องเห็นที่อยู่ร้าน)
drop policy if exists store_settings_select_all on public.store_settings;
create policy store_settings_select_all
  on public.store_settings for select
  to authenticated
  using (true);

-- เฉพาะ admin แก้ได้
drop policy if exists store_settings_admin_update on public.store_settings;
create policy store_settings_admin_update
  on public.store_settings for update
  to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

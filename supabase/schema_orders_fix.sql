-- ============================================================
-- ซ่อม order pipeline: paid_at, ตารางรูปถ่าย, bucket รูป
-- รัน: supabase db query --linked < supabase/schema_orders_fix.sql
-- ============================================================

-- 1) คอลัมน์ paid_at (ไรเดอร์ใช้กรองงานที่จ่ายแล้ว)
alter table public.orders add column if not exists paid_at timestamptz;

-- 2) ตารางรูปถ่ายของออเดอร์ (ตะกร้าผ้า ลูกค้า/ไรเดอร์)
create table if not exists public.order_photos (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  url         text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  photo_type  text not null default 'customer',
  created_at  timestamptz default now()
);
create index if not exists idx_order_photos_order on public.order_photos(order_id);

alter table public.order_photos enable row level security;

drop policy if exists order_photos_insert on public.order_photos;
create policy order_photos_insert on public.order_photos for insert
  to authenticated with check (uploaded_by = auth.uid());

drop policy if exists order_photos_select on public.order_photos;
create policy order_photos_select on public.order_photos for select
  to authenticated using (true);

-- 3) Storage bucket สำหรับรูปถ่าย (public อ่านได้)
insert into storage.buckets (id, name, public)
values ('delivery-photos', 'delivery-photos', true)
on conflict (id) do nothing;

-- policies บน storage.objects เฉพาะ bucket นี้
drop policy if exists dp_insert on storage.objects;
create policy dp_insert on storage.objects for insert
  to authenticated with check (bucket_id = 'delivery-photos');

drop policy if exists dp_select on storage.objects;
create policy dp_select on storage.objects for select
  to public using (bucket_id = 'delivery-photos');

-- ════════════════════════════════════════════════════════════════════════
-- Uniwash — สคริปต์ตั้งค่าฐานข้อมูล + RLS ฉบับสมบูรณ์ (รันซ้ำได้/idempotent)
-- รันใน Supabase Dashboard → SQL Editor ทั้งไฟล์ทีเดียว
-- แก้: ตาราง addresses หาย, RLS own-row ถูก drop, ฟังก์ชันเหรียญถูกลบ
-- ════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────
-- 0) คอลัมน์ที่ต้องมี (กันพลาด เผื่อยังไม่ได้เพิ่ม)
-- ───────────────────────────────────────────────
alter table public.profiles add column if not exists full_name  text;
alter table public.profiles add column if not exists phone      text;
alter table public.profiles add column if not exists bio        text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists coins      integer not null default 0;

alter table public.orders add column if not exists employee_id        uuid references public.profiles(id);
alter table public.orders add column if not exists pickup_confirmed_at timestamptz;
alter table public.orders add column if not exists delivered_at        timestamptz;
alter table public.orders add column if not exists paid_at             timestamptz;

-- ───────────────────────────────────────────────
-- 1) ตาราง addresses (หน้า "ที่อยู่ของฉัน")
-- ───────────────────────────────────────────────
create table if not exists public.addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  label      text,
  address    text not null,
  lat        double precision,
  lng        double precision,
  created_at timestamptz not null default now()
);
create index if not exists addresses_user_id_idx on public.addresses (user_id);

-- ───────────────────────────────────────────────
-- 1.5) ตารางรูปถ่ายตะกร้าผ้า (ลูกค้าอัปโหลดตอนสั่ง / rider ถ่ายตอนส่ง)
-- ───────────────────────────────────────────────
create table if not exists public.order_photos (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  url        text not null,
  uploaded_by uuid not null references public.profiles (id),
  photo_type text not null default 'rider' check (photo_type in ('customer', 'rider')),
  created_at timestamptz not null default now()
);
create index if not exists order_photos_order_id_idx on public.order_photos (order_id);

-- Storage bucket สำหรับรูป (public อ่านได้ผ่าน URL)
insert into storage.buckets (id, name, public)
values ('delivery-photos', 'delivery-photos', true)
on conflict (id) do nothing;

drop policy if exists "delivery_photos_upload" on storage.objects;
create policy "delivery_photos_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'delivery-photos');

drop policy if exists "delivery_photos_read" on storage.objects;
create policy "delivery_photos_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'delivery-photos');

-- ───────────────────────────────────────────────
-- 2) ฟังก์ชันอ่าน role ของตัวเอง (SECURITY DEFINER กัน RLS recursion)
-- ───────────────────────────────────────────────
create or replace function public.get_my_role()
returns text language sql security definer set search_path = public stable as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ───────────────────────────────────────────────
-- 3) ฟังก์ชันเติมเหรียญ (แทน add_coins/deduct_coins ที่ลบไป)
-- ───────────────────────────────────────────────
-- 3.1 ใช้โดย edge function omise-topup (อัตโนมัติ)
create or replace function public.add_coins_and_confirm(
  p_user_id uuid, p_charge_id text, p_amount integer
) returns void language plpgsql security definer set search_path = public as $$
declare v_txn public.coin_transactions%rowtype;
begin
  -- ล็อกแถว txn กัน webhook ยิงซ้ำพร้อมกัน + กันเติมเหรียญซ้ำ
  select * into v_txn from public.coin_transactions
   where charge_id = p_charge_id for update;
  if not found then raise exception 'ไม่พบรายการเติมเงิน'; end if;
  if v_txn.status = 'success' then return; end if;

  update public.profiles
     set coins = coalesce(coins, 0) + p_amount
   where id = p_user_id;

  update public.coin_transactions
     set status = 'success', paid_at = now()
   where charge_id = p_charge_id;
end; $$;

-- 3.2 ใช้โดย Admin กดอนุมัติเติมเงินเอง (โหมด Hybrid)
create or replace function public.admin_approve_topup(p_charge_id text)
returns void language plpgsql security definer set search_path = public as $$
declare v_txn public.coin_transactions%rowtype;
begin
  if public.get_my_role() <> 'admin' then
    raise exception 'ต้องเป็น admin เท่านั้น';
  end if;

  select * into v_txn from public.coin_transactions
   where charge_id = p_charge_id for update;
  if not found then raise exception 'ไม่พบรายการเติมเงิน'; end if;
  if v_txn.status = 'success' then return; end if;  -- กันเติมซ้ำ

  update public.profiles
     set coins = coalesce(coins, 0) + v_txn.amount
   where id = v_txn.user_id;

  update public.coin_transactions
     set status = 'success', paid_at = now()
   where charge_id = p_charge_id;
end; $$;

-- 3.3 Admin ปรับเหรียญผู้ใช้ (+/-) — แทน add_coins/deduct_coins เดิม
--     จำเป็นเพราะ grant ข้อ 5.2 ปิดไม่ให้แก้คอลัมน์ coins ตรง ๆ จาก client
create or replace function public.admin_adjust_coins(p_user_id uuid, p_amount integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.get_my_role() <> 'admin' then
    raise exception 'ต้องเป็น admin เท่านั้น';
  end if;

  update public.profiles
     set coins = greatest(coalesce(coins, 0) + p_amount, 0)  -- ไม่ให้ติดลบ
   where id = p_user_id;
  if not found then raise exception 'ไม่พบผู้ใช้'; end if;
end; $$;

-- 3.4 Admin เปลี่ยน role ผู้ใช้ — จำเป็นเพราะ grant ข้อ 5.2 เช่นกัน
create or replace function public.admin_set_role(p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.get_my_role() <> 'admin' then
    raise exception 'ต้องเป็น admin เท่านั้น';
  end if;
  if p_role not in ('customer', 'employee', 'admin') then
    raise exception 'role ไม่ถูกต้อง: %', p_role;
  end if;

  update public.profiles set role = p_role where id = p_user_id;
  if not found then raise exception 'ไม่พบผู้ใช้'; end if;
end; $$;

-- 3.5 ลูกค้าจ่ายค่าออเดอร์ด้วยเหรียญ (atomic: เช็คยอด + หัก + ติดธง paid)
--     จำเป็นเพราะ grant ข้อ 5.2 ปิดไม่ให้ client แก้คอลัมน์ coins ตรง ๆ
create or replace function public.pay_order_with_coins(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_coins integer;
begin
  select * into v_order from public.orders
   where id = p_order_id for update;
  if not found then raise exception 'ไม่พบออเดอร์'; end if;
  if v_order.customer_id <> auth.uid() then
    raise exception 'ออเดอร์นี้ไม่ใช่ของคุณ';
  end if;
  if v_order.paid_at is not null then return; end if;  -- กันจ่ายซ้ำ
  if v_order.status <> 'pending' then
    raise exception 'ออเดอร์อยู่ในสถานะที่ชำระไม่ได้';
  end if;

  select coalesce(coins, 0) into v_coins from public.profiles
   where id = auth.uid() for update;
  if v_coins < v_order.total_price then
    raise exception 'เหรียญไม่พอ (มี % ต้องใช้ %)', v_coins, v_order.total_price::integer;
  end if;

  update public.profiles
     set coins = coins - v_order.total_price::integer
   where id = auth.uid();

  update public.orders set paid_at = now() where id = p_order_id;
end; $$;

-- 3.6 คืนเหรียญเมื่อยกเลิกออเดอร์ที่จ่ายแล้ว (ลูกค้ายกเลิกเองได้เฉพาะ pending)
create or replace function public.cancel_order_refund(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders
   where id = p_order_id for update;
  if not found then raise exception 'ไม่พบออเดอร์'; end if;
  if v_order.customer_id <> auth.uid() and public.get_my_role() <> 'admin' then
    raise exception 'ออเดอร์นี้ไม่ใช่ของคุณ';
  end if;
  if v_order.status = 'cancelled' then return; end if;  -- กันคืนซ้ำ
  if v_order.status <> 'pending' then
    raise exception 'ยกเลิกได้เฉพาะออเดอร์ที่ยังไม่เริ่มซัก';
  end if;

  if v_order.paid_at is not null then
    update public.profiles
       set coins = coalesce(coins, 0) + v_order.total_price::integer
     where id = v_order.customer_id;
  end if;

  update public.orders set status = 'cancelled' where id = p_order_id;
end; $$;

-- ════════════════════════════════════════════════════════════════════════
-- 4) RLS POLICIES — สร้างกลับครบทุกตาราง (drop ก่อน create เพื่อรันซ้ำได้)
-- ════════════════════════════════════════════════════════════════════════

-- ── profiles ──────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own"      on public.profiles;
drop policy if exists "profiles_insert_own"      on public.profiles;
drop policy if exists "profiles_update_own"      on public.profiles;
drop policy if exists "profiles_select_admin"    on public.profiles;
drop policy if exists "profiles_update_admin"    on public.profiles;
drop policy if exists "profiles_select_employee" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
-- พนักงานส่งผ้าต้องเห็นชื่อ/เบอร์ลูกค้าเพื่อติดต่อจัดส่ง
create policy "profiles_select_employee" on public.profiles
  for select using (public.get_my_role() = 'employee');
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_select_admin" on public.profiles
  for select using (public.get_my_role() = 'admin');
create policy "profiles_update_admin" on public.profiles
  for update using (public.get_my_role() = 'admin');

-- ── packages (ทุกคนที่ล็อกอินอ่านได้ / admin จัดการได้) ─────────────────
alter table public.packages enable row level security;

drop policy if exists "packages_select_all"   on public.packages;
drop policy if exists "packages_admin_manage" on public.packages;

create policy "packages_select_all" on public.packages
  for select to authenticated using (true);
create policy "packages_admin_manage" on public.packages
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- ── orders ────────────────────────────────────────────────────────────
alter table public.orders enable row level security;

drop policy if exists "orders_select_own"      on public.orders;
drop policy if exists "orders_insert_own"      on public.orders;
drop policy if exists "orders_update_own"      on public.orders;
drop policy if exists "orders_rider_select"    on public.orders;
drop policy if exists "orders_rider_update"    on public.orders;
drop policy if exists "orders_admin_all"       on public.orders;

create policy "orders_select_own" on public.orders
  for select using (auth.uid() = customer_id);
create policy "orders_insert_own" on public.orders
  for insert with check (auth.uid() = customer_id);
create policy "orders_update_own" on public.orders
  for update using (auth.uid() = customer_id);          -- ลูกค้ายกเลิกออเดอร์ตัวเอง
create policy "orders_rider_select" on public.orders
  for select using (auth.uid() = employee_id or public.get_my_role() = 'employee');
create policy "orders_rider_update" on public.orders
  for update using (auth.uid() = employee_id or public.get_my_role() = 'employee');
create policy "orders_admin_all" on public.orders
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- ── order_items (ตามเจ้าของออเดอร์ / rider / admin) ─────────────────────
alter table public.order_items enable row level security;

drop policy if exists "order_items_select" on public.order_items;
drop policy if exists "order_items_insert" on public.order_items;

create policy "order_items_select" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.customer_id = auth.uid() or o.employee_id = auth.uid())
    )
    or public.get_my_role() in ('admin', 'employee')
  );
create policy "order_items_insert" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.customer_id = auth.uid()
    )
  );

-- ── coin_transactions (เจ้าของ + admin ดู/อนุมัติ) ──────────────────────
alter table public.coin_transactions enable row level security;

drop policy if exists "coin_txn_select_own"   on public.coin_transactions;
drop policy if exists "coin_txn_insert_own"   on public.coin_transactions;
drop policy if exists "coin_txn_admin_select" on public.coin_transactions;
drop policy if exists "coin_txn_admin_update" on public.coin_transactions;

create policy "coin_txn_select_own" on public.coin_transactions
  for select using (auth.uid() = user_id);
create policy "coin_txn_insert_own" on public.coin_transactions
  for insert with check (auth.uid() = user_id);
create policy "coin_txn_admin_select" on public.coin_transactions
  for select using (public.get_my_role() = 'admin');
create policy "coin_txn_admin_update" on public.coin_transactions
  for update using (public.get_my_role() = 'admin');

-- ── order_photos (เจ้าของออเดอร์ / rider / admin) ───────────────────────
alter table public.order_photos enable row level security;

drop policy if exists "order_photos_select" on public.order_photos;
drop policy if exists "order_photos_insert" on public.order_photos;

create policy "order_photos_select" on public.order_photos
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_photos.order_id
        and (o.customer_id = auth.uid() or o.employee_id = auth.uid())
    )
    or public.get_my_role() in ('admin', 'employee')
  );
create policy "order_photos_insert" on public.order_photos
  for insert with check (
    uploaded_by = auth.uid()
    and (
      exists (
        select 1 from public.orders o
        where o.id = order_photos.order_id and o.customer_id = auth.uid()
      )
      or public.get_my_role() in ('admin', 'employee')
    )
  );

-- ── addresses (เฉพาะเจ้าของ) ────────────────────────────────────────────
alter table public.addresses enable row level security;

drop policy if exists "addresses_select_own" on public.addresses;
drop policy if exists "addresses_insert_own" on public.addresses;
drop policy if exists "addresses_update_own" on public.addresses;
drop policy if exists "addresses_delete_own" on public.addresses;

create policy "addresses_select_own" on public.addresses
  for select using (auth.uid() = user_id);
create policy "addresses_insert_own" on public.addresses
  for insert with check (auth.uid() = user_id);
create policy "addresses_update_own" on public.addresses
  for update using (auth.uid() = user_id);
create policy "addresses_delete_own" on public.addresses
  for delete using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════════
-- 5) GRANTS — ปิดช่องโหว่สิทธิ์
-- ════════════════════════════════════════════════════════════════════════

-- 5.1 ห้าม client เรียก add_coins_and_confirm ตรง ๆ (เติมเหรียญให้ตัวเองได้)
--     ให้เฉพาะ edge function (service_role) เรียกเท่านั้น
revoke execute on function public.add_coins_and_confirm(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.add_coins_and_confirm(uuid, text, integer)
  to service_role;

-- 5.2 จำกัดคอลัมน์ที่ user แก้ได้ใน profiles (กันแก้ coins/role ตัวเอง)
--     หมายเหตุ: admin ฝั่ง client ก็แก้ coins/role ตรง ๆ ไม่ได้เช่นกัน
--     ต้องทำผ่านฟังก์ชัน security definer (เช่น admin_approve_topup) หรือ service_role
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, bio, avatar_url) on public.profiles to authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- เสร็จ — ตรวจ policy ทั้งหมด:  select * from pg_policies where schemaname='public';
-- ════════════════════════════════════════════════════════════════════════

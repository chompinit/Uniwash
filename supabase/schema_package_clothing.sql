-- ============================================================
-- ผูกชนิดเสื้อผ้า (clothing_items) เข้ากับแพ็กเกจ (packages)
-- ลูกค้าจะเห็นเฉพาะผ้าที่อยู่ในแพ็กเกจที่เลือก
-- รันบน Supabase: `supabase db query --linked < supabase/schema_package_clothing.sql`
-- ============================================================

create table if not exists public.package_clothing_items (
  id                uuid primary key default gen_random_uuid(),
  package_id        uuid not null references public.packages(id) on delete cascade,
  clothing_item_id  uuid not null references public.clothing_items(id) on delete cascade,
  created_at        timestamptz default now(),
  unique (package_id, clothing_item_id)
);

create index if not exists idx_pci_package on public.package_clothing_items(package_id);

alter table public.package_clothing_items enable row level security;

-- ทุกคนที่ล็อกอินอ่านได้ (ลูกค้าต้องเห็นว่าผ้าใดอยู่ในแพ็กเกจ)
drop policy if exists pci_select_all on public.package_clothing_items;
create policy pci_select_all
  on public.package_clothing_items for select
  to authenticated
  using (true);

-- เฉพาะ admin เพิ่ม/ลบ/แก้
drop policy if exists pci_admin_manage on public.package_clothing_items;
create policy pci_admin_manage
  on public.package_clothing_items for all
  to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

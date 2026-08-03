-- ============================================================
-- ซ่อม coin_transactions ให้รองรับ Omise topup (charge/link)
-- คอลัมน์ที่ฟังก์ชัน add_coins_and_confirm และ coins.tsx ต้องใช้
-- รัน: supabase db query --linked < supabase/schema_coin_topup_fix.sql
-- ============================================================

alter table public.coin_transactions add column if not exists charge_id text;
alter table public.coin_transactions add column if not exists status text default 'pending';
alter table public.coin_transactions add column if not exists paid_at timestamptz;

-- กันเครดิตซ้ำ: charge_id (หรือ link id) ต้องไม่ซ้ำ
create unique index if not exists uq_coin_txn_charge
  on public.coin_transactions(charge_id) where charge_id is not null;

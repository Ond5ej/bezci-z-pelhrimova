-- =========================================================
--  SPONZOŘI – doplněk ke supabase-schema.sql
--  ---------------------------------------------------------
--  Pusť v Supabase: SQL Editor → New query → vlož → Run.
--  Jde spustit opakovaně, nic nerozbije.
--
--  Loga se nahrávají na /admin/ (záložka Sponzoři) do stejného
--  úložiště jako fotky, do složky "sponzori".
-- =========================================================

create table if not exists public.sponsors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,          -- jméno pro popisek a alt text
  logo_url   text not null,
  logo_path  text,                   -- cesta v úložišti, ať jde logo smazat i ze storage
  url        text,                   -- odkaz na web sponzora (nepovinný)
  sort_order int not null default 0, -- menší číslo = dřív
  created_at timestamptz not null default now()
);

create index if not exists sponsors_order_idx on public.sponsors(sort_order, created_at);


-- ---------- OPRÁVNĚNÍ ----------
grant select on public.sponsors to anon;
grant select, insert, update, delete on public.sponsors to authenticated;


-- ---------- ZABEZPEČENÍ (RLS) ----------
alter table public.sponsors enable row level security;

drop policy if exists "verejne cteni sponzoru" on public.sponsors;
create policy "verejne cteni sponzoru" on public.sponsors
  for select to anon, authenticated
  using (true);

drop policy if exists "sprava sponzoru" on public.sponsors;
create policy "sprava sponzoru" on public.sponsors
  for all to authenticated
  using (true) with check (true);

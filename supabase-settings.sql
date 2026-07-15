-- =========================================================
--  BĚŽCI Z PELHŘIMOVA – tabulka „settings" (záložka Ostatní)
--  ---------------------------------------------------------
--  KDE TO SPUSTIT:
--    Supabase → tvůj projekt → SQL Editor → New query
--    → vlož celý tento soubor → Run
--
--  Spustit stačí JEDNOU. Skript je bezpečný i při opakování.
--
--  POZOR: nepouštěj znovu celý supabase-schema.sql – vložil by
--  ti podruhé ukázkovou novinku. Tenhle soubor je jen doplněk.
-- =========================================================


-- =========================================================
--  1) TABULKA
--  Obecné „klíč → hodnota". Přidání další věci ke spravování
--  = jeden insert níže, kódu se to netýká.
-- =========================================================
create table if not exists public.settings (
  key        text primary key,       -- strojový název, páruje se s data-setting v HTML
  value      text not null default '',
  label      text not null,          -- jak se pole jmenuje v administraci
  hint       text,                   -- nápověda pod popiskem (nepovinné)
  sort_order int  not null default 0,
  updated_at timestamptz not null default now()
);


-- =========================================================
--  2) OPRÁVNĚNÍ (GRANT)
-- =========================================================
grant select on public.settings to anon;
grant select, insert, update, delete on public.settings to authenticated;


-- =========================================================
--  3) ZABEZPEČENÍ (RLS)
-- =========================================================
alter table public.settings enable row level security;

-- veřejnost smí jen číst
drop policy if exists "verejne cteni nastaveni" on public.settings;
create policy "verejne cteni nastaveni"
  on public.settings for select
  to anon, authenticated
  using (true);

-- měnit smí jen přihlášený správce
drop policy if exists "sprava nastaveni" on public.settings;
create policy "sprava nastaveni"
  on public.settings for all
  to authenticated
  using (true) with check (true);


-- =========================================================
--  4) VÝCHOZÍ HODNOTY
--  „on conflict do nothing" = když už klíč existuje, nechá
--  se tvoje hodnota na pokoji. Proto je opakování bezpečné.
-- =========================================================
insert into public.settings (key, value, label, hint, sort_order) values
  ('members',       '111', 'Počet členů party',
   'Velké číslo v úvodu a v sekci Běžci. Piš jen číslici.', 1),
  ('members_round', '100', 'Zaokrouhlený počet',
   'Do textů „už nás je přes 100" a „100+ běžců". Bez plusu – ten doplní web sám.', 2)
on conflict (key) do nothing;


-- =========================================================
--  HOTOVO. V administraci přibude záložka „Ostatní".
-- =========================================================

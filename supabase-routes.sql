-- =========================================================
--  TRASY – doplněk ke supabase-schema.sql
--  ---------------------------------------------------------
--  Pusť v Supabase: SQL Editor → New query → vlož → Run.
--  Jde spustit opakovaně, výchozí trasy se nezaloží dvakrát.
-- =========================================================

create table if not exists public.routes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  -- km i elev jsou TEXT, ne číslo: píše se "5,2" s čárkou a "260 m"
  -- s jednotkou. Na webu se to jen vypisuje, nepočítá se s tím.
  km          text,
  elev        text,
  teren       text,                     -- asfalt / les / smíšený…
  -- diff řídí BARVU štítku (třída v CSS), diff_label je text na štítku
  diff        text not null default 'easy'
              check (diff in ('easy', 'medium', 'hard')),
  diff_label  text,
  -- profil převýšení: 10 čísel, ze kterých se kreslí křivka na kartě.
  -- Nejsou to metry, jen relativní výška – kreslítko si je samo
  -- přeškáluje podle největší hodnoty.
  profile     smallint[] not null default '{3,4,3,5,4,6,4,3,4,3}',
  sort_order  int not null default 0,   -- menší číslo = dřív na webu
  created_at  timestamptz not null default now()
);

-- Vložená mapa z Mapy.cz (adresa typu https://mapy.com/s/kod).
-- Když je vyplněná, na kartě se ukáže skutečná mapa místo kreslené křivky.
alter table public.routes add column if not exists map_embed text;

create index if not exists routes_order_idx on public.routes(sort_order, created_at);


-- ---------- OPRÁVNĚNÍ ----------
grant select on public.routes to anon;
grant select, insert, update, delete on public.routes to authenticated;


-- ---------- ZABEZPEČENÍ (RLS) ----------
alter table public.routes enable row level security;

drop policy if exists "verejne cteni tras" on public.routes;
create policy "verejne cteni tras" on public.routes
  for select to anon, authenticated
  using (true);

drop policy if exists "sprava tras" on public.routes;
create policy "sprava tras" on public.routes
  for all to authenticated
  using (true) with check (true);


-- ---------- VÝCHOZÍ OBSAH ----------
-- Stejné trasy, jaké byly dosud natvrdo v javascript/routes.js.
-- Založí se jen tehdy, když je tabulka prázdná – takže tenhle
-- skript můžeš pustit znovu, aniž bys je zduplikoval.
do $$
begin
  if not exists (select 1 from public.routes) then
    insert into public.routes
      (name, description, km, elev, teren, diff, diff_label, profile, sort_order)
    values
      ('Městský okruh',
       'Nenáročný okruh centrem a parky. Ideální na rozběhání a pro úplné začátečníky.',
       '5,2', '45 m', 'asfalt', 'easy', 'Pro každého',
       '{3,4,3,5,4,6,4,3,4,3}', 1),
      ('Křemešník',
       'Táhlé stoupání lesem až k rozhledně. Odměnou je výhled na celou Vysočinu.',
       '11,8', '260 m', 'les', 'medium', 'Kopcovitá',
       '{2,3,5,7,9,10,8,6,4,3}', 2),
      ('Nedělní vejšlap',
       'Delší pohodová trasa přes kopce a zpět. Pomalé tempo, hlavně si to užít.',
       '18,0', '340 m', 'smíšený', 'hard', 'Delší',
       '{3,6,4,8,6,10,7,9,5,3}', 3);
  end if;
end $$;

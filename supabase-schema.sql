-- =========================================================
--  BĚŽCI Z PELHŘIMOVA – schéma databáze pro Supabase
--  ---------------------------------------------------------
--  KDE TO SPUSTIT:
--    Supabase → tvůj projekt → SQL Editor → New query
--    → vlož celý tento soubor → Run
--
--  Spustit stačí JEDNOU. Skript je bezpečný i při opakování.
-- =========================================================


-- =========================================================
--  1) TABULKY
-- =========================================================

-- Alba (složky fotek)
create table if not exists public.albums (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  cover_url   text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- Fotky
create table if not exists public.photos (
  id         uuid primary key default gen_random_uuid(),
  album_id   uuid references public.albums(id) on delete cascade,
  url        text not null,          -- veřejná adresa fotky
  path       text not null,          -- cesta v úložišti (kvůli mazání)
  alt        text,                   -- popisek
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

-- Aktuálně / novinky (včetně banneru = obrázku)
create table if not exists public.news (
  id         uuid primary key default gen_random_uuid(),
  date       date not null default current_date,
  tag        text,                   -- např. VÝBĚH, PARTA, TRASA
  title      text not null,
  text       text,
  image_url  text,                   -- banner (nepovinný)
  published  boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists photos_album_idx on public.photos(album_id);
create index if not exists news_date_idx    on public.news(date desc);


-- =========================================================
--  2) OPRÁVNĚNÍ (GRANT)
--  Nové projekty Supabase už tabulky samy nezpřístupňují,
--  proto je musíme povolit ručně.
-- =========================================================
grant usage on schema public to anon, authenticated;

-- veřejnost (nepřihlášení návštěvníci webu) smí jen ČÍST
grant select on public.albums, public.photos, public.news to anon;

-- přihlášený správce smí všechno
grant select, insert, update, delete
  on public.albums, public.photos, public.news to authenticated;


-- =========================================================
--  3) ZABEZPEČENÍ (RLS)
--  Tohle je to hlavní – rozhoduje, kdo smí co.
-- =========================================================
alter table public.albums enable row level security;
alter table public.photos enable row level security;
alter table public.news   enable row level security;

-- --- veřejné čtení ---
drop policy if exists "verejne cteni alb" on public.albums;
create policy "verejne cteni alb"
  on public.albums for select
  to anon, authenticated
  using (true);

drop policy if exists "verejne cteni fotek" on public.photos;
create policy "verejne cteni fotek"
  on public.photos for select
  to anon, authenticated
  using (true);

-- veřejnost vidí jen zveřejněné novinky
drop policy if exists "verejne cteni novinek" on public.news;
create policy "verejne cteni novinek"
  on public.news for select
  to anon
  using (published = true);

-- --- zápis pouze pro přihlášeného správce ---
drop policy if exists "sprava alb" on public.albums;
create policy "sprava alb"
  on public.albums for all
  to authenticated
  using (true) with check (true);

drop policy if exists "sprava fotek" on public.photos;
create policy "sprava fotek"
  on public.photos for all
  to authenticated
  using (true) with check (true);

drop policy if exists "sprava novinek" on public.news;
create policy "sprava novinek"
  on public.news for all
  to authenticated
  using (true) with check (true);


-- =========================================================
--  4) ÚLOŽIŠTĚ FOTEK (Storage)
-- =========================================================
insert into storage.buckets (id, name, public)
values ('fotky', 'fotky', true)
on conflict (id) do nothing;

-- kdokoli si smí fotku zobrazit
drop policy if exists "verejne cteni souboru" on storage.objects;
create policy "verejne cteni souboru"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'fotky');

-- nahrávat / mazat smí jen přihlášený správce
drop policy if exists "sprava nahravani" on storage.objects;
create policy "sprava nahravani"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'fotky');

drop policy if exists "sprava uprav" on storage.objects;
create policy "sprava uprav"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'fotky');

drop policy if exists "sprava mazani" on storage.objects;
create policy "sprava mazani"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'fotky');


-- =========================================================
--  5) UKÁZKOVÁ DATA (nepovinné – klidně smaž)
-- =========================================================
insert into public.news (date, tag, title, text)
values (current_date, 'PARTA', 'Web je nový!', 'Spustili jsme nové stránky. Novinky teď najdeš tady.')
on conflict do nothing;

-- =========================================================
--  HOTOVO – ale spusť ještě `supabase-settings.sql`
--  (tabulka pro záložku „Ostatní" v administraci).
--
--  Ještě vytvoř správce:
--    Authentication → Users → Add user
--    (e-mail + heslo, zaškrtni "Auto Confirm User")
--
--  A VYPNI veřejnou registraci, ať se nemůže nikdo přihlásit sám:
--    Authentication → Sign In / Providers → Email
--    → vypnout "Allow new users to sign up"
-- =========================================================

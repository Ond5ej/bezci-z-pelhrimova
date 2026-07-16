-- =========================================================
--  POČÍTADLO NÁVŠTĚV – doplněk ke supabase-schema.sql
--  ---------------------------------------------------------
--  Pusť v Supabase: SQL Editor → New query → vlož → Run.
--  Jde spustit opakovaně, čítač se nevynuluje.
--
--  K ČEMU TO JE (a k čemu ne):
--  Tohle je ozdoba na web, ne měření návštěvnosti. Počítá
--  načtení stránky, ne lidi. Přičtou se i roboti vyhledávačů.
--  Kdo chce, může si zdroj stránky otevřít a číslo nafouknout.
--  Na skutečné statistiky použij GoatCounter nebo Plausible.
-- =========================================================

create table if not exists public.counters (
  key        text primary key,
  value      bigint not null default 0,
  updated_at timestamptz not null default now()
);


-- ---------- OPRÁVNĚNÍ ----------
-- Návštěvník smí číslo jen ČÍST. Zapisovat přes tabulku nesmí –
-- jinak by ho mohl přepsat na cokoli. Zvyšovat jde jen funkcí níže,
-- která umí přičíst přesně jedničku a nic jiného.
grant select on public.counters to anon;
grant select, insert, update, delete on public.counters to authenticated;


-- ---------- ZABEZPEČENÍ (RLS) ----------
alter table public.counters enable row level security;

drop policy if exists "verejne cteni pocitadla" on public.counters;
create policy "verejne cteni pocitadla" on public.counters
  for select to anon, authenticated
  using (true);

drop policy if exists "sprava pocitadla" on public.counters;
create policy "sprava pocitadla" on public.counters
  for all to authenticated
  using (true) with check (true);


-- ---------- FUNKCE: přičti jedničku ----------
-- security definer = funkce běží s právy vlastníka, takže smí zapsat
-- i tam, kam návštěvník sám nedosáhne. Umí ale jediné: +1.
-- set search_path je proti podstrčení cizí tabulky se stejným jménem.
create or replace function public.bump_counter(k text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v bigint;
begin
  insert into public.counters (key, value)
  values (k, 1)
  on conflict (key) do update
    set value = public.counters.value + 1,
        updated_at = now()
  returning value into v;
  return v;
end;
$$;

grant execute on function public.bump_counter(text) to anon, authenticated;


-- ---------- VÝCHOZÍ ČÍTAČ ----------
insert into public.counters (key, value)
values ('page_views', 0)
on conflict (key) do nothing;

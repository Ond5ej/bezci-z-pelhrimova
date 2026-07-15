/* =========================================================
   NASTAVENÍ WEBU (počty členů apod.)
   ---------------------------------------------------------
   Hodnoty se načítají ze Supabase, tabulka `settings`
   (spravuješ je na /admin/ → záložka Ostatní).

   JAK TO FUNGUJE:
   V HTML dáš prvku atribut  data-setting="klic"
   a jeho obsah se nahradí hodnotou z databáze.
   Např.  <span data-setting="members">111</span>

   Číslo napsané přímo v HTML slouží jako záloha – ukáže se,
   dokud se data nenačtou, nebo když Supabase není dostupné.
   Proto tam vždycky nech rozumnou hodnotu.
   ========================================================= */
import { getSupabase } from './supabase.js';

function apply(map) {
  document.querySelectorAll('[data-setting]').forEach(el => {
    const v = map[el.dataset.setting];
    if (v != null && v !== '') el.textContent = v;
  });
}

export async function initSettings() {
  const sb = await getSupabase();
  if (!sb) return;   // necháme zálohu z HTML

  const { data, error } = await sb.from('settings').select('key, value');

  if (error) { console.warn('Nastavení se nepodařilo načíst:', error.message); return; }
  if (!data?.length) return;

  apply(Object.fromEntries(data.map(r => [r.key, r.value])));
}

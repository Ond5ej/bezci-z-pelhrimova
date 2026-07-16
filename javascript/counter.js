/* =========================================================
   POČÍTADLO NÁVŠTĚV
   ---------------------------------------------------------
   Přičte jedničku při první návštěvě a číslo ukáže v patičce.
   Nastavení databáze je v supabase-counter.sql.

   Počítáme jednou za relaci prohlížeče, ne za každé načtení –
   jinak by stačilo párkrát zmáčknout F5 a číslo letí nahoru.
   Není to ochrana (kdo chce, obejde to), jen slušnost vůči
   vlastnímu číslu.

   Když Supabase není dostupné, patička zůstane beze změny –
   čítač je schovaný a odkryje se, až když je co ukázat.
   ========================================================= */
import { getSupabase } from './supabase.js';

const KEY = 'page_views';
const SESSION_FLAG = 'bzp_counted_v1';

/** Čeština skloňuje: 1 návštěva, 2–4 návštěvy, 5+ návštěv. */
function pluralVisits(n) {
  if (n === 1) return 'návštěva';
  if (n >= 2 && n <= 4) return 'návštěvy';
  return 'návštěv';
}

/** sessionStorage může být zakázané (soukromý režim) – nesmí to shodit web. */
function alreadyCounted() {
  try { return sessionStorage.getItem(SESSION_FLAG) === '1'; }
  catch { return false; }
}
function markCounted() {
  try { sessionStorage.setItem(SESSION_FLAG, '1'); }
  catch { /* nevadí, jen se připočte znovu */ }
}

export async function initCounter(sel) {
  const box = document.querySelector(sel.box);
  const num = document.querySelector(sel.num);
  if (!box || !num) return;

  const sb = await getSupabase();
  if (!sb) return;

  try {
    let value;

    if (alreadyCounted()) {
      // v téhle relaci už jsme se započítali – jen si přečteme stav
      const { data, error } = await sb
        .from('counters').select('value').eq('key', KEY).single();
      if (error) throw error;
      value = data.value;
    } else {
      // rpc = zavolání funkce v databázi; vrátí novou hodnotu
      const { data, error } = await sb.rpc('bump_counter', { k: KEY });
      if (error) throw error;
      value = data;
      markCounted();
    }

    const n = Number(value);
    if (!Number.isFinite(n)) return;

    num.textContent = n.toLocaleString('cs-CZ');
    box.querySelector('.visits-word').textContent = pluralVisits(n);
    box.hidden = false;
  } catch (e) {
    console.warn('Počítadlo se nepodařilo načíst:', e.message || e);
  }
}

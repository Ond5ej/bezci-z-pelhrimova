/* =========================================================
   SUPABASE – společné nastavení
   ---------------------------------------------------------
   1) Založ projekt na https://supabase.com
   2) V projektu: Settings → API
   3) Zkopíruj sem "Project URL" a veřejný klíč
      (anon / publishable key)

   POZOR: tento klíč je VEŘEJNÝ a je to tak správně –
   je vidět v prohlížeči každému. Bezpečnost neřeší klíč,
   ale pravidla RLS v databázi (viz supabase-schema.sql).
   NIKDY sem nedávej "service_role" klíč!
   ========================================================= */
export const SUPABASE_URL = 'https://jqbpktmcbqzzmwsfiesh.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_mRR5mfX2csFfFylGHej3Bg_C5OAvpQC';

/** Název úložiště na fotky (bucket v Supabase Storage) */
export const BUCKET = 'fotky';

let _client = null;

/** Je Supabase vůbec nastavené? */
export function isConfigured() {
  return !SUPABASE_URL.includes('TVUJ-PROJEKT') && !SUPABASE_KEY.includes('TVUJ-VEREJNY');
}

/**
 * Vrátí Supabase klienta, nebo null když ještě není nastavený.
 * Knihovna se stahuje až když je potřeba – web tím nezpomalíme.
 */
export async function getSupabase() {
  if (!isConfigured()) return null;
  if (_client) return _client;
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    _client = createClient(SUPABASE_URL, SUPABASE_KEY);
    return _client;
  } catch (e) {
    console.warn('Supabase se nepodařilo načíst:', e);
    return null;
  }
}

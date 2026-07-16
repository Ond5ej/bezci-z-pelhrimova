/* =========================================================
   PÁS SPONZORŮ
   ---------------------------------------------------------
   Loga se načítají ze Supabase (spravuješ je na /admin/,
   záložka Sponzoři). Když tam žádný sponzor není, celá sekce
   zůstane schovaná – v hero po ní nezbude prázdné místo.

   POSUN: rozjede se jen tehdy, když se loga do řádku nevejdou.
   Při třech logách by se pás jen trapně šoural, takže stojí
   a jen se hezky vycentruje. Rozhoduje o tom měření v JS,
   protože CSS neumí zjistit, jestli obsah přetéká.
   ========================================================= */
import { getSupabase } from './supabase.js';

function esc(s = '') {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** Kolik pixelů za sekundu pás ujede. Nižší = pomalejší. */
const SPEED = 40;

export function initSponsors(sel) {
  const box = document.querySelector(sel.box);
  const track = document.querySelector(sel.track);
  if (!box || !track) return;

  let items = [];

  load();

  async function load() {
    const sb = await getSupabase();
    if (!sb) return;

    const { data, error } = await sb.from('sponsors')
      .select('name, logo_url, url')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) { console.warn('Sponzory se nepodařilo načíst:', error.message); return; }
    if (!data?.length) return;   // žádní sponzoři = sekce zůstane skrytá

    items = data;
    render();
    box.hidden = false;
  }

  function cell(s) {
    const img = `<img src="${esc(s.logo_url)}" alt="${esc(s.name)}" loading="lazy">`;
    return s.url
      ? `<a class="sponsor" href="${esc(s.url)}" target="_blank" rel="noopener"
            title="${esc(s.name)}">${img}</a>`
      : `<span class="sponsor" title="${esc(s.name)}">${img}</span>`;
  }

  function render() {
    track.classList.remove('is-rolling');
    track.style.removeProperty('--roll-time');
    track.innerHTML = items.map(cell).join('');
    // obrázky mají svou šířku až po načtení – změřit jde teprve pak
    waitForImages().then(measure);
  }

  function waitForImages() {
    const imgs = [...track.querySelectorAll('img')];
    return Promise.all(imgs.map(i => i.complete
      ? Promise.resolve()
      : new Promise(res => { i.onload = i.onerror = res; })));
  }

  function measure() {
    // reset, ať měříme skutečnou šířku jedné sady
    track.classList.remove('is-rolling');
    const viewport = track.parentElement.clientWidth;
    const width = track.scrollWidth;

    if (width <= viewport) return;   // vejde se → stojí

    // Pás jede plynule dokola tak, že obsah zdvojíme a posuneme
    // přesně o polovinu – druhá sada v tu chvíli sedí tam, kde
    // začínala první, takže sklouznutí není vidět.
    track.innerHTML = track.innerHTML + track.innerHTML;
    track.style.setProperty('--roll-time', `${Math.round(width / SPEED)}s`);
    track.classList.add('is-rolling');
  }

  // po změně šířky okna se může přetečení objevit i zmizet
  let t;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => { if (items.length) render(); }, 200);
  });
}

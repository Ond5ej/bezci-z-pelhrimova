/* =========================================================
   TRASY – vykreslení karet + mini profil převýšení
   ---------------------------------------------------------
   Trasy se načítají ze Supabase (spravuješ je na /admin/,
   záložka Trasy). Když Supabase není dostupné, ukážou se
   záložní trasy definované níže.

   Názvy polí schválně odpovídají sloupcům v databázi,
   ať se nemusí nic převádět.
   ========================================================= */
import { getSupabase } from './supabase.js';
import { initReveal } from './reveal.js';

/** Záloha – ukáže se, dokud se nenačtou data ze Supabase. */
const fallbackRoutes = [
  {
    name: 'Městský okruh',
    description: 'Nenáročný okruh centrem a parky. Ideální na rozběhání a pro úplné začátečníky.',
    km: '5,2', elev: '45 m', teren: 'asfalt', diff: 'easy', diff_label: 'Pro každého',
    profile: [3, 4, 3, 5, 4, 6, 4, 3, 4, 3],
  },
  {
    name: 'Křemešník',
    description: 'Táhlé stoupání lesem až k rozhledně. Odměnou je výhled na celou Vysočinu.',
    km: '11,8', elev: '260 m', teren: 'les', diff: 'medium', diff_label: 'Kopcovitá',
    profile: [2, 3, 5, 7, 9, 10, 8, 6, 4, 3],
  },
  {
    name: 'Nedělní vejšlap',
    description: 'Delší pohodová trasa přes kopce a zpět. Pomalé tempo, hlavně si to užít.',
    km: '18,0', elev: '340 m', teren: 'smíšený', diff: 'hard', diff_label: 'Delší',
    profile: [3, 6, 4, 8, 6, 10, 7, 9, 5, 3],
  },
];

function esc(s = '') {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** Jen tyhle tři hodnoty smí do CSS třídy – cokoli jiného je 'easy'. */
function diffClass(d) {
  return ['easy', 'medium', 'hard'].includes(d) ? d : 'easy';
}

// Každý graf potřebuje vlastní id přechodu. Dřív se odvozovalo z hodnot,
// takže dvě trasy se stejným profilem si navzájem přepsaly výplň.
let gradId = 0;

/** Nakreslí mini profil převýšení. Exportované – používá i náhled v adminu. */
export function profileSVG(points) {
  const pts = (Array.isArray(points) ? points : []).map(Number).filter(n => !isNaN(n));
  if (pts.length < 2) return '';

  const W = 300, H = 64, pad = 4;
  const max = Math.max(...pts, 1);
  const step = (W - pad * 2) / (pts.length - 1);
  const coords = pts.map((v, i) => {
    const x = pad + i * step;
    const y = H - pad - (v / max) * (H - pad * 2);
    return [x, y];
  });

  // hladká křivka (Catmull-Rom -> Bézier)
  let d = `M ${coords[0][0].toFixed(1)} ${coords[0][1].toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i === 0 ? 0 : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  const area = `${d} L ${W - pad} ${H} L ${pad} ${H} Z`;
  const gid = `rg${++gradId}`;

  return `<svg class="route-profile" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--amber)" stop-opacity="0.35"/>
      <stop offset="1" stop-color="var(--amber)" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#${gid})"/>
    <path d="${d}" fill="none" stroke="var(--amber)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

export function initRoutes(sel) {
  const grid = document.querySelector(sel.grid);
  if (!grid) return;

  function render(list) {
    grid.innerHTML = list.map((r, i) => `
      <article class="route-card reveal" data-delay="${i + 1}">
        <div class="route-top">
          <span class="route-num">TRASA ${String(i + 1).padStart(2, '0')}</span>
          <span class="route-diff ${diffClass(r.diff)}">${esc(r.diff_label || '')}</span>
        </div>
        <h3>${esc(r.name)}</h3>
        <p class="route-desc">${esc(r.description || '')}</p>
        ${r.map_embed
          ? `<div class="route-map"><iframe src="${esc(r.map_embed)}"
               title="Mapa trasy ${esc(r.name)}" loading="lazy"
               referrerpolicy="no-referrer-when-downgrade"></iframe></div>`
          : profileSVG(r.profile)}
        <div class="route-meta">
          <div class="m"><span class="v">${esc(r.km || '–')}</span><span class="k">km</span></div>
          <div class="m"><span class="v">${esc(r.elev || '–')}</span><span class="k">převýšení</span></div>
          <div class="m"><span class="v">${esc(r.teren || '–')}</span><span class="k">povrch</span></div>
        </div>
      </article>
    `).join('');
  }

  // 1) hned záloha, ať sekce není prázdná
  render(fallbackRoutes);

  // 2) živá data
  loadRemote();

  async function loadRemote() {
    const sb = await getSupabase();
    if (!sb) return;

    const { data, error } = await sb.from('routes').select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) { console.warn('Trasy se nepodařilo načíst:', error.message); return; }
    if (!data?.length) return;

    render(data);
    // Karty vykreslené až teď observer z initReveal nezná – tyhle nové
    // by zůstaly navždy průhledné. Musíme mu je předat znovu.
    initReveal(`${sel.grid} .reveal`);
  }
}

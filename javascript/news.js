/* =========================================================
   AKTUÁLNĚ – novinky v úvodní sekci
   ---------------------------------------------------------
   Novinky se načítají ze Supabase (spravuješ je na /admin/).
   Pole `fallbackNews` níže se ukáže jen když Supabase ještě
   není nastavené nebo se data nepodaří načíst.
   ========================================================= */
import { getSupabase } from './supabase.js';

const fallbackNews = [
  {
    date: '2026-07-19',
    tag: 'VÝBĚH',
    title: 'Nedělní long run',
    text: 'Sraz v 9:00 na náměstí. Pohodové tempo, delší trasa, po doběhu kafe.',
  },
  {
    date: '2026-07-16',
    tag: 'PARTA',
    title: 'Je nás už 111!',
    text: 'Za poslední měsíc nás přibylo deset. Díky všem, co dorazili poprvé.',
  },
];

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' });
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function render(list, items) {
  if (!items.length) {
    list.innerHTML = `<li class="news-empty">
      Zatím tu nic nového není. Termíny výběhů dáváme na Facebook a Instagram.
    </li>`;
    return;
  }

  list.innerHTML = items.map(n => `
    <li class="news-item">
      ${n.image_url ? `<img class="news-banner" src="${escapeHtml(n.image_url)}"
        alt="${escapeHtml(n.title)}" loading="lazy" tabindex="0"
        role="button" aria-label="Zvětšit banner: ${escapeHtml(n.title)}">` : ''}
      <div class="news-meta">
        <time datetime="${escapeHtml(n.date)}">${formatDate(n.date)}</time>
        ${n.tag ? `<span class="news-tag">${escapeHtml(n.tag)}</span>` : ''}
      </div>
      <h3>${escapeHtml(n.title)}</h3>
      ${n.text ? `<p>${escapeHtml(n.text)}</p>` : ''}
    </li>
  `).join('');

  bindBanners(list);
}

/* ---- banner na celou stránku ---- */
function bindBanners(list) {
  const overlay = document.getElementById('banner-overlay');
  if (!overlay) return;
  const img = overlay.querySelector('img');
  const closeBtn = overlay.querySelector('.bo-close');

  const open = (src, alt) => {
    img.src = src;
    img.alt = alt || '';
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  };
  const close = () => {
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    img.removeAttribute('src');
  };

  list.querySelectorAll('.news-banner').forEach(b => {
    b.addEventListener('click', () => open(b.src, b.alt));
    b.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(b.src, b.alt); }
    });
  });

  if (!overlay.dataset.bound) {
    overlay.dataset.bound = '1';
    closeBtn.addEventListener('click', close);
    // klik mimo obrázek zavře
    overlay.addEventListener('click', (e) => { if (e.target !== img) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.getAttribute('aria-hidden') === 'false') close();
    });
  }
}

export async function initNews(sel) {
  const list = document.querySelector(sel.list);
  if (!list) return;
  const limit = sel.limit || 3;

  // 1) hned ukážeme zálohu, ať panel není prázdný
  const sorted = [...fallbackNews].sort((a, b) => b.date.localeCompare(a.date));
  render(list, sorted.slice(0, limit));

  // 2) zkusíme načíst živá data ze Supabase
  const sb = await getSupabase();
  if (!sb) return;

  const { data, error } = await sb
    .from('news')
    .select('date, tag, title, text, image_url')
    .eq('published', true)
    .order('date', { ascending: false })
    // `date` je bez času – když má víc novinek stejný den, rozhodne čas vložení,
    // jinak by databáze vracela jejich pořadí náhodně
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) { console.warn('Novinky se nepodařilo načíst:', error.message); return; }
  if (data) render(list, data);
}
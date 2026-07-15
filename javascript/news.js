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
      ${n.image_url ? `<img class="news-banner" src="${escapeHtml(n.image_url)}" alt="" loading="lazy">` : ''}
      <div class="news-meta">
        <time datetime="${escapeHtml(n.date)}">${formatDate(n.date)}</time>
        ${n.tag ? `<span class="news-tag">${escapeHtml(n.tag)}</span>` : ''}
      </div>
      <h3>${escapeHtml(n.title)}</h3>
      ${n.text ? `<p>${escapeHtml(n.text)}</p>` : ''}
    </li>
  `).join('');
}

export async function initNews(sel) {
  const list = document.querySelector(sel.list);
  if (!list) return;
  const limit = sel.limit || 3;

  // 1) hned ukážeme zálohu, ať panel není prázdný
  const sorted = [...fallbackNews].sort((a, b) => (a.date < b.date ? 1 : -1));
  render(list, sorted.slice(0, limit));

  // 2) zkusíme načíst živá data ze Supabase
  const sb = await getSupabase();
  if (!sb) return;

  const { data, error } = await sb
    .from('news')
    .select('date, tag, title, text, image_url')
    .eq('published', true)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) { console.warn('Novinky se nepodařilo načíst:', error.message); return; }
  if (data) render(list, data);
}

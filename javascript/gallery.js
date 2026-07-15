/* =========================================================
   GALERIE + ALBA + LIGHTBOX
   ---------------------------------------------------------
   Fotky a alba se načítají ze Supabase (spravuješ je na /admin/).
   Když Supabase ještě není nastavené, ukážou se placeholdery
   z gallery-data.js.
   ========================================================= */
import { galleryPhotos } from './gallery-data.js';
import { getSupabase } from './supabase.js';

/** Kolik fotek je vidět, než se začne rolovat. Zbytek je dostupný posuvníkem. */
const VISIBLE_PHOTOS = 20;

/** Zamíchá kopii pole (Fisher–Yates). */
function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Promíchá fotky tak, aby se alba střídala – bere po jedné z každého
 * dokola. Album s 200 fotkami tak nezavalí začátek mřížky a na album
 * s pěti se taky dostane.
 */
function spreadAcrossAlbums(list) {
  const byAlbum = new Map();
  for (const p of list) {
    const key = p.album_id || '_';
    if (!byAlbum.has(key)) byAlbum.set(key, []);
    byAlbum.get(key).push(p);
  }
  // uvnitř alba náhodně, ať se pořád netočí ty samé
  const buckets = [...byAlbum.values()].map(shuffle);

  const out = [];
  let i = 0;
  while (buckets.some(b => b.length)) {
    const b = buckets[i % buckets.length];
    if (b.length) out.push(b.shift());
    i++;
  }
  return out;
}

export function initGallery(sel) {
  const grid = document.querySelector(sel.grid);
  const filterBox = document.querySelector(sel.filters || '#gallery-filters');
  if (!grid) return;

  const lb = document.querySelector(sel.lightbox);
  const lbImg = lb?.querySelector('.lb-stage img');
  const lbCap = lb?.querySelector('.lb-caption');
  const lbThumbs = lb?.querySelector('.lb-thumbs');
  const btnClose = lb?.querySelector('.lb-close');
  const btnPrev = lb?.querySelector('.lb-prev');
  const btnNext = lb?.querySelector('.lb-next');

  let remotePhotos = [];   // ze Supabase
  let albums = [];
  let albumTitles = new Map(); // id alba -> název (pro odznak na fotce)
  let activeAlbum = 'all';
  let photos = [];         // aktuálně zobrazené
  let current = 0;

  /* ---- co se má zobrazit ---- */
  function currentSet() {
    // základ: fotky ze Supabase, jinak placeholdery
    const base = remotePhotos.length
      ? remotePhotos.map(p => ({ src: p.url, alt: p.alt || '', album_id: p.album_id }))
      : galleryPhotos.map(p => ({ ...p, album_id: null }));

    // konkrétní album: pořadí od nejnovějších
    if (activeAlbum !== 'all') {
      return base.filter(p => p.album_id === activeAlbum);
    }
    // pohled "Vše": promícháme napříč alby
    return spreadAcrossAlbums(base);
  }

  /* ---- filtr alb ---- */
  function renderFilters() {
    if (!filterBox || !albums.length) return;
    filterBox.hidden = false;
    filterBox.innerHTML = `
      <button class="gal-chip is-active" data-album="all">Vše</button>
      ${albums.map(a => `<button class="gal-chip" data-album="${a.id}">${a.title}</button>`).join('')}
    `;
    filterBox.querySelectorAll('.gal-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        activeAlbum = btn.dataset.album;
        filterBox.querySelectorAll('.gal-chip')
          .forEach(x => x.classList.toggle('is-active', x === btn));
        render();
      });
    });
  }

  /**
   * Nastaví mřížce strop výšky přesně na VISIBLE_PHOTOS fotek.
   * Počet sloupců čteme z CSS (mění se na 4/3/2 podle šířky okna),
   * výšku řádku měříme z první dlaždice – ta ji má z aspect-ratio,
   * takže je známá hned a nečeká se na stažení obrázků.
   */
  function applyScrollHeight() {
    const first = grid.querySelector('.gallery-item');
    if (!first) { grid.style.maxHeight = ''; grid.classList.remove('is-scrollable'); return; }

    const cs = getComputedStyle(grid);
    const cols = cs.gridTemplateColumns.split(' ').filter(Boolean).length;
    if (!cols) return;

    const rows = Math.max(1, Math.ceil(VISIBLE_PHOTOS / cols));
    const fits = rows * cols;

    // rolovat má smysl, jen když se fotky nevejdou
    if (photos.length <= fits) {
      grid.style.maxHeight = '';
      grid.classList.remove('is-scrollable');
      return;
    }

    const gap = parseFloat(cs.rowGap) || 0;
    const rowH = first.getBoundingClientRect().height;
    grid.style.maxHeight = `${Math.round(rows * rowH + (rows - 1) * gap)}px`;
    grid.classList.add('is-scrollable');
  }

  /* ---- vykreslení mřížky ---- */
  function render() {
    photos = currentSet();
    grid.querySelectorAll('.gallery-item').forEach(el => el.remove());

    photos.forEach((p, i) => {
      const fig = document.createElement('figure');
      fig.className = 'gallery-item';
      fig.setAttribute('role', 'button');
      fig.setAttribute('tabindex', '0');
      fig.setAttribute('aria-label', 'Zobrazit fotku: ' + (p.alt || 'Fotografie'));

      const img = document.createElement('img');
      img.src = p.src;
      img.alt = p.alt || 'Fotografie';
      img.loading = 'lazy';
      fig.appendChild(img);

      // název alba – ukáže se až po najetí myší (CSS)
      const albName = p.album_id ? albumTitles.get(p.album_id) : null;
      if (albName) {
        const badge = document.createElement('span');
        badge.className = 'alb-badge';
        badge.textContent = albName;
        fig.appendChild(badge);
      }

      if (p.alt) {
        const cap = document.createElement('figcaption');
        cap.className = 'cap';
        cap.textContent = p.alt;
        fig.appendChild(cap);
      }

      const open = () => openLightbox(i);
      fig.addEventListener('click', open);
      fig.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });

      grid.appendChild(fig);
    });

    applyScrollHeight();
  }

  // po změně šířky okna se mění počet sloupců → přepočítat
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyScrollHeight, 150);
  });

  /* ---- lightbox ---- */
  function buildThumbs() {
    if (!lbThumbs) return;
    lbThumbs.innerHTML = '';
    photos.forEach((p, i) => {
      const t = document.createElement('img');
      t.src = p.src;
      t.alt = '';
      t.addEventListener('click', () => show(i));
      lbThumbs.appendChild(t);
    });
  }
  function show(i) {
    if (!photos.length) return;
    current = (i + photos.length) % photos.length;
    const p = photos[current];
    if (lbImg) { lbImg.src = p.src; lbImg.alt = p.alt || 'Fotografie'; }
    if (lbCap) lbCap.textContent = p.alt || '';
    if (lbThumbs) {
      Array.from(lbThumbs.children).forEach((n, idx) =>
        n.classList.toggle('active', idx === current));
      lbThumbs.children[current]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }
  function openLightbox(i) {
    if (!lb) return;
    buildThumbs();
    document.body.style.overflow = 'hidden';
    lb.setAttribute('aria-hidden', 'false');
    show(i);
  }
  function closeLightbox() {
    if (!lb) return;
    document.body.style.overflow = '';
    lb.setAttribute('aria-hidden', 'true');
    if (lbImg) lbImg.removeAttribute('src');
  }

  /* ---- události ---- */
  btnClose?.addEventListener('click', closeLightbox);
  btnPrev?.addEventListener('click', () => show(current - 1));
  btnNext?.addEventListener('click', () => show(current + 1));
  lb?.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (lb?.getAttribute('aria-hidden') !== 'false') return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') show(current + 1);
    if (e.key === 'ArrowLeft') show(current - 1);
  });

  /* ---- švihání prstem ---- */
  // Na mobilu lidi čekají, že mezi fotkami přejedou prstem. Bez toho
  // působí prohlížeč rozbitě, i když šipky fungují.
  let touchX = null, touchY = null;
  lb?.addEventListener('touchstart', (e) => {
    touchX = e.changedTouches[0].clientX;
    touchY = e.changedTouches[0].clientY;
  }, { passive: true });

  lb?.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    touchX = touchY = null;
    // jen vodorovné tahy delší než 50 px – ať se to nepere s rolováním
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    show(dx < 0 ? current + 1 : current - 1);
  }, { passive: true });

  /* ---- start: nejdřív placeholdery, pak živá data ---- */
  render();
  loadRemote();

  async function loadRemote() {
    const sb = await getSupabase();
    if (!sb) return;

    const [{ data: al }, { data: ph, error }] = await Promise.all([
      sb.from('albums').select('id, title').order('created_at', { ascending: false }),
      sb.from('photos').select('url, alt, album_id').order('created_at', { ascending: false }),
    ]);

    if (error) { console.warn('Fotky se nepodařilo načíst:', error.message); return; }

    remotePhotos = ph || [];
    albumTitles = new Map((al || []).map(a => [a.id, a.title]));
    // ukážeme jen alba, která mají aspoň jednu fotku
    const used = new Set(remotePhotos.map(p => p.album_id));
    albums = (al || []).filter(a => used.has(a.id));

    if (remotePhotos.length) { renderFilters(); render(); }
  }
}

/* =========================================================
   GALERIE + ALBA + LIGHTBOX
   ---------------------------------------------------------
   Fotky a alba se načítají ze Supabase (spravuješ je na /admin/).
   Když Supabase ještě není nastavené, ukážou se placeholdery
   z gallery-data.js.
   ========================================================= */
import { galleryPhotos } from './gallery-data.js';
import { getSupabase } from './supabase.js';

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
  let activeAlbum = 'all';
  let photos = [];         // aktuálně zobrazené
  let current = 0;

  /* ---- co se má zobrazit ---- */
  function currentSet() {
    // základ: fotky ze Supabase, jinak placeholdery
    let base = remotePhotos.length
      ? remotePhotos.map(p => ({ src: p.url, alt: p.alt || '', album_id: p.album_id }))
      : galleryPhotos.map(p => ({ ...p, album_id: null }));

    if (activeAlbum !== 'all') base = base.filter(p => p.album_id === activeAlbum);
    return base;
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
  }

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
    // ukážeme jen alba, která mají aspoň jednu fotku
    const used = new Set(remotePhotos.map(p => p.album_id));
    albums = (al || []).filter(a => used.has(a.id));

    if (remotePhotos.length) { renderFilters(); render(); }
  }
}
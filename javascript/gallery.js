/* =========================================================
   GALERIE + ALBA + LIGHTBOX
   ---------------------------------------------------------
   Fotky a alba se načítají ze Supabase (spravuješ je na /admin/).
   Když Supabase ještě není nastavené, ukážou se placeholdery
   z gallery-data.js.
   Tlačítko „Přidat fotku" ukládá fotku jen do prohlížeče
   návštěvníka (soukromá nástěnka) – ostatní ji nevidí.
   ========================================================= */
import { galleryPhotos } from './gallery-data.js';
import { getSupabase } from './supabase.js';

const LS_KEY = 'bzp_user_photos_v1';

export function initGallery(sel) {
  const grid = document.querySelector(sel.grid);
  const fileInput = document.querySelector(sel.fileInput);
  const addTile = document.querySelector(sel.addTile);
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

  /* ---- uložené fotky návštěvníka ---- */
  const loadUserPhotos = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; }
  };
  const saveUserPhotos = (list) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); }
    catch (e) { console.warn('Nelze uložit fotky:', e); }
  };

  /* ---- co se má zobrazit ---- */
  function currentSet() {
    const user = loadUserPhotos().map(p => ({ ...p, user: true, album_id: null }));

    // základ: fotky ze Supabase, jinak placeholdery
    let base = remotePhotos.length
      ? remotePhotos.map(p => ({ src: p.url, alt: p.alt || '', album_id: p.album_id, user: false }))
      : galleryPhotos.map(p => ({ ...p, album_id: null, user: false }));

    if (activeAlbum !== 'all') base = base.filter(p => p.album_id === activeAlbum);
    return activeAlbum === 'all' ? [...base, ...user] : base;
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
      fig.className = 'gallery-item' + (p.user ? ' user' : '');
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

      if (p.user) {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = 'MOJE';
        fig.appendChild(badge);

        const del = document.createElement('button');
        del.className = 'del';
        del.type = 'button';
        del.setAttribute('aria-label', 'Odebrat fotku');
        del.innerHTML = '&times;';
        del.addEventListener('click', (e) => { e.stopPropagation(); removeUserPhoto(p.id); });
        fig.appendChild(del);
      }

      const open = () => openLightbox(i);
      fig.addEventListener('click', open);
      fig.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });

      if (addTile && addTile.parentNode === grid) grid.insertBefore(fig, addTile);
      else grid.appendChild(fig);
    });
  }

  /* ---- přidání fotky návštěvníkem (jen do prohlížeče) ---- */
  function handleFiles(fileList) {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    let pending = files.length;
    const list = loadUserPhotos();

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        list.push({
          id: 'u' + Date.now() + Math.random().toString(36).slice(2, 6),
          src: reader.result,
          alt: file.name.replace(/\.[^.]+$/, ''),
        });
        if (--pending === 0) { saveUserPhotos(list); render(); }
      };
      reader.onerror = () => { if (--pending === 0) { saveUserPhotos(list); render(); } };
      reader.readAsDataURL(file);
    });
  }

  function removeUserPhoto(id) {
    saveUserPhotos(loadUserPhotos().filter(p => p.id !== id));
    render();
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
  addTile?.addEventListener('click', () => fileInput?.click());
  addTile?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput?.click(); }
  });
  fileInput?.addEventListener('change', (e) => { handleFiles(e.target.files); e.target.value = ''; });

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

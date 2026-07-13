/* =========================================================
   GALERIE + LIGHTBOX + PŘIDÁVÁNÍ FOTEK
   Nahrané fotky se ukládají do prohlížeče (localStorage) –
   zůstanou uložené jen v tomto zařízení a prohlížeči.
   ========================================================= */
import { galleryPhotos } from './gallery-data.js';

const LS_KEY = 'bzp_user_photos_v1';

export function initGallery(sel) {
  const grid = document.querySelector(sel.grid);
  const fileInput = document.querySelector(sel.fileInput);
  const addTile = document.querySelector(sel.addTile);
  if (!grid) return;

  // --- lightbox prvky ---
  const lb = document.querySelector(sel.lightbox);
  const lbImg = lb?.querySelector('.lb-stage img');
  const lbCap = lb?.querySelector('.lb-caption');
  const lbThumbs = lb?.querySelector('.lb-thumbs');
  const btnClose = lb?.querySelector('.lb-close');
  const btnPrev = lb?.querySelector('.lb-prev');
  const btnNext = lb?.querySelector('.lb-next');

  let photos = [];       // spojený seznam {src, alt, user?}
  let current = 0;

  // ---- načtení uložených fotek ----
  function loadUserPhotos() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch { return []; }
  }
  function saveUserPhotos(list) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); }
    catch (e) { console.warn('Nelze uložit fotky:', e); }
  }

  // ---- vykreslení mřížky ----
  function render() {
    const userPhotos = loadUserPhotos().map(p => ({ ...p, user: true }));
    photos = [...galleryPhotos.map(p => ({ ...p, user: false })), ...userPhotos];

    // odeber staré fotky, ale zachovej dlaždici „přidat"
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

      const cap = document.createElement('figcaption');
      cap.className = 'cap';
      cap.textContent = p.alt || '';
      fig.appendChild(cap);

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

      // vlož před dlaždici „přidat" (pokud existuje), jinak na konec
      if (addTile && addTile.parentNode === grid) grid.insertBefore(fig, addTile);
      else grid.appendChild(fig);
    });
  }

  // ---- přidání fotky ----
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
          user: true,
        });
        if (--pending === 0) { saveUserPhotos(list); render(); }
      };
      reader.onerror = () => { if (--pending === 0) { saveUserPhotos(list); render(); } };
      reader.readAsDataURL(file);
    });
  }

  function removeUserPhoto(id) {
    const list = loadUserPhotos().filter(p => p.id !== id);
    saveUserPhotos(list);
    render();
  }

  // ---- lightbox ----
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

  // ---- události ----
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

  render();
}

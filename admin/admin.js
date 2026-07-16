/* =========================================================
   ADMINISTRACE – logika
   Přihlášení + správa novinek, alb a fotek přes Supabase.
   ========================================================= */
import { getSupabase, isConfigured, BUCKET } from '../javascript/supabase.js';
// stejné kreslítko, jaké používá web – náhled tak ukazuje přesně to,
// co uvidí návštěvník, a nemůže se to rozejít
import { profileSVG } from '../javascript/routes.js';

const $ = (s) => document.querySelector(s);
let sb = null;
let albums = [];
let editingNewsId = null;
let editingAlbumId = null;
let editingRouteId = null;
let editingSponsorId = null;
let pendingLogo = null;   // { file, preview } než se uloží
let pendingBanner = null;   // { file } nebo { url } u úprav

/* ---------- pomocné ---------- */
function msg(el, text, kind = '') {
  const n = $(el);
  if (!n) return;
  n.textContent = text;
  n.className = 'msg ' + kind;
}
function esc(s = '') {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d) ? iso : d.toLocaleDateString('cs-CZ');
}
function today() { return new Date().toISOString().slice(0, 10); }

/** Nahraje soubor do úložiště a vrátí { url, path } */
async function uploadFile(file, folder) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/* =========================================================
   START
   ========================================================= */
(async function start() {
  if (!isConfigured()) {
    $('#setup-warn').hidden = false;
    return;
  }
  sb = await getSupabase();
  if (!sb) {
    $('#setup-warn').hidden = false;
    return;
  }

  const { data: { session } } = await sb.auth.getSession();
  session ? showAdmin(session) : showLogin();

  sb.auth.onAuthStateChange((_e, s) => {
    s ? showAdmin(s) : showLogin();
  });
})();

function showLogin() {
  $('#admin').hidden = true;
  $('#login-wrap').hidden = false;
}

async function showAdmin(session) {
  $('#login-wrap').hidden = true;
  $('#admin').hidden = false;
  $('#who').textContent = session?.user?.email || '';
  $('#n-date').value = today();
  await loadAlbums();
  await loadNews();
  await loadPhotos();
  await loadRoutes();
  await loadSponsors();
  await loadSettings();
}

/* =========================================================
   PŘIHLÁŠENÍ
   ========================================================= */
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#login-btn');
  btn.disabled = true;
  msg('#login-msg', 'Přihlašuji…');

  const { error } = await sb.auth.signInWithPassword({
    email: $('#email').value.trim(),
    password: $('#password').value,
  });

  btn.disabled = false;
  if (error) {
    msg('#login-msg', 'Přihlášení se nepovedlo. Zkontroluj e-mail a heslo.', 'err');
    return;
  }
  msg('#login-msg', '');
  $('#login-form').reset();
});

$('#logout-btn').addEventListener('click', async () => {
  await sb.auth.signOut();
});

/* =========================================================
   ZÁLOŽKY
   ========================================================= */
$('#tabs').addEventListener('click', (e) => {
  const t = e.target.closest('.tab');
  if (!t) return;
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('is-active', x === t));
  document.querySelectorAll('.panel').forEach(p =>
    p.classList.toggle('is-active', p.id === 'panel-' + t.dataset.tab));
});

/* =========================================================
   AKTUÁLNĚ (novinky)
   ========================================================= */
$('#n-image').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;
  pendingBanner = { file: f };
  const img = $('#n-preview img');
  img.src = URL.createObjectURL(f);
  $('#n-preview').hidden = false;
});

$('#n-image-remove').addEventListener('click', () => {
  pendingBanner = null;
  $('#n-image').value = '';
  $('#n-preview').hidden = true;
  $('#n-preview img').src = '';
});

$('#news-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#news-save');
  btn.disabled = true;
  msg('#news-msg', 'Ukládám…');

  try {
    let image_url = pendingBanner?.url || null;
    if (pendingBanner?.file) {
      msg('#news-msg', 'Nahrávám banner…');
      const up = await uploadFile(pendingBanner.file, 'bannery');
      image_url = up.url;
    }

    const row = {
      date: $('#n-date').value || today(),
      tag: $('#n-tag').value.trim() || null,
      title: $('#n-title').value.trim(),
      text: $('#n-text').value.trim() || null,
      image_url,
      published: $('#n-published').checked,
    };

    const { error } = editingNewsId
      ? await sb.from('news').update(row).eq('id', editingNewsId)
      : await sb.from('news').insert(row);
    if (error) throw error;

    resetNewsForm();
    msg('#news-msg', 'Uloženo ✓', 'ok');
    await loadNews();
  } catch (err) {
    console.error(err);
    msg('#news-msg', 'Nepovedlo se uložit: ' + (err.message || err), 'err');
  } finally {
    btn.disabled = false;
  }
});

$('#news-cancel').addEventListener('click', resetNewsForm);

function resetNewsForm() {
  editingNewsId = null;
  pendingBanner = null;
  $('#news-form').reset();
  $('#n-date').value = today();
  $('#n-published').checked = true;
  $('#n-preview').hidden = true;
  $('#news-form-title').textContent = 'Nová novinka';
  $('#news-cancel').hidden = true;
  msg('#news-msg', '');
}

async function loadNews() {
  const box = $('#news-list');
  box.innerHTML = '<p class="empty">Načítám…</p>';
  const { data, error } = await sb.from('news').select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) { box.innerHTML = `<p class="empty">Chyba: ${esc(error.message)}</p>`; return; }
  if (!data.length) { box.innerHTML = '<p class="empty">Zatím tu není žádná novinka.</p>'; return; }

  box.innerHTML = data.map(n => `
    <div class="row">
      ${n.image_url ? `<img class="row-thumb" src="${esc(n.image_url)}" alt="">` : ''}
      <div class="row-main">
        <strong>${esc(n.title)}</strong>
        <div class="row-meta">
          <span>${fmtDate(n.date)}</span>
          ${n.tag ? `<span class="pill">${esc(n.tag)}</span>` : ''}
          ${n.published ? '' : '<span class="pill off">SKRYTO</span>'}
        </div>
      </div>
      <div class="row-actions">
        <button class="icon-btn" data-edit="${n.id}" title="Upravit"><i class="bi bi-pencil"></i></button>
        <button class="icon-btn danger" data-del="${n.id}" title="Smazat"><i class="bi bi-trash"></i></button>
      </div>
    </div>
  `).join('');

  box.querySelectorAll('[data-edit]').forEach(b =>
    b.addEventListener('click', () => editNews(data.find(x => x.id === b.dataset.edit))));
  box.querySelectorAll('[data-del]').forEach(b =>
    b.addEventListener('click', () => delNews(b.dataset.del)));
}

function editNews(n) {
  if (!n) return;
  editingNewsId = n.id;
  $('#n-date').value = n.date;
  $('#n-tag').value = n.tag || '';
  $('#n-title').value = n.title;
  $('#n-text').value = n.text || '';
  $('#n-published').checked = n.published;
  pendingBanner = n.image_url ? { url: n.image_url } : null;
  if (n.image_url) {
    $('#n-preview img').src = n.image_url;
    $('#n-preview').hidden = false;
  } else {
    $('#n-preview').hidden = true;
  }
  $('#news-form-title').textContent = 'Úprava novinky';
  $('#news-cancel').hidden = false;
  $('#news-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function delNews(id) {
  if (!confirm('Opravdu smazat tuto novinku?')) return;
  const { error } = await sb.from('news').delete().eq('id', id);
  if (error) { alert('Nepovedlo se smazat: ' + error.message); return; }
  await loadNews();
}

/* =========================================================
   ALBA
   ========================================================= */
$('#album-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  msg('#album-msg', 'Ukládám…');

  const row = {
    title: $('#a-title').value.trim(),
    description: $('#a-desc').value.trim() || null,
  };

  const { error } = editingAlbumId
    ? await sb.from('albums').update(row).eq('id', editingAlbumId)
    : await sb.from('albums').insert(row);

  if (error) { msg('#album-msg', 'Chyba: ' + error.message, 'err'); return; }

  resetAlbumForm();
  msg('#album-msg', 'Uloženo ✓', 'ok');
  await loadAlbums();
  await loadPhotos();
});

$('#album-cancel').addEventListener('click', resetAlbumForm);

function resetAlbumForm() {
  editingAlbumId = null;
  $('#album-form').reset();
  $('#album-form-title').textContent = 'Nové album';
  $('#album-cancel').hidden = true;
  msg('#album-msg', '');
}

async function loadAlbums() {
  const { data, error } = await sb.from('albums')
    .select('*, photos(count)')
    .order('created_at', { ascending: false });

  const box = $('#album-list');
  if (error) { box.innerHTML = `<p class="empty">Chyba: ${esc(error.message)}</p>`; return; }
  albums = data || [];

  // naplníme rozbalovací seznamy u fotek
  const opts = albums.map(a => `<option value="${a.id}">${esc(a.title)}</option>`).join('');
  $('#p-album').innerHTML = opts || '<option value="">Nejdřív vytvoř album</option>';
  $('#p-filter').innerHTML = opts || '<option value="">Žádné album</option>';

  if (!albums.length) { box.innerHTML = '<p class="empty">Zatím žádné album. Vytvoř první vlevo.</p>'; return; }

  box.innerHTML = albums.map(a => `
    <div class="row">
      <div class="row-main">
        <strong>${esc(a.title)}</strong>
        <div class="row-meta">
          <span>${a.photos?.[0]?.count ?? 0} fotek</span>
          ${a.description ? `<span>· ${esc(a.description)}</span>` : ''}
        </div>
      </div>
      <div class="row-actions">
        <button class="icon-btn" data-edit="${a.id}" title="Upravit"><i class="bi bi-pencil"></i></button>
        <button class="icon-btn danger" data-del="${a.id}" title="Smazat album i fotky"><i class="bi bi-trash"></i></button>
      </div>
    </div>
  `).join('');

  box.querySelectorAll('[data-edit]').forEach(b =>
    b.addEventListener('click', () => {
      const a = albums.find(x => x.id === b.dataset.edit);
      editingAlbumId = a.id;
      $('#a-title').value = a.title;
      $('#a-desc').value = a.description || '';
      $('#album-form-title').textContent = 'Úprava alba';
      $('#album-cancel').hidden = false;
    }));

  box.querySelectorAll('[data-del]').forEach(b =>
    b.addEventListener('click', () => delAlbum(b.dataset.del)));
}

async function delAlbum(id) {
  if (!confirm('Smazat album i všechny jeho fotky? Nejde to vrátit.')) return;

  // nejdřív smažeme soubory z úložiště
  const { data: ph } = await sb.from('photos').select('path').eq('album_id', id);
  if (ph?.length) await sb.storage.from(BUCKET).remove(ph.map(p => p.path));

  const { error } = await sb.from('albums').delete().eq('id', id);
  if (error) { alert('Nepovedlo se smazat: ' + error.message); return; }

  await loadAlbums();
  await loadPhotos();
}

/* =========================================================
   FOTKY
   ========================================================= */
$('#p-files').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  const albumId = $('#p-album').value;
  if (!files.length) return;
  if (!albumId) { alert('Nejdřív vytvoř album v záložce Alba.'); e.target.value = ''; return; }

  $('#p-progress').hidden = false;
  let done = 0;

  for (const f of files) {
    msg('#p-msg', `Nahrávám ${done + 1} z ${files.length}…`);
    try {
      const up = await uploadFile(f, albumId);
      const { error } = await sb.from('photos').insert({
        album_id: albumId,
        url: up.url,
        path: up.path,
        alt: f.name.replace(/\.[^.]+$/, ''),
      });
      if (error) throw error;
    } catch (err) {
      console.error(err);
      msg('#p-msg', 'Chyba u ' + f.name + ': ' + (err.message || err), 'err');
    }
    done++;
    $('#p-bar').style.width = Math.round((done / files.length) * 100) + '%';
  }

  msg('#p-msg', `Hotovo – nahráno ${done} fotek ✓`, 'ok');
  e.target.value = '';
  $('#p-filter').value = albumId;
  await loadPhotos();
  await loadAlbums();
  setTimeout(() => { $('#p-progress').hidden = true; $('#p-bar').style.width = '0'; }, 2500);
});

$('#p-filter').addEventListener('change', loadPhotos);

async function loadPhotos() {
  const grid = $('#photo-grid');
  const albumId = $('#p-filter').value;
  if (!albumId) { grid.innerHTML = '<p class="empty">Zatím žádné album.</p>'; return; }

  grid.innerHTML = '<p class="empty">Načítám…</p>';
  const { data, error } = await sb.from('photos')
    .select('*').eq('album_id', albumId)
    .order('created_at', { ascending: false });

  if (error) { grid.innerHTML = `<p class="empty">Chyba: ${esc(error.message)}</p>`; return; }
  if (!data.length) { grid.innerHTML = '<p class="empty">V tomhle albu zatím nejsou fotky.</p>'; return; }

  grid.innerHTML = data.map(p => `
    <figure class="photo-cell">
      <img src="${esc(p.url)}" alt="${esc(p.alt || '')}" loading="lazy">
      <button class="del" data-del="${p.id}" data-path="${esc(p.path)}" title="Smazat">
        <i class="bi bi-trash"></i>
      </button>
    </figure>
  `).join('');

  grid.querySelectorAll('[data-del]').forEach(b =>
    b.addEventListener('click', () => delPhoto(b.dataset.del, b.dataset.path)));
}

async function delPhoto(id, path) {
  if (!confirm('Smazat tuto fotku?')) return;
  await sb.storage.from(BUCKET).remove([path]);
  const { error } = await sb.from('photos').delete().eq('id', id);
  if (error) { alert('Nepovedlo se smazat: ' + error.message); return; }
  await loadPhotos();
  await loadAlbums();
}

/* =========================================================
   TRASY
   ---------------------------------------------------------
   Profil převýšení se zadává jako čísla oddělená čárkou.
   Náhled se kreslí stejnou funkcí jako web (profileSVG),
   takže se nemůže rozejít s tím, co uvidí návštěvník.
   ========================================================= */

/**
 * Z vlepeného <iframe> nebo holého odkazu vytáhne adresu mapy a ověří ji.
 * Vrací adresu, null (prázdné), nebo vyhodí chybu s vysvětlením.
 *
 * Rozhoduje CESTA, ne doména: /s/kod je sdílený obsah, kdežto
 * /cs/turisticka?planovani-trasy je celá aplikace plánovače – tu do
 * iframu dát nejde, Seznam přes ni hodí šedou vrstvu.
 */
function parseMapEmbed(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;

  // buď celý kód s src="...", nebo rovnou adresa
  const m = text.match(/src\s*=\s*["']([^"']+)["']/i);
  const url = m ? m[1] : text;

  let u;
  try { u = new URL(url); }
  catch { throw new Error('Tohle nevypadá jako odkaz ani jako kód s mapou.'); }

  if (!/(^|\.)mapy\.(cz|com)$/.test(u.hostname)) {
    throw new Error('Adresa nevede na Mapy.cz.');
  }
  if (!/^\/s\/[A-Za-z0-9]+$/.test(u.pathname)) {
    throw new Error('Tohle je adresa plánovače, ne sdílené mapy. V Mapy.com klikni '
      + 'Sdílet → Vložit mapu do vlastních stránek a zkopíruj kód odtamtud.');
  }
  return u.toString();
}

/** "2, 3, 5" -> [2,3,5]. Ignoruje mezery a prázdné kousky. */
function parseProfile(text) {
  return String(text || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter(n => !isNaN(n) && n >= 0);
}

function drawPreview() {
  const box = $('#r-preview');
  if (!box) return;
  const pts = parseProfile($('#r-profile').value);
  box.innerHTML = pts.length >= 2
    ? profileSVG(pts)
    : '<span class="hint">Napiš aspoň dvě čísla a uvidíš náhled křivky.</span>';
}
$('#r-profile')?.addEventListener('input', drawPreview);

/**
 * Ukáže mapu tak, jak bude na webu, a podle toho schová profil.
 * Kódy typu /s/deranuvofo jsou náhodné a z ničeho nepoznáš, jestli
 * je to ta správná trasa – jediná odpověď je vidět ji.
 */
function drawMapPreview() {
  const box = $('#r-map-preview');
  const block = $('#r-profile-block');
  const wins = $('#r-map-wins');
  if (!box) return;

  const raw = $('#r-map').value.trim();
  if (!raw) {
    box.innerHTML = '';
    if (block) block.hidden = false;
    if (wins) wins.hidden = true;
    return;
  }

  try {
    const url = parseMapEmbed(raw);
    box.innerHTML = `<iframe src="${esc(url)}" title="Náhled mapy" loading="lazy"></iframe>`;
    // mapa je platná → profil se nepoužije, tak ať nepřekáží
    if (block) block.hidden = true;
    if (wins) wins.hidden = false;
  } catch (err) {
    box.innerHTML = `<p class="map-err"><i class="bi bi-exclamation-triangle-fill"></i>
      ${esc(err.message)}</p>`;
    if (block) block.hidden = false;
    if (wins) wins.hidden = true;
  }
}
$('#r-map')?.addEventListener('input', drawMapPreview);

function resetRouteForm() {
  editingRouteId = null;
  $('#route-form').reset();
  $('#r-order').value = 0;
  $('#route-form-title').textContent = 'Nová trasa';
  $('#route-cancel').hidden = true;
  drawPreview();
  drawMapPreview();
  msg('#route-msg', '');
}
$('#route-cancel')?.addEventListener('click', resetRouteForm);

$('#route-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  let mapEmbed;
  try { mapEmbed = parseMapEmbed($('#r-map').value); }
  catch (err) { msg('#route-msg', err.message, 'err'); return; }

  // Profil je záloha pro trasy bez mapy – s mapou ho vyžadovat nemá smysl.
  const profile = parseProfile($('#r-profile').value);
  if (!mapEmbed && profile.length < 2) {
    msg('#route-msg', 'Vlep mapu z Mapy.cz, nebo vyplň profil (aspoň dvě čísla).', 'err');
    return;
  }

  msg('#route-msg', 'Ukládám…');
  const row = {
    name: $('#r-name').value.trim(),
    description: $('#r-desc').value.trim() || null,
    km: $('#r-km').value.trim() || null,
    elev: $('#r-elev').value.trim() || null,
    teren: $('#r-teren').value.trim() || null,
    diff: $('#r-diff').value,
    diff_label: $('#r-diff-label').value.trim() || null,
    map_embed: mapEmbed,
    sort_order: Number($('#r-order').value) || 0,
  };
  // prázdný profil nepřepisujeme – u nové trasy doplní výchozí databáze
  if (profile.length >= 2) row.profile = profile;

  const { error } = editingRouteId
    ? await sb.from('routes').update(row).eq('id', editingRouteId)
    : await sb.from('routes').insert(row);

  if (error) { msg('#route-msg', 'Nepovedlo se uložit: ' + error.message, 'err'); return; }

  msg('#route-msg', 'Uloženo ✓', 'ok');
  resetRouteForm();
  await loadRoutes();
});

async function loadRoutes() {
  const box = $('#route-list');
  if (!box) return;
  box.innerHTML = '<p class="empty">Načítám…</p>';

  const { data, error } = await sb.from('routes').select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) { box.innerHTML = `<p class="empty">Chyba: ${esc(error.message)}</p>`; return; }
  if (!data.length) { box.innerHTML = '<p class="empty">Zatím tu není žádná trasa.</p>'; return; }

  box.innerHTML = data.map(r => `
    <div class="row">
      <div class="row-main">
        <strong>${esc(r.name)}</strong>
        <div class="row-meta">
          <span class="pill">${r.sort_order}</span>
          ${r.km ? `<span>${esc(r.km)} km</span>` : ''}
          ${r.elev ? `<span>${esc(r.elev)}</span>` : ''}
          ${r.diff_label ? `<span class="pill">${esc(r.diff_label)}</span>` : ''}
          ${r.map_embed ? '<span class="pill"><i class="bi bi-map"></i> mapa</span>' : ''}
        </div>
      </div>
      <div class="row-actions">
        <button class="icon-btn" data-redit="${r.id}" title="Upravit"><i class="bi bi-pencil"></i></button>
        <button class="icon-btn danger" data-rdel="${r.id}" title="Smazat"><i class="bi bi-trash"></i></button>
      </div>
    </div>
  `).join('');

  box.querySelectorAll('[data-redit]').forEach(b =>
    b.addEventListener('click', () => editRoute(data.find(x => x.id === b.dataset.redit))));
  box.querySelectorAll('[data-rdel]').forEach(b =>
    b.addEventListener('click', () => delRoute(b.dataset.rdel)));
}

function editRoute(r) {
  if (!r) return;
  editingRouteId = r.id;
  $('#r-name').value = r.name || '';
  $('#r-desc').value = r.description || '';
  $('#r-km').value = r.km || '';
  $('#r-elev').value = r.elev || '';
  $('#r-teren').value = r.teren || '';
  $('#r-diff').value = ['easy', 'medium', 'hard'].includes(r.diff) ? r.diff : 'easy';
  $('#r-diff-label').value = r.diff_label || '';
  $('#r-profile').value = (r.profile || []).join(', ');
  $('#r-map').value = r.map_embed || '';
  $('#r-order').value = r.sort_order ?? 0;
  drawPreview();
  drawMapPreview();
  $('#route-form-title').textContent = 'Úprava trasy';
  $('#route-cancel').hidden = false;
  $('#route-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function delRoute(id) {
  if (!confirm('Opravdu smazat tuto trasu?')) return;
  const { error } = await sb.from('routes').delete().eq('id', id);
  if (error) { alert('Nepovedlo se smazat: ' + error.message); return; }
  await loadRoutes();
}


/* =========================================================
   SPONZOŘI
   ---------------------------------------------------------
   Loga jdou do stejného úložiště jako fotky, do složky
   "sponzori". Při mazání sponzora mažeme i soubor – jinak
   by v úložišti zůstávaly osiřelé obrázky.
   ========================================================= */

$('#sp-file')?.addEventListener('change', (e) => {
  const f = e.target.files?.[0];
  const box = $('#sp-preview');
  if (!f) { pendingLogo = null; if (box) box.innerHTML = ''; return; }
  pendingLogo = { file: f };
  if (box) box.innerHTML = `<img src="${URL.createObjectURL(f)}" alt="Náhled loga">`;
});

function resetSponsorForm() {
  editingSponsorId = null;
  pendingLogo = null;
  $('#sponsor-form').reset();
  $('#sp-order').value = 0;
  $('#sp-preview').innerHTML = '';
  $('#sponsor-form-title').textContent = 'Nový sponzor';
  $('#sponsor-cancel').hidden = true;
  msg('#sponsor-msg', '');
}
$('#sponsor-cancel')?.addEventListener('click', resetSponsorForm);

$('#sponsor-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  // logo je povinné jen u nového sponzora – při úpravě se smí nechat staré
  if (!editingSponsorId && !pendingLogo) {
    msg('#sponsor-msg', 'Vyber prosím logo.', 'err');
    return;
  }

  msg('#sponsor-msg', 'Ukládám…');
  try {
    const row = {
      name: $('#sp-name').value.trim(),
      url: $('#sp-url').value.trim() || null,
      sort_order: Number($('#sp-order').value) || 0,
    };

    if (pendingLogo) {
      const up = await uploadFile(pendingLogo.file, 'sponzori');
      row.logo_url = up.url;
      row.logo_path = up.path;
    }

    const { error } = editingSponsorId
      ? await sb.from('sponsors').update(row).eq('id', editingSponsorId)
      : await sb.from('sponsors').insert(row);
    if (error) throw error;

    msg('#sponsor-msg', 'Uloženo ✓', 'ok');
    resetSponsorForm();
    await loadSponsors();
  } catch (err) {
    console.error(err);
    msg('#sponsor-msg', 'Nepovedlo se uložit: ' + (err.message || err), 'err');
  }
});

async function loadSponsors() {
  const box = $('#sponsor-list');
  if (!box) return;
  box.innerHTML = '<p class="empty">Načítám…</p>';

  const { data, error } = await sb.from('sponsors').select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) { box.innerHTML = `<p class="empty">Chyba: ${esc(error.message)}</p>`; return; }
  if (!data.length) { box.innerHTML = '<p class="empty">Zatím tu není žádný sponzor.</p>'; return; }

  box.innerHTML = data.map(x => `
    <div class="row">
      <img class="row-logo" src="${esc(x.logo_url)}" alt="">
      <div class="row-main">
        <strong>${esc(x.name)}</strong>
        <div class="row-meta">
          <span class="pill">${x.sort_order}</span>
          ${x.url ? '<span>má odkaz</span>' : '<span>bez odkazu</span>'}
        </div>
      </div>
      <div class="row-actions">
        <button class="icon-btn" data-spedit="${x.id}" title="Upravit"><i class="bi bi-pencil"></i></button>
        <button class="icon-btn danger" data-spdel="${x.id}" title="Smazat"><i class="bi bi-trash"></i></button>
      </div>
    </div>
  `).join('');

  box.querySelectorAll('[data-spedit]').forEach(b =>
    b.addEventListener('click', () => editSponsor(data.find(x => x.id === b.dataset.spedit))));
  box.querySelectorAll('[data-spdel]').forEach(b =>
    b.addEventListener('click', () => delSponsor(data.find(x => x.id === b.dataset.spdel))));
}

function editSponsor(x) {
  if (!x) return;
  editingSponsorId = x.id;
  pendingLogo = null;
  $('#sp-name').value = x.name || '';
  $('#sp-url').value = x.url || '';
  $('#sp-order').value = x.sort_order ?? 0;
  $('#sp-preview').innerHTML = `<img src="${esc(x.logo_url)}" alt="Současné logo">`;
  $('#sponsor-form-title').textContent = 'Úprava sponzora';
  $('#sponsor-cancel').hidden = false;
  msg('#sponsor-msg', 'Logo nech prázdné, pokud ho měnit nechceš.');
  $('#sponsor-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function delSponsor(x) {
  if (!x || !confirm(`Opravdu smazat sponzora „${x.name}"?`)) return;
  const { error } = await sb.from('sponsors').delete().eq('id', x.id);
  if (error) { alert('Nepovedlo se smazat: ' + error.message); return; }
  // uklidíme i soubor, ať v úložišti nezůstane osiřelé logo
  if (x.logo_path) await sb.storage.from(BUCKET).remove([x.logo_path]);
  await loadSponsors();
}


/* =========================================================
   OSTATNÍ (nastavení – počty členů apod.)
   ---------------------------------------------------------
   Formulář se vykresluje z toho, co je v tabulce `settings`.
   Chceš spravovat něco dalšího? Přidej řádek do tabulky –
   tady ani na webu se nic měnit nemusí. V HTML pak stačí
   dát prvku  data-setting="tvuj-klic".
   ========================================================= */
async function loadSettings() {
  const box = $('#settings-fields');
  const { data, error } = await sb.from('settings')
    .select('*').order('sort_order', { ascending: true });

  if (error) { box.innerHTML = `<p class="empty">Chyba: ${esc(error.message)}</p>`; return; }
  if (!data?.length) {
    box.innerHTML = `<p class="empty">Tabulka <code>settings</code> je prázdná –
      spustil jsi v Supabase soubor <code>supabase-settings.sql</code>?</p>`;
    return;
  }

  box.innerHTML = data.map(s => `
    <label for="set-${esc(s.key)}">
      ${esc(s.label)}
      ${s.hint ? `<small>— ${esc(s.hint)}</small>` : ''}
    </label>
    <input type="text" id="set-${esc(s.key)}" data-key="${esc(s.key)}"
           value="${esc(s.value)}" autocomplete="off">
  `).join('');
}

$('#settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#settings-save');
  btn.disabled = true;
  msg('#settings-msg', 'Ukládám…');

  const rows = Array.from(document.querySelectorAll('#settings-fields input[data-key]'))
    .map(i => ({ key: i.dataset.key, value: i.value.trim() }));

  if (!rows.length) { btn.disabled = false; msg('#settings-msg', ''); return; }

  try {
    // upsert po jednom, ať nepřepíšeme label/hint prázdnou hodnotou
    for (const r of rows) {
      const { data, error } = await sb.from('settings')
        .update({ value: r.value, updated_at: new Date().toISOString() })
        .eq('key', r.key)
        .select();
      if (error) throw error;
      // update, který netrefí žádný řádek, NEVRACÍ chybu – musíme si ověřit sami
      if (!data?.length) {
        throw new Error(`klíč „${r.key}" se neuložil – řádek v tabulce neexistuje `
          + `nebo zápis blokuje RLS`);
      }
    }
    msg('#settings-msg', 'Uloženo ✓ Web už ukazuje nové hodnoty.', 'ok');
  } catch (err) {
    console.error(err);
    msg('#settings-msg', 'Nepovedlo se uložit: ' + (err.message || err), 'err');
  } finally {
    btn.disabled = false;
  }
});

/* =========================================================
   ADMINISTRACE – logika
   Přihlášení + správa novinek, alb a fotek přes Supabase.
   ========================================================= */
import { getSupabase, isConfigured, BUCKET } from '../javascript/supabase.js';

const $ = (s) => document.querySelector(s);
let sb = null;
let albums = [];
let editingNewsId = null;
let editingAlbumId = null;
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
  const { data, error } = await sb.from('news').select('*').order('date', { ascending: false });

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

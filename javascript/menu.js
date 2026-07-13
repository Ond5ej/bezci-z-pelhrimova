/* =========================================================
   MOBILNÍ MENU (off-canvas)
   ========================================================= */
export function initMenu(sel) {
  const toggle = document.querySelector(sel.toggle);
  const nav = document.querySelector(sel.nav);
  const backdrop = document.querySelector(sel.backdrop);
  if (!toggle || !nav) return;

  const open = () => {
    document.body.classList.add('menu-open');
    toggle.setAttribute('aria-expanded', 'true');
  };
  const close = () => {
    document.body.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  const toggleMenu = () =>
    document.body.classList.contains('menu-open') ? close() : open();

  toggle.addEventListener('click', toggleMenu);
  backdrop?.addEventListener('click', close);
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

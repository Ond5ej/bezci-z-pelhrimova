/* =========================================================
   HLAVIČKA – stín při scrollu + zvýraznění aktivní sekce
   ========================================================= */
export function initHeader(sel) {
  const header = document.querySelector(sel.header || 'header');
  if (header) {
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // aktivní odkaz podle viditelné sekce
  const links = Array.from(document.querySelectorAll('.nav-desktop a[href^="#"]'));
  const map = new Map();
  links.forEach(a => {
    const id = a.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (target) map.set(target, a);
  });
  if (!map.size) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        map.get(en.target)?.classList.add('active');
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

  map.forEach((_, target) => obs.observe(target));
}

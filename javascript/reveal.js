/* =========================================================
   ODHALENÍ PRVKŮ PŘI SCROLLU
   ========================================================= */
export function initReveal(selector = '.reveal') {
  const items = document.querySelectorAll(selector);
  if (!items.length) return;

  if (!('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach(el => el.classList.add('is-in'));
    return;
  }

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('is-in');
        obs.unobserve(en.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

  items.forEach(el => obs.observe(el));
}

/* =========================================================
   TRASY – vykreslení karet + mini profil převýšení
   Přidání trasy = nová položka v poli `routes` níže.
   ========================================================= */
const routes = [
  {
    name: 'Městský okruh',
    desc: 'Rovinatý okruh centrem a parky. Ideální na rozběhání a pro úplné začátečníky.',
    km: '5,2', elev: '45 m', time: '30–40 min', diff: 'easy', diffLabel: 'Lehká',
    profile: [3, 4, 3, 5, 4, 6, 4, 3, 4, 3],
  },
  {
    name: 'Křemešník',
    desc: 'Táhlé stoupání lesem až k rozhledně. Odměnou je výhled na celou Vysočinu.',
    km: '11,8', elev: '260 m', time: '60–75 min', diff: 'medium', diffLabel: 'Střední',
    profile: [2, 3, 5, 7, 9, 10, 8, 6, 4, 3],
  },
  {
    name: 'Řečický long run',
    desc: 'Dlouhá nedělní trasa přes kopce k Červené Řečici a zpět. Pro trénované nohy.',
    km: '21,1', elev: '410 m', time: '110–130 min', diff: 'hard', diffLabel: 'Náročná',
    profile: [3, 6, 4, 8, 6, 10, 7, 9, 5, 3],
  },
];

function profileSVG(points) {
  const W = 300, H = 64, pad = 4;
  const max = Math.max(...points, 1);
  const step = (W - pad * 2) / (points.length - 1);
  const coords = points.map((v, i) => {
    const x = pad + i * step;
    const y = H - pad - (v / max) * (H - pad * 2);
    return [x, y];
  });
  // hladká křivka (Catmull-Rom -> Bézier)
  let d = `M ${coords[0][0].toFixed(1)} ${coords[0][1].toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i === 0 ? 0 : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  const area = `${d} L ${W - pad} ${H} L ${pad} ${H} Z`;
  return `<svg class="route-profile" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="rg${points.join('')}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--amber)" stop-opacity="0.35"/>
      <stop offset="1" stop-color="var(--amber)" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#rg${points.join('')})"/>
    <path d="${d}" fill="none" stroke="var(--amber)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

export function initRoutes(sel) {
  const grid = document.querySelector(sel.grid);
  if (!grid) return;
  grid.innerHTML = routes.map((r, i) => `
    <article class="route-card reveal" data-delay="${i + 1}">
      <div class="route-top">
        <span class="route-num">TRASA ${String(i + 1).padStart(2, '0')}</span>
        <span class="route-diff ${r.diff}">${r.diffLabel}</span>
      </div>
      <h3>${r.name}</h3>
      <p class="route-desc">${r.desc}</p>
      ${profileSVG(r.profile)}
      <div class="route-meta">
        <div class="m"><span class="v">${r.km}</span><span class="k">km</span></div>
        <div class="m"><span class="v">${r.elev}</span><span class="k">převýšení</span></div>
        <div class="m"><span class="v">${r.time.split('–')[0]}′</span><span class="k">tempo</span></div>
      </div>
    </article>
  `).join('');
}

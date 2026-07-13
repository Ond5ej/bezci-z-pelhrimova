#!/usr/bin/env python3
"""Generátor stylizovaných SVG podkladů pro web Běžci z Pelhřimova.
Vytváří: logo, hero mapu trasy, placeholder fotky do galerie a avatary běžců.
Vše je vektorové, laděné do palety (smrkový les Vysočiny + svítání)."""

import math, os, random

OUT = os.path.dirname(os.path.abspath(__file__))
GAL = os.path.join(OUT, "img", "gallery")
IMG = os.path.join(OUT, "img")
os.makedirs(GAL, exist_ok=True)

# ---- Paleta (modrobílá – dle značky Běžci z Pelhřimova) -----------------
INK      = "#0E2C5A"   # hluboká navy
FOREST   = "#14386F"   # panel na navy
FOREST2  = "#1E4C86"
PAPER    = "#F5F9FE"
SAND     = "#EAF3FC"
AMBER    = "#2E9BE6"   # jasná azurová (hlavní akcent)
AMBER_D  = "#1C6FD4"   # sytější modrá
GRASS    = "#5AB0EE"   # světlá azurová (sekundární)
SAGE     = "#A9C2E0"


def write(path, svg):
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)


# ---- Pomocné: čistá silueta běžce (hlava + končetiny) -----------------
def runner(x, y, s=1.0, fill=AMBER):
    """Atletická běžecká silueta v pohybu, složená z hlavy a tahů s kulatými konci.
    Kreslena v lokálním prostoru ~20x24, kotva zhruba na hrudi."""
    sw = 3.4  # tloušťka končetin
    parts = [
        # trup (nakloněný vpřed)
        f'<line x1="1" y1="-3" x2="-2.5" y2="7" stroke="{fill}" stroke-width="{sw}" stroke-linecap="round"/>',
        # přední paže (napřažená)
        f'<line x1="0.5" y1="-1" x2="8" y2="-3" stroke="{fill}" stroke-width="{sw}" stroke-linecap="round"/>',
        # zadní paže (pokrčená vzad)
        f'<line x1="0.5" y1="-1" x2="-6" y2="1.5" stroke="{fill}" stroke-width="{sw}" stroke-linecap="round"/>',
        # přední stehno + lýtko (dlouhý krok vpřed)
        f'<path d="M -2.5 7 L 5 9 L 7 16" fill="none" stroke="{fill}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>',
        # zadní noha (odraz vzad)
        f'<path d="M -2.5 7 L -7 11 L -5.5 17" fill="none" stroke="{fill}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>',
        # hlava
        f'<circle cx="2.6" cy="-7.5" r="3.2" fill="{fill}"/>',
    ]
    return f'<g transform="translate({x},{y}) scale({s})">{"".join(parts)}</g>'


# ---- Placeholder fotka: stylizovaná krajina ---------------------------
def landscape(w, h, seed, title, palette, sun=True, with_runner=True):
    random.seed(seed)
    base, hills, accent = palette
    p = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
         f'width="{w}" height="{h}" role="img" aria-label="{title}">']
    p.append(f'<defs><linearGradient id="sky{seed}" x1="0" y1="0" x2="0" y2="1">'
             f'<stop offset="0" stop-color="{base[0]}"/>'
             f'<stop offset="1" stop-color="{base[1]}"/></linearGradient>'
             f'<linearGradient id="gl{seed}" x1="0" y1="0" x2="0" y2="1">'
             f'<stop offset="0" stop-color="{accent}" stop-opacity="0.9"/>'
             f'<stop offset="1" stop-color="{accent}" stop-opacity="0"/></linearGradient></defs>')
    p.append(f'<rect width="{w}" height="{h}" fill="url(#sky{seed})"/>')
    if sun:
        sx, sy, r = w * 0.72, h * 0.30, min(w, h) * 0.13
        p.append(f'<circle cx="{sx:.0f}" cy="{sy:.0f}" r="{r:.0f}" fill="{accent}" opacity="0.92"/>')
        p.append(f'<circle cx="{sx:.0f}" cy="{sy:.0f}" r="{r*1.9:.0f}" fill="{accent}" opacity="0.12"/>')
    # vrstvy kopců
    layers = len(hills)
    for i, col in enumerate(hills):
        baseY = h * (0.45 + 0.13 * i)
        amp = h * (0.10 - 0.012 * i)
        step = w / 6
        pts = [f'M 0 {baseY:.0f}']
        x = 0
        while x <= w:
            y = baseY + math.sin((x / w) * math.pi * (2 + i) + seed) * amp \
                + random.uniform(-amp*0.25, amp*0.25)
            pts.append(f'L {x:.0f} {y:.0f}')
            x += step
        pts.append(f'L {w} {h} L 0 {h} Z')
        p.append(f'<path d="{" ".join(pts)}" fill="{col}"/>')
    # vrstevnice na předním kopci
    for k in range(3):
        yy = h * (0.80 + k * 0.05)
        dash = 'stroke-dasharray="2 6"'
        p.append(f'<path d="M 0 {yy:.0f} Q {w*0.5:.0f} {yy-14:.0f} {w} {yy:.0f}" '
                 f'fill="none" stroke="{PAPER}" stroke-opacity="0.10" {dash} stroke-width="1.5"/>')
    # cesta / trasa
    ry = h * 0.90
    p.append(f'<path d="M {-10} {h} Q {w*0.35:.0f} {ry:.0f} {w*0.55:.0f} {h*0.78:.0f} '
             f'T {w+10} {h*0.6:.0f}" fill="none" stroke="{PAPER}" stroke-opacity="0.22" '
             f'stroke-width="{h*0.02:.0f}" stroke-linecap="round"/>')
    if with_runner:
        p.append(runner(w*0.28, h*0.66, s=h/120, fill=PAPER))
    # jemný label
    p.append(f'<rect x="0" y="{h-26}" width="{w}" height="26" fill="{INK}" opacity="0.28"/>')
    p.append(f'<text x="14" y="{h-9}" font-family="Space Mono, monospace" font-size="12" '
             f'fill="{PAPER}" opacity="0.85">{title}</text>')
    p.append('</svg>')
    return "\n".join(p)


PAL_DAWN   = (("#1b3a63", "#2a5488"), [FOREST2, FOREST, INK], AMBER)
PAL_FOREST = (("#22456f", "#152f52"), ["#2f5688", FOREST, INK], GRASS)
PAL_MIST   = (("#3a5a7e", "#6d87a6"), [SAGE, "#5f7a9e", FOREST], "#cfe4f8")
PAL_TOWN   = (("#2f4d70", "#1c3050"), ["#3f5c82", FOREST, INK], AMBER)
PAL_SUNSET = (("#2a4a78", "#14263f"), ["#356093", "#22345a", INK], AMBER)
PAL_WINTER = (("#8aa0bd", "#c3d2e0"), ["#aec1d6", "#8f9fb8", "#6f7f96"], "#eef5fd")

photos = [
    ("foto-01.svg", PAL_DAWN,   "svitani nad Krivem",       True,  True),
    ("foto-02.svg", PAL_FOREST, "lesni okruh Batovsky rybnik", True, True),
    ("foto-03.svg", PAL_MIST,   "rano nad Belou",           True,  True),
    ("foto-04.svg", PAL_TOWN,   "start na namesti",         False, True),
    ("foto-05.svg", PAL_SUNSET, "vecerni vybeh",            True,  True),
    ("foto-06.svg", PAL_WINTER, "zimni beh",                True,  True),
    ("foto-07.svg", PAL_FOREST, "kopce u Cerekve",          True,  True),
    ("foto-08.svg", PAL_DAWN,   "spolecny long run",        True,  True),
]

for i, (name, pal, title, sun, run) in enumerate(photos):
    svg = landscape(720, 540, seed=i*7+3, title=title, palette=pal, sun=sun, with_runner=run)
    write(os.path.join(GAL, name), svg)
print(f"Galerie: {len(photos)} fotek")

# ---- Logo (značka) -----------------------------------------------------
logo = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <circle cx="24" cy="24" r="22" fill="none" stroke="{AMBER}" stroke-width="2.5"/>
  <path d="M 6 30 Q 16 20 24 26 T 42 20" fill="none" stroke="{AMBER}"
        stroke-width="2.4" stroke-linecap="round" stroke-dasharray="0.1 5.4"/>
  <circle cx="6" cy="30" r="3" fill="{GRASS}"/>
  <circle cx="42" cy="20" r="3" fill="{AMBER}"/>
  {runner(24, 22, s=0.72, fill=PAPER)}
</svg>'''
write(os.path.join(IMG, "logo.svg"), logo)

# ---- Favicon -----------------------------------------------------------
fav = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect width="48" height="48" rx="12" fill="{INK}"/>
  <path d="M 8 32 Q 18 22 26 28 T 42 20" fill="none" stroke="{AMBER}"
        stroke-width="2.6" stroke-linecap="round" stroke-dasharray="0.1 5.6"/>
  <circle cx="8" cy="32" r="3.2" fill="{GRASS}"/>
  <circle cx="42" cy="20" r="3.2" fill="{AMBER}"/>
</svg>'''
write(os.path.join(IMG, "favicon.svg"), fav)
write(os.path.join(OUT, "favicon.svg"), fav)

# ---- Hero: mapa trasy s vrstevnicemi ----------------------------------
def hero_map(w=760, h=620):
    random.seed(42)
    p = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
         f'width="{w}" height="{h}" fill="none" aria-hidden="true">']
    p.append(f'<defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">'
             f'<stop offset="0" stop-color="{FOREST2}"/>'
             f'<stop offset="1" stop-color="{INK}"/></linearGradient>'
             f'<radialGradient id="glow" cx="70%" cy="28%" r="55%">'
             f'<stop offset="0" stop-color="{AMBER}" stop-opacity="0.35"/>'
             f'<stop offset="1" stop-color="{AMBER}" stop-opacity="0"/></radialGradient></defs>')
    p.append(f'<rect width="{w}" height="{h}" rx="26" fill="url(#hg)"/>')
    p.append(f'<rect width="{w}" height="{h}" rx="26" fill="url(#glow)"/>')
    # vrstevnice
    for k in range(9):
        cy = h*0.2 + k*46
        rr = 120 + k*36
        p.append(f'<ellipse cx="{w*0.62:.0f}" cy="{cy:.0f}" rx="{rr}" ry="{rr*0.6:.0f}" '
                 f'stroke="{SAGE}" stroke-opacity="{0.10+0.015*k:.2f}" stroke-width="1.4"/>')
    # trasa (bude animovaná v CSS)
    route = "M 60 540 C 150 520 180 430 250 420 S 360 470 420 400 " \
            "S 470 300 560 300 S 660 240 700 150"
    p.append(f'<path id="hero-route" d="{route}" stroke="{AMBER}" stroke-width="5" '
             f'stroke-linecap="round" stroke-dasharray="0.1 13" opacity="0.95"/>')
    # body zastavek
    dots = [(60,540,GRASS),(250,420,PAPER),(420,400,PAPER),(560,300,PAPER),(700,150,AMBER)]
    labels = ["START","3 km","6 km","9 km","CÍL"]
    for (dx,dy,c),lab in zip(dots,labels):
        p.append(f'<circle cx="{dx}" cy="{dy}" r="8" fill="{INK}" stroke="{c}" stroke-width="3"/>')
        p.append(f'<text x="{dx+14}" y="{dy+4}" font-family="Space Mono, monospace" '
                 f'font-size="14" fill="{PAPER}" opacity="0.9">{lab}</text>')
    p.append(runner(w*0.5, h*0.15, s=2.6, fill=AMBER))
    p.append('</svg>')
    return "\n".join(p)

write(os.path.join(IMG, "hero-route.svg"), hero_map())

# ---- OG cover ----------------------------------------------------------
og = landscape(1200, 630, seed=99, title="Bezci z Pelhrimova  |  bezcizpelhrimova.cz",
               palette=PAL_DAWN, sun=True, with_runner=True)
write(os.path.join(IMG, "og-cover.svg"), og)

# ---- Avatary běžců (monogramy) ----------------------------------------
def avatar(letters, bg, fg):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">'
            f'<rect width="96" height="96" rx="48" fill="{bg}"/>'
            f'<path d="M 12 66 Q 34 52 48 60 T 84 44" fill="none" stroke="{fg}" '
            f'stroke-opacity="0.35" stroke-width="3" stroke-linecap="round" stroke-dasharray="0.1 7"/>'
            f'<text x="48" y="46" text-anchor="middle" dominant-baseline="middle" '
            f'font-family="Bricolage Grotesque, sans-serif" font-weight="700" '
            f'font-size="34" fill="{fg}">{letters}</text></svg>')

avatars = [("MK",FOREST,AMBER),("JN",AMBER,INK),("PL",GRASS,PAPER),
           ("TD",FOREST2,SAGE),("EV",INK,AMBER),("RB",SAGE,INK)]
for i,(l,bg,fg) in enumerate(avatars,1):
    write(os.path.join(IMG, f"avatar-{i}.svg"), avatar(l,bg,fg))
print(f"Avatary: {len(avatars)}")
print("Hotovo.")

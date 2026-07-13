# Běžci z Pelhřimova

Statický web běžecké party v Pelhřimově. Čistý **HTML + CSS + JavaScript**,
žádný build, žádný framework. Modrobílá identita dle značky.

Doména: **bezcizpelhrimova.cz** (soubor `CNAME` pro GitHub Pages)
Kontakt: **bezcizpelhrimova@seznam.cz** · IG **@bezci_z_pelhrimova** · FB **Běžci z Pelhřimova**

---

## Struktura

```
├── index.html              hlavní stránka (všechny sekce)
├── CNAME                    doména
├── favicon.svg
├── css/  00-variables.css   ← BARVY (modrobílá paleta)
│        01-base … 09-lightbox.css
├── javascript/
│        main.js             spouští vše
│        gallery.js          galerie + lightbox + přidávání fotek
│        gallery-data.js     ← SEZNAM FOTEK (uprav tady)
│        routes.js           ← TRASY (uprav tady)
│        header.js, menu.js, reveal.js, contact.js
├── img/
│        brand-logo.png      vaše logo (v hlavičce)
│        hero.jpg, community.jpg   fotky v úvodu a v sekci Běžci
│        qr-fb.png, qr-ig.png      QR kódy na sítě (v kontaktu)
│        gallery/            fotky galerie (real-*.jpg + placeholdery)
└── gen_assets.py            (volitelné) generátor placeholder grafik
```

## Spuštění lokálně

Kvůli ES modulům je potřeba server (ne dvojklik):
```bash
python3 -m http.server 8000    # → http://localhost:8000
```

## Nasazení
Už běží na GitHub Pages. Po každé změně stačí `git add . && git commit -m "..." && git push`.

---

## Nejčastější úpravy

**Fotky v galerii** – `javascript/gallery-data.js`. Nahraj obrázek do `img/gallery/`
a přidej řádek `{ src: 'img/gallery/soubor.jpg', alt: 'Popisek' },`.
Tlačítko „Přidat fotku" na webu ukládá fotky jen do prohlížeče daného návštěvníka.

**Fotka v úvodu / v sekci Běžci** – přepiš `img/hero.jpg` a `img/community.jpg`
(stejný název souboru).

**Trasy** – `javascript/routes.js`, pole `routes` (název, popis, km, převýšení, povrch,
obtížnost, profil převýšení).

**Texty** – přímo v `index.html`.

**Sítě a QR** – odkazy v sekci Kontakt v `index.html`. Doplň přesnou adresu vašeho
Facebooku (teď vede na facebook.com). QR obrázky jsou `img/qr-fb.png` a `img/qr-ig.png`.

**Barvy** – `css/00-variables.css`. Hlavní modrá je `--amber` (název je historický),
tmavá navy `--ink`.

## Kontaktní formulář
Bez serveru → odeslání otevře e-mailového klienta (`mailto:` na
`bezcizpelhrimova@seznam.cz`). Chceš zprávy přímo do schránky bez otevírání pošty?
Napoj Formspree nebo EmailJS.

## Novinky (až budeš chtít)
Web zatím sekci novinek nemá. Nejjednodušší cesty bez správcování webu:
feed z Instagramu/Facebooku, sdílená Google tabulka, nebo Git-based CMS (Sveltia CMS).

---
Nemusíš být závodník. Stačí chuť vyběhnout. 🏃

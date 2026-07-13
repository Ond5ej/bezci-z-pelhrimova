# Běžci z Pelhřimova

Statický web běžecké komunity v Pelhřimově. Čistý **HTML + CSS + JavaScript**,
žádný build, žádný framework. Stačí nahrát soubory na hosting.

Doména: **bezcizpelhrimova.cz** (nastavená v souboru `CNAME` pro GitHub Pages)

---

## Struktura projektu

```
bezci-z-pelhrimova/
├── index.html              hlavní stránka (všechny sekce)
├── CNAME                   doména pro GitHub Pages
├── favicon.svg
├── css/                    styly (číslované podle pořadí)
│   ├── 00-variables.css    ← BARVY A FONTY (uprav tady)
│   ├── 01-base.css … 09-lightbox.css
├── javascript/             ES moduly
│   ├── main.js             spouští vše
│   ├── gallery.js          galerie + lightbox + přidávání fotek
│   ├── gallery-data.js     ← SEZNAM FOTEK (uprav tady)
│   ├── routes.js           ← TRASY (uprav tady)
│   ├── header.js, menu.js, reveal.js, contact.js
├── img/                    obrázky
│   ├── logo.svg, hero-route.svg, avatar-1..6.svg
│   └── gallery/            fotky do galerie (foto-01.svg …)
└── gen_assets.py           (volitelné) generátor placeholder obrázků
```

---

## Spuštění lokálně

Protože web používá ES moduly, nestačí otevřít `index.html` dvojklikem –
je potřeba jednoduchý server:

```bash
cd bezci-z-pelhrimova
python3 -m http.server 8000
# otevři http://localhost:8000
```

## Nasazení

**GitHub Pages:** nahraj obsah složky do repozitáře, v *Settings → Pages*
zvol větev `main`. Soubor `CNAME` už obsahuje doménu – stačí u registrátora
nasměrovat DNS na GitHub Pages.

**Jakýkoli hosting / FTP:** nahraj celý obsah složky do kořene webu. Hotovo.

---

## Jak přidat fotky do galerie

Jsou dvě cesty:

### 1) Trvalé fotky pro všechny návštěvníky (doporučeno)
1. Nahraj obrázek do složky `img/gallery/` (např. `img/gallery/beh-2025.jpg`)
2. Otevři `javascript/gallery-data.js` a přidej řádek:
   ```js
   { src: 'img/gallery/beh-2025.jpg', alt: 'Popisek fotky' },
   ```
Podporované formáty: `.jpg .jpeg .png .webp .svg`.
Tyto fotky vidí každý, kdo web otevře.

### 2) Tlačítko „Přidat fotku" na stránce
Návštěvník může nahrát fotku přímo v prohlížeči. **Uloží se ale jen
v jeho zařízení a prohlížeči** (localStorage) – funguje to jako soukromá
nástěnka, ostatní ji neuvidí. Vlastní fotky lze i mazat (křížek v rohu).

> **Chceš skutečně sdílenou galerii, kam nahrávají všichni?**
> Statický web sám o sobě nemá kam soubory ukládat. Nejjednodušší varianty:
> - **Cloudinary / imgbb** (upload widget) – fotky se ukládají do cloudu,
>   do `gallery-data.js` pak dáváš jejich URL.
> - **Netlify Forms / Formspree** s přílohou – fotky ti přijdou a ty je
>   přidáš do galerie.
> - Vlastní malý backend (Firebase Storage apod.).

---

## Jak upravit ostatní obsah

- **Trasy:** `javascript/routes.js` – pole `routes` (název, popis, km,
  převýšení, obtížnost, profil převýšení jako pole čísel).
- **Běžci:** přímo v `index.html`, sekce `#bezci` (karty `runner-card`).
  Avatary jsou v `img/avatar-*.svg`.
- **Sraz / termíny / kontakt:** `index.html`, sekce `#kontakt`
  (seznam `meet-list` a odkazy na sociální sítě – doplň své URL).
- **E-mail pro formulář:** v `javascript/main.js` (parametr `email`)
  a v odkazech v `index.html`.

## Kontaktní formulář

Web nemá server, takže odeslání otevře e-mailového klienta (`mailto:`).
Pokud chceš, aby zprávy chodily přímo bez otevírání pošty, napoj službu:

- **Formspree** – zdarma, stačí změnit `<form>` na `action="https://formspree.io/f/…"`.
- **EmailJS** – odesílání přes JavaScript.

## Barvy a fonty

Vše je v `css/00-variables.css`. Změna hlavního akcentu = jeden řádek
(`--amber`). Fonty se načítají z Google Fonts v `index.html`.

## Placeholder obrázky

Krajinky, logo a avatary jsou vektorové placeholdery. Nahraď je klidně
reálnými fotkami. Chceš je přegenerovat? `python3 gen_assets.py`
(potřebuje jen Python; náhledy vyžadují `pip install cairosvg`).

---

Běháme spolu od úsvitu. 🏃

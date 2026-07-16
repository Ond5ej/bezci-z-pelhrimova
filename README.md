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
│        settings.js        ← POČTY ČLENŮ (plní data-setting z databáze)
│        header.js, menu.js, reveal.js, contact.js
├── img/
│        brand-logo.png      vaše logo (v hlavičce)
│        gallery/            grafické placeholdery (nahraď vlastními fotkami)
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

**Fotky v galerii** – normálně přes administraci na `/admin/` (záložky Alba a Fotky).
Placeholdery v `javascript/gallery-data.js` se ukážou jen když Supabase není dostupné.


**Trasy** – `javascript/routes.js`, pole `routes` (název, popis, km, převýšení, povrch,
obtížnost, profil převýšení).

**Počty členů** – v administraci `/admin/` → záložka **Ostatní**. Čísla v `index.html`
jsou jen záloha (ukážou se, než se načtou data). V HTML je poznáš podle `data-setting="…"`.

**Texty** – přímo v `index.html`.

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

**Sítě** – odkazy v sekci Kontakt v `index.html` (a v JSON-LD `sameAs` v hlavičce).
Facebook = skupina `facebook.com/groups/4313081512346383`, Instagram `@bezci_z_pelhrimova`.

**Administrace** – na `/admin/`. Odkaz na ni na webu záměrně není,
zadej adresu ručně. Přístup hlídá přihlášení přes Supabase.

**Sponzoři** – spravují se na `/admin/` (záložka Sponzoři). Před prvním použitím
pusť v Supabase `supabase-sponsors.sql`. Pás v hero se rozjede sám, teprve když
se loga přestanou vejít do řádku; při pár logách jen stojí. Bez sponzorů je celá
sekce skrytá.

**Počítadlo návštěv** – číslo v patičce. Před prvním použitím pusť v Supabase
`supabase-counter.sql`. Je to ozdoba, ne měření: počítá načtení stránky včetně
robotů a dá se zvenčí nafouknout. Na skutečné statistiky použij GoatCounter
nebo Plausible.

**SEO** – `robots.txt` a `sitemap.xml` v kořeni. Náhled pro sítě a Google
je `img/og-cover.jpg` (1200×630). Musí to být JPG nebo PNG – SVG sítě
v náhledech nezobrazí. Po změně náhledu si ho Facebook drží v mezipaměti;
protlač ho přes developers.facebook.com/tools/debug.

**Trasy** – spravují se na `/admin/` (záložka Trasy). Před prvním použitím
pusť v Supabase `supabase-routes.sql` (jde pustit i znovu – doplní sloupec
`map_embed` bez ztráty dat).
Ke každé trase jde vložit mapu z Mapy.cz: na mapy.com naplánuj trasu →
Sdílet → *Vložit mapu do vlastních stránek* → kód vlep do adminu. Adresa
z prohlížeče nestačí, ta míří na plánovač. Kde je mapa, nahradí kreslený profil. Trasy v `javascript/routes.js` jsou
už jen záloha pro případ, že by Supabase nebylo dostupné.

**Kontaktní formulář** – odesílá přes EmailJS. Nastavení a podrobný návod
je v `javascript/emailjs.js`. Adresa, kam zprávy chodí, se nastavuje
v šabloně na emailjs.com (pole „To Email"), ne v kódu.
Dokud klíče nevyplníš, formulář otevírá poštovní program (mailto).

---

## Administrace (/admin/)

Web má vlastní administraci na **https://bezcizpelhrimova.cz/admin/** postavenou
na Supabase (databáze + úložiště fotek + přihlášení). Spravuješ v ní:

- **Aktuálně** – novinky v úvodní sekci, včetně banneru (obrázku)
- **Alba** – složky fotek
- **Fotky** – nahrávání a mazání fotek v albech
- **Ostatní** – počty členů a podobné údaje (tabulka `settings`)

### Nastavení (jednorázově)

1. Založ si projekt zdarma na https://supabase.com
2. **SQL Editor → New query** → vlož `supabase-schema.sql` → **Run**,
   pak totéž s `supabase-settings.sql`
3. **Settings → API** → zkopíruj *Project URL* a veřejný *anon / publishable key*
   a vlož je do `javascript/supabase.js`
4. **Authentication → Users → Add user** → zadej e-mail a heslo správce
   (zaškrtni *Auto Confirm User*)
5. **Authentication → Sign In / Providers → Email** → **vypni**
   „Allow new users to sign up" (jinak by se mohl zaregistrovat kdokoli)
6. Commit + push → hotovo

### Bezpečnost

Klíč v `javascript/supabase.js` je **veřejný a je to tak správně** – je vidět
v prohlížeči. Bezpečnost nedělá klíč, ale pravidla RLS v databázi:
veřejnost smí jen číst, zapisovat může jen přihlášený správce.
**Nikdy tam nedávej `service_role` klíč.**

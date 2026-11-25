# Emotion Cafe & Bar – web

Statický web (HTML, CSS, trocha JavaScriptu) bez frameworku a bez závislostí. Vzhled vychází z Framer šablony Qitchen (Gola Templates), kód je napsaný znovu a na Frameru nezávisí.

## Co kde je

| Soubor | K čemu slouží |
| --- | --- |
| `data/menu.json` | Jídelní a nápojový lístek: názvy, ceny, poznámky, fotky |
| `data/info.json` | Telefon, e-mail, adresa, otvírací doba, odkazy na sociální sítě (`instagram`, `facebook`, případně `x`), poloha na mapě |
| `build.mjs` | Šablony stránek a sestavení webu do `dist/` |
| `src/styles.css` | Vzhled (desktop od 1280 px, tablet 810–1279 px, mobil do 809 px) |
| `src/main.js` | Hamburger menu, slidery, animace |
| `assets/` | Obrázky, video, fonty |

## Úprava menu a kontaktů

Stačí upravit `data/menu.json` nebo `data/info.json` (jde to i přímo na GitHubu tužkou „Edit“) a uložit. Vercel web po každém commitu sám znovu sestaví.

Položka menu:

```json
{ "name": "Sandwich", "price": "145 Kč", "note": "S trhaným hovězím masem", "image": "menu-sandwich.webp", "leaf": true }
```

`note`, `image` a `leaf` (ikona lístku) jsou nepovinné. `nameMobile` a `noteMobile` dají na telefonu kratší název a zbytek do poznámky. Nové fotky patří do `assets/img/`.

## Lokální náhled

Potřeba je Node.js 18 nebo novější.

```
node build.mjs --serve
```

Web pak běží na http://localhost:3000.

## Nasazení na Vercel

1. Nahrajte složku do repozitáře na GitHubu.
2. Na vercel.com zvolte Add New → Project a repozitář importujte.
3. Nic nenastavujte, `vercel.json` už obsahuje příkaz pro sestavení i výstupní složku. Klikněte na Deploy.

Web poběží na adrese `nazev-projektu.vercel.app`.

## Licence a zdroje

- Design: šablona Qitchen od Gola Templates, proto v patičce zůstává odkaz na autora. Repozitář nechte soukromý, šablonu není dovoleno šířit jako samostatný podklad.
- Fonty: Forum (SIL Open Font License), Satoshi (Fontshare, ITF Free Font License).
- Ikony: Phosphor Icons (MIT).

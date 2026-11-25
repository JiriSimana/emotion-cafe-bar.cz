#!/usr/bin/env node
// Sestaví statický web do složky dist/.
//   node build.mjs           → jednorázové sestavení
//   node build.mjs --serve   → sestavení + lokální náhled na http://localhost:3000
// Bez závislostí, stačí Node 18+.

import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');
const menu = JSON.parse(read('data/menu.json'));
const info = JSON.parse(read('data/info.json'));
const sprite = read('src/sprite.svg');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const icon = (name, cls = 'icon') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const img = (file, alt = '', extra = '') => `<img src="/assets/img/${file}" alt="${esc(alt)}" ${extra}>`;
const roll = (text) => `<span class="roll"><span>${esc(text)}</span><span aria-hidden="true">${esc(text)}</span></span>`;
const orn = (tag, cls, text, small = false) =>
  `<div class="orn${small ? ' orn--sm' : ''}"><span class="orn__side"></span><${tag} class="${cls}">${esc(text)}</${tag}><span class="orn__side orn__side--r"></span></div>`;

const SOCIAL_LABELS = { instagram: 'Instagram', facebook: 'Facebook', x: 'X' };
const socials = Object.entries(info.social).filter(([n, h]) => h && SOCIAL_LABELS[n]).map(([n, h]) => [n, SOCIAL_LABELS[n], h]);

const NAV = [
  ['Menu', '/menu'],
  ['Rezervace', '/reservation'],
  ['Catering', '/about'],
  ['Kontakt', '/contact'],
];

function nav(current) {
  return `
<header class="nav">
  <div class="nav__bar">
    <div class="nav__left">
      <button class="toggle" type="button" data-menu-open aria-controls="menu" aria-expanded="false" aria-label="Otevřít menu"><span class="toggle__lines"><i></i><i></i><i></i></span></button>
      <a class="nav__logo" href="/" aria-label="${esc(info.name)} – úvod">${img('logo.png', info.name, 'width="100" height="100"')}</a>
    </div>
    <div class="nav__right">
      <nav class="nav__links" aria-label="Hlavní navigace">
        <a class="nav__link" href="/menu"${current === '/menu' ? ' aria-current="page"' : ''}>Menu</a>
        <a class="nav__link" href="/about"${current === '/about' ? ' aria-current="page"' : ''}>catering</a>
      </nav>
      <a class="btn" href="/reservation">REZERVACE</a>
    </div>
  </div>
</header>
<div class="overlay" id="menu" aria-hidden="true">
  <div class="overlay__panel">
    <button class="toggle toggle--close" type="button" data-menu-close aria-label="Zavřít menu"><span class="toggle__lines"><i></i><i></i><i></i></span></button>
    <div class="overlay__inner">
      <span class="orn-mini"><span></span></span>
      <nav class="overlay__nav" aria-label="Menu">
        ${NAV.map(([t, h]) => `<a class="overlay__link" href="${h}">${roll(t)}</a>`).join('\n        ')}
      </nav>
      <span class="orn-mini"><span></span></span>
    </div>
  </div>
</div>`;
}

const footer = (inline = false) => `
<footer class="footer card${inline ? ' footer--inline' : ''}" data-reveal>
  <div class="footer__in">
    <a href="https://gola.supply" target="_blank" rel="noopener">${roll('© Gola Templates')}</a>
    <span class="diamond"></span>
    <a href="/licensing">${roll('Licensing')}</a>
  </div>
</footer>`;

function layout({ path, title, description, body, bodyClass = '', withFooter = true }) {
  const full = title ? `${title} | ${info.name}` : `${info.name} – kavárna a bar v Plzni`;
  return `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description || info.description)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(description || info.description)}">
<meta property="og:image" content="/assets/img/hero-poster.webp">
<meta name="theme-color" content="#0a0b0a">
<link rel="icon" href="/assets/img/favicon.png">
<link rel="preload" href="/assets/fonts/forum-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/satoshi-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/styles.css">
<script>document.documentElement.classList.add('js')</script>
</head>
<body class="${bodyClass}">
${sprite}
<div class="page">
${nav(path)}
${body}
${withFooter ? footer() : ''}
</div>
<div class="texture" aria-hidden="true">${img('texture.jpg', '', 'loading="lazy"')}</div>
<script src="/assets/main.js" defer></script>
</body>
</html>
`;
}

const hero = (file, alt, title, pos = '') => `
  <div class="col-left">
    <div class="hero media">
      ${img(file, alt, `fetchpriority="high"${pos ? ` style="object-position:${pos}"` : ''}`)}
      ${title ? `<div class="hero__shade"></div>
      <div class="hero__title"><h1 class="display">${esc(title)}</h1></div>` : ''}
    </div>
  </div>`;

const slider = (files, cls = 'slider', extra = '') => `
<div class="${cls}" data-slider ${extra}>
  <ul class="${cls === 'strip' ? 'strip__track' : 'slider__track'}">
    ${files.map((f) => `<li>${img(f, '', 'loading="lazy"')}</li>`).join('\n    ')}
  </ul>
  <button class="slider__btn slider__btn--prev" type="button" data-prev aria-label="Předchozí fotka">${icon('chevron-left', '')}</button>
  <button class="slider__btn slider__btn--next" type="button" data-next aria-label="Další fotka">${icon('chevron-right', '')}</button>
</div>`;

/* ---------------- Stránky ---------------- */

function home() {
  const tile = (label, href, file, alt, pos = '') => `
    <div class="tile" data-reveal>
      <a class="tile__link" href="${href}" aria-label="${esc(label)}"></a>
      <div class="tile__img">${img(file, alt, pos ? `style="object-position:${pos}"` : '')}</div>
      <div class="tab"><a class="cta" href="${href}" tabindex="-1">${roll(label)}<span class="cta__badge"><span class="cta__icons">${icon('arrow-right')}${icon('arrow-right')}</span></span></a></div>
    </div>`;
  const body = `
<main class="wrap home">
  <div class="col-left">
    <div class="hero media">
      <video src="/assets/video/hero.mp4" poster="/assets/img/hero-poster.webp" muted loop playsinline preload="none" data-autoplay></video>
      <div class="hero__shade"></div>
      <div class="hero__title hero__title--home">
        <h1 class="display">Emotion</h1>
        <p class="display">cafe &amp; bar</p>
      </div>
      <div class="tab socials">
        ${socials.map(([n, l, h]) => `<a class="social" href="${h}" target="_blank" rel="noopener" aria-label="${l}">${icon(n)}</a>`).join('\n        ')}
      </div>
    </div>
  </div>
  <div class="col-right">
    ${tile('Menu', '/menu', 'home-menu.webp', 'Menu', '21.5% 32.4%')}
    ${tile('REZERVACE', '/reservation', 'home-rezervace.webp', 'Rezervace')}
    ${tile('O NÁS', '/about', 'interier-bar.webp', 'O nás')}
  </div>
</main>`;
  return layout({ path: '/', title: '', body, bodyClass: 'is-home' });
}

function menuPage() {
  const item = (it) => {
    const picture = it.image
      ? `<div class="item__img"><picture>${it.imageTablet ? `<source media="(min-width: 810px) and (max-width: 1279.98px)" srcset="/assets/img/${it.imageTablet}">` : ''}${img(it.image, it.name, 'loading="lazy"')}</picture></div>`
      : '';
    return `<li class="item${it.image ? '' : ' item--drink'}">${picture}
        <div class="item__body">
          <div class="item__top"><div class="item__title"><h3 class="item__name">${it.nameMobile ? `<span class="not-mobile">${esc(it.name)}</span><span class="only-mobile">${esc(it.nameMobile)}</span>` : esc(it.name)}</h3>${it.leaf ? icon('leaf') : ''}</div><span class="dots"></span><p class="item__price">${esc(it.price)}</p></div>
          ${it.note ? `<p class="item__note">${esc(it.note)}</p>` : ''}${it.noteMobile ? `<p class="item__note only-mobile">${esc(it.noteMobile)}</p>` : ''}
        </div>
      </li>`;
  };
  const list = (s) => `<ul class="menu-list">\n      ${s.items.map(item).join('\n      ')}\n    </ul>`;
  const [daily, steady, coffee, ...drinks] = menu.sections;
  const chips = menu.sections.filter((s) => s.chip);
  const body = `
<a class="to-top" href="#start" aria-label="Zpět nahoru">${icon('caret-up', '')}</a>
<main class="wrap" id="start">
  ${hero('hero-menu.webp', 'Menu', 'Menu', '0% 50%')}
  <div class="col-right">
    <div class="card panel menu-card">
      <nav class="filter" aria-label="Sekce menu">
        ${chips.map((s) => `<a href="#${s.id}">${esc(s.title)}</a>`).join('\n        ')}
      </nav>
      <section class="menu-group menu-group--food" id="${daily.id}">
        ${orn('h2', 'h-32', daily.title)}
        ${list(daily)}
        <div id="${steady.id}" class="menu-anchor">${orn('h2', 'h-32', steady.title)}</div>
        ${list(steady)}
      </section>
      <section class="menu-group menu-group--first" id="${coffee.id}">
        ${orn('h2', 'h-32', coffee.title)}
        ${list(coffee)}
      </section>
      <div class="menu-drinks">
        ${drinks.map((s) => `<section class="menu-group menu-group--drinks" id="${s.id}">
        ${orn('h2', 'h-32', s.title)}
        ${list(s)}
      </section>`).join('\n        ')}
      </div>
    </div>
  </div>
</main>`;
  return layout({ path: '/menu', title: 'Menu', description: 'Jídelní a nápojový lístek Emotion Cafe & Bar: denní nabídka, snídaně, káva, víno, pivo, míchané nápoje a destiláty.', body });
}

function about() {
  const body = `
<main class="wrap">
  ${hero('interier-bar.webp', 'Interiér Emotion Cafe & Bar', 'Catering')}
  <div class="col-right">
    <div class="stack">
      <div class="row row--a">
        <div class="card info info--center info--mcenter" data-reveal>
          <h2 class="h-32" style="width:100%">Vítejte v eMOTION CAFE &amp; BAR !</h2>
          <p class="text">Jsme tu pro vás nejen během otevírací doby, ale i jako multifunkční prostor pro vaše speciální události. S kapacitou pro 25-50 osob, možností <strong>kompletního cateringu</strong> a <strong>koordinace oslav</strong> vám zaručujeme skvělé zážitky.</p>
        </div>
        ${slider(['galerie-01.webp', 'hero-kontakt.webp', 'galerie-02.webp'], 'slider', 'data-reveal')}
      </div>
      <ul class="chips3">
        <li class="card h-24">Firemní AKce</li>
        <li class="card h-24">Soukromé oslavy</li>
        <li class="card h-24">Kompletní catering</li>
      </ul>
      <div class="row row--b">
        ${slider(['galerie-03.webp', 'galerie-04.webp', 'galerie-05.webp'])}
        <div class="card info info--mcenter" data-reveal>
          ${orn('h4', 'h-24', 'Co nabízíme', true)}
          <div class="text">
            <p><strong>• Řemeslné chleby s různými druhy domácích pomazánek, doplněné čerstvými a sezónními ingrediencemi<br>• Finger food a chlebíčky pro rauty<br>• Sdílené cateringové mísy<br>• Sezónní speciality připravované na míru akci</strong></p>
            <p style="margin-top:20px"><strong>Kompletní catering zajistíme od návrhu menu až po servírování.<br>Vše přizpůsobíme typu akce i počtu hostů.</strong></p>
          </div>
        </div>
      </div>
    </div>
  </div>
</main>`;
  return layout({ path: '/about', title: 'Catering', description: 'Catering a pronájem prostoru Emotion Cafe & Bar pro 25–50 osob: firemní akce, soukromé oslavy, kompletní catering.', body });
}

function reservation() {
  const body = `
<main class="wrap">
  ${hero('hero-rezervace.webp', 'Emotion Cafe & Bar', 'Rezervace & catering')}
  <div class="col-right">
    <div class="card panel">
      <div class="panel__inner reserve">
        <div class="reserve__head">
        ${orn('h2', 'h-32', 'Rezervace')}
        <div class="reserve__text text-lg">
          <p>Vítejte v eMOTION CAFE &amp; BAR ! Jsme tu pro vás nejen během otevírací doby, ale i jako multifunkční prostor pro vaše speciální události.</p>
          <p><br></p>
          <p>Každý den na našem&nbsp;<strong>denním menu najdete lahodnou polévku a jedno hlavní jídlo</strong>, a navíc máme stálou nabídku jídel a dalších dobrot, které si můžete vzít s sebou na cestu.</p>
          <p><br></p>
          <p>Nabízíme ideální místo pro:</p>
          <p><strong>pohodový ranní start</strong>&nbsp;,&nbsp;<strong>posezení s přáteli</strong>, malou<strong>&nbsp;zastávku při výletu s dětmi</strong>,&nbsp;<strong>pracovní schůzku s klientem</strong>&nbsp;nebo&nbsp;<strong>nevšední soukromou párty</strong>.</p>
          <p><br></p>
          <p>S kapacitou pro 25-50 osob, možností&nbsp;<strong>kompletního cateringu</strong>&nbsp;a&nbsp;<strong>koordinace oslav s animačním programem</strong>&nbsp;vám zaručujeme skvělé zážitky.</p>
          <p><br></p>
          <p>Rádi vám sdělíme ceník a podmínky pronájmu na vyžádání.</p>
          <p>Pro rezervaci volejte na telefonní číslo:</p>
        </div>
        </div>
        <a href="${info.phoneHref}" aria-label="Zavolat ${esc(info.phone)}">${orn('p', 'h-32', info.phone)}</a>
        <div class="reserve__spacer"></div>
      </div>
      ${slider(['galerie-01.webp', 'galerie-06.webp', 'galerie-07.webp', 'galerie-08.webp', 'galerie-05.webp'], 'strip')}
    </div>
  </div>
</main>`;
  return layout({ path: '/reservation', title: 'Rezervace', description: `Rezervace a pronájem prostoru v Emotion Cafe & Bar. Volejte ${info.phone}.`, body });
}

function contact() {
  const insta = ['galerie-09.webp', 'galerie-03.webp', 'galerie-10.webp', 'galerie-11.webp'];
  const { lat, lng, zoom } = info.map;
  const body = `
<main class="wrap">
  ${hero('hero-kontakt.webp', 'Tortilly na prkénku', 'Navštivte nás')}
  <div class="col-right">
    <div class="grid2">
      <div class="card info" data-reveal>
        ${orn('h4', 'h-24', 'OTVÍRACÍ DOBA', true)}
        <ul class="hours text">
          ${info.hours.map(([d, t]) => `<li><span>${esc(d)}</span><span class="dots"></span><span>${esc(t)}</span></li>`).join('\n          ')}
        </ul>
      </div>
      <div class="insta">
        ${insta.map((f) => `<a href="${info.social.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${img(f, '', 'loading="lazy"')}${icon('instagram')}</a>`).join('\n        ')}
      </div>
      <div class="map"><iframe title="Mapa – ${esc(info.address)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${lat}%2C${lng}&amp;z=${zoom}&amp;output=embed"></iframe></div>
      <div class="card info" data-reveal>
        ${orn('h4', 'h-24', 'KONTAKT', true)}
        <ul class="contact">
          <li><span class="label">Adresa</span><span class="text">${info.mapLink ? `<a href="${esc(info.mapLink)}" target="_blank" rel="noopener">${esc(info.address)}</a>` : esc(info.address)}</span></li>
          <li><span class="label">TELEFON</span><span class="text"><a href="${info.phoneHref}">${esc(info.phone)}</a></span></li>
          <li><span class="label">Email</span><span class="text"><a href="mailto:${info.email}">${esc(info.email)}</a></span></li>
          <li><span class="label">ODEBÍREJTE</span><span class="contact__socials">
            ${socials.map(([n, l, h]) => `<a href="${h}" target="_blank" rel="noopener" aria-label="${l}">${icon(n)}</a>`).join('\n            ')}
          </span></li>
        </ul>
      </div>
    </div>
  </div>
</main>`;
  return layout({ path: '/contact', title: 'Kontakt', description: `${info.name}, ${info.address}. Otevírací doba, telefon ${info.phone}, e-mail ${info.email}.`, body });
}

function licensing() {
  const body = `
<main class="wrap">
  ${hero('hero-licensing.webp', '', '')}
  <div class="col-right">
    <div class="card panel">
      <div class="panel__inner lic">
        <div class="lic__head">
          ${orn('h1', 'h-32', 'Licensing')}
          <p class="text-lg">All graphical assets in this template are licensed for personal and commercial use. If you'd like to use a specific asset, please check the license.</p>
        </div>
        <div class="lic__block">
          <div class="lic__title"><h2 class="h-24">Images</h2><div class="rule"><span></span></div></div>
          <div class="lic__cols">
            <p class="label">Pexels</p>
            <div class="lic__links label">
              <a href="https://www.pexels.com/collections/qitchen-restaurant-framer-template-zsi0fpp/" target="_blank" rel="noopener">Image Collection</a>
              <a href="https://www.pexels.com/license/" target="_blank" rel="noopener">License</a>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${footer(true)}
  </div>
</main>`;
  return layout({ path: '/licensing', title: 'Licensing', body });
}

function notFound() {
  const body = `
<main class="wrap">
  <section class="card nf">
    <div class="nf__head">
      ${orn('h1', 'h-48', '404')}
      <p class="text">Unfortunately the page you are looking for could not be found.</p>
    </div>
    <a class="cta" href="/">${roll('Go Back')}<span class="cta__badge"><span class="cta__icons">${icon('arrow-right')}${icon('arrow-right')}</span></span></a>
  </section>
</main>`;
  return layout({ path: '/404', title: 'Stránka nenalezena', body, withFooter: false });
}

/* ---------------- Sestavení ---------------- */

function build() {
  const out = join(root, 'dist');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, 'assets'), { recursive: true });
  cpSync(join(root, 'assets'), join(out, 'assets'), { recursive: true });
  writeFileSync(join(out, 'assets/styles.css'), read('src/styles.css'));
  writeFileSync(join(out, 'assets/main.js'), read('src/main.js'));
  const pages = { 'index.html': home(), 'menu.html': menuPage(), 'about.html': about(), 'reservation.html': reservation(), 'contact.html': contact(), 'licensing.html': licensing(), '404.html': notFound() };
  for (const [file, html] of Object.entries(pages)) writeFileSync(join(out, file), html);
  writeFileSync(join(out, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  console.log(`Hotovo: ${Object.keys(pages).length} stránek v dist/`);
}

function serve(port = 3000) {
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.txt': 'text/plain' };
  createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.includes('..')) { res.writeHead(400).end(); return; }
    if (p.endsWith('/')) p += 'index.html';
    let file = join(root, 'dist', p);
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'dist', p + '.html');
    let code = 200;
    if (!existsSync(file)) { file = join(root, 'dist', '404.html'); code = 404; }
    res.writeHead(code, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  }).listen(port, () => console.log(`Náhled běží na http://localhost:${port}`));
}

build();
if (process.argv.includes('--serve')) serve(Number(process.env.PORT) || 3000);

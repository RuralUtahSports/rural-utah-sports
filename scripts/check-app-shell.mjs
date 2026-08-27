import fs from 'node:fs';

const fail = message => {
  console.error(`APP SHELL CHECK FAILED: ${message}`);
  process.exitCode = 1;
};

const requiredFiles = [
  'RUSlogoNew.png',
  'manifest.webmanifest',
  'pwa.js',
  'sw.js',
  'nav-menu.js',
  'mobile-shell.js',
  'desktop-optimizations.js',
  'desktop-v2.js',
  'site-search.js',
  'optimization-polish.js',
  'recently-viewed.js',
  'home-personalized.js',
  'my-teams-dashboard.js',
  'my-teams-dashboard-v4.js',
  'rus-lines-dashboard.js',
  'game-center-upgrade.js',
  'deseret-rosters-stats-2026.json',
  'deseret-rosters-stats-2025.json'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) fail(`Missing required file: ${file}`);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
} catch (error) {
  fail(`manifest.webmanifest is not valid JSON: ${error.message}`);
}

if (manifest) {
  if (manifest.display !== 'standalone') fail('Manifest display must remain standalone.');
  if (!manifest.start_url) fail('Manifest is missing start_url.');
  if (!Array.isArray(manifest.icons) || !manifest.icons.length) {
    fail('Manifest must declare at least one install icon.');
  } else {
    for (const icon of manifest.icons) {
      const src = String(icon?.src || '').split('?')[0].replace(/^\.\//, '');
      if (!src) fail('Manifest contains an icon without a src.');
      else if (!fs.existsSync(src)) fail(`Manifest icon does not exist: ${src}`);
    }
  }
}

const pwa = fs.readFileSync('pwa.js', 'utf8');
const nav = fs.readFileSync('nav-menu.js', 'utf8');
const mobile = fs.readFileSync('mobile-shell.js', 'utf8');
const desktop = fs.readFileSync('desktop-optimizations.js', 'utf8');
const search = fs.readFileSync('site-search.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

for (const needle of ['manifest.webmanifest', 'apple-touch-icon', 'sw.js']) {
  if (!pwa.includes(needle)) fail(`pwa.js no longer references ${needle}.`);
}

for (const needle of ['pwa.js', 'site-search.js', 'mobile-shell.js', 'desktop-optimizations.js', 'recently-viewed.js', 'home-personalized.js', 'my-teams-dashboard.js', 'rus-lines-dashboard.js', 'game-center-upgrade.js']) {
  if (!nav.includes(needle)) fail(`nav-menu.js no longer loads ${needle}.`);
}

const setupStart = nav.indexOf('function setup()');
const mobileLoad = nav.indexOf('mobile-shell.js?v=20260827-mobile-nav-restore1', setupStart);
const deferredExtras = nav.indexOf('afterFirstPaint(loadExtras', setupStart);
if (setupStart < 0 || mobileLoad < setupStart || deferredExtras < 0 || mobileLoad > deferredExtras) {
  fail('Mobile navigation must load during critical setup before deferred extras.');
}
if (!nav.includes('if (document.querySelector("nav .nav-content")) setup();')) {
  fail('Navigation no longer initializes immediately when its markup is already parsed.');
}

for (const needle of ["navLink('home','Home'", "navLink('scores','Scores'", "navLink('teams','Teams'", "navLink('rankings','Rankings'", 'rus-mobile-more-button']) {
  if (!mobile.includes(needle)) fail(`mobile-shell.js is missing bottom-navigation item: ${needle}`);
}
if (!mobile.includes("if(document.querySelector('nav .rus-nav'))install();")) {
  fail('Mobile navigation no longer installs immediately after the canonical nav is ready.');
}

for (const file of fs.readdirSync('.').filter(name => name.endsWith('.html'))) {
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']nav-menu\.js\?v=([^"']+)["'][^>]*>/gi)) {
    if (match[1] !== '20260827-mobile-nav-restore1') fail(`${file} uses stale nav-menu version ${match[1]}.`);
    if (/\bdefer\b/i.test(match[0])) fail(`${file} defers the critical navigation script.`);
  }
}

if (!desktop.includes('desktop-v2.js')) fail('desktop-optimizations.js no longer loads desktop-v2.js.');

for (const needle of ['deseret-rosters-stats-${season}.json', 'player.html?id=', 'teams-data.json', 'weekly-simulation.json']) {
  if (!search.includes(needle)) fail(`site-search.js is missing expected search source/link: ${needle}.`);
}

for (const needle of ['RUSlogoNew.png', 'mobile-shell.js', 'site-search.js', 'optimization-polish.js', 'desktop-optimizations.js', 'desktop-v2.js', 'nav-menu.js', 'app-shell-polish.js']) {
  if (!sw.includes(needle)) fail(`sw.js app-shell cache is missing ${needle}.`);
}

for (const needle of ['LIVE_DATA', 'staleWhileRevalidate', 'networkFirst', 'cacheFirst']) {
  if (!sw.includes(needle)) fail(`sw.js is missing caching strategy ${needle}.`);
}

if (!process.exitCode) console.log('App shell sanity checks passed.');

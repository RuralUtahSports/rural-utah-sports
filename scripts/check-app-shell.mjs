import fs from 'node:fs';
import path from 'node:path';

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

for (const needle of ['manifest.webmanifest', 'apple-touch-icon', 'getRegistrations', 'unregister', 'rus-site-']) {
  if (!pwa.includes(needle)) fail(`pwa.js is missing reliability retirement token ${needle}.`);
}
if (/serviceWorker\.register\s*\(/.test(pwa)) fail('pwa.js must not register a service worker.');

for (const needle of ['pwa.js', 'site-search.js', 'mobile-shell.js', 'desktop-optimizations.js', 'recently-viewed.js', 'home-personalized.js', 'my-teams-dashboard.js', 'rus-lines-dashboard.js', 'game-center-upgrade.js']) {
  if (!nav.includes(needle)) fail(`nav-menu.js no longer loads ${needle}.`);
}

const setupStart = nav.indexOf('function setup()');
const mobileLoad = nav.indexOf('mobile-shell.js?v=20261017-playoff-pickem-mobile1', setupStart);
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

// Treat the homepage's navigation version as canonical. The cache key is
// intentionally bumped with nav changes, so a hard-coded historical version
// would flag correctly updated pages and miss future drift.
const indexVersions = [...fs.readFileSync('index.html', 'utf8').matchAll(/nav-menu\.js\?v=([\w-]+)/gi)].map(match => match[1]);
const navVersion = indexVersions[0] || '';
if (!/^\d{8}-[a-z0-9-]+$/.test(navVersion)) fail('index.html has no valid canonical nav-menu version.');
for (const file of fs.readdirSync('.').filter(name => name.endsWith('.html'))) {
  const html = fs.readFileSync(file, 'utf8');
  const versions = [...html.matchAll(/nav-menu\.js\?v=([\w-]+)/gi)].map(match => match[1]);
  // The audit and private award editors intentionally have a self-contained
  // navigation bar, not the shared .nav-content shell. Require an explicit
  // semantic navigation marker and working local destinations for that mode.
  const standalone = html.match(/<nav\b[^>]*\bdata-rus-navigation=["']standalone["'][^>]*>([\s\S]*?)<\/nav>/i);
  if (standalone) {
    if (versions.length || /class=["'][^"']*\bnav-content\b/.test(html)) fail(`${file} mixes standalone and shared navigation.`);
    const links = [...standalone[1].matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)].map(match => match[1]);
    const local = links.filter(link => !/^(?:[a-z]+:|\/\/|#)/i.test(link));
    if (local.length < 2) fail(`${file} standalone navigation must provide at least two local links.`);
    for (const link of local) {
      const target = path.resolve(path.dirname(file), link.split(/[?#]/)[0]);
      if (!target.startsWith(process.cwd() + path.sep) || !fs.existsSync(target)) fail(`${file} has a broken standalone navigation link: ${link}`);
    }
  } else if (!versions.length) fail(`${file} is missing a versioned nav-menu reference.`);
  for (const version of versions) {
    if (version !== navVersion) fail(`${file} uses nav-menu version ${version}; expected ${navVersion}.`);
  }
  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']nav-menu\.js\?v=([^"']+)["'][^>]*>/gi)) {
    if (/\bdefer\b/i.test(match[0])) fail(`${file} defers the critical navigation script.`);
  }
}

if (!desktop.includes('desktop-v2.js')) fail('desktop-optimizations.js no longer loads desktop-v2.js.');

for (const needle of ['site-search-index.json', 'player.html?id=']) {
  if (!search.includes(needle)) fail(`site-search.js is missing expected search source/link: ${needle}.`);
}

for (const needle of ['skipWaiting', 'clients.claim', 'registration.unregister', "key.startsWith('rus-site-')"]) {
  if (!sw.includes(needle)) fail(`sw.js retirement worker is missing ${needle}.`);
}
if (/addEventListener\(['"]fetch['"]/.test(sw)) fail('sw.js must not intercept fetches after service-worker retirement.');

if (!process.exitCode) console.log('App shell sanity checks passed.');

for (const source of ['deseret-rosters-stats-', 'teams-data.json', 'standings-2026.json', 'weekly-simulation.json']) {
  if (search.includes(source)) fail(`Search must use the compact index instead of ${source}`);
}

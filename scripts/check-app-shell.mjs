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
  'site-search.js',
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
const search = fs.readFileSync('site-search.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

for (const needle of ['manifest.webmanifest', 'apple-touch-icon', 'sw.js']) {
  if (!pwa.includes(needle)) fail(`pwa.js no longer references ${needle}.`);
}

for (const needle of ['pwa.js', 'site-search.js', 'mobile-shell.js']) {
  if (!nav.includes(needle)) fail(`nav-menu.js no longer loads ${needle}.`);
}

for (const needle of ['deseret-rosters-stats-${season}.json', 'player.html?id=', 'teams-data.json', 'weekly-simulation.json']) {
  if (!search.includes(needle)) fail(`site-search.js is missing expected search source/link: ${needle}.`);
}

for (const needle of ['RUSlogoNew.png', 'mobile-shell.js', 'site-search.js']) {
  if (!sw.includes(needle)) fail(`sw.js app-shell cache is missing ${needle}.`);
}

if (!process.exitCode) console.log('App shell sanity checks passed.');

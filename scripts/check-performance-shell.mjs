import fs from 'node:fs';

const fail=message=>{
  console.error(`PERFORMANCE CHECK FAILED: ${message}`);
  process.exitCode=1;
};

const read=file=>fs.readFileSync(file,'utf8');
const optimization=read('optimization-polish.js');
const nav=read('nav-menu.js');
const sw=read('sw.js');
const pwa=read('pwa.js');
const fetchCache=read('rus-fetch-cache.js');
const schoolCore=read('school-assets-core.js');
const schoolBundle=read('school-assets-bundle.js');
const scoreboardAssets=read('school-assets-scoreboard.js');
const logoIntegration=read('school-logo-integration.js');
const colorLoader=read('school-colors.js');
const colorPage=read('school-colors-page.js');

// optimization-polish.js should optimize presentation/runtime work, not act as a second feature loader.
for(const feature of ['recently-viewed.js','home-personalized.js','my-teams-dashboard.js','rus-lines-dashboard.js','game-center-upgrade.js']){
  if(optimization.includes(feature))fail(`optimization-polish.js still loads ${feature}`);
}
if(/function\s+load\s*\(/.test(optimization))fail('optimization-polish.js still defines a generic script loader');
if(/will-change\s*:\s*transform/i.test(optimization))fail('Broad will-change: transform hint returned');
if(!optimization.includes('observer.observe(main'))fail('Dynamic image observer must stay scoped to <main>');
if(optimization.includes('observer.observe(document.body'))fail('Dynamic image observer must not watch the full document body');

// nav-menu.js remains the global feature-loader source of truth.
for(const feature of ['recently-viewed.js','home-personalized.js','rus-lines-dashboard.js','game-center-upgrade.js']){
  if(!nav.includes(feature))fail(`nav-menu.js is missing global/page feature loader ${feature}`);
}

// Shared JSON requests should collapse only while they overlap, not freeze live data for the life of a page.
for(const token of ['DEDUPE_MS=900','CACHE_BUSTERS','removeLater','response.clone()','window.RUSFetchCache']){
  if(!fetchCache.includes(token))fail(`rus-fetch-cache.js is missing ${token}`);
}
for(const buster of ['v','ver','version','t','ts','timestamp','_']){
  if(!fetchCache.includes(`'${buster}'`))fail(`rus-fetch-cache.js does not normalize ${buster} cache-busters`);
}
if(fetchCache.includes("cache==='no-store'"))fail("rus-fetch-cache.js must allow simultaneous no-store JSON requests to dedupe");
if(!/setTimeout\([\s\S]{0,180}pending\.delete\(key\)/.test(fetchCache))fail('rus-fetch-cache.js does not expire completed request entries');
if(!nav.includes('ensureFetchCache')||!nav.includes('fetchCacheReady'))fail('nav-menu.js does not coordinate the shared JSON fetch cache');
if(!nav.includes("rus-fetch-cache.js?v=20260818-perf5"))fail('nav-menu.js is not loading the current shared fetch cache');
if(!/async function loadExtras\(\)[\s\S]{0,80}await fetchCacheReady/.test(nav))fail('Feature scripts can start before the shared fetch cache is ready');

// School assets: one shared exact-logo source, lightweight compatibility wrappers, page-scoped enhancements.
for(const file of ['school-assets-core.js','school-assets-bundle.js','school-assets-scoreboard.js','school-logo-integration.js','school-colors.js','school-colors-page.js']){
  if(!fs.existsSync(file))fail(`Missing ${file}`);
}
for(const token of ['window.RUSSchoolAssets','A.logoUrl','A.address','school-directory.json','A.customLogo','rus:school-assets-ready']){
  if(!schoolCore.includes(token))fail(`school-assets-core.js is missing ${token}`);
}
for(const logo of ['alta.webp','beaver.webp','emery-exact.png','grantsville.webp','east-user.svg','grand.webp','ridgeline-card.png','south-summit.webp']){
  if(!schoolCore.includes(logo))fail(`school-assets-core.js is missing exact logo override ${logo}`);
  const path=`school-logos/${logo}`;
  if(!fs.existsSync(path))fail(`Missing exact logo asset ${path}`);
}
for(const scoreboardOnly of ['rus-live-mercy','rankings-history-2026.json','applyFinalEloChanges','applyMercySummary']){
  if(schoolCore.includes(scoreboardOnly))fail(`school-assets-core.js contains scoreboard-only code: ${scoreboardOnly}`);
  if(schoolBundle.includes(scoreboardOnly))fail(`Compatibility bundle still contains scoreboard-only code: ${scoreboardOnly}`);
  if(!scoreboardAssets.includes(scoreboardOnly))fail(`school-assets-scoreboard.js is missing scoreboard behavior: ${scoreboardOnly}`);
}
if(/CUSTOM_LOGOS|const\s+CUSTOM\s*=/.test(logoIntegration))fail('school-logo-integration.js has a duplicate custom-logo table');
for(const token of ['A.logoUrl','A.hasCustomLogo','rus:school-assets-ready','observer.observe(main']){
  if(!logoIntegration.includes(token))fail(`school-logo-integration.js is missing shared/event-driven token: ${token}`);
}
if(logoIntegration.includes('[100,400,1000,2200]'))fail('school-logo-integration.js restored timed full-page rescans');
if(/observe\(document\.documentElement/.test(logoIntegration))fail('school-logo-integration.js must not observe the full document element');
if(!schoolBundle.includes("school-assets-core.js?v=20260821-emery-exact4"))fail('Compatibility bundle does not lazy-load the shared school core');
if(!schoolBundle.includes("school-assets-scoreboard.js?v=20260821-emery-exact4"))fail('Compatibility bundle does not lazy-load scoreboard-only assets');
if(/CUSTOM_LOGOS/.test(schoolBundle))fail('Compatibility bundle contains a duplicate custom-logo table');
if(!colorLoader.includes("school-colors-page.js?v=20260818-perf4"))fail('school-colors.js does not lazy-load the page-scoped color painter');
if(!colorLoader.includes("'index.html','programs.html','season.html','championships.html'"))fail('school-colors.js page allowlist changed');
if(colorLoader.includes('teams-data.json'))fail('school-colors.js wrapper contains heavy color data work');
if(!colorPage.includes("fetch('teams-data.json')"))fail('school-colors-page.js should use cache-friendly teams-data fetch');
if(colorPage.includes('Date.now()'))fail('school-colors-page.js cache-busts stable team branding data');
if(!colorPage.includes("document.querySelector('main')"))fail('school-colors-page.js does not scope dynamic painting to page content');
if(/data:image\//i.test(schoolCore)||/data:image\//i.test(schoolBundle))fail('Shared school asset JavaScript contains an embedded image; keep exact logos as files');

const coreBytes=Buffer.byteLength(schoolCore,'utf8');
const bundleBytes=Buffer.byteLength(schoolBundle,'utf8');
const scoreboardBytes=Buffer.byteLength(scoreboardAssets,'utf8');
const colorLoaderBytes=Buffer.byteLength(colorLoader,'utf8');
const fetchCacheBytes=Buffer.byteLength(fetchCache,'utf8');
if(coreBytes>5000)fail(`school-assets-core.js grew too large (${coreBytes} bytes)`);
if(bundleBytes>6000)fail(`school-assets-bundle.js compatibility wrapper grew too large (${bundleBytes} bytes)`);
if(colorLoaderBytes>1200)fail(`school-colors.js loader grew too large (${colorLoaderBytes} bytes)`);
if(fetchCacheBytes>5000)fail(`rus-fetch-cache.js grew too large (${fetchCacheBytes} bytes)`);
if(scoreboardBytes<=bundleBytes)fail('Scoreboard-only payload is not actually separated from the compatibility wrapper');
if(!/path\s*===\s*["']scoreboard\.html["'][\s\S]{0,140}school-assets-bundle\.js\?v=20260818-perf2[\s\S]{0,140}school-assets-core\.js\?v=20260818-perf2/.test(nav))fail('nav-menu.js no longer routes school assets by page');
for(const cached of ["'./rus-fetch-cache.js'","'./school-assets-core.js'","'./school-assets-bundle.js'","'./school-logo-integration.js'","'./school-colors.js'"]){
  if(!sw.includes(cached))fail(`service worker core cache is missing ${cached}`);
}

// Scoreboard extras should react to real DOM/data changes, not constantly rescan every game card.
for(const token of ['queueRefresh','MutationObserver','observer.observe(root','requestIdleCallback']){
  if(!scoreboardAssets.includes(token))fail(`school-assets-scoreboard.js is missing event-driven refresh token: ${token}`);
}
if(/setInterval\s*\(\s*refreshScoreboardExtras/i.test(scoreboardAssets))fail('Scoreboard extras returned to fixed-interval rescanning');
if(/setTimeout\s*\(\s*refreshScoreboardExtras/i.test(scoreboardAssets))fail('Scoreboard extras directly schedule repeated full rescans');
if(scoreboardAssets.includes('[0,100,400,1000]'))fail('Scoreboard extras restored the four-pass timer refresh pattern');

// Live data stays network-first, while the service worker also shares simultaneous network work.
for(const token of ['LIVE_DATA','JSON_DATA','normalizedLiveKey','CACHE_BUSTERS','NETWORK_INFLIGHT','sharedNetwork','staleWhileRevalidate','networkFirst(req,{normalize:true})']){
  if(!sw.includes(token))fail(`sw.js is missing ${token}`);
}
if(!/req\.mode==='navigate'[\s\S]{0,180}staleWhileRevalidate\(req\)/.test(sw))fail('Navigations are not stale-while-revalidate');
if(!/[,{]\s*key\s*=\s*JSON_DATA\.test\(url\.pathname\)\s*\?\s*normalizedLiveKey\(req\)\s*:\s*req/.test(sw))fail('Static JSON cache-busters are not normalized in stale-while-revalidate');
const liveLine=sw.split('\n').find(line=>line.includes('const LIVE_DATA='))||'';
for(const staticScript of ['nav-menu','pwa','desktop-optimizations','home-personalized','my-teams-dashboard','game-center-upgrade'])if(liveLine.includes(staticScript))fail(`Static script ${staticScript} is incorrectly classified as LIVE_DATA`);
for(const liveSource of ['weekly-simulation','deseret','standings-2026','rankings-current','elo-summary'])if(!liveLine.includes(liveSource))fail(`Live source ${liveSource} is missing from LIVE_DATA`);

// PWA registration and service-worker cache generations must move together.
const pwaVersion=pwa.match(/const VERSION='([^']+)'/)?.[1];
const swVersion=sw.match(/const CACHE='rus-site-([^']+)'/)?.[1];
if(!pwaVersion||!swVersion)fail('Could not read PWA/service-worker cache versions');
else if(pwaVersion!==swVersion)fail(`PWA version ${pwaVersion} does not match service-worker cache ${swVersion}`);

// Catch accidental duplicate direct script tags. Legacy bundle tags are allowed because the file is now a tiny wrapper.
let legacyBundlePages=0;
for(const file of fs.readdirSync('.').filter(name=>name.endsWith('.html'))){
  const html=read(file);
  const srcs=[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(m=>m[1].split('?')[0]);
  const seen=new Set();
  for(const src of srcs){if(seen.has(src))fail(`${file} directly includes ${src} more than once`);seen.add(src)}
  if(srcs.includes('school-assets-bundle.js'))legacyBundlePages++;
}

if(!process.exitCode)console.log(`Performance shell checks passed. Fetch cache ${fetchCacheBytes} B; core ${coreBytes} B; legacy wrapper ${bundleBytes} B; scoreboard-only ${scoreboardBytes} B; color loader ${colorLoaderBytes} B; ${legacyBundlePages} legacy HTML tags use the lightweight wrapper.`);

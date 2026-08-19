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
const schoolCore=read('school-assets-core.js');
const schoolBundle=read('school-assets-bundle.js');
const scoreboardAssets=read('school-assets-scoreboard.js');

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

// School assets: exact shared logo resolution stays tiny; legacy bundle tags are now a lightweight compatibility wrapper.
for(const file of ['school-assets-core.js','school-assets-bundle.js','school-assets-scoreboard.js'])if(!fs.existsSync(file))fail(`Missing ${file}`);
for(const token of ['window.RUSSchoolAssets','A.logoUrl','A.address','school-directory.json'])if(!schoolCore.includes(token))fail(`school-assets-core.js is missing ${token}`);
for(const logo of ['alta.webp','beaver.webp','emery.webp','grantsville.webp']){
  if(!schoolCore.includes(logo))fail(`school-assets-core.js is missing exact logo override ${logo}`);
  if(!fs.existsSync(`school-logos/${logo}`))fail(`Missing exact logo asset school-logos/${logo}`);
}
for(const scoreboardOnly of ['rus-live-mercy','rankings-history-2026.json','applyFinalEloChanges','applyMercySummary']){
  if(schoolCore.includes(scoreboardOnly))fail(`school-assets-core.js contains scoreboard-only code: ${scoreboardOnly}`);
  if(schoolBundle.includes(scoreboardOnly))fail(`Compatibility bundle still contains scoreboard-only code: ${scoreboardOnly}`);
  if(!scoreboardAssets.includes(scoreboardOnly))fail(`school-assets-scoreboard.js is missing scoreboard behavior: ${scoreboardOnly}`);
}
if(!schoolBundle.includes("school-assets-scoreboard.js?v=20260818-perf3"))fail('Compatibility bundle does not lazy-load scoreboard-only assets');
if(/data:image\//i.test(schoolCore)||/data:image\//i.test(schoolBundle))fail('Shared school asset JavaScript contains an embedded image; keep exact logos as files');
const coreBytes=Buffer.byteLength(schoolCore,'utf8'),bundleBytes=Buffer.byteLength(schoolBundle,'utf8'),scoreboardBytes=Buffer.byteLength(scoreboardAssets,'utf8');
if(coreBytes>5000)fail(`school-assets-core.js grew too large (${coreBytes} bytes)`);
if(bundleBytes>5000)fail(`school-assets-bundle.js compatibility wrapper grew too large (${bundleBytes} bytes)`);
if(scoreboardBytes<=bundleBytes)fail('Scoreboard-only payload is not actually separated from the compatibility wrapper');
if(!nav.includes("path==='scoreboard.html'?'school-assets-bundle.js?v=20260818-perf2':'school-assets-core.js?v=20260818-perf2'"))fail('nav-menu.js no longer routes school assets by page');
for(const cached of ["'./school-assets-core.js'","'./school-assets-bundle.js'"])if(!sw.includes(cached))fail(`service worker core cache is missing ${cached}`);

// Live data must stay network-first; page/static shell must be fast from cache on repeat visits.
for(const token of ['LIVE_DATA','normalizedLiveKey','CACHE_BUSTERS','staleWhileRevalidate','networkFirst(req,{normalize:true})'])if(!sw.includes(token))fail(`sw.js is missing ${token}`);
if(!/req\.mode==='navigate'[\s\S]{0,180}staleWhileRevalidate\(req\)/.test(sw))fail('Navigations are not stale-while-revalidate');
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

if(!process.exitCode)console.log(`Performance shell checks passed. Core ${coreBytes} B; legacy wrapper ${bundleBytes} B; scoreboard-only ${scoreboardBytes} B; ${legacyBundlePages} legacy HTML tags now point to the lightweight wrapper.`);

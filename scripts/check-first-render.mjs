import fs from 'node:fs';

const fail=message=>{console.error(`FIRST RENDER CHECK FAILED: ${message}`);process.exitCode=1};
const read=file=>fs.readFileSync(file,'utf8');
const nav=read('nav-menu.js');
const teamLoader=read('team-enhancements.js');
const teamRuntime=read('team-enhancements-runtime.js');
const pwa=read('pwa.js');
const sw=read('sw.js');

for(const token of ['afterFirstPaint','requestIdleCallback','afterFirstPaint(loadExtras','afterFirstPaint(setupAnalytics']){
  if(!nav.includes(token))fail(`nav-menu.js is missing deferred first-render token: ${token}`);
}
if(!/requestAnimationFrame\(\(\)\s*=>\s*requestAnimationFrame/s.test(nav))fail('nav-menu.js is missing the two-frame first-render delay');
if(/\bsetupAnalytics\(\);/.test(nav.split('const groups=')[0]))fail('Analytics starts immediately before the page can paint');
for(const token of ['content-visibility:auto','contain-intrinsic-size','#board .game:nth-child(n+5)','#state25List .state25-row:nth-child(n+9)','#rankings .rank-card:nth-child(n+3)','#rusMtGrid .rus-mt-card:nth-child(n+3)','#page .single-game-explorer']){
  if(!nav.includes(token))fail(`Mobile off-screen rendering guard is missing ${token}`);
}

const loaderBytes=Buffer.byteLength(teamLoader,'utf8');
const runtimeBytes=Buffer.byteLength(teamRuntime,'utf8');
if(loaderBytes>700)fail(`team-enhancements.js parser wrapper is too large (${loaderBytes} bytes)`);
if(runtimeBytes<=loaderBytes)fail('Team enhancement runtime was not actually split from the head loader');
for(const token of ['team-enhancements-runtime.js?v=20260826-record-mount4','s.async=false','rusTeamEnhancementsRuntime']){
  if(!teamLoader.includes(token))fail(`Team enhancement wrapper is missing ${token}`);
}
for(const token of ['function install()','window.render=function','loadCurrentSeason','loadRosterStats','loadOverviewCleanup','Rivalry Hub']){
  if(!teamRuntime.includes(token))fail(`Team enhancement runtime is missing preserved behavior: ${token}`);
}

const pwaVersion=pwa.match(/const VERSION='([^']+)'/)?.[1];
const swVersion=sw.match(/const CACHE='rus-site-([^']+)'/)?.[1];
if(pwaVersion!=='20260828-unique-featured1')fail(`Unexpected PWA first-render generation: ${pwaVersion||'missing'}`);
if(swVersion!==pwaVersion)fail(`Service-worker generation ${swVersion||'missing'} does not match PWA ${pwaVersion||'missing'}`);

if(!process.exitCode)console.log(`First-render checks passed. Team head wrapper ${loaderBytes} B -> ${runtimeBytes} B deferred runtime; mobile content-visibility guards and post-paint extras are active.`);

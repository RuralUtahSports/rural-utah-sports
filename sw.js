const CACHE='rus-site-20260831-week4-rankings1';
const CORE=[
  './',
  './index.html',
  './teams.html',
  './scoreboard.html',
  './rankings.html',
  './standings.html',
  './my-teams.html',
  './whats-new.html',
  './changelog.json',
  './RUSlogoNew.png?v=20260817-iosicon2',
  './nav-menu.js',
  './rus-fetch-cache.js',
  './mobile-shell.js',
  './site-search.js',
  './optimization-polish.js',
  './desktop-optimizations.js',
  './desktop-v2.js',
  './site-credibility.js',
  './seo-structured-data.js',
  './app-shell-polish.js',
  './school-assets-core.js',
  './school-assets-bundle.js',
  './school-logo-integration.js',
  './school-colors.js'
];
const LIVE_DATA=/(weekly-simulation|deseret|live-|record-alerts|standings-2026|rankings-current|rankings-history-2026|state-top25-history-2026|elo-summary|playoff-picture|game-preview-overrides|scoreboard.*\.json|2026\.json)/i;
const JSON_DATA=/\.json$/i;
const IMAGE=/\.(?:png|jpg|jpeg|webp|svg|ico)$/i;
const HTML=/\.html$/i;
const FRESH_HTML=/\/(?:rankings|scoreboard|game|team|team-page-content|simulators)\.html$/i;
const FRESH_JS=/(?:pwa|weekly-picks|weekly-picks-enhanced|weekly-picks-backend|weekly-simulation-promo|home-this-week|home-record-alerts|home-game-of-week|home-feature-share|site-share|game-center-upgrade|game-center-color-layout|rankings-sponsor-removal|school-assets-bundle|rus-lines-dashboard|scoreboard-refresh|scoreboard-share-layout|scoreboard-share-layout-core|share-graphic|mobile-shell|nav-menu|team-tabs|team-record-tabs-repair|team-player-records|team-stat-records|team-enhancements|team-enhancements-runtime)\.js$/i;
const CACHE_BUSTERS=new Set(['v','ver','version','t','ts','timestamp','_']);
const NETWORK_INFLIGHT=new Map();
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(CORE.map(x=>cache.add(x)))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
function normalizedLiveKey(req){const url=new URL(req.url);for(const key of [...url.searchParams.keys()])if(CACHE_BUSTERS.has(key.toLowerCase()))url.searchParams.delete(key);return new Request(url.toString(),{method:'GET',headers:req.headers,mode:req.mode,credentials:req.credentials,redirect:req.redirect})}
function sharedNetwork(id,factory){if(!NETWORK_INFLIGHT.has(id)){const task=Promise.resolve().then(factory);NETWORK_INFLIGHT.set(id,task);task.finally(()=>{if(NETWORK_INFLIGHT.get(id)===task)NETWORK_INFLIGHT.delete(id)}).catch(()=>{})}return NETWORK_INFLIGHT.get(id).then(res=>res.clone())}
async function networkFirst(req,{normalize=false}={}){const cache=await caches.open(CACHE),key=normalize?normalizedLiveKey(req):req,id=`network:${key.url}`;return sharedNetwork(id,async()=>{try{const res=await fetch(req);if(res&&res.ok)await cache.put(key,res.clone());return res}catch(err){const hit=await cache.match(key);if(hit)return hit;throw err}})}
async function staleWhileRevalidate(req){const cache=await caches.open(CACHE),url=new URL(req.url),key=JSON_DATA.test(url.pathname)?normalizedLiveKey(req):req,hit=await cache.match(key),fresh=sharedNetwork(`swr:${key.url}`,async()=>{const res=await fetch(req);if(res&&res.ok)await cache.put(key,res.clone());return res}).catch(()=>null);return hit||await fresh||Response.error()}
async function cacheFirst(req){const cache=await caches.open(CACHE),hit=await cache.match(req);if(hit)return hit;return sharedNetwork(`cache:${req.url}`,async()=>{const res=await fetch(req);if(res&&res.ok)await cache.put(req,res.clone());return res})}
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==location.origin)return;if(LIVE_DATA.test(url.pathname)){event.respondWith(networkFirst(req,{normalize:true}));return}if(FRESH_JS.test(url.pathname)||FRESH_HTML.test(url.pathname)){event.respondWith(networkFirst(req));return}if(req.mode==='navigate'||HTML.test(url.pathname)){event.respondWith(staleWhileRevalidate(req));return}if(IMAGE.test(url.pathname)){event.respondWith(cacheFirst(req));return}event.respondWith(staleWhileRevalidate(req))});

const CACHE='rus-site-20260921-shared-runtime2';
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
const LIVE_DATA=/(site-search-index|weekly-simulation|deseret|live-|record-alerts|standings-2026|rankings-current|rankings-history-2026|state-top25-history-2026|small-school-rankings-history-2026|elo-summary|playoff-picture|game-preview-overrides|scoreboard.*\.json|2026\.json)/i;
const JSON_DATA=/\.json$/i;
const IMAGE=/\.(?:png|jpg|jpeg|webp|svg|ico)$/i;
const HTML=/\.html$/i;
const FRESH_HTML=/\/(?:index|rankings|scoreboard|game|team|team-page-content|simulators|playoff-picture|stat-leaders|boys-basketball-teams)\.html$/i;
const FRESH_JS=/(?:optimization-polish|pwa|weekly-picks|weekly-picks-enhanced|weekly-picks-backend|weekly-simulation-promo|home-this-week|home-record-alerts|home-game-of-week|home-feature-share|site-share|game-center-upgrade|game-center-color-layout|rankings-sponsor-removal|school-assets-bundle|school-logo-integration|rus-lines-dashboard|scoreboard-refresh|scoreboard-share-layout|scoreboard-share-layout-core|share-graphic|mvp-race-share|mobile-shell|nav-menu|site-search|site-extras|site-share-lite|table-accessibility|app-shell-polish|mobile-optimizations|desktop-optimizations|growth-features|share-preview-links|team-tabs|team-record-tabs-repair|team-player-records|team-stat-records|team-enhancements|team-enhancements-runtime|playoff-picture-v2)\.js$/i;
const CACHE_BUSTERS=new Set(['v','ver','version','t','ts','timestamp','_']);
const NETWORK_INFLIGHT=new Map();
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(CORE.map(x=>cache.add(x)))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
function normalizedLiveKey(req){const url=new URL(req.url);for(const key of [...url.searchParams.keys()])if(CACHE_BUSTERS.has(key.toLowerCase()))url.searchParams.delete(key);return new Request(url.toString(),{method:'GET',headers:req.headers,mode:req.mode,credentials:req.credentials,redirect:req.redirect})}
function sharedNetwork(id,factory){if(!NETWORK_INFLIGHT.has(id)){const task=Promise.resolve().then(factory);NETWORK_INFLIGHT.set(id,task);task.finally(()=>{if(NETWORK_INFLIGHT.get(id)===task)NETWORK_INFLIGHT.delete(id)}).catch(()=>{})}return NETWORK_INFLIGHT.get(id).then(res=>res.clone())}
function cacheResponse(event,cache,key,response){
  if(!cache||!response?.ok)return;
  // Storage failure or slow disk must never hold up a page response.
  try{const write=cache.put(key,response.clone()).catch(()=>{});event?.waitUntil(write)}catch{}
}
async function boundedFetch(req){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  try{return await fetch(req,{signal:controller.signal})}finally{clearTimeout(timer)}
}
const openCache=()=>caches.open(CACHE).catch(()=>null);
async function networkFirst(req,{normalize=false}={},event){
  const cache=await openCache(),key=normalize?normalizedLiveKey(req):req,id=`network:${key.url}`;
  return sharedNetwork(id,async()=>{
    try{const res=await boundedFetch(req);cacheResponse(event,cache,key,res);return res}
    catch(err){const hit=await cache?.match(key).catch(()=>null);if(hit)return hit;throw err}
  });
}
async function staleWhileRevalidate(req,event){
  const cache=await openCache(),url=new URL(req.url),key=JSON_DATA.test(url.pathname)?normalizedLiveKey(req):req,hit=await cache?.match(key).catch(()=>null);
  const fresh=sharedNetwork(`swr:${key.url}`,async()=>{const res=await boundedFetch(req);cacheResponse(event,cache,key,res);return res}).catch(()=>null);
  event?.waitUntil(fresh.then(()=>{}));
  return hit||await fresh||Response.error();
}
async function cacheFirst(req,event){
  const cache=await openCache(),hit=await cache?.match(req).catch(()=>null);if(hit)return hit;
  return sharedNetwork(`cache:${req.url}`,async()=>{const res=await boundedFetch(req);cacheResponse(event,cache,req,res);return res});
}
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(req.mode==='navigate'&&url.hostname==='ruralutahsports.github.io'){const path=url.pathname.replace(/^\/rural-utah-sports(?=\/|$)/,'')||'/';event.respondWith(Promise.resolve(Response.redirect(`https://ruralutahsports.com${path}${url.search}`,302)));return}if(url.origin!==location.origin)return;if(LIVE_DATA.test(url.pathname)){event.respondWith(networkFirst(req,{normalize:true},event));return}if((req.mode==='navigate'&&url.pathname.endsWith('/'))||FRESH_JS.test(url.pathname)||FRESH_HTML.test(url.pathname)){event.respondWith(networkFirst(req,{},event));return}if(req.mode==='navigate'||HTML.test(url.pathname)){event.respondWith(staleWhileRevalidate(req,event));return}if(IMAGE.test(url.pathname)){event.respondWith(cacheFirst(req,event));return}event.respondWith(staleWhileRevalidate(req,event))});

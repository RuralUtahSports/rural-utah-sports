const CACHE='rus-site-20260819-lcp1';
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

// Data that must prefer the network because it can change during the season or on game night.
const LIVE_DATA=/(weekly-simulation|deseret|live-|standings-2026|rankings-current|rankings-history-2026|elo-summary|playoff-picture|scoreboard.*\.json|2026\.json)/i;
const JSON_DATA=/\.json$/i;
const IMAGE=/\.(?:png|jpg|jpeg|webp|svg|ico)$/i;
const HTML=/\.html$/i;
const CACHE_BUSTERS=new Set(['v','ver','version','t','ts','timestamp','_']);
const NETWORK_INFLIGHT=new Map();

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>Promise.allSettled(CORE.map(x=>cache.add(x))))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

function normalizedLiveKey(req){
  const url=new URL(req.url);
  for(const key of [...url.searchParams.keys()]){
    if(CACHE_BUSTERS.has(key.toLowerCase()))url.searchParams.delete(key);
  }
  return new Request(url.toString(),{method:'GET',headers:req.headers,mode:req.mode,credentials:req.credentials,redirect:req.redirect});
}

function sharedNetwork(id,factory){
  if(!NETWORK_INFLIGHT.has(id)){
    const task=Promise.resolve().then(factory);
    NETWORK_INFLIGHT.set(id,task);
    task.finally(()=>{if(NETWORK_INFLIGHT.get(id)===task)NETWORK_INFLIGHT.delete(id)}).catch(()=>{});
  }
  return NETWORK_INFLIGHT.get(id).then(res=>res.clone());
}

async function networkFirst(req,{normalize=false}={}){
  const cache=await caches.open(CACHE);
  const key=normalize?normalizedLiveKey(req):req;
  const id=`network:${key.url}`;
  return sharedNetwork(id,async()=>{
    try{
      const res=await fetch(req);
      if(res&&res.ok)await cache.put(key,res.clone());
      return res;
    }catch(err){
      const hit=await cache.match(key);
      if(hit)return hit;
      throw err;
    }
  });
}

async function staleWhileRevalidate(req){
  const cache=await caches.open(CACHE);
  const url=new URL(req.url);
  const key=JSON_DATA.test(url.pathname)?normalizedLiveKey(req):req;
  const hit=await cache.match(key);
  const fresh=sharedNetwork(`swr:${key.url}`,async()=>{
    const res=await fetch(req);
    if(res&&res.ok)await cache.put(key,res.clone());
    return res;
  }).catch(()=>null);
  return hit||await fresh||Response.error();
}

async function cacheFirst(req){
  const cache=await caches.open(CACHE);
  const hit=await cache.match(req);
  if(hit)return hit;
  return sharedNetwork(`cache:${req.url}`,async()=>{
    const res=await fetch(req);
    if(res&&res.ok)await cache.put(req,res.clone());
    return res;
  });
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==location.origin)return;

  // Live football data stays network-first; duplicate simultaneous requests share one network trip.
  if(LIVE_DATA.test(url.pathname)){
    event.respondWith(networkFirst(req,{normalize:true}));
    return;
  }

  // Once visited, page shells can render immediately while refreshing in the background.
  if(req.mode==='navigate'||HTML.test(url.pathname)){
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Logos and other media are immutable enough to favor cache speed.
  if(IMAGE.test(url.pathname)){
    event.respondWith(cacheFirst(req));
    return;
  }

  // Static JSON also normalizes cache-buster parameters, so shared data does not create duplicate cache entries.
  event.respondWith(staleWhileRevalidate(req));
});

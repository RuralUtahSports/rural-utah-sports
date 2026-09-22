const CACHE='rus-site-20260922-retire2';

const bounded=(promise,timeout=1200,fallback=null)=>Promise.race([Promise.resolve(promise).catch(()=>fallback),new Promise(resolve=>setTimeout(()=>resolve(fallback),timeout))]);

// Reliability kill switch: RUS no longer uses a service worker for request caching.
// This worker exists only so previously registered workers can update, take control,
// clear old RUS caches, and unregister themselves.
self.addEventListener('install',event=>{
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    try{
      const keys=await bounded(caches.keys(),1200,[]);
      await bounded(Promise.allSettled((keys||[]).filter(key=>key.startsWith('rus-site-')).map(key=>caches.delete(key))),1200,[]);
    }catch{}
    try{await self.clients.claim()}catch{}
    try{await self.registration.unregister()}catch{}
  })());
});

const CACHE='rus-site-20260921-no-sw1';

// Reliability kill switch: RUS no longer uses a service worker for request caching.
// This worker exists only so previously registered workers can update, take control,
// clear old RUS caches, and unregister themselves.
self.addEventListener('install',event=>{
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    try{
      const keys=await caches.keys();
      await Promise.allSettled(keys.filter(key=>key.startsWith('rus-site-')).map(key=>caches.delete(key)));
    }catch{}
    try{await self.clients.claim()}catch{}
    try{await self.registration.unregister()}catch{}
  })());
});

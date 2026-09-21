(()=>{
'use strict';
const head=document.head;
const VERSION='20260921-no-sw1';
const ICON='RUSlogoNew.png?v=20260817-iosicon2';
function meta(name,content){let m=document.querySelector(`meta[name="${name}"]`);if(!m){m=document.createElement('meta');m.name=name;head.appendChild(m)}m.content=content}
function script(src,id){if(document.getElementById(id)||document.querySelector(`script[src^="${src.split('?')[0]}"]`))return;const s=document.createElement('script');s.id=id;s.src=src;s.defer=true;document.body.appendChild(s)}
let manifest=document.querySelector('link[rel="manifest"]');if(!manifest){manifest=document.createElement('link');manifest.rel='manifest';head.appendChild(manifest)}manifest.href=`manifest.webmanifest?v=${VERSION}`;
let touch=document.querySelector('link[rel="apple-touch-icon"]');if(!touch){touch=document.createElement('link');touch.rel='apple-touch-icon';head.appendChild(touch)}touch.href=ICON;touch.setAttribute('sizes','320x320');
meta('theme-color','#F14D07');meta('apple-mobile-web-app-capable','yes');meta('apple-mobile-web-app-status-bar-style','black-translucent');meta('apple-mobile-web-app-title','Rural Utah Sports');
script(`site-credibility.js?v=${VERSION}`,'rusCredibilityLoader');
script(`seo-structured-data.js?v=${VERSION}`,'rusSeoLoader');
async function retireServiceWorkers(){
  try{
    let hadController=false;
    if('serviceWorker' in navigator){
      hadController=!!navigator.serviceWorker.controller;
      const registrations=await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(registrations.map(registration=>registration.unregister()));
    }
    if('caches' in window&&typeof caches.keys==='function'){
      const keys=await caches.keys();
      await Promise.allSettled(keys.filter(key=>key.startsWith('rus-site-')).map(key=>caches.delete(key)));
    }
    if(hadController){
      let alreadyReloaded=false;
      try{alreadyReloaded=sessionStorage.getItem('rus-sw-retired-reload')==='1'}catch{}
      if(!alreadyReloaded){
        try{sessionStorage.setItem('rus-sw-retired-reload','1')}catch{}
        setTimeout(()=>location.reload(),50);
      }
    }
  }catch(err){
    console.warn('RUS service worker retirement failed',err);
  }
}
retireServiceWorkers();
})();

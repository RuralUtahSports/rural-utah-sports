(()=>{
'use strict';
const head=document.head;
const VERSION='20260826-team-records-fresh1';
const ICON='RUSlogoNew.png?v=20260817-iosicon2';
function meta(name,content){let m=document.querySelector(`meta[name="${name}"]`);if(!m){m=document.createElement('meta');m.name=name;head.appendChild(m)}m.content=content}
function script(src,id){if(document.getElementById(id)||document.querySelector(`script[src^="${src.split('?')[0]}"]`))return;const s=document.createElement('script');s.id=id;s.src=src;s.defer=true;document.body.appendChild(s)}
let manifest=document.querySelector('link[rel="manifest"]');if(!manifest){manifest=document.createElement('link');manifest.rel='manifest';head.appendChild(manifest)}manifest.href=`manifest.webmanifest?v=${VERSION}`;
let touch=document.querySelector('link[rel="apple-touch-icon"]');if(!touch){touch=document.createElement('link');touch.rel='apple-touch-icon';head.appendChild(touch)}touch.href=ICON;touch.setAttribute('sizes','320x320');
meta('theme-color','#F14D07');meta('apple-mobile-web-app-capable','yes');meta('apple-mobile-web-app-status-bar-style','black-translucent');meta('apple-mobile-web-app-title','Rural Utah Sports');
script(`site-credibility.js?v=${VERSION}`,'rusCredibilityLoader');
script(`seo-structured-data.js?v=${VERSION}`,'rusSeoLoader');
if('serviceWorker' in navigator){window.addEventListener('load',async()=>{try{const reg=await navigator.serviceWorker.register(`./sw.js?v=${VERSION}`,{updateViaCache:'none'});await reg.update()}catch(err){console.warn('RUS service worker registration failed',err)}},{once:true})}
})();

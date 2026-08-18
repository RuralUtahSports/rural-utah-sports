(()=>{
'use strict';
const head=document.head;
const VERSION='20260817-desktop2';
const ICON='RUSlogoNew.png?v=20260817-iosicon2';
function meta(name,content){let m=document.querySelector(`meta[name="${name}"]`);if(!m){m=document.createElement('meta');m.name=name;head.appendChild(m)}m.content=content}
let manifest=document.querySelector('link[rel="manifest"]');if(!manifest){manifest=document.createElement('link');manifest.rel='manifest';head.appendChild(manifest)}manifest.href=`manifest.webmanifest?v=${VERSION}`;
let touch=document.querySelector('link[rel="apple-touch-icon"]');if(!touch){touch=document.createElement('link');touch.rel='apple-touch-icon';head.appendChild(touch)}touch.href=ICON;touch.setAttribute('sizes','320x320');
meta('theme-color','#F14D07');meta('apple-mobile-web-app-capable','yes');meta('apple-mobile-web-app-status-bar-style','black-translucent');meta('apple-mobile-web-app-title','Rural Utah Sports');
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register(`./sw.js?v=${VERSION}`).catch(err=>console.warn('RUS service worker registration failed',err)),{once:true})}
})();

(()=>{
'use strict';
const head=document.head;
function meta(name,content){if(document.querySelector(`meta[name="${name}"]`))return;const m=document.createElement('meta');m.name=name;m.content=content;head.appendChild(m)}
if(!document.querySelector('link[rel="manifest"]')){const l=document.createElement('link');l.rel='manifest';l.href='manifest.webmanifest?v=20260817-opt1';head.appendChild(l)}
if(!document.querySelector('link[rel="apple-touch-icon"]')){const l=document.createElement('link');l.rel='apple-touch-icon';l.href='RUSlogoNew.png';head.appendChild(l)}
meta('theme-color','#F14D07');meta('apple-mobile-web-app-capable','yes');meta('apple-mobile-web-app-status-bar-style','black-translucent');meta('apple-mobile-web-app-title','RUS');
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=20260817-opt1').catch(err=>console.warn('RUS service worker registration failed',err)),{once:true})}
})();

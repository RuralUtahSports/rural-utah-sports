(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='rankings.html')return;
if(window.__RUS_RANKINGS_SHARE_BOOTSTRAP__)return;
window.__RUS_RANKINGS_SHARE_BOOTSTRAP__=true;

const STYLE_ID='rus-rankings-share-bootstrap-style';
function styles(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent='.rus-rankings-share-bootstrap{position:fixed;right:18px;bottom:88px;z-index:9996;appearance:none;border:0;border-radius:999px;background:#F14D07;color:#000;font:900 12px Arial,sans-serif;text-transform:uppercase;padding:11px 15px;cursor:pointer;box-shadow:0 5px 18px rgba(0,0,0,.35)}';
  document.head.appendChild(s);
}
function load(src){
  const base=src.split('?')[0];
  const existing=[...document.scripts].find(s=>(s.getAttribute('src')||'').split('?')[0]===base);
  if(existing)return Promise.resolve(existing);
  return new Promise(resolve=>{
    const s=document.createElement('script');
    s.src=src;
    s.async=true;
    s.onload=()=>resolve(s);
    s.onerror=()=>resolve(s);
    document.body.appendChild(s);
  });
}
async function openShare(button){
  if(button)button.disabled=true;
  await Promise.all([
    load('share-graphic.js?v=20260921-rankings-lazy1'),
    load('rankings-share-direct.js?v=20260823-ios9-roundrect-fix'),
    load('rankings-class-share-direct-v3.js?v=20260819-ios3-class-polish-elo'),
    load('rankings-overall-share-direct-v3.js?v=20260820-ios3-overall-featured-top3-logos')
  ]);
  button?.remove();
  document.getElementById(STYLE_ID)?.remove();
  if(window.RUSShareGraphic?.openModal)window.RUSShareGraphic.openModal();
}
function init(){
  if(document.querySelector('.rus-share-btn,.rus-rankings-share-bootstrap'))return;
  styles();
  const b=document.createElement('button');
  b.type='button';
  b.className='rus-rankings-share-bootstrap';
  b.textContent='Share Graphic';
  b.addEventListener('click',()=>openShare(b),{once:true});
  document.body.appendChild(b);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

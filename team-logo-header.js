(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='team.html')return;
if(window.__rusTeamLogoHeaderLoaded)return;window.__rusTeamLogoHeaderLoaded=true;
const team=new URLSearchParams(location.search).get('team')||'';if(!team)return;
function addStyles(){
  if(document.getElementById('rus-team-logo-header-style'))return;
  const style=document.createElement('style');style.id='rus-team-logo-header-style';style.textContent=`
.rus-team-brand-head{display:flex;align-items:center;gap:18px;min-width:0;max-width:100%}.rus-team-page-logo{display:block;width:92px;height:92px;object-fit:contain;flex:0 0 92px;max-width:none;background:rgba(255,255,255,.96);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:8px}.rus-team-brand-copy{min-width:0;max-width:100%}@media(max-width:600px){.rus-team-brand-head{align-items:center;gap:12px;width:100%}.rus-team-page-logo{display:block!important;visibility:visible!important;opacity:1!important;width:68px;height:68px;flex-basis:68px;max-width:none!important;padding:6px}.rus-team-brand-copy{flex:1 1 0;overflow:hidden}.rus-team-brand-copy .team-title{font-size:28px;overflow-wrap:anywhere}}
`;document.head.appendChild(style);
}
async function assets(){
  if(window.RUSSchoolAssets)return window.RUSSchoolAssets;
  let script=[...document.scripts].find(s=>/school-assets-core\.js(?:\?|$)/.test(s.getAttribute('src')||''));
  if(!script){script=document.createElement('script');script.src='school-assets-core.js?v=20260819-teamfix2';script.async=true;document.head.appendChild(script)}
  await new Promise(resolve=>{
    let done=false,timer=0,timeout=0;
    const finish=()=>{if(done)return;done=true;clearInterval(timer);clearTimeout(timeout);window.removeEventListener('rus:school-assets-ready',ready);resolve()};
    const ready=()=>{if(window.RUSSchoolAssets)finish()};
    window.addEventListener('rus:school-assets-ready',ready);
    script.addEventListener('load',ready,{once:true});
    timer=setInterval(ready,50);timeout=setTimeout(finish,15000);ready();
  });
  return window.RUSSchoolAssets||null;
}
const srcKey=v=>{try{return new URL(v,location.href).href}catch{return String(v||'')}};
function dedupe(hero,keep){
  const key=srcKey(keep.currentSrc||keep.src);if(!key)return;
  hero.querySelectorAll('img').forEach(img=>{if(img===keep||img.closest('.rus-team-hero-sponsor'))return;if(srcKey(img.currentSrc||img.src)===key)img.remove()});
}
async function insert(){
  const hero=document.querySelector('#page .hero .hero-content');if(!hero)return false;
  const existing=hero.querySelector('.rus-team-page-logo');if(existing){dedupe(hero,existing);return true}
  const api=await assets();if(!api)return false;try{if(api.load)await api.load()}catch{}
  const url=api.logoUrl?.(team)||'';if(!url)return false;
  const title=hero.querySelector('.team-title'),subtitle=hero.querySelector('.team-subtitle');if(!title||!subtitle)return false;
  const wrap=document.createElement('div');wrap.className='rus-team-brand-head';
  const img=document.createElement('img');img.className='rus-team-page-logo';img.src=url;img.alt=`${team} logo`;img.width=92;img.height=92;img.loading='eager';img.decoding='async';img.fetchPriority='high';img.dataset.rusTeamLogo='1';
  let triedFallback=false;img.addEventListener('error',()=>{if(triedFallback)return;triedFallback=true;const fallback=api.fallbackLogo?.(team)||'';if(fallback&&srcKey(fallback)!==srcKey(img.src))img.src=fallback});
  const copy=document.createElement('div');copy.className='rus-team-brand-copy';title.parentNode.insertBefore(wrap,title);wrap.append(img,copy);copy.append(title,subtitle);dedupe(hero,img);return true;
}
function watch(){
  insert().then(ok=>{if(ok)return;const root=document.getElementById('page');if(!root)return;const observer=new MutationObserver(async()=>{if(await insert())observer.disconnect()});observer.observe(root,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),30000)});
}
function boot(){addStyles();watch();window.addEventListener('pageshow',()=>setTimeout(watch,0),{passive:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

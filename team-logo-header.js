(()=>{
'use strict';
if(document.getElementById('rus-team-logo-header-style'))return;
const team=new URLSearchParams(location.search).get('team')||'';if(!team)return;
const style=document.createElement('style');style.id='rus-team-logo-header-style';style.textContent=`
.rus-team-brand-head{display:flex;align-items:center;gap:18px}.rus-team-page-logo{width:92px;height:92px;object-fit:contain;flex:0 0 92px;background:rgba(255,255,255,.96);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:8px}.rus-team-brand-copy{min-width:0}@media(max-width:600px){.rus-team-brand-head{align-items:flex-start;gap:12px}.rus-team-page-logo{width:68px;height:68px;flex-basis:68px;padding:6px}.rus-team-brand-copy .team-title{font-size:28px}}
`;document.head.appendChild(style);
async function assets(){
  if(window.RUSSchoolAssets)return window.RUSSchoolAssets;
  let script=[...document.scripts].find(s=>/school-assets-core\.js(?:\?|$)/.test(s.getAttribute('src')||''));
  if(!script){script=document.createElement('script');script.src='school-assets-core.js?v=20260818-perf2';script.async=true;document.head.appendChild(script)}
  for(let i=0;i<50&&!window.RUSSchoolAssets;i++)await new Promise(r=>setTimeout(r,40));
  return window.RUSSchoolAssets||null;
}
async function insert(){
  const hero=document.querySelector('#page .hero .hero-content');if(!hero||hero.querySelector('.rus-team-page-logo'))return false;
  const api=await assets();if(!api)return false;try{if(api.load)await api.load()}catch{}
  const url=api.logoUrl?.(team)||'';if(!url)return false;
  const title=hero.querySelector('.team-title'),subtitle=hero.querySelector('.team-subtitle');if(!title||!subtitle)return false;
  const wrap=document.createElement('div');wrap.className='rus-team-brand-head';
  const img=document.createElement('img');img.className='rus-team-page-logo';img.src=url;img.alt=`${team} logo`;img.decoding='async';img.fetchPriority='high';
  const copy=document.createElement('div');copy.className='rus-team-brand-copy';title.parentNode.insertBefore(wrap,title);wrap.append(img,copy);copy.append(title,subtitle);
  return true;
}
insert().then(ok=>{
  if(ok)return;
  const root=document.getElementById('page');if(!root)return;
  const observer=new MutationObserver(async()=>{if(await insert())observer.disconnect()});observer.observe(root,{childList:true,subtree:true});
});
})();

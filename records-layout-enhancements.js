(()=>{
'use strict';
const path=(location.pathname.split('/').pop()||'').toLowerCase();
if(path!=='records.html')return;

function addStyles(){
  if(document.getElementById('rus-record-layout-enhancements'))return;
  const s=document.createElement('style');
  s.id='rus-record-layout-enhancements';
  s.textContent=`
    .controls.rus-record-controls-moved{margin-top:0;margin-bottom:20px}
    .team-badge.rus-logo-badge{display:inline-flex;align-items:center;gap:8px;min-width:0;padding:6px 10px 6px 7px;vertical-align:middle}
    .rus-record-team-logo{width:28px;height:28px;object-fit:contain;flex:0 0 28px;background:rgba(255,255,255,.10);border-radius:4px;padding:2px}
    .rus-record-team-name{display:inline-block;line-height:1.1}
    @media(max-width:700px){.rus-record-team-logo{width:25px;height:25px;flex-basis:25px}.team-badge.rus-logo-badge{gap:6px;padding:5px 8px 5px 6px}}
  `;
  document.head.appendChild(s);
}

async function waitForAssets(){
  for(let i=0;i<80&&!window.RUSSchoolAssets;i++)await new Promise(r=>setTimeout(r,35));
  if(window.RUSSchoolAssets?.load)await window.RUSSchoolAssets.load().catch(()=>{});
}

function moveControls(){
  const controls=document.querySelector('main .controls');
  const uhsaa=document.getElementById('rusUhsaa');
  if(!controls||!uhsaa)return false;
  if(uhsaa.nextElementSibling!==controls)uhsaa.insertAdjacentElement('afterend',controls);
  controls.classList.add('rus-record-controls-moved');
  return true;
}

function decorateBadges(root=document){
  root.querySelectorAll('.team-badge').forEach(a=>{
    if(a.dataset.rusLogoAdded==='1')return;
    const team=(a.textContent||'').trim();
    if(!team)return;
    let src='';
    try{src=window.RUSSchoolAssets?.logoUrl?window.RUSSchoolAssets.logoUrl(team):''}catch{}
    if(!src)return;
    const text=document.createElement('span');
    text.className='rus-record-team-name';
    text.textContent=team;
    a.textContent='';
    const img=document.createElement('img');
    img.className='rus-record-team-logo';
    img.src=src;
    img.alt=`${team} logo`;
    img.loading='lazy';
    img.decoding='async';
    img.onerror=()=>img.remove();
    a.append(img,text);
    a.classList.add('rus-logo-badge');
    a.dataset.rusLogoAdded='1';
  });
}

async function init(){
  addStyles();
  await waitForAssets();
  let attempts=0;
  const place=()=>{if(moveControls())return;attempts++;if(attempts<100)setTimeout(place,50)};
  place();
  decorateBadges();
  const main=document.querySelector('main');
  if(main)new MutationObserver(()=>requestAnimationFrame(()=>{moveControls();decorateBadges(main)})).observe(main,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

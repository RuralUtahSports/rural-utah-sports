(()=>{
'use strict';
const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
if(!['programs.html','season.html','championships.html'].includes(path))return;

const clean=v=>String(v??'').trim();
const baseNorm=v=>clean(v).replace(/^#\d+\s*/,'').toUpperCase().replace(/[.'’]/g,'').replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
const aliases={'ST JOSEPH':'SAINT JOSEPH','ST JOSEPH CATHOLIC':'SAINT JOSEPH','UMA CAMP WILLIAMS':'UMA LEHI','AMERICAN LEADERSHIP':'ALA','CEDAR':'CEDAR CITY','MONUMENT VALLEY':'MONUMENT VAL','PANGUTICH':'PANGUITCH','GUNNISON':'GUNNISON VALLEY','WASATCH ACADEMY':'WASATCH ACAD'};
const key=v=>aliases[baseNorm(v)]||baseNorm(v);
const safeHex=(v,f)=>/^#[0-9A-F]{3}(?:[0-9A-F]{3})?$/i.test(clean(v))?clean(v):f;
let teamMap=new Map();

function addStyles(){
  if(document.getElementById('rus-school-color-style'))return;
  const s=document.createElement('style');
  s.id='rus-school-color-style';
  s.textContent=`
    .rus-team-color{display:inline-block!important;padding:4px 8px!important;border-radius:5px!important;text-decoration:none!important;font-weight:900!important;line-height:1.2!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.20)}
    .rus-team-color:hover{filter:brightness(1.12)}
    #page tbody tr.rus-colored-row td:first-child{box-shadow:inset 4px 0 0 var(--rus-school-color)}
    .champ.rus-colored-champ{border-top:4px solid var(--rus-school-color)!important;position:relative;overflow:hidden}
    .champ.rus-colored-champ h3{margin-top:7px}
    .champ.rus-colored-champ h3 a,.champ.rus-colored-champ .rus-champion-name{display:inline-block;padding:5px 9px;border-radius:5px;background:var(--rus-school-color);color:var(--rus-school-text);box-shadow:inset 0 0 0 1px rgba(255,255,255,.20)}
    .champ.rus-colored-champ .class{color:var(--rus-school-color)!important}
    .bracket-title-count{display:none!important}
  `;
  document.head.appendChild(s);
}

function lookup(name){const k=key(name);return teamMap.get(k)||teamMap.get(baseNorm(name))||null}
function paintLink(a,name){
  const t=lookup(name||a.textContent);if(!t)return;
  const bg=safeHex(t.backgroundColor,'#222222'),fg=safeHex(t.textColor,'#FFFFFF');
  a.classList.add('rus-team-color');a.style.backgroundColor=bg;a.style.color=fg;a.style.setProperty('--rus-school-color',bg);
  const tr=a.closest('tr');if(tr){tr.classList.add('rus-colored-row');tr.style.setProperty('--rus-school-color',bg)}
}

function paintPrograms(){
  document.querySelectorAll('#page td.team a').forEach(a=>paintLink(a));
}

function paintSeason(){
  document.querySelectorAll('#page a.team-link').forEach(a=>paintLink(a));
  document.querySelectorAll('#page .champ').forEach(card=>{
    const h=card.querySelector('h3');if(!h||card.dataset.rusColor==='1')return;
    const name=clean(h.textContent);const t=lookup(name);if(!t)return;
    const bg=safeHex(t.backgroundColor,'#F14D07'),fg=safeHex(t.textColor,'#FFFFFF');
    card.dataset.rusColor='1';card.classList.add('rus-colored-champ');card.style.setProperty('--rus-school-color',bg);card.style.setProperty('--rus-school-text',fg);
    if(!h.querySelector('.rus-champion-name'))h.innerHTML=`<span class="rus-champion-name">${h.innerHTML}</span>`;
  });
}

function suppressTitleCount(){
  document.querySelectorAll('.bracket-title-count').forEach(el=>el.remove());
}

async function init(){
  addStyles();
  if(path==='championships.html'){
    suppressTitleCount();new MutationObserver(suppressTitleCount).observe(document.body,{childList:true,subtree:true});return;
  }
  try{
    const r=await fetch('teams-data.json?v='+Date.now());
    if(r.ok){for(const t of await r.json()){if(!t?.team)continue;teamMap.set(key(t.team),t);teamMap.set(baseNorm(t.team),t)}}
  }catch(e){console.warn('School colors unavailable',e)}
  const paint=path==='programs.html'?paintPrograms:paintSeason;
  paint();
  const host=document.getElementById('page')||document.body;
  new MutationObserver(()=>requestAnimationFrame(paint)).observe(host,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

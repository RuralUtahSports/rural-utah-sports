(()=>{
'use strict';
const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
if(!['index.html','programs.html','season.html','championships.html'].includes(path))return;

const clean=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
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
    .rus-home-team-color{display:inline-block!important;padding:3px 7px!important;border-radius:5px!important;font-weight:900!important;line-height:1.2!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.20);margin:0 2px!important}
    .rus-history-card .rus-home-team-color{display:inline-block!important;color:var(--rus-school-text)!important;font-size:inherit!important;margin-top:0!important}
    .rus-history-score{display:inline-block!important;color:#bbb!important;font-size:12px!important;margin:0 3px!important}
    .rus-watch-card strong.rus-home-single-team,.rus-search-item strong.rus-home-single-team{display:inline-block!important;padding:4px 8px!important;border-radius:5px!important;color:var(--rus-school-text)!important;background:var(--rus-school-color)!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.20)}
  `;
  document.head.appendChild(s);
}

function lookup(name){const k=key(name);return teamMap.get(k)||teamMap.get(baseNorm(name))||null}
function colorVars(el,t){
  if(!el||!t)return;
  const bg=safeHex(t.backgroundColor,'#222222'),fg=safeHex(t.textColor,'#FFFFFF');
  el.style.setProperty('--rus-school-color',bg);el.style.setProperty('--rus-school-text',fg);
  return {bg,fg};
}
function paintLink(a,name){
  const t=lookup(name||a.textContent);if(!t)return;
  const {bg,fg}=colorVars(a,t);
  a.classList.add('rus-team-color');a.style.backgroundColor=bg;a.style.color=fg;
  const tr=a.closest('tr');if(tr){tr.classList.add('rus-colored-row');tr.style.setProperty('--rus-school-color',bg)}
}
function chip(name){
  const t=lookup(name);if(!t)return esc(name);
  const bg=safeHex(t.backgroundColor,'#222222'),fg=safeHex(t.textColor,'#FFFFFF');
  return `<span class="rus-home-team-color" data-rus-color-chip="1" style="--rus-school-color:${bg};--rus-school-text:${fg};background:${bg};color:${fg}">${esc(name)}</span>`;
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

function paintHomeDataTeams(){
  document.querySelectorAll('[data-team]').forEach(el=>{
    const name=el.getAttribute('data-team');const t=lookup(name);if(!t)return;
    const {bg,fg}=colorVars(el,t);
    if(el.classList.contains('watch-team')||el.classList.contains('watch-badge')){
      el.style.setProperty('--team-bg',bg);el.style.setProperty('--team-fg',fg);
    }
  });
}
function paintHomeRecordWatch(){
  document.querySelectorAll('.rus-watch-card').forEach(card=>{
    let team='';
    try{team=new URL(card.getAttribute('href')||'',location.href).searchParams.get('team')||''}catch(e){}
    const strong=card.querySelector('strong'),t=lookup(team);if(!strong||!t)return;
    colorVars(strong,t);strong.classList.add('rus-home-single-team');
  });
}
function paintHomeHistory(){
  document.querySelectorAll('.rus-history-card').forEach(card=>{
    if(card.dataset.rusHomeColors==='1')return;
    let u;try{u=new URL(card.getAttribute('href')||'',location.href)}catch(e){return}
    const a=u.searchParams.get('team1')||'',b=u.searchParams.get('team2')||'',s1=u.searchParams.get('score1'),s2=u.searchParams.get('score2'),strong=card.querySelector('strong');
    if(!strong||!a||!b||!lookup(a)||!lookup(b))return;
    const score=s1!==null&&s2!==null?`${esc(s1)}–${esc(s2)}`:'vs';
    strong.innerHTML=`${chip(a)}<span class="rus-history-score">${score}</span>${chip(b)}`;
    card.dataset.rusHomeColors='1';
  });
}
function paintHomeSearch(){
  document.querySelectorAll('.rus-search-item').forEach(item=>{
    let team='';try{const u=new URL(item.getAttribute('href')||'',location.href);if((u.pathname.split('/').pop()||'').toLowerCase()==='team.html')team=u.searchParams.get('team')||''}catch(e){}
    const strong=item.querySelector('strong'),t=lookup(team);if(!strong||!t)return;
    colorVars(strong,t);strong.classList.add('rus-home-single-team');
  });
}
function paintHome(){paintHomeDataTeams();paintHomeRecordWatch();paintHomeHistory();paintHomeSearch()}

function suppressTitleCount(){document.querySelectorAll('.bracket-title-count').forEach(el=>el.remove())}

async function init(){
  addStyles();
  if(path==='championships.html'){
    suppressTitleCount();new MutationObserver(suppressTitleCount).observe(document.body,{childList:true,subtree:true});return;
  }
  try{
    const r=await fetch('teams-data.json?v='+Date.now());
    if(r.ok){for(const t of await r.json()){if(!t?.team)continue;teamMap.set(key(t.team),t);teamMap.set(baseNorm(t.team),t)}}
  }catch(e){console.warn('School colors unavailable',e)}
  const paint=path==='programs.html'?paintPrograms:path==='season.html'?paintSeason:paintHome;
  paint();
  const host=path==='index.html'?document.body:(document.getElementById('page')||document.body);
  let scheduled=false;
  new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;paint()})}).observe(host,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

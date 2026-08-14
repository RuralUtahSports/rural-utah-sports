(()=>{
'use strict';
const path=(location.pathname.split('/').pop()||'').toLowerCase();
if(!['all-utah.html','all-state-watch.html'].includes(path))return;
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const compact=v=>String(v??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
const aliases={CEDAR:'CEDARCITY',CEDARCITY:'CEDARCITY',GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISONVALLEY',MONUMENTVAL:'MONUMENTVALLEY',MAPLEMTN:'MAPLEMOUNTAIN'};
const canon=v=>aliases[compact(v)]||compact(v);
let meta=new Map();
function safe(v,f){return /^#[0-9a-f]{3,8}$/i.test(String(v||''))?v:f}
function addStyles(){if(document.getElementById('rus-award-school-style'))return;const s=document.createElement('style');s.id='rus-award-school-style';s.textContent=`
.method,.weights,.weight-grid{display:none!important}.rus-award-logo{width:38px;height:38px;object-fit:contain;flex:0 0 38px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}.rus-award-name-wrap{display:flex;align-items:center;gap:9px;min-width:0}.rus-award-name-pill{display:inline-block;padding:4px 7px;border-radius:5px;background:var(--rus-team-bg,#222);color:var(--rus-team-fg,#fff)!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.16);text-decoration:none}.rus-award-name-pill:hover{filter:brightness(1.12);color:var(--rus-team-fg,#fff)!important}.card{box-shadow:inset 4px 0 0 var(--rus-team-bg,#333)}.award{box-shadow:inset 4px 0 0 var(--rus-team-bg,#333)}
@media(max-width:600px){.rus-award-logo{width:32px;height:32px;flex-basis:32px}.rus-award-name-wrap{gap:7px}}
`;document.head.appendChild(s)}
async function ensureAssets(){for(let i=0;i<80&&!window.RUSSchoolAssets;i++)await new Promise(r=>setTimeout(r,40));if(window.RUSSchoolAssets?.load)await window.RUSSchoolAssets.load().catch(()=>{});}
async function loadMeta(){const r=await fetch(`teams-data.json?v=${Date.now()}`,{cache:'no-store'});if(!r.ok)return;for(const t of await r.json())meta.set(canon(t.team),t)}
function stripWeightText(root){root.querySelectorAll('.meta,.award-meta,.score span,.award-score span').forEach(el=>{let x=el.textContent||'';x=x.replace(/\s*•\s*\d+(?:\.\d+)?×(?:\s*weight)?/gi,'').replace(/Weighted\s+RUS\s+score/gi,'RUS score').replace(/Weighted\s+score/gi,'RUS score');if(el.textContent!==x)el.textContent=x})}
function decorate(){document.querySelectorAll('.card,.award').forEach(card=>{if(card.dataset.rusSchoolBranded==='1'){stripWeightText(card);return}const teamA=card.querySelector('.teamlink');const nameA=card.querySelector('.playerlink');if(!teamA||!nameA)return;let team='';try{team=new URL(teamA.href,location.href).searchParams.get('team')||teamA.textContent}catch{team=teamA.textContent}team=String(team||'').trim();const m=meta.get(canon(team))||{},bg=safe(m.backgroundColor,'#333'),fg=safe(m.textColor,'#fff');card.style.setProperty('--rus-team-bg',bg);card.style.setProperty('--rus-team-fg',fg);const logo=window.RUSSchoolAssets?.logoUrl?window.RUSSchoolAssets.logoUrl(team):'';nameA.classList.add('rus-award-name-pill');if(!nameA.closest('.rus-award-name-wrap')){const wrap=document.createElement('span');wrap.className='rus-award-name-wrap';nameA.parentNode.insertBefore(wrap,nameA);if(logo){const img=document.createElement('img');img.className='rus-award-logo';img.src=logo;img.alt=`${team} logo`;img.loading='lazy';img.decoding='async';img.onerror=()=>img.remove();wrap.appendChild(img)}wrap.appendChild(nameA)}stripWeightText(card);card.dataset.rusSchoolBranded='1'})}
async function init(){addStyles();await Promise.all([ensureAssets(),loadMeta().catch(()=>{})]);decorate();const root=document.getElementById('results')||document.getElementById('teams')||document.body;new MutationObserver(()=>requestAnimationFrame(decorate)).observe(root,{childList:true,subtree:true});}
init().catch(console.warn);
})();
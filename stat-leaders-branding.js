(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='stat-leaders.html')return;
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const norm=v=>String(v??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
const aliases={CEDAR:'CEDARCITY',CEDARCITY:'CEDARCITY',GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISONVALLEY',MONUMENTVAL:'MONUMENTVALLEY',MAPLEMTN:'MAPLEMOUNTAIN'};
const canon=v=>aliases[norm(v)]||norm(v);
let meta=new Map();
function addStyles(){if(document.getElementById('rus-stat-branding-style'))return;const s=document.createElement('style');s.id='rus-stat-branding-style';s.textContent=`
.leaders tbody tr{--team-color:#333;position:relative;background:linear-gradient(90deg,color-mix(in srgb,var(--team-color) 18%,#000) 0,color-mix(in srgb,var(--team-color) 7%,#000) 18%,#000 55%);box-shadow:inset 4px 0 0 var(--team-color)}
.leaders.rus-desktop-table thead th{top:0!important}
.leaders tbody tr:hover{background:linear-gradient(90deg,color-mix(in srgb,var(--team-color) 28%,#111) 0,color-mix(in srgb,var(--team-color) 12%,#111) 22%,#171717 60%)}
.rus-stat-team-wrap{display:flex;align-items:center;gap:9px;min-width:170px}.rus-stat-logo-shell{width:34px;height:34px;flex:0 0 34px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(255,255,255,.18);background:var(--team-color);overflow:hidden}.rus-stat-logo{width:28px;height:28px;object-fit:contain;filter:drop-shadow(0 1px 2px rgba(0,0,0,.7))}.rus-stat-team-text{display:flex;flex-direction:column;gap:2px}.rus-stat-team-text a{font-weight:900}.rus-stat-team-color{width:34px;height:3px;border-radius:99px;background:var(--team-color);opacity:.95}.rus-stat-rank-dot{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;border:1px solid color-mix(in srgb,var(--team-color) 70%,#666);background:color-mix(in srgb,var(--team-color) 20%,#111);color:#fff;font-weight:900}.rus-defense-note{margin:-6px 0 16px;color:#777;font-size:10px;line-height:1.45;font-weight:800;text-transform:uppercase}@media(max-width:700px){.rus-stat-team-wrap{min-width:150px}.rus-stat-logo-shell{width:30px;height:30px;flex-basis:30px}.rus-stat-logo{width:25px;height:25px}}
`;document.head.appendChild(s)}
async function ensureAssets(){for(let i=0;i<60&&!window.RUSSchoolAssets;i++)await new Promise(r=>setTimeout(r,50));if(window.RUSSchoolAssets?.load)await window.RUSSchoolAssets.load().catch(()=>({}));}
async function loadMeta(){const r=await fetch(`teams-data.json?v=${Date.now()}`,{cache:'no-store'});if(!r.ok)return;for(const t of await r.json())meta.set(canon(t.team),t)}
function colorFor(team){const m=meta.get(canon(team))||{};return m.backgroundColor||m.primaryColor||'#444'}
function logoFor(team){if(window.RUSSchoolAssets?.logoUrl)return window.RUSSchoolAssets.logoUrl(team);return ''}
function relabelDefense(){
  document.querySelectorAll('[data-cat="Defense/Special Teams"]').forEach(b=>{
    if(b.textContent.trim()!=='Defense')b.textContent='Defense';
    if(b.title!=='Defensive stat leaders')b.title='Defensive stat leaders';
  });
  for(const pill of document.querySelectorAll('#summary .pill'))if(pill.textContent.trim()==='Defense/Special Teams')pill.textContent='Defense';
  const controls=document.querySelector('.controls');
  if(controls&&!document.getElementById('rusDefenseLeadersNote')){
    const note=document.createElement('div');note.id='rusDefenseLeadersNote';note.className='rus-defense-note';note.textContent='Defense leaders are tracked for tackles, sacks, interceptions and defensive/return touchdowns when those stats are reported.';controls.insertAdjacentElement('afterend',note)
  }
}
function decorate(){relabelDefense();const rows=document.querySelectorAll('.leaders tbody tr');rows.forEach(tr=>{const teamCell=tr.querySelector('td.team');if(!teamCell||teamCell.dataset.rusBranded==='1')return;const a=teamCell.querySelector('a');if(!a)return;const team=(new URL(a.href,location.href).searchParams.get('team')||a.textContent||'').trim();if(!team)return;const color=colorFor(team);const logo=logoFor(team);tr.style.setProperty('--team-color',color);teamCell.dataset.rusBranded='1';teamCell.innerHTML=`<div class="rus-stat-team-wrap"><span class="rus-stat-logo-shell">${logo?`<img class="rus-stat-logo" src="${esc(logo)}" alt="" loading="lazy" onerror="this.style.display='none'">`:''}</span><span class="rus-stat-team-text"><a href="team.html?team=${encodeURIComponent(team)}">${esc(team)}</a><span class="rus-stat-team-color"></span></span></div>`;const rank=tr.querySelector('td.rank');if(rank&&!rank.querySelector('.rus-stat-rank-dot'))rank.innerHTML=`<span class="rus-stat-rank-dot">${esc(rank.textContent.trim())}</span>`})}
async function init(){addStyles();await Promise.all([ensureAssets(),loadMeta().catch(()=>{})]);decorate();for(const id of ['results','categoryButtons','summary']){const host=document.getElementById(id);if(host)new MutationObserver(()=>requestAnimationFrame(decorate)).observe(host,{childList:true,subtree:true})}}
init().catch(console.warn);
})();
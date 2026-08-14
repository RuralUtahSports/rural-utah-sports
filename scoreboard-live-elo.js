(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='scoreboard.html')return;
const norm=v=>String(v??'').trim().toUpperCase();
const compact=v=>norm(v).replace(/[^A-Z0-9]/g,'');
const aliases={CEDAR:'CEDARCITY',CEDARCITY:'CEDARCITY',GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISONVALLEY',MONUMENTVAL:'MONUMENTVALLEY',MAPLEMTN:'MAPLEMOUNTAIN'};
const canon=v=>aliases[compact(v)]||compact(v);
let summary={},history={};
function addStyles(){if(document.getElementById('rus-live-elo-style'))return;const s=document.createElement('style');s.id='rus-live-elo-style';s.textContent=`.rus-live-elo{margin-top:4px;font-size:8px;color:#777;font-weight:800}.rus-live-elo strong{color:#fff}.rus-live-elo .up{color:#73d977}.rus-live-elo .down{color:#ff7b7b}.rus-live-elo .flat{color:#aaa}@media(max-width:700px){.rus-live-elo{font-size:7px}}`;document.head.appendChild(s)}
function findTeamKey(name,obj){const c=canon(name);return Object.keys(obj||{}).find(k=>canon(k)===c)||null}
function latestFor(name){const hk=findTeamKey(name,history);if(hk&&history[hk]?.length){const r=history[hk][history[hk].length-1];return{elo:r.eloAfter,change:r.change,date:r.date}}const sk=findTeamKey(name,summary);if(sk&&summary[sk])return{elo:summary[sk].currentElo,change:null,date:summary[sk].currentDate};return null}
function decorate(){document.querySelectorAll('.game').forEach(card=>{card.querySelectorAll('.team-row').forEach(row=>{if(row.dataset.rusElo==='1')return;const a=row.querySelector('.team-name');if(!a)return;const x=latestFor(a.textContent);if(!x)return;const meta=row.querySelector('.team-meta');if(!meta)return;const cls=x.change>0?'up':x.change<0?'down':'flat',chg=x.change===null?'':` <span class="${cls}">${x.change>0?'+':''}${x.change}</span>`;meta.insertAdjacentHTML('afterend',`<div class="rus-live-elo">ELO <strong>${Math.round(Number(x.elo))}</strong>${chg}</div>`);row.dataset.rusElo='1'})})}
async function init(){addStyles();const stamp=Date.now(),[sr,hr]=await Promise.all([fetch(`elo-summary.json?v=${stamp}`,{cache:'no-store'}),fetch(`team-elo-history.json?v=${stamp}`,{cache:'no-store'})]);if(sr.ok)summary=await sr.json();if(hr.ok)history=await hr.json();decorate();const b=document.getElementById('board');if(b)new MutationObserver(()=>requestAnimationFrame(decorate)).observe(b,{childList:true,subtree:true})}
init().catch(console.warn);
})();
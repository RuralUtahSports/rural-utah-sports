(()=>{
'use strict';
const qs=new URLSearchParams(location.search);if((qs.get('season')||'')!=='2025')return;
const team=qs.get('team')||'';if(!team)return;
const clean=v=>String(v??'').trim();
const compact=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const aliases={CEDAR:'CEDARCITY',CEDARCITY:'CEDARCITY',GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISONVALLEY',MONUMENTVAL:'MONUMENTVALLEY',MAPLEMTN:'MAPLEMOUNTAIN',AMERICANLEADERSHIP:'ALA',AMERICANLEADERSHIPACADEMY:'ALA',STJOSEPH:'SAINTJOSEPH'};
const canon=v=>aliases[compact(v)]||compact(v);
const isScore=v=>clean(v)!==''&&Number.isFinite(Number(v));
const isFinal=g=>isScore(g?.actualScoreA)&&isScore(g?.actualScoreB);
async function finalKeys(){try{const r=await fetch(`deseret-team-data-2025.json?v=${Date.now()}`,{cache:'no-store'});if(!r.ok)return null;const data=await r.json();const key=Object.keys(data.teams||{}).find(k=>canon(k)===canon(team));if(!key)return null;const rows=(data.teams[key].schedule||[]).filter(isFinal);const set=new Set();for(const g of rows){set.add(`${clean(g.date)}|${canon(g.opponent)}|${Number(g.actualScoreA)}|${Number(g.actualScoreB)}`)}return set}catch(e){console.warn('2025 final filter:',e);return null}}
function scorePair(text){const m=clean(text).match(/(\d+)\s*[-–]\s*(\d+)/);return m?[Number(m[1]),Number(m[2])]:null}
async function apply(){const keys=await finalKeys();if(!keys)return;const wait=()=>new Promise(resolve=>{let tries=0;const run=()=>{const body=document.querySelector('.rus25-panel[data-tab="schedule"] tbody');if(body||++tries>120)return resolve(body);setTimeout(run,50)};run()});const body=await wait();if(!body)return;for(const row of [...body.querySelectorAll('tr')]){const cells=row.querySelectorAll('td');if(cells.length<4)continue;const date=clean(cells[0].textContent),opp=canon(cells[1].textContent),pair=scorePair(cells[3].textContent);if(!pair){row.remove();continue}const direct=`${date}|${opp}|${pair[0]}|${pair[1]}`,reverse=`${date}|${opp}|${pair[1]}|${pair[0]}`;if(!keys.has(direct)&&!keys.has(reverse))row.remove()}
const count=body.querySelectorAll('tr').length;const card=[...document.querySelectorAll('.rus25-card span')].find(x=>x.textContent.trim()==='Games');if(card)card.previousElementSibling.textContent=count;const total=[...document.querySelectorAll('.rus25-card span')].find(x=>x.textContent.trim()==='Total Games');if(total)total.previousElementSibling.textContent=count;if(!count){const wrap=body.closest('.rus25-wrap');if(wrap)wrap.outerHTML='<div class="rus25-empty">No completed 2025 games are available for this team.</div>'}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();
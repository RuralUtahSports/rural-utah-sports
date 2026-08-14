(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='scoreboard.html')return;
const norm=v=>String(v??'').trim().toUpperCase();
const compact=v=>norm(v).replace(/[^A-Z0-9]/g,'');
const aliases={CEDAR:'CEDARCITY',CEDARCITY:'CEDARCITY',GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISONVALLEY',MONUMENTVAL:'MONUMENTVALLEY',MAPLEMTN:'MAPLEMOUNTAIN'};
const canon=v=>aliases[compact(v)]||compact(v);
let summary={};
function addStyles(){if(document.getElementById('rus-live-elo-style'))return;const s=document.createElement('style');s.id='rus-live-elo-style';s.textContent=`
.rus-live-elo{margin-top:4px;font-size:8px;color:#777;font-weight:800;display:flex;align-items:center;gap:5px;flex-wrap:wrap}.rus-live-elo strong{color:#fff}.rus-elo-change{display:inline-flex;align-items:center;gap:2px;border-radius:999px;padding:2px 5px;font-size:7px;font-weight:1000}.rus-elo-change.up{color:#061507;background:#73d977}.rus-elo-change.down{color:#2a0707;background:#ff8c8c}.rus-elo-change.flat{color:#ddd;background:#333}.team-row.rus-winner .rus-live-elo{color:#bbb}.team-row.rus-winner .rus-elo-change.up{padding:3px 7px;font-size:8px;box-shadow:0 0 0 1px rgba(255,255,255,.12)}
@media(max-width:700px){.rus-live-elo{font-size:7px}.rus-elo-change{font-size:6px}.team-row.rus-winner .rus-elo-change.up{font-size:7px}}
`;document.head.appendChild(s)}
function findTeamKey(name){const c=canon(name);return Object.keys(summary||{}).find(k=>canon(k)===c)||null}
function iso(d){const t=Date.parse(String(d||''));if(!Number.isFinite(t))return String(d||'').trim();const x=new Date(t);return`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`}
function currentFor(name){const k=findTeamKey(name);if(!k)return null;const x=summary[k];return{currentElo:x.currentElo,change:x.currentChange,date:x.currentDate,opponent:x.currentOpponent,result:x.currentResult}}
function gameForCard(card){if(typeof games==='undefined'||!Array.isArray(games))return null;const names=[...card.querySelectorAll('.team-row .team-name')].map(a=>norm(a.textContent));if(names.length<2)return null;return games.find(g=>norm(g.awayTeam)===names[0]&&norm(g.homeTeam)===names[1])||null}
function opponentFor(g,name){return norm(name)===norm(g.awayTeam)?g.homeTeam:g.awayTeam}
function isWinner(g,name){try{const s=scoreState(g);if(!s?.done||Number(s.away)===Number(s.home))return false;return Number(s.away)>Number(s.home)?norm(name)===norm(g.awayTeam):norm(name)===norm(g.homeTeam)}catch{return false}}
function decorate(){document.querySelectorAll('.game').forEach(card=>{const g=gameForCard(card);if(!g)return;card.querySelectorAll('.team-row').forEach(row=>{const a=row.querySelector('.team-name'),meta=row.querySelector('.team-meta');if(!a||!meta)return;const x=currentFor(a.textContent);if(!x)return;row.querySelector('.rus-live-elo')?.remove();const matchesGame=iso(x.date)===iso(g.date)&&canon(x.opponent)===canon(opponentFor(g,a.textContent));const change=matchesGame&&Number.isFinite(Number(x.change))?Number(x.change):null;const cls=change>0?'up':change<0?'down':'flat',winner=isWinner(g,a.textContent);let badge='';if(change!==null){const arrow=change>0?'▲':change<0?'▼':'•',label=winner&&change>0?`ELO ${arrow} +${change}`:`${arrow} ${change>0?'+':''}${change}`;badge=`<span class="rus-elo-change ${cls}">${label}</span>`}meta.insertAdjacentHTML('afterend',`<div class="rus-live-elo"><span>ELO <strong>${Math.round(Number(x.currentElo))}</strong></span>${badge}</div>`);})})}
async function init(){addStyles();const r=await fetch(`elo-summary.json?v=${Date.now()}`,{cache:'no-store'});if(!r.ok)return;summary=await r.json();decorate();const b=document.getElementById('board');if(b)new MutationObserver(()=>requestAnimationFrame(decorate)).observe(b,{childList:true,subtree:true})}
init().catch(console.warn);
})();
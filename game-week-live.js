(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='game-week.html')return;
const root=document.getElementById('featureRoot');if(!root)return;
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
const num=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
const get=async(name,fallback=null)=>{try{const r=await fetch(`${name}?v=${Date.now()}`,{cache:'no-store'});return r.ok?await r.json():fallback}catch{return fallback}};
const final=g=>num(g?.actualAway)!==null&&num(g?.actualHome)!==null;
const dateNum=d=>{const n=Date.parse(String(d||''));return Number.isFinite(n)?n:0};
const startDay=v=>{const d=new Date(v);d.setHours(0,0,0,0);return d};
const footballWeekStart=v=>{const d=startDay(v),day=d.getDay();if(day>=1&&day<=3)d.setDate(d.getDate()+(4-day));else d.setDate(d.getDate()-((day+3)%7));return d.getTime()};
const gamesForCurrentWeek=games=>{const rows=(games||[]).filter(g=>g?.awayTeam&&g?.homeTeam&&dateNum(g.date));if(!rows.length)return[];const current=footballWeekStart(Date.now()),weeks=[...new Set(rows.map(g=>footballWeekStart(dateNum(g.date))))].sort((a,b)=>a-b),selected=weeks.includes(current)?current:(weeks.find(x=>x>current)??weeks.at(-1));return rows.filter(g=>footballWeekStart(dateNum(g.date))===selected)};
const fmtDate=d=>{const n=dateNum(d);return n?new Date(n).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}):String(d||'')};
const favKey='rus-favorite-teams-v1';
const favorites=()=>{try{const a=JSON.parse(localStorage.getItem(favKey)||'[]');return new Set((Array.isArray(a)?a:[]).map(norm))}catch{return new Set()}};
const style=document.createElement('style');
style.textContent=`
.rus-week-actions{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 26px}.rus-week-actions a{display:inline-flex;align-items:center;min-height:36px;padding:0 13px;border:1px solid #444;border-radius:5px;background:#222;color:#fff;text-decoration:none;font-size:11px;font-weight:900;text-transform:uppercase}.rus-week-actions a.primary,.rus-week-actions a:hover{background:#F14D07;border-color:#F14D07;color:#000}
.rus-week-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:28px}.rus-week-card{min-width:0;background:#050505;border:1px solid #343434;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:12px}.rus-week-card:hover{border-color:#555}.rus-week-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.rus-week-matchup{display:flex;align-items:center;gap:7px;flex-wrap:wrap;min-width:0}.rus-week-matchup .at{color:#777;font-size:12px;font-weight:800}.rus-week-ranked-team{display:inline-flex;align-items:center;gap:5px;min-width:0}.rus-week-rank{display:inline-flex;align-items:center;justify-content:center;min-height:22px;padding:3px 6px;border-radius:999px;background:#F14D07;color:#000;font-size:9px;font-weight:1000;line-height:1;white-space:nowrap;letter-spacing:.02em}.rus-week-rank.top1{background:#d5ad35}.rus-week-rank.top2{background:#d7d9dc}.rus-week-rank.top3{background:#cf8754}.rus-week-score{font-size:21px;font-weight:1000;white-space:nowrap;color:#fff;line-height:1.2}.rus-week-score.projected{color:#F14D07}.rus-week-bottom{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid #262626;padding-top:10px}.rus-week-meta{color:#aaa;font-size:11px;font-weight:700}.rus-week-view{color:#F14D07;text-decoration:none;font-size:10px;font-weight:1000;text-transform:uppercase;white-space:nowrap}.rus-week-view:hover{text-decoration:underline}.rus-week-date-head{color:#aaa;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;margin:18px 0 9px}.rus-week-empty{background:#050505;border:1px solid #333;border-radius:7px;padding:18px;color:#888;margin-bottom:28px}
@media(max-width:850px){.rus-week-grid{grid-template-columns:1fr}}@media(max-width:520px){.rus-week-card{padding:12px}.rus-week-top,.rus-week-bottom{align-items:flex-start;flex-direction:column}.rus-week-score{font-size:19px}.rus-week-view{font-size:11px}.rus-week-rank{font-size:8px;min-height:20px;padding:3px 5px}}
`;
document.head.appendChild(style);
function teamPill(name,map){const t=map.get(norm(name)),bg=t?.backgroundColor||'#222',fg=t?.textColor||'#fff';return `<a class="team-pill" style="--bg:${esc(bg)};--fg:${esc(fg)}" href="team.html?team=${encodeURIComponent(t?.team||name)}">${esc(name)}</a>`}
function rankedTeam(name,map,rankMap,showRank){const info=rankMap?.get(norm(name));if(!showRank||!info)return teamPill(name,map);const cls=String(info.cls||'').toUpperCase()==='8P'?'8P':info.cls;const top=info.rank<=3?` top${info.rank}`:'';return `<span class="rus-week-ranked-team"><span class="rus-week-rank${top}">${esc(cls)} #${esc(info.rank)}</span>${teamPill(name,map)}</span>`}
function gameHref(g){return `game.html?${new URLSearchParams({date:g.date||'',away:g.awayTeam||'',home:g.homeTeam||''})}`}
function card(g,map,rankMap=null,showRanks=false){const isFinal=final(g),pa=num(g.awayScore),ph=num(g.homeScore),aa=num(g.actualAway),ah=num(g.actualHome);let score='',label='Scheduled';if(isFinal){score=`${aa}-${ah}`;label='Final'}else if(pa!==null&&ph!==null){score=`${pa}-${ph}`;label='RUS projection'}return `<article class="rus-week-card"><div class="rus-week-top"><div class="rus-week-matchup">${rankedTeam(g.awayTeam,map,rankMap,showRanks)}<span class="at">at</span>${rankedTeam(g.homeTeam,map,rankMap,showRanks)}</div>${score?`<div class="rus-week-score ${isFinal?'':'projected'}">${esc(score)}</div>`:''}</div><div class="rus-week-bottom"><div class="rus-week-meta">${esc(fmtDate(g.date))} • ${label}</div><a class="rus-week-view" href="${gameHref(g)}">View Game →</a></div></article>`}
function section(title,games,map,rankMap=null,showRanks=false){return `<h2 class="section-title">${esc(title)}</h2>${games.length?`<div class="rus-week-grid">${games.map(g=>card(g,map,rankMap,showRanks)).join('')}</div>`:'<div class="rus-week-empty">No games to show here yet.</div>'}`}
async function run(){
 root.innerHTML='<div class="loading">Loading the newest game week…</div>';
 const [week,weekly,teams,rankings]=await Promise.all([get('home-week-data.json',{}),get('weekly-simulation.json',{}),get('teams-data.json',[]),get('rankings-current-2026.json',{})]);
 const currentGames=gamesForCurrentWeek(weekly?.games),homeGames=gamesForCurrentWeek(week?.games);
 const games=(currentGames.length?currentGames:homeGames).slice().sort((a,b)=>dateNum(a.date)-dateNum(b.date)||String(a.awayTeam).localeCompare(String(b.awayTeam)));
 const map=new Map((teams||week?.teams||[]).map(t=>[norm(t.team),t]));
 const fav=favorites();
 const favGames=games.filter(g=>fav.has(norm(g.awayTeam))||fav.has(norm(g.homeTeam)));
 const closest=games.filter(g=>!final(g)&&num(g.awayScore)!==null&&num(g.homeScore)!==null).sort((a,b)=>Math.abs(num(a.awayScore)-num(a.homeScore))-Math.abs(num(b.awayScore)-num(b.homeScore))).slice(0,8);
 const rankMap=new Map();
 const rankingGroups=rankings?.classifications||week?.rankings||{};
 for(const [cls,arr] of Object.entries(rankingGroups))(arr||[]).forEach((x,i)=>{const team=typeof x==='string'?x:x?.team;if(team)rankMap.set(norm(team),{cls,rank:Number(x?.rank)||i+1})});
 const ranked=games.filter(g=>rankMap.has(norm(g.awayTeam))||rankMap.has(norm(g.homeTeam))).slice(0,10);
 const grouped=new Map();for(const g of games){const k=g.date||'Date TBD';if(!grouped.has(k))grouped.set(k,[]);grouped.get(k).push(g)}
 const full=[...grouped.entries()].map(([d,rows])=>`<div class="rus-week-date-head">${esc(fmtDate(d))} • ${rows.length} game${rows.length===1?'':'s'}</div><div class="rus-week-grid">${rows.map(g=>card(g,map)).join('')}</div>`).join('');
 root.innerHTML=`<div class="rus-week-actions"><a class="primary" href="scoreboard.html">Scoreboard</a><a href="simulators.html#weekly">Weekly Simulator</a><a href="playoff-picture.html">Playoff Picture</a><a href="my-teams.html">My Teams</a></div>${favGames.length?section('My Teams This Week',favGames,map):''}${section('Closest RUS Projections',closest,map)}${section('Ranked Teams in Action',ranked,map,rankMap,true)}<h2 class="section-title">Full Week</h2>${full||'<div class="rus-week-empty">No games are loaded for the newest week yet.</div>'}`;
}
run().catch(e=>{console.error(e);root.innerHTML='<div class="empty">Game Week could not load. Try refreshing in a moment.</div>'});
})();

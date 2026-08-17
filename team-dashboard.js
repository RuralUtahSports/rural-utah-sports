(()=>{
'use strict';
if(window.__rusTeamDashboardLoaded)return;window.__rusTeamDashboardLoaded=true;
if((location.pathname.split('/').pop()||'').toLowerCase()!=='team.html')return;
const team=new URLSearchParams(location.search).get('team');if(!team)return;
const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:null};
const date=d=>{const x=Date.parse(String(d||''));return Number.isFinite(x)?x:0};
const get=async f=>{try{const r=await fetch(`${f}?v=${Date.now()}`,{cache:'no-store'});return r.ok?await r.json():null}catch{return null}};
const style=document.createElement('style');style.textContent='.rus-team-dashboard{margin:0 0 28px}.rus-team-dashboard h2{border-left:6px solid #F14D07;padding-left:12px;margin:0 0 12px;text-transform:uppercase}.rus-dash-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px}.rus-dash-card{background:#000;border:1px solid #333;border-radius:7px;padding:13px;text-align:center}.rus-dash-card strong{display:block;font-size:22px;color:#F14D07}.rus-dash-card span{display:block;color:#888;font-size:9px;text-transform:uppercase;margin-top:5px;font-weight:900}.rus-dash-next{margin-top:10px;background:#000;border:1px solid #333;border-radius:7px;padding:12px;color:#bbb;font-size:11px}.rus-dash-next a{color:#F14D07;font-weight:900;text-decoration:none}@media(max-width:900px){.rus-dash-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:560px){.rus-dash-grid{grid-template-columns:repeat(2,1fr)}}';document.head.appendChild(style);
let building=false,built=false;
async function build(){
  if(building||built||document.getElementById('rusTeamDashboard'))return built;
  const hero=document.querySelector('#page .hero');if(!hero)return false;
  building=true;
  try{
    const [standings,elo,rankings,records,weekly]=await Promise.all([get('standings-2026.json'),get('elo-summary.json'),get('rankings-current-2026.json'),get('team-records.json'),get('weekly-simulation.json')]);
    if(document.getElementById('rusTeamDashboard')){built=true;return true}
    const key=norm(team),all=Object.values(standings?.byClassification||{}).flat(),s=all.find(x=>norm(x.team)===key),ev=elo?.[key]||elo?.[team],eloNum=n(ev?.currentElo??ev?.elo??ev),rec=records?.[key]||records?.[team]||{},classes=rankings?.classifications||{},rankHit=Object.entries(classes).map(([cls,arr])=>({cls,index:(arr||[]).findIndex(x=>norm(typeof x==='string'?x:x.team)===key)})).find(x=>x.index>=0),games=(weekly?.games||[]).filter(g=>norm(g.awayTeam)===key||norm(g.homeTeam)===key),finals=games.filter(g=>String(g.actualAway??'').trim()!==''&&String(g.actualHome??'').trim()!=='').sort((a,b)=>date(b.date)-date(a.date)),upcoming=games.filter(g=>String(g.actualAway??'').trim()===''||String(g.actualHome??'').trim()==='').sort((a,b)=>date(a.date)-date(b.date)),last=finals[0],next=upcoming[0],record=s?`${s.wins}-${s.losses}${s.ties?'-'+s.ties:''}`:'—';
    const box=document.createElement('section');box.id='rusTeamDashboard';box.className='rus-team-dashboard';box.innerHTML=`<h2>2026 Dashboard</h2><div class="rus-dash-grid"><div class="rus-dash-card"><strong>${record}</strong><span>Record</span></div><div class="rus-dash-card"><strong>${eloNum===null?'—':Math.round(eloNum)}</strong><span>Current ELO</span></div><div class="rus-dash-card"><strong>${rankHit?`#${rankHit.index+1}`:'—'}</strong><span>${rankHit?rankHit.cls+' Rank':'Class Rank'}</span></div><div class="rus-dash-card"><strong>${s?.streak||'—'}</strong><span>Current Streak</span></div><div class="rus-dash-card"><strong>${rec.stateChampionships??'—'}</strong><span>State Titles</span></div><div class="rus-dash-card"><strong>${rec.playoffWins??'—'}</strong><span>Playoff Wins</span></div></div><div class="rus-dash-next">${last?`Last: <a href="game.html?${new URLSearchParams({date:last.date,away:last.awayTeam,home:last.homeTeam})}">${last.awayTeam} ${last.actualAway} – ${last.actualHome} ${last.homeTeam}</a>`:'No completed 2026 game loaded yet.'}${next?` &nbsp; • &nbsp; Next: <a href="game.html?${new URLSearchParams({date:next.date,away:next.awayTeam,home:next.homeTeam})}">${next.awayTeam} at ${next.homeTeam} (${next.date})</a>`:''} &nbsp; • &nbsp; <a href="playoff-picture.html">View playoff picture →</a></div>`;
    hero.insertAdjacentElement('afterend',box);built=true;return true;
  }finally{building=false}
}
let tries=0;const timer=setInterval(async()=>{tries++;if(await build()||tries>80)clearInterval(timer)},150);
})();
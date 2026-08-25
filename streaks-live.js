(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='streaks.html')return;
const root=document.getElementById('featureRoot');if(!root)return;
const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const get=async f=>{try{const r=await fetch(`${f}?v=${Date.now()}`,{cache:'no-store'});return r.ok?await r.json():null}catch{return null}};
const isFinal=g=>String(g?.actualAway??'').trim()!==''&&String(g?.actualHome??'').trim()!=='';
const dateNum=d=>{const n=Date.parse(String(d||''));return Number.isFinite(n)?n:0};
const fmt=d=>{if(!d)return'—';const n=dateNum(d);if(!n)return d;return new Date(n).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})};
function teamPill(name,map){const t=map.get(norm(name));const bg=t?.backgroundColor||'#222',fg=t?.textColor||'#fff';return `<a class="team-pill" style="--bg:${esc(bg)};--fg:${esc(fg)}" href="team.html?team=${encodeURIComponent(t?.team||name)}">${esc(name)}</a>`}
function baseState(team,x){const w=x?.currentWinStreak||{},l=x?.currentLossStreak||{};if(Number(w.length)>0)return{team,type:'W',len:Number(w.length),start:w.startDate||'',last:w.endDate||''};if(Number(l.length)>0)return{team,type:'L',len:Number(l.length),start:l.startDate||'',last:l.endDate||''};return{team,type:'',len:0,start:'',last:''}}
function applyResult(s,result,date){if(!result||dateNum(date)<=dateNum(s.last))return;if(s.type===result){s.len+=1}else{s.type=result;s.len=1;s.start=date}s.last=date}
function renderTable(title,rows,map,kind){const body=rows.length?rows.map((x,i)=>`<tr><td class="rank">${i+1}</td><td class="left">${teamPill(x.team,map)}</td><td><strong>${kind==='historic'?x.len:x.type+x.len}</strong></td><td>${fmt(x.start)}</td><td>${fmt(x.last)}</td></tr>`).join(''):`<tr><td colspan="5" class="empty">No ${title.toLowerCase()} of 2+ games right now.</td></tr>`;return `<h2 class="section-title">${title}</h2><div class="table-wrap"><table><thead><tr><th>#</th><th class="left">Team</th><th>${kind==='historic'?'Length':'Streak'}</th><th>Started</th><th>${kind==='historic'?'Ended':'Through'}</th></tr></thead><tbody>${body}</tbody></table></div>`}
async function run(){
  const [history,weekly,teams]=await Promise.all([get('streak-records.json'),get('weekly-simulation.json'),get('teams-data.json')]);
  if(!history||!teams){root.innerHTML='<div class="empty">Streak data could not be loaded.</div>';return}
  const teamMap=new Map((teams||[]).map(t=>[norm(t.team),t]));
  const states=new Map(Object.entries(history).map(([team,x])=>[norm(team),baseState(team,x)]));
  const games=(weekly?.games||[]).filter(isFinal).sort((a,b)=>dateNum(a.date)-dateNum(b.date));
  for(const g of games){const a=Number(g.actualAway),h=Number(g.actualHome);if(!Number.isFinite(a)||!Number.isFinite(h))continue;const ar=a>h?'W':a<h?'L':'T',hr=h>a?'W':h<a?'L':'T';for(const [team,res] of [[g.awayTeam,ar],[g.homeTeam,hr]]){const k=norm(team);if(!states.has(k))states.set(k,{team,type:'',len:0,start:'',last:''});applyResult(states.get(k),res,g.date)}}
  const all=[...states.values()];
  const wins=all.filter(x=>x.type==='W'&&x.len>=2).sort((a,b)=>b.len-a.len||a.team.localeCompare(b.team)).slice(0,30);
  const losses=all.filter(x=>x.type==='L'&&x.len>=2).sort((a,b)=>b.len-a.len||a.team.localeCompare(b.team)).slice(0,20);
  const historicWins=Object.entries(history).map(([team,x])=>({team,len:Number(x?.longestWinStreak?.length||0),start:x?.longestWinStreak?.startDate||'',last:x?.longestWinStreak?.endDate||''})).filter(x=>x.len>0).sort((a,b)=>b.len-a.len||a.team.localeCompare(b.team)).slice(0,30);
  const historicLosses=Object.entries(history).map(([team,x])=>({team,len:Number(x?.longestLossStreak?.length||0),start:x?.longestLossStreak?.startDate||'',last:x?.longestLossStreak?.endDate||''})).filter(x=>x.len>0).sort((a,b)=>b.len-a.len||a.team.localeCompare(b.team)).slice(0,30);
  root.innerHTML=`<div class="feature-note"><strong>Active means active across seasons.</strong> A streak does not reset just because a new season starts. Completed games newer than the streak database are added live, and the active lists below show streaks of at least two games.</div>${renderTable('Active Winning Streaks',wins,teamMap,'active')}${renderTable('Active Losing Streaks',losses,teamMap,'active')}${renderTable('Longest Winning Streaks in Database',historicWins,teamMap,'historic')}${renderTable('Longest Losing Streaks in Database',historicLosses,teamMap,'historic')}`;
}
run().catch(e=>{console.error(e);root.innerHTML='<div class="empty">Streak data could not be loaded.</div>'});
})();

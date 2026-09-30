(()=>{
'use strict';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const esc=v=>clean(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const TEAM_ALIASES={
  AMERICANLEADERSHIPACADEMY:'ALA',CEDARCITY:'CEDAR',GRAND:'GRANDCOUNTY',GUNNISON:'GUNNISONVALLEY',
  STJOSEPH:'SAINTJOSEPH',MONUMENTVAL:'MONUMENTVALLEY',UTAHMILITARYACADEMYCAMPWILLIAMS:'UMACAMPWILLIAMS',
  UMALEHI:'UMACAMPWILLIAMS',UTAHMILITARYACADEMYHILLFIELD:'UMAHILLFIELD',LAYTONCHRISTIAN:'LAYTONCHRISTIANACADEMY',
  AMERICANPREPARATORYACADEMYWESTVALLEY:'AMERICANPREPWV',MAESERPREPARATORYACADEMY:'MAESERPREPACADEMY'
};
const key=v=>TEAM_ALIASES[norm(v)]||norm(v);
const classRank={'6A':6,'5A':5,'4A':4,'3A':3,'2A':2,'1A':1};
let games=[],teams=[],teamMap=new Map(),footballBrands=new Map(),dates=[],selectedDate='';
function safeHex(v,f='#555555'){return /^#[0-9A-F]{6}$/i.test(clean(v))?clean(v):f}
function rgba(hex,a=.13){const h=safeHex(hex,'#555555').slice(1);return 'rgba('+parseInt(h.slice(0,2),16)+','+parseInt(h.slice(2,4),16)+','+parseInt(h.slice(4,6),16)+','+a+')'}
function statusKey(g){return clean(g?.status).toLowerCase()}
function hasScore(g){return Number.isFinite(Number(g?.homeScore))&&Number.isFinite(Number(g?.awayScore))}
function zeroZero(g){return hasScore(g)&&Number(g.homeScore)===0&&Number(g.awayScore)===0}
function isFinal(g){return ['final','completed'].includes(statusKey(g))&&hasScore(g)&&!zeroZero(g)}
function isLive(g){const s=statusKey(g);return !isFinal(g)&&(/live|in progress|quarter|q[1-4]|half|halftime|overtime|\bot\b/.test(s))&&hasScore(g)}
function teamRow(name){
  return teamMap.get(key(name))||null;
}
function brand(name){
  const k=key(name),fb=footballBrands.get(k),bb=window.RUSBasketballBracketBrands?.basketballBrands?.[k];
  return bb||fb||{backgroundColor:'#F14D07',textColor:'#000000'};
}
function logo(name){
  const row=teamRow(name);if(!row)return'';
  return window.RUSSchoolAssets?.logoUrl?.(row.team)||'';
}
function pageLink(name){
  const row=teamRow(name);return row?'boys-basketball-team.html?team='+encodeURIComponent(row.team):'';
}
function displayDate(v,long=true){
  const d=new Date(v+'T12:00:00');if(Number.isNaN(d.getTime()))return v;
  return new Intl.DateTimeFormat('en-US',long?{weekday:'long',month:'long',day:'numeric',year:'numeric'}:{month:'short',day:'numeric'}).format(d);
}
function localIso(){
  const d=new Date(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return d.getFullYear()+'-'+m+'-'+day;
}
function timeMinutes(v){
  const m=clean(v).match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);if(!m)return 9999;
  let h=Number(m[1]),min=Number(m[2]||0),amp=clean(m[3]).toUpperCase();if(amp==='PM'&&h!==12)h+=12;if(amp==='AM'&&h===12)h=0;return h*60+min;
}
function recordBefore(name,date){
  const k=key(name),r={w:0,l:0,t:0};
  for(const g of games){
    if(clean(g.date)>=date||!isFinal(g))continue;
    const hk=key(g.homeTeam),ak=key(g.awayTeam);if(hk!==k&&ak!==k)continue;
    const ours=hk===k?Number(g.homeScore):Number(g.awayScore),opp=hk===k?Number(g.awayScore):Number(g.homeScore);
    if(ours>opp)r.w++;else if(ours<opp)r.l++;else r.t++;
  }
  return r.t?r.w+'-'+r.l+'-'+r.t:r.w+'-'+r.l;
}
function filtersMatch(g){
  const team=$('teamFilter').value,cl=$('classFilter').value,region=$('regionFilter').value,rural=$('ruralOnly').checked;
  const h=teamRow(g.homeTeam),a=teamRow(g.awayTeam);
  if(team&&key(g.homeTeam)!==team&&key(g.awayTeam)!==team)return false;
  if(cl&&h?.classification!==cl&&a?.classification!==cl)return false;
  if(region&&h?.region!==region&&a?.region!==region)return false;
  if(rural){
    const hr=classRank[h?.classification]||99,ar=classRank[a?.classification]||99;
    if(hr>3&&ar>3)return false;
  }
  return true;
}
function matchingDates(){return [...new Set(games.filter(filtersMatch).map(g=>g.date).filter(Boolean))].sort()}
function findNextDate(from=localIso()){
  const ds=matchingDates();return ds.find(d=>d>=from)||ds[ds.length-1]||'';
}
function syncDate(date){
  if(!date)return;selectedDate=date;$('datePicker').value=date;render();
}
function populateFilters(){
  const activeTeams=[...new Map(games.flatMap(g=>[g.homeTeam,g.awayTeam]).filter(Boolean).map(n=>[key(n),teamRow(n)?.team||n])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  $('teamFilter').innerHTML='<option value="">All Teams</option>'+activeTeams.map(([k,n])=>'<option value="'+esc(k)+'">'+esc(n)+'</option>').join('');
  const classes=[...new Set(teams.map(t=>t.classification).filter(c=>classRank[c]))].sort((a,b)=>(classRank[b]||0)-(classRank[a]||0));
  $('classFilter').innerHTML='<option value="">All Classes</option>'+classes.map(c=>'<option>'+esc(c)+'</option>').join('');
  const regions=[...new Set(teams.map(t=>t.region).filter(r=>r&&!/independent/i.test(r)))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  $('regionFilter').innerHTML='<option value="">All Regions</option>'+regions.map(r=>'<option>'+esc(r)+'</option>').join('');
}
function teamMeta(name,date){
  const row=teamRow(name),rec=recordBefore(name,date);
  if(!row)return 'Opponent';
  return [row.classification,row.region,'Entering '+rec].filter(Boolean).join(' · ');
}
function scoreFor(g,side){if(!hasScore(g))return '—';return String(side==='home'?Number(g.homeScore):Number(g.awayScore))}
function statusBadge(g){
  if(isFinal(g))return '<span class="badge final">Final</span>';
  if(isLive(g))return '<span class="badge live">'+esc(g.status||'Live')+'</span>';
  if(statusKey(g)==='score not reported')return '<span class="badge">No score reported</span>';
  return '<span class="badge">Scheduled</span>';
}
function renderTeam(g,name,side){
  const b=brand(name),color=safeHex(b.backgroundColor,'#555555'),src=logo(name),href=pageLink(name);
  const nameHtml=href?'<a class="team-name" href="'+esc(href)+'">'+esc(name)+'</a>':'<span class="team-name">'+esc(name)+'</span>';
  const logoHtml=src?'<img class="team-logo" src="'+esc(src)+'" alt="'+esc(name)+' logo" onerror="this.style.display=\'none\'">':'';
  const score=(isFinal(g)||isLive(g))?scoreFor(g,side):'';
  return '<div class="team-row" style="--team-color:'+color+';--team-wash:'+rgba(color,.14)+'">'+
    '<div class="team-logo-wrap">'+logoHtml+'</div><div class="team-info">'+nameHtml+'<div class="team-meta">'+esc(teamMeta(name,g.date))+'</div></div>'+
    '<div class="score">'+esc(score)+'</div></div>';
}
function gameCard(g){
  const region=g.regionGame===true||['true','yes','region'].includes(statusKey({status:g.regionGame}));
  const time=clean(g.time)||'Time TBD',neutral=g.neutralSite===true?' · Neutral':'';
  const source=g.sourceUrl?'<a class="source-link" href="'+esc(g.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Source ↗</a>':'';
  return '<article class="game"><div class="game-top"><span class="time">'+esc(time+neutral)+'</span><div class="badges">'+
    (region?'<span class="badge region">Region</span>':'')+statusBadge(g)+'</div></div>'+
    renderTeam(g,g.awayTeam,'away')+renderTeam(g,g.homeTeam,'home')+
    '<div class="game-foot"><span class="game-status">'+esc(isFinal(g)?'Completed':isLive(g)?'In progress':statusKey(g)==='score not reported'?'Result not reported':'Upcoming')+'</span>'+source+'</div></article>';
}
function render(){
  if(!selectedDate)return;
  const rows=games.filter(g=>g.date===selectedDate&&filtersMatch(g)).sort((a,b)=>timeMinutes(a.time)-timeMinutes(b.time)||clean(a.awayTeam).localeCompare(clean(b.awayTeam)));
  $('dateHeading').textContent=displayDate(selectedDate);
  $('dayMeta').textContent=rows.length+' game'+(rows.length===1?'':'s')+' after filters';
  $('heroGameCount').textContent=rows.length;
  $('scheduledCount').textContent=rows.filter(g=>!isFinal(g)&&!isLive(g)).length;
  $('liveCount').textContent=rows.filter(isLive).length;
  $('finalCount').textContent=rows.filter(isFinal).length;
  $('regionCount').textContent=rows.filter(g=>g.regionGame===true||['true','yes','region'].includes(clean(g.regionGame).toLowerCase())).length;
  $('games').innerHTML=rows.length?rows.map(gameCard).join(''):'<div class="empty"><strong>No matching games</strong>Try another date or clear one of the filters.</div>';
  const ds=matchingDates(),i=ds.indexOf(selectedDate);$('prevGameDate').disabled=i<=0;$('nextGameDate').disabled=i<0||i>=ds.length-1;
}
function wire(){
  $('datePicker').onchange=()=>syncDate($('datePicker').value);
  $('todayButton').onclick=()=>syncDate(localIso());
  $('nextGamesButton').onclick=()=>{const d=findNextDate(localIso());if(d)syncDate(d)};
  $('prevGameDate').onclick=()=>{const ds=matchingDates(),i=ds.indexOf(selectedDate);if(i>0)syncDate(ds[i-1])};
  $('nextGameDate').onclick=()=>{const ds=matchingDates(),i=ds.indexOf(selectedDate);if(i>=0&&i<ds.length-1)syncDate(ds[i+1]);else{const d=ds.find(x=>x>selectedDate);if(d)syncDate(d)}};
  for(const id of ['teamFilter','classFilter','regionFilter','ruralOnly'])$(id).onchange=()=>{const ds=matchingDates();if(!ds.includes(selectedDate)){const d=ds.find(x=>x>=selectedDate)||ds[0];if(d){selectedDate=d;$('datePicker').value=d}}render()};
  $('clearFilters').onclick=()=>{$('teamFilter').value='';$('classFilter').value='';$('regionFilter').value='';$('ruralOnly').checked=false;const d=findNextDate(localIso());if(d)syncDate(d);else render()};
}
async function init(){
  try{
    await window.RUSSchoolAssets?.load?.();
    const [gr,tr,fr]=await Promise.all([
      fetch('boys-basketball-games-2026-27.json?v='+Date.now(),{cache:'no-store'}),
      fetch('boys-basketball-teams.json?v=20260930-scoreboard1',{cache:'no-store'}),
      fetch('teams-data.json?v=20260930-scoreboard1',{cache:'no-store'})
    ]);
    if(!gr.ok||!tr.ok)throw new Error('Basketball scoreboard data unavailable');
    const data=await gr.json();teams=await tr.json();const fb=fr.ok?await fr.json():[];
    games=Array.isArray(data.games)?data.games:[];teamMap=new Map(teams.map(t=>[key(t.team),t]));
    footballBrands=new Map((fb||[]).map(t=>[key(t.team),{backgroundColor:t.backgroundColor,textColor:t.textColor}]));
    dates=[...new Set(games.map(g=>g.date).filter(Boolean))].sort();populateFilters();wire();
    if(dates.length){$('datePicker').min=dates[0];$('datePicker').max=dates[dates.length-1]}
    selectedDate=findNextDate(localIso())||dates[0]||localIso();$('datePicker').value=selectedDate;render();
  }catch(e){
    console.error(e);$('dateHeading').textContent='Unable to load';$('games').innerHTML='<div class="empty"><strong>Basketball scoreboard unavailable</strong>The current basketball schedule data could not be loaded.</div>';
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
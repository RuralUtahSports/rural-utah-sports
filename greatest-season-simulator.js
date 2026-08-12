let greatestSeasons=[];
let greatestSeasonColors={};

const gsClean=v=>String(v??'').trim();
const gsEsc=v=>gsClean(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const gsNorm=v=>gsClean(v).toUpperCase().replace(/[’']/g,'').replace(/[.,]/g,'').replace(/\s+/g,' ').trim();
const gsColorKey=v=>gsClean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const gsNum=(row,key)=>{const x=Number(row?.[key]);return Number.isFinite(x)?x:0};
const gsHex=(v,f)=>/^#[0-9A-F]{6}$/i.test(gsClean(v))?gsClean(v):f;

function gsStats(row){
  return{
    team:gsNorm(row['Team']),season:String(row['Year']??''),rank:gsNum(row,'Rank'),rating:gsNum(row,'Rating'),
    wins:gsNum(row,'Wins'),losses:gsNum(row,'Losses'),ties:gsNum(row,'Ties'),winPct:gsNum(row,'Win %'),games:gsNum(row,'Games'),
    pointsFor:gsNum(row,'Points For'),pointsAgainst:gsNum(row,'Points Against'),ppg:gsNum(row,'PPG'),papg:gsNum(row,'PAPG'),
    avgMargin:gsNum(row,'Avg Margin'),opponentWinPct:gsNum(row,'Opponent Win %'),opponentsOpponentsWinPct:gsNum(row,"Opponents' Opponent Win %"),sos:gsNum(row,'SOS')
  };
}
function gsStrength(s){return s.rating*.50+s.avgMargin*.18+s.ppg*.10+(50-s.papg)*.10+s.sos*.07+s.opponentWinPct*10*.03}
function gsProbability(a,b){let p=1/(1+Math.exp(-(a-b)/5));return Math.max(.08,Math.min(.92,p))}
function gsRandom(min,max){return Math.random()*(max-min)+min}
function gsNormal(mean,sd){let u=0,v=0;while(u===0)u=Math.random();while(v===0)v=Math.random();const z=Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);return mean+z*sd}
function gsGame(a,b,sa,sb){
  const p=gsProbability(sa,sb),winner=Math.random()<p?1:2;
  let score1=(a.ppg+b.papg)/2,score2=(b.ppg+a.papg)/2;
  const d=sa-sb;score1+=d*.12;score2-=d*.12;score1+=gsNormal(0,6);score2+=gsNormal(0,6);
  if(winner===1)score1+=gsRandom(2,7);else score2+=gsRandom(2,7);
  score1=Math.max(0,Math.round(score1));score2=Math.max(0,Math.round(score2));
  if(winner===1&&score1<=score2)score1=score2+1;if(winner===2&&score2<=score1)score2=score1+1;
  return{score1,score2,winner:score1>score2?1:2};
}
function gsRecord(s){return s.ties?`${s.wins}-${s.losses}-${s.ties}`:`${s.wins}-${s.losses}`}
function gsColors(team){const c=greatestSeasonColors[gsColorKey(team)]||{};return{bg:gsHex(c.background,'#222222'),text:gsHex(c.text,'#FFFFFF')}}
function gsSeasonBox(s){const c=gsColors(s.team);return `<div class="gs-season-box" style="background:${c.bg};color:${c.text}"><div class="gs-season-team">${gsEsc(s.team)}</div><div class="gs-season-year">${gsEsc(s.season)}</div><div class="gs-season-record">${gsRecord(s)} • Rating ${s.rating.toFixed(1)}</div></div>`}
function gsTeamOptions(){return[...new Set(greatestSeasons.map(x=>gsNorm(x['Team'])).filter(Boolean))].sort((a,b)=>a.localeCompare(b))}
function gsSeasonsFor(team){return greatestSeasons.filter(x=>gsNorm(x['Team'])===gsNorm(team)).map(x=>String(x['Year']??'')).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>Number(b)-Number(a))}
function gsFind(team,year){const row=greatestSeasons.find(x=>gsNorm(x['Team'])===gsNorm(team)&&String(x['Year']??'')===String(year));return row?gsStats(row):null}
function gsFillSeason(teamId,seasonId,preserve){const team=document.getElementById(teamId)?.value||'',sel=document.getElementById(seasonId);if(!sel)return;const old=preserve?sel.value:'';const years=gsSeasonsFor(team);sel.innerHTML=years.map(y=>`<option value="${gsEsc(y)}">${gsEsc(y)}</option>`).join('');if(old&&years.includes(old))sel.value=old}

function renderGreatestSeasonSimulator(){
  const root=document.getElementById('greatestContent');if(!root)return;
  const teams=gsTeamOptions(),opts=teams.map(t=>`<option value="${gsEsc(t)}">${gsEsc(t)}</option>`).join('');
  root.className='';root.innerHTML=`<div class="card gs-picker"><div class="gs-grid"><div class="field"><label>Team 1</label><select id="gsTeam1">${opts}</select></div><div class="field"><label>Season 1</label><select id="gsSeason1"></select></div><div class="vs gs-vs">VS</div><div class="field"><label>Team 2</label><select id="gsTeam2">${opts}</select></div><div class="field"><label>Season 2</label><select id="gsSeason2"></select></div><div class="field"><label>Series Length</label><select id="gsLength"><option value="3">3 Games</option><option value="5">5 Games</option><option value="7">7 Games</option><option value="10">10 Games</option></select></div><div class="gs-action-wrap" style="grid-column:1/-1"><button class="action" id="gsSimulate" style="width:100%">Simulate Series</button></div></div><div id="gsMessage" class="message"></div></div><div id="gsResults"></div>`;
  const top=[...greatestSeasons].sort((a,b)=>gsNum(a,'Rank')-gsNum(b,'Rank'));
  const a=top[0],b=top.find(x=>gsNorm(x['Team'])!==gsNorm(a?.['Team'])||String(x['Year'])!==String(a?.['Year']))||top[1];
  if(a){document.getElementById('gsTeam1').value=gsNorm(a['Team']);gsFillSeason('gsTeam1','gsSeason1',false);document.getElementById('gsSeason1').value=String(a['Year'])}
  if(b){document.getElementById('gsTeam2').value=gsNorm(b['Team']);gsFillSeason('gsTeam2','gsSeason2',false);document.getElementById('gsSeason2').value=String(b['Year'])}
  document.getElementById('gsTeam1').onchange=()=>gsFillSeason('gsTeam1','gsSeason1',false);
  document.getElementById('gsTeam2').onchange=()=>gsFillSeason('gsTeam2','gsSeason2',false);
  document.getElementById('gsSimulate').onclick=simulateGreatestSeasonWebsiteSeries;
}

function simulateGreatestSeasonWebsiteSeries(){
  const t1=document.getElementById('gsTeam1').value,y1=document.getElementById('gsSeason1').value,t2=document.getElementById('gsTeam2').value,y2=document.getElementById('gsSeason2').value,len=Number(document.getElementById('gsLength').value),msg=document.getElementById('gsMessage');
  if(t1===t2&&y1===y2){msg.textContent='Choose two different historical seasons.';return}msg.textContent='';
  const a=gsFind(t1,y1),b=gsFind(t2,y2);if(!a||!b){msg.textContent='One of those historical seasons could not be found.';return}
  const sa=gsStrength(a),sb=gsStrength(b),p1=gsProbability(sa,sb),p2=1-p1,winsNeeded=len===3?2:len===5?3:len===7?4:null;
  let w1=0,w2=0;const games=[];
  for(let i=1;i<=len;i++){const g=gsGame(a,b,sa,sb);if(g.winner===1)w1++;else w2++;games.push({...g,game:i});if(winsNeeded!==null&&(w1>=winsNeeded||w2>=winsNeeded))break}
  const avg1=games.reduce((s,g)=>s+g.score1,0)/games.length,avg2=games.reduce((s,g)=>s+g.score2,0)/games.length,seriesWinner=w1===w2?'TIE':w1>w2?a.team:b.team;
  const rows=games.map(g=>{const c1=g.score1>g.score2?'gs-winner-score':'',c2=g.score2>g.score1?'gs-winner-score':'',winner=g.winner===1?a.team:b.team,wc=gsColors(winner);return `<tr><td>${g.game}</td><td class="${c1}">${g.score1}</td><td class="${c2}">${g.score2}</td><td><span class="team-pill" style="background:${wc.bg};color:${wc.text}">${gsEsc(winner)}</span></td></tr>`}).join('');
  const comp=[['Rank',a.rank,b.rank],['Record',gsRecord(a),gsRecord(b)],['Rating',a.rating.toFixed(2),b.rating.toFixed(2)],['Win %',(a.winPct*100).toFixed(1)+'%',(b.winPct*100).toFixed(1)+'%'],['PPG',a.ppg.toFixed(2),b.ppg.toFixed(2)],['PAPG',a.papg.toFixed(2),b.papg.toFixed(2)],['Avg Margin',a.avgMargin.toFixed(2),b.avgMargin.toFixed(2)],['Opponent Win %',(a.opponentWinPct*100).toFixed(1)+'%',(b.opponentWinPct*100).toFixed(1)+'%'],['SOS',a.sos.toFixed(3),b.sos.toFixed(3)],['Model Strength',sa.toFixed(2),sb.toFixed(2)]];
  document.getElementById('gsResults').innerHTML=`<div class="gs-series-summary">${gsSeasonBox(a)}<div class="gs-center"><div class="gs-center-label">Win Probability</div><div class="gs-center-value">${(p1*100).toFixed(1)}% – ${(p2*100).toFixed(1)}%</div><div class="gs-center-label" style="margin-top:8px">${games.length}-game result</div></div>${gsSeasonBox(b)}</div><div class="card prob-card"><div class="prob-head"><span>${gsEsc(a.team)} ${a.season} ${(p1*100).toFixed(1)}%</span><span>${(p2*100).toFixed(1)}% ${gsEsc(b.team)} ${b.season}</span></div><div class="prob-track"><div class="prob-one" style="width:${p1*100}%">${p1>=.18?(p1*100).toFixed(1)+'%':''}</div><div class="prob-two" style="width:${p2*100}%">${p2>=.18?(p2*100).toFixed(1)+'%':''}</div></div></div><h3 class="section-title">Series Results</h3><div class="table-wrap"><table><thead><tr><th>Game</th><th>${gsEsc(a.team)} ${a.season}</th><th>${gsEsc(b.team)} ${b.season}</th><th>Winner</th></tr></thead><tbody>${rows}<tr><td class="gs-average">Average Score</td><td class="gs-average">${avg1.toFixed(1)}</td><td class="gs-average">${avg2.toFixed(1)}</td><td></td></tr></tbody></table></div><div class="card gs-result-card"><div class="gs-result-title">Series Winner</div><div class="gs-result-winner">${gsEsc(seriesWinner)}</div><div class="gs-result-score">${gsEsc(a.team)} ${w1} – ${w2} ${gsEsc(b.team)}</div></div><h3 class="section-title">Season Comparison</h3><div class="table-wrap"><table><thead><tr><th>Stat</th><th>${gsEsc(a.team)} ${a.season}</th><th>${gsEsc(b.team)} ${b.season}</th></tr></thead><tbody>${comp.map(r=>`<tr><td class="left muted">${r[0]}</td><td class="stat-team">${r[1]}</td><td class="stat-team">${r[2]}</td></tr>`).join('')}</tbody></table></div><p class="gs-note">This uses the same Greatest Season Matchup model as the master sheet: 50% rating, 18% average margin, 10% offense, 10% defense, 7% SOS, and 3% opponent win percentage. Win probability is capped between 8% and 92% so upsets remain possible. Re-running the series can produce different results.</p>`;
}

async function loadGreatestSeasonSimulator(){
  try{
    const stamp=Date.now(),[s,c]=await Promise.all([fetch('greatest-seasons-data-v2.json?v='+stamp,{cache:'no-store'}),fetch('team-colors-exact.json?v='+stamp,{cache:'no-store'})]);
    if(!s.ok)throw new Error('Greatest Seasons data unavailable');greatestSeasons=await s.json();
    if(c.ok){const colors=await c.json();for(const x of colors){greatestSeasonColors[gsColorKey(x.team)]={background:x.backgroundColor,text:x.textColor}}}
    renderGreatestSeasonSimulator();
  }catch(e){console.error(e);const root=document.getElementById('greatestContent');if(root)root.innerHTML='<div class="error">Greatest Season matchup data could not be loaded.</div>'}
}

document.addEventListener('DOMContentLoaded',loadGreatestSeasonSimulator);
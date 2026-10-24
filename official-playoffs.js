(() => {
'use strict';
const host=document.getElementById('rusOfficialPlayoffs');
if(!host)return;
const ORDER=['8-Player','1A','2A','3A','4A','5A','6A'];
const home=host.dataset.mode==='home';
let selected='8-Player', manuallySelected=false, lastPayload='', inFlight=false, currentData=null, predictionMap=new Map();
const assets=window.RUSOfficialBracketTeamAssets;
const teamAsset=name=>assets?.resolve(name)||{logo:'',backgroundColor:'#303030',textColor:'#fff',known:false};
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const getName=t=>typeof t==='string'?t:(t?.name||t?.team||'');
const isOfficial=c=>c?.status==='official'&&Array.isArray(c.rounds)&&c.rounds.length>0;
const isPartial=c=>c?.status==='partial'&&Array.isArray(c.rounds)&&c.rounds.length>0;
const isPublished=c=>isOfficial(c)||isPartial(c);
const nameKey=value=>{
 const resolved=assets?.resolve(value);
 return String(resolved?.key||value||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
};
const monthNum={JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12'};
function dateKey(value){
 const v=String(value||'').trim();
 let m=v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 if(m)return m[3]+'-'+m[1].padStart(2,'0')+'-'+m[2].padStart(2,'0');
 m=v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if(m)return v;
 m=v.match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})/);
 if(m&&monthNum[m[1].toUpperCase()])return m[3]+'-'+monthNum[m[1].toUpperCase()]+'-'+m[2].padStart(2,'0');
 return '';
}
function predictionKey(date,home,away){return dateKey(date)+'|'+nameKey(home)+'|'+nameKey(away)}
function isFinalGame(g){
 const scores=[g?.a?.score,g?.b?.score];
 return scores.every(v=>v!==undefined&&v!==null&&v!==''&&Number.isFinite(Number(v)))
   &&(g?.a?.winner===true||g?.b?.winner===true||/^final\b/i.test(String(g?.note||'')));
}
function gameLine(g){
 if(isFinalGame(g))return '';
 const a=getName(g?.a),b=getName(g?.b);
 // No projected opponent, no line. BYE does not count as a played game.
 if(!g?.a?.seed||!g?.b?.seed||!a||!b)return '';
 const prediction=predictionMap.get(predictionKey(g.date,a,b));
 if(!prediction)return '';
 const home=Number(prediction.homeScore),away=Number(prediction.awayScore);
 if(!Number.isFinite(home)||!Number.isFinite(away))return '';
 const favorite=home===away?'Pick’em':home>away?a:b;
 const spread=home===away?'PK':favorite+' -'+Math.abs(home-away);
 const total=home+away;
 return '<div class="rus-o-projection"><b>RUS LINE:</b> '+esc(spread)+' <span>·</span> <b>O/U:</b> '+esc(total)+'<small>RUS model projection · Not a final score</small></div>';
}
function loadPredictions(payload){
 const next=new Map();
 for(const p of payload?.games||[]){
  if(!p?.homeTeam||!p?.awayTeam)continue;
  const key=predictionKey(p.date,p.homeTeam,p.awayTeam);
  if(key&&key[0]!=='|')next.set(key,p);
 }
 predictionMap=next;
}

function team(t,isFinal=false){
  const name=getName(t),seed=t&&typeof t==='object'&&Number.isFinite(Number(t.seed))&&String(t.seed).trim()!==''?'#'+esc(t.seed):'';
  const display=name||'TBD',isBye=/^bye$/i.test(display);
  const known=!!name&&!/^(?:TBD|Bye|Winner of |Semifinal |Quarterfinal )/i.test(name);
  const colors=known?teamAsset(name):{logo:'',backgroundColor:'#303030',textColor:'#fff',known:false};
  const real=known&&colors.known;
  const isWinner=isFinal&&t?.winner===true;
  const cls='rus-o-team'+(isBye?' rus-o-bye':'')+(isWinner?' rus-o-win':'')+(real?' rus-o-real-team':'');
  const style=real?' style="--team-bg:'+colors.backgroundColor+';--team-ink:'+colors.textColor+'"':'';
  const logo=colors.logo&&known?'<span class="rus-o-logo-shell" data-team-key="'+esc(colors.key||'')+'"><img class="rus-o-logo" src="'+esc(colors.logo)+'" alt="'+esc(name)+' school logo" loading="lazy" decoding="async" width="48" height="48"></span>':'';
  const score=t&&typeof t==='object'&&t.score!==undefined&&t.score!==null?'<span class="rus-o-score">'+esc(t.score)+'</span>':'';
  const nameAndBadge='<span class="rus-o-team-details"><span class="rus-o-name">'+esc(display)+'</span>'+(isWinner?'<span class="rus-o-winner-label" aria-label="Winning team">✓ WINNER</span>':'')+'</span>';
  return '<div class="'+cls+'"'+style+'><span class="rus-o-seed">'+seed+'</span>'+logo+nameAndBadge+score+'</div>';
}
function game(g){
  const a=g?.a??null,b=g?.b??null,isFinal=isFinalGame(g);
  const schedule=[
    isFinal?'<strong class="rus-o-final">FINAL</strong>':'',
    g?.date?'<span><b>Date:</b> '+esc(g.date)+'</span>':'',
    g?.time?'<span><b>Kickoff:</b> '+esc(g.time)+'</span>':'',
    (g?.venue||g?.location)?'<span><b>Location:</b> '+esc(g.venue||g.location)+'</span>':'',
    g?.note&&!isFinal?'<span>'+esc(g.note)+'</span>':''
  ].filter(Boolean).join(' <span aria-hidden="true">·</span> ');
  return '<div class="rus-o-game'+(isFinal?' is-final':'')+'">'+team(a,isFinal)+team(b,isFinal)+gameLine(g)+(schedule?'<div class="rus-o-gamemeta">'+schedule+'</div>':'')+'</div>';
}
function draw(data){
  currentData=data;
  const classes=data.classifications||{},confirmed=ORDER.filter(c=>isOfficial(classes[c]));
  const partial=ORDER.filter(c=>isPartial(classes[c])),published=ORDER.filter(c=>isPublished(classes[c]));
  if(!manuallySelected&&published.length)selected=published[0];
  const current=classes[selected]||{},ready=isPublished(current);
  let html='<div class="rus-o-top"><div><div class="rus-o-eyebrow">2026 Utah High School Football</div><h2>Official State Playoff Brackets</h2><p class="rus-o-desc">UHSAA matchups, seeds and first-round byes, added as each classification is announced.</p></div>';
  if(home)html+='<a class="rus-o-cta" href="official-playoffs.html">Full Brackets →</a>';
  html+='</div><div class="rus-o-progress"><span><strong>'+confirmed.length+' of 7 classifications fully posted</strong>'+(partial.length?' · '+partial.length+' partially posted':'')+' · '+(confirmed.length===7?'All official brackets posted':published.length?'Bracket reveal in progress':'Awaiting official bracket reveal')+'</span><button type="button" class="rus-o-refresh" aria-label="Refresh bracket scores now">↻ Refresh Scores</button></div>';
  html+='<div class="rus-o-tabs" role="group" aria-label="Choose football classification">'+ORDER.map(c=>'<button type="button" class="rus-o-tab'+(isPublished(classes[c])?'':' is-waiting')+'" data-class="'+esc(c)+'" aria-pressed="'+(selected===c?'true':'false')+'">'+esc(c)+'<small>'+(isOfficial(classes[c])?'OFFICIAL':isPartial(classes[c])?'PARTIAL':'AWAITING')+'</small></button>').join('')+'</div>';
  if(ready){
    const rounds=current.rounds.filter(r=>Array.isArray(r.games)&&r.games.length);
    html+='<div class="rus-o-status"><b>'+esc(selected)+(isPartial(current)?' bracket · Partial reveal':' official bracket')+'</b> · Scroll sideways to view every published round. Matchups marked TBD have not been established.</div>';
    html+='<div class="rus-o-actions"><button type="button" class="rus-o-share" data-official-share="'+esc(selected)+'" aria-label="Create a shareable '+esc(selected)+' official playoff bracket graphic">Share Graphic ↗</button><span>Download or share an Instagram-ready playoff graphic</span></div>';
    html+='<div class="rus-o-scroll" tabindex="0" aria-label="'+esc(selected)+' official playoff bracket"><div class="rus-o-rounds">'+rounds.map(r=>'<div class="rus-o-round"><h3>'+esc(r.name||r.label||'Round')+'</h3><div class="rus-o-games">'+r.games.map(game).join('')+'</div></div>').join('')+'</div></div>';
  }else{
    html+='<div class="rus-o-waiting"><strong>'+esc(selected)+' bracket has not been posted yet.</strong>We will show verified seeds, matchups and byes here after the official reveal.</div>';
  }
  html+='<p class="rus-o-foot">Bracket information transcribed from MaxPreps / UHSAA. Check the official source for subsequent changes. '+(current.sourceUrl&&/^https:\/\//.test(current.sourceUrl)?'<a href="'+esc(current.sourceUrl)+'" target="_blank" rel="noopener noreferrer">View '+esc(selected)+' source</a>. ':'')+(data.updatedAt?'RUS update: '+esc(new Date(data.updatedAt).toLocaleString('en-US',{timeZone:'America/Denver',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}))+'. ':'')+'<a href="https://uhsaa.org/football-rpi/" target="_blank" rel="noopener noreferrer">UHSAA football RPI</a> · <a href="playoff-picture.html">Previous RUS projections</a>.</p>';
  host.innerHTML=html;
  host.querySelectorAll('[data-class]').forEach(btn=>btn.addEventListener('click',()=>{selected=btn.dataset.class;manuallySelected=true;draw(data)}));
  host.querySelector('.rus-o-refresh')?.addEventListener('click',()=>refresh());
  host.querySelectorAll('img.rus-o-logo').forEach(img=>img.addEventListener('error',()=>{
    const shell=img.closest('.rus-o-logo-shell');
    if(shell)shell.remove();else img.remove();
  }));
}
const PRIMARY_BRACKETS='official-brackets-2026.json';
const REPO_BRACKETS='https://raw.githubusercontent.com/RuralUtahSports/rural-utah-sports/main/official-brackets-2026.json';
async function fetchFreshBrackets(url){
 const separator=url.includes('?')?'&':'?';
 const response=await fetch(url+separator+'v='+Date.now(),{cache:'no-store'});
 if(!response.ok)throw new Error('HTTP '+response.status);
 const data=await response.json();
 if(!data?.classifications||!data.classifications['8-Player']?.rounds)throw new Error('Invalid bracket data');
 return data;
}
async function refresh(){
 if(inFlight)return;
 inFlight=true;
 try{
  // Pages/CDNs can lag behind the latest GitHub commit. Compare both sources
  // and display the newest verified bracket feed rather than a stale site copy.
  const outcomes=await Promise.allSettled([
   fetchFreshBrackets(PRIMARY_BRACKETS),
   fetchFreshBrackets(REPO_BRACKETS)
  ]);
  const available=outcomes.filter(x=>x.status==='fulfilled').map(x=>x.value);
  if(!available.length)throw new Error('All bracket sources unavailable');
  available.sort((a,b)=>(Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0));
  const d=available[0];
  window.RUSOfficialBracketsLatest=d;
  let forecast={games:[]};
  try{const pr=await fetch('playoff-predictions-2026.json?v='+Date.now(),{cache:'no-store'});if(pr.ok)forecast=await pr.json()}catch(e){console.warn('RUS playoff projections unavailable',e)}
  loadPredictions(forecast);
  const body=JSON.stringify(d)+'|'+JSON.stringify(forecast);
  if(body!==lastPayload){lastPayload=body;draw(d);}
 }catch(e){
  console.warn('RUS playoff brackets refresh failed',e);
  if(!lastPayload)host.innerHTML='<div class="rus-o-error">The official bracket feed is temporarily unavailable. Please reload the page.</div>';
 }finally{inFlight=false;}
}
refresh();
assets?.ready.then(()=>{if(currentData)draw(currentData)});
setInterval(()=>{if(!document.hidden)refresh()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
window.addEventListener('pageshow',()=>{if(!document.hidden)refresh()});
})();
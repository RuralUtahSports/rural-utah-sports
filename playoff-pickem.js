(() => {
'use strict';
const root=document.getElementById('rusBracketPickem');
if(!root)return;
const ORDER=['8-Player','1A','2A','3A','4A','5A','6A'];
const STORAGE='rus-2026-playoff-pickem-v1';
const assets=window.RUSOfficialBracketTeamAssets;
const escapeHTML=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const isBye=t=>/^bye$/i.test(t?.name||'');
const isPlaceholder=t=>/^(?:Winner of|Semifinal|Quarterfinal|TBD)/i.test(t?.name||'');
let defs={},selected='8-Player',picks={},shared=false,notice='';
const API='https://pleggeciqvaoyxtuvczd.supabase.co/functions/v1/playoff-pickem';
const NAME_KEY='rus-2026-playoff-fan-name',TOKEN_KEY='rus-2026-playoff-fan-token';
let leaderboardRows=[],leaderboardStatus='Loading fan standings…',participantCount=0,deadlines={},submitWorking=false;
let publicViewer=null,publicSequence=0,publicScrollLock='',publicCached=new Map();
function team(t){
 if(!t||!t.name||isBye(t)||isPlaceholder(t))return null;
 return {id:String(t.seed||t.name),name:t.name,seed:t.seed||null};
}
function entry(t){return isBye(t)?{type:'bye'}:team(t)?{type:'team',value:team(t)}:{type:'unresolved',label:t?.name||'TBD'};}
function preliminarySource(t,first){
 if(!t?.name||!isPlaceholder(t))return entry(t);
 const label=t.name;
 const opening=label.match(/opening matchup\s*(\d+)/i);
 if(opening&&first[Number(opening[1])-1])return {type:'game',id:first[Number(opening[1])-1].id};
 const numbers=[...label.matchAll(/#(\d+)/g)].map(m=>String(Number(m[1])));
 if(numbers.length>=2){
  const match=first.find(g=>[g.a,g.b].every(s=>s.type==='team')&&
   [g.a.value.seed,g.b.value.seed].map(String).sort().join(':')===numbers.slice(0,2).sort().join(':'));
  if(match)return {type:'game',id:match.id};
 }
 return {type:'unresolved',label:label};
}
function buildClass(raw){
 const rounds=raw?.rounds||[];
 if(rounds.length<4)throw Error('Incomplete official rounds');
 const first=rounds[0].games.map((g,i)=>({id:'R0-'+i,round:0,a:entry(g.a),b:entry(g.b),date:g.date||'',auto:isBye(g.a)||isBye(g.b)}));
 const quarter=rounds[1].games.map((g,i)=>({id:'QF-'+i,round:1,a:preliminarySource(g.a,first),b:preliminarySource(g.b,first),date:g.date||''}));
 const semifinal=rounds[2].games.map((g,i)=>({id:'SF-'+i,round:2,a:{type:'game',id:quarter[i*2]?.id},b:{type:'game',id:quarter[i*2+1]?.id},date:g.date||''}));
 const final=rounds[3].games.map((g,i)=>({id:'F-'+i,round:3,a:{type:'game',id:semifinal[i*2]?.id},b:{type:'game',id:semifinal[i*2+1]?.id},date:g.date||''}));
 return [...first,...quarter,...semifinal,...final];
}
function resolve(source,winners){
 if(source?.type==='team')return source.value;
 if(source?.type==='game')return winners[source.id]||null;
 return null;
}
function calculate(cls,sourcePicks=picks){
 const winners={},games=[],kept={};
 for(const def of defs[cls]||[]){
  const a=resolve(def.a,winners),b=resolve(def.b,winners);
  const key=cls+'|'+def.id,choice=sourcePicks[key],eligible=a&&b;
  let winner=null;
  if(def.auto)winner=a||b;
  else if(eligible&&choice&&(choice===a.id||choice===b.id)){winner=choice===a.id?a:b;kept[key]=choice;}
  winners[def.id]=winner;
  games.push({...def,a,b,winner,chosen:!!winner&&!def.auto,enabled:!!eligible&&!def.auto});
 }
 return {games,winners,kept,complete:games.filter(g=>g.chosen).length,total:games.filter(g=>!g.auto).length,champion:games[games.length-1]?.winner||null};
}
function sanitizeClass(cls){
 const {kept}=calculate(cls);
 for(const k of Object.keys(picks))if(k.startsWith(cls+'|')&&!(k in kept))delete picks[k];
}
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(picks))}catch(e){console.warn('Local picks could not be saved',e)}}
function load(){
 try{const old=JSON.parse(localStorage.getItem(STORAGE)||'{}');if(old&&typeof old==='object'&&!Array.isArray(old))picks=old;}catch(e){picks={}}
 const param=new URLSearchParams(location.search).get('p');
 if(param!==null&&/^[\d.]*$/.test(param)&&param.length<1300){
  const values=param.split('.'),keys=ORDER.flatMap(cls=>(defs[cls]||[]).map(g=>cls+'|'+g.id));
  if(values.length===keys.length){
   picks={};keys.forEach((key,i)=>{if(/^\d{1,3}$/.test(values[i]))picks[key]=values[i]});shared=true;notice='You are viewing a shared bracket. Change any pick to make your own version.';
  }
 }
 ORDER.forEach(sanitizeClass);
 const hash=decodeURIComponent(location.hash.slice(1));
 if(ORDER.includes(hash))selected=hash;
}
function asset(teamData){
 if(!teamData)return {logo:'',backgroundColor:'#272727',textColor:'#fff'};
 return assets?.resolve(teamData.name)||{logo:'',backgroundColor:'#272727',textColor:'#fff'};
}
function side(teamData,game,slot){
 const assigned=teamData&&game.enabled&&!classLocked(selected);
 const pick=Boolean(teamData&&game.winner?.id===teamData.id);
 const brand=asset(teamData);
 const safeColor=/^#[0-9a-f]{6}$/i.test(brand.backgroundColor)?brand.backgroundColor:'#292929';
 const safeInk=/^#[0-9a-f]{6}$/i.test(brand.textColor)?brand.textColor:'#fff';
 const text=teamData?teamData.name:(game.round===0?'BYE':'Awaiting previous winner');
 const logo=teamData&&brand.logo?'<img loading="lazy" decoding="async" alt="" src="'+escapeHTML(brand.logo)+'" onerror="this.style.display=\'none\'">':'';
 return '<button type="button" class="rus-pick-team'+(pick?' is-picked':'')+'"'+(assigned?' data-game="'+escapeHTML(game.id)+'" data-team="'+escapeHTML(teamData.id)+'"':' disabled')+
  ' style="--pick-bg:'+safeColor+';--pick-ink:'+safeInk+'" aria-pressed="'+(pick?'true':'false')+'">'+
  '<span class="rus-pick-seed">'+(teamData?.seed?'#'+escapeHTML(teamData.seed):'—')+'</span>'+logo+
  '<span class="rus-pick-name">'+escapeHTML(text)+'</span><span class="rus-pick-mark">'+(pick?'✓':'')+'</span></button>';
}
function renderGame(g){
 if(g.auto)return '<div class="rus-pick-game rus-pick-bye"><small>FIRST-ROUND BYE</small><strong>'+escapeHTML((g.a||g.b)?.name||'TBD')+'</strong><span>Automatically advances</span></div>';
 return '<div class="rus-pick-game"><div class="rus-pick-game-top"><span>'+escapeHTML(g.date||'Playoff matchup')+'</span><span>'+(g.chosen?'PICKED':g.enabled?'PICK A WINNER':'PENDING')+'</span></div>'+
 side(g.a,g,'a')+side(g.b,g,'b')+'</div>';
}
function draw(){
 const results=Object.fromEntries(ORDER.map(c=>[c,calculate(c)]));
 const active=results[selected],overall=Object.values(results).reduce((a,x)=>({done:a.done+x.complete,total:a.total+x.total}),{done:0,total:0});
 const oldScroll=root.querySelector('.rus-pick-visual')?.scrollLeft||0;
 const isLocked=classLocked(selected);
 const championList=ORDER.map(c=>({classification:c,champion:results[c].champion}));
 let html='<div class="rus-pick-header"><div class="rus-pick-eyebrow">2026 UHSAA FOOTBALL · FAN PREDICTIONS</div><h1>RUS Playoff Pick’em</h1><p>Choose the winners. Build your road to the championship. Share your bracket with friends.</p></div>';
 html+='<div class="rus-pick-progress"><div><b>'+overall.done+' / '+overall.total+'</b> games picked across Utah</div><div class="rus-pick-meter"><span style="width:'+(overall.total?Math.round(overall.done/overall.total*100):0)+'%"></span></div></div>';
 html+='<div class="rus-pick-tabs" role="group" aria-label="Choose classification">'+ORDER.map(c=>'<button type="button" data-class="'+c+'" aria-pressed="'+(c===selected)+'" class="'+(c===selected?'active':'')+'">'+c+'<small>'+(results[c].champion?'Champion picked':results[c].complete+'/'+results[c].total+' picks')+'</small></button>').join('')+'</div>';
 html+='<section class="rus-pick-panel"><div class="rus-pick-panel-head"><div><div class="rus-pick-eyebrow">INTERACTIVE PLAYOFF BRACKET</div><h2>'+selected+' · Road to State</h2><p>'+active.complete+' of '+active.total+' picks made · '+(isLocked?'Predictions locked for this classification.':'Tap a team to advance them through the bracket.')+'</p></div><button type="button" id="rusPickReset" class="rus-pick-secondary"'+(isLocked?' disabled title="Class predictions have locked"':'')+'>Reset '+selected+'</button></div>';
 html+='<div class="rus-pick-champion-preview">'+(active.champion?'<span>YOUR '+selected+' CHAMPION</span><strong>'+escapeHTML(active.champion.name)+'</strong>':'<span>STATE CHAMPION</span><strong>Pick your path to the title →</strong>')+'</div>';
 if(shared)html+='<div class="rus-pick-note">Shared bracket preview · Make a pick to create your own copy.</div>';
 if(notice)html+='<p class="rus-pick-alert" role="status">'+escapeHTML(notice)+'</p>';
 const headers=['Opening Round','Quarterfinals','Semifinals','State Championship'];
 html+='<div class="rus-pick-help">Swipe sideways to move through the rounds →</div><div class="rus-pick-visual" tabindex="0" role="region" aria-label="'+selected+' interactive playoff bracket"><div class="rus-pick-columns">';
 for(let r=0;r<4;r++){
  const games=active.games.filter(g=>g.round===r);if(!games.length)continue;
  html+='<section class="rus-pick-column rus-pick-stage-'+r+'"><div class="rus-pick-round-head"><h3>'+headers[r]+'</h3><span>'+games.filter(g=>g.chosen||g.auto).length+' / '+games.length+'</span></div><div class="rus-pick-stage-games">'+games.map(renderGame).join('')+'</div></section>';
 }
 html+='</div></div>';
 html+='</section>';
 html+='<section class="rus-pick-summary"><div><div class="rus-pick-eyebrow">YOUR ROAD TO STATE</div><h2>My 2026 State Champions</h2><p>All seven classifications, from 8-Player to 6A.</p></div><div class="rus-pick-champs">'+championList.map(x=>'<div><small>'+x.classification+'</small><strong>'+escapeHTML(x.champion?.name||'Not picked yet')+'</strong></div>').join('')+'</div>';
 html+='<div class="rus-pick-actions"><button type="button" id="rusPickShare" class="rus-pick-primary">Share My Bracket ↗</button><button type="button" id="rusPickImage" class="rus-pick-secondary">Save Graphic to Phone ↓</button></div><p class="rus-pick-disclaimer">On iPhone, tap Save Graphic to Phone and choose Save Image from the share sheet. Picks are saved on this device; public entries are submitted separately.</p></section>';
 html+='<section class="rus-pick-community"><div class="rus-pick-join"><div class="rus-pick-eyebrow">ENTER THE 2026 CHALLENGE</div><h2>Put Your Bracket on the Leaderboard</h2><p>Choose a fan name and submit. You can update open classifications before their playoffs begin; submitted picks lock at that class’s first listed kickoff (Mountain Time).</p><form id="rusPickJoin"><label for="rusFanName">Fan name</label><div class="rus-pick-join-row"><input id="rusFanName" name="fanName" maxlength="24" minlength="2" autocomplete="nickname" placeholder="Your fan name" value="'+escapeHTML(readName())+'" required><button type="submit" class="rus-pick-primary"'+(submitWorking?' disabled':'')+'>'+(submitWorking?'Submitting…':'Submit My Picks →')+'</button></div></form><small>No email required. Your private entry token stays on this device, so keep your browser data to update your entry.</small></div>';
 html+='<div class="rus-pick-standings"><div class="rus-pick-eyebrow">RUS PLAYOFF BRACKET CHALLENGE</div><h2>Fan Leaderboard <small>'+participantCount+' entries</small></h2><p>Tap any fan name to view their bracket and compare it with yours. Picks reveal only after that classification begins. Scoring: 1 / 2 / 4 / 8 points by round.</p><div class="rus-pick-table-wrap">'+leaderboardMarkup()+'</div><button type="button" id="rusReloadStandings" class="rus-pick-secondary">Refresh Standings ↻</button></div></section>';
 root.innerHTML=html;
 const bracket=root.querySelector('.rus-pick-visual');if(bracket)bracket.scrollLeft=oldScroll;
 root.querySelectorAll('[data-class]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.class;notice='';draw();history.replaceState(null,'',location.pathname+location.search+'#'+encodeURIComponent(selected));}));
 root.querySelectorAll('[data-game]').forEach(b=>b.addEventListener('click',()=>{if(classLocked(selected)){notice='This classification is locked because playoff games have started.';draw();return;}picks[selected+'|'+b.dataset.game]=b.dataset.team;ORDER.forEach(sanitizeClass);shared=false;notice='Picks saved on this device.';persist();draw();if(location.search){history.replaceState(null,'',location.pathname+'#'+encodeURIComponent(selected));}}));
 root.querySelector('#rusPickReset').addEventListener('click',()=>{if(classLocked(selected))return;if(!confirm('Clear all your '+selected+' picks?'))return;Object.keys(picks).filter(k=>k.startsWith(selected+'|')).forEach(k=>delete picks[k]);persist();shared=false;notice=selected+' picks cleared.';if(location.search)history.replaceState(null,'',location.pathname+'#'+encodeURIComponent(selected));draw();});
 root.querySelector('#rusPickShare').addEventListener('click',share);
 root.querySelector('#rusPickImage').addEventListener('click',downloadCard);
 root.querySelector('#rusPickJoin').addEventListener('submit',submitEntry);
 root.querySelector('#rusReloadStandings').addEventListener('click',refreshLeaderboard);
 root.querySelectorAll('[data-fan]').forEach(b=>b.addEventListener('click',()=>openFanBracket(b.dataset.fan)));

}


function closeFanBracket(){
 publicSequence++;
 publicViewer=null;
 const old=document.getElementById('rusPublicFanModal');
 if(old)old.remove();
 document.body.style.overflow=publicScrollLock;
 window.removeEventListener('keydown',fanEscape);
}
function fanEscape(event){if(event.key==='Escape'&&publicViewer)closeFanBracket();}
function fanRoundCard(g,actual,myResult){
 if(g.auto)return '<div class="rus-fan-game rus-fan-bye"><small>FIRST-ROUND BYE</small><strong>'+escapeHTML((g.a||g.b)?.name||'TBD')+'</strong></div>';
 const pick=g.winner?.id||'',truth=actual?.[g.id]||'',mine=myResult?.winners?.[g.id]?.id||'';
 const status=truth?(pick===truth?'rus-fan-correct':'rus-fan-wrong'):'rus-fan-pending';
 const label=truth?(pick===truth?'✓ Correct pick':pick?'✕ Wrong pick':'No pick'):'Awaiting final';
 const showTeam=t=>'<div class="rus-fan-side'+(pick&&t?.id===pick?' is-fan-picked':'')+(mine&&t?.id===mine?' is-my-picked':'')+'"><span>'+escapeHTML(t?.seed?'#'+t.seed:'—')+'</span><strong>'+escapeHTML(t?.name||'Awaiting winner')+'</strong>'+(t?.id===pick?'<b class="rus-fan-pick-label">FAN</b>':'')+(t?.id===mine?'<b class="rus-fan-my-label">YOU</b>':'')+'</div>';
 return '<div class="rus-fan-game '+status+'"><div class="rus-fan-game-top"><span>'+escapeHTML(g.date||'Playoff matchup')+'</span><span>'+label+'</span></div>'+showTeam(g.a)+showTeam(g.b)+'</div>';
}
function viewerMarkup(){
 if(!publicViewer)return'';
 const v=publicViewer,c=v.classification,name=escapeHTML(v.username),locked=!!deadlines[c]?.locked;
 let html='<div class="rus-fan-overlay" id="rusPublicFanModal"><div class="rus-fan-dialog" role="dialog" aria-modal="true" aria-labelledby="rusFanDialogHeading">';
 html+='<div class="rus-fan-dialog-head"><div><div class="rus-pick-eyebrow">RUS PUBLIC PLAYOFF BRACKETS</div><h2 id="rusFanDialogHeading">'+name+'’s Picks</h2><p>Head-to-head bracket comparison · 2026 Utah football</p></div><button type="button" class="rus-fan-close" aria-label="Close fan bracket">×</button></div>';
 html+='<div class="rus-fan-classes" role="group" aria-label="View classification">'+ORDER.map(cls=>'<button type="button" data-public-class="'+cls+'" class="'+(cls===c?'active':'')+'" aria-pressed="'+(cls===c)+'">'+cls+' <small>'+(deadlines[cls]?.locked?'View picks':'🔒')+'</small></button>').join('')+'</div>';
 if(v.loading)html+='<div class="rus-fan-message">Loading '+escapeHTML(c)+' predictions…</div>';
 else if(v.error)html+='<div class="rus-fan-message">'+escapeHTML(v.error)+'</div>';
 else if(!locked||v.data?.locked){
  const d=deadlines[c],date=d?.lockDate||v.data?.deadline?.lockDate||'opening kickoff',time=d?.lockTime||v.data?.deadline?.lockTime||'';
  html+='<div class="rus-fan-message"><strong>🔒 '+escapeHTML(c)+' predictions are still private.</strong><p>They’ll be revealed when this classification begins: '+escapeHTML(date)+' '+escapeHTML(time)+' (Mountain Time).</p><p>You can keep making your own picks until then.</p></div>';
 }else if(v.data?.picks){
  const submitted={};for(const [id,val] of Object.entries(v.data.picks))submitted[c+'|'+id]=String(val);
  const fan=calculate(c,submitted),mine=calculate(c);
  let agree=0,disagree=0;
  for(const g of fan.games){const myChoice=mine.winners[g.id]?.id;if(!g.auto&&g.winner&&myChoice){if(g.winner.id===myChoice)agree++;else disagree++;}}
  html+='<div class="rus-fan-comparison"><div><strong>'+fan.complete+'/'+fan.total+'</strong><small>Fan picks</small></div><div><strong>'+agree+'</strong><small>Same as you</small></div><div><strong>'+disagree+'</strong><small>Different picks</small></div></div>';
  html+='<div class="rus-fan-legend"><span><b class="rus-fan-fan-key"></b> '+name+'’s winner</span><span><b class="rus-fan-you-key"></b> Your winner</span><span>✓ / ✕ = graded result</span></div>';
  html+='<div class="rus-fan-visual" role="region" tabindex="0" aria-label="Read-only '+c+' fan bracket"><div class="rus-fan-columns">';
  const titles=['Opening Round','Quarterfinals','Semifinals','State Championship'];
  for(let i=0;i<4;i++){const games=fan.games.filter(g=>g.round===i);html+='<section class="rus-fan-column"><h3>'+titles[i]+'</h3><div class="rus-fan-stage-games">'+games.map(g=>fanRoundCard(g,v.data.actual,mine)).join('')+'</div></section>';}
  html+='</div></div><p class="rus-fan-footer-note">This is '+name+'’s submitted bracket, shown read-only. Green and red labels appear as verified final results arrive. Your picks stay on this device.</p>';
 }
 return html+'</div></div>';
}
function renderFanBracket(){
 if(!publicViewer)return;
 let modal=document.getElementById('rusPublicFanModal');
 const wasOpen=!!modal,scrollLeft=modal?.querySelector('.rus-fan-visual')?.scrollLeft||0;
 if(modal)modal.remove();
 const host=document.createElement('div');
 host.innerHTML=viewerMarkup();
 modal=host.firstElementChild;
 document.body.appendChild(modal);
 if(!wasOpen){publicScrollLock=document.body.style.overflow;document.body.style.overflow='hidden';window.addEventListener('keydown',fanEscape);}
 const slider=modal.querySelector('.rus-fan-visual');if(slider)slider.scrollLeft=scrollLeft;
 modal.querySelector('.rus-fan-close').addEventListener('click',closeFanBracket);
 modal.addEventListener('click',e=>{if(e.target===modal)closeFanBracket()});
 modal.querySelectorAll('[data-public-class]').forEach(btn=>btn.addEventListener('click',()=>loadFanClassification(btn.dataset.publicClass)));
 if(!wasOpen)modal.querySelector('.rus-fan-close').focus({preventScroll:true});
}
async function loadFanClassification(classification){
 if(!publicViewer||!ORDER.includes(classification))return;
 const request=++publicSequence;
 publicViewer.classification=classification;publicViewer.loading=true;publicViewer.error='';publicViewer.data=null;
 renderFanBracket();
 try{
  // Always request one classification. The backend rejects pre-lock access.
  const key=publicViewer.username.toLowerCase()+'|'+classification;
  const data=publicCached.get(key)||await api({action:'bracket',username:publicViewer.username,classification});
  if(!publicViewer||request!==publicSequence)return;
  if(!data.locked)publicCached.set(key,data);
  publicViewer.loading=false;publicViewer.data=data;
 }catch(e){if(!publicViewer||request!==publicSequence)return;publicViewer.loading=false;publicViewer.error=e?.message||'Could not load this fan bracket.';}
 renderFanBracket();
}
function openFanBracket(username){
 if(!username)return;
 if(publicViewer)closeFanBracket();
 const preferred=ORDER.find(c=>deadlines[c]?.locked)||selected;
 publicViewer={username,classification:preferred,loading:false,data:null,error:''};
 loadFanClassification(preferred);
}

function readName(){try{return localStorage.getItem(NAME_KEY)||''}catch{return''}}
function classLocked(c){
 const server=deadlines[c];
 if(server?.locked===true)return true;
 const games=(defs[c]||[]).filter(g=>g.round===0&&!g.auto);
 const keys=games.map(g=>{
  const m=String(g.date||'').match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})/);
  if(!m)return null;
  const n=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[1].toLowerCase());
  if(n<0)return null;
  const date=m[3]+String(n+1).padStart(2,'0')+m[2].padStart(2,'0');
  const time=String(g.time||'').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const hour=time?(Number(time[1])%12+(time[3].toUpperCase()==='PM'?12:0)):0;
  const min=time?Number(time[2]):0;
  return Number(date+String(hour).padStart(2,'0')+String(min).padStart(2,'0'));
 }).filter(Boolean).sort((a,b)=>a-b);
 const cutoff=Number(server?.lockKey||keys[0]||0);
 if(!cutoff)return false;
 const p={};
 for(const x of new Intl.DateTimeFormat('en-US',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()))p[x.type]=x.value;
 return Number(p.year+p.month+p.day+p.hour+p.minute)>=cutoff;
}
function leaderboardMarkup(){
 if(!leaderboardRows.length)return '<div class="rus-pick-empty">'+escapeHTML(leaderboardStatus)+'</div>';
 return '<table class="rus-pick-leaderboard"><thead><tr><th>Rank</th><th>Fan</th><th>Points</th><th>Correct</th><th>Titles</th></tr></thead><tbody>'+
 leaderboardRows.map(r=>'<tr><td>#'+Number(r.rank)+'</td><td><button type="button" class="rus-fan-name" data-fan="'+escapeHTML(r.username)+'" aria-label="View '+escapeHTML(r.username)+'\'s playoff bracket">'+escapeHTML(r.username)+' <span aria-hidden="true">↗</span></button></td><td><strong>'+Number(r.points)+'</strong></td><td>'+Number(r.correct)+'</td><td>'+Number(r.champions)+'</td></tr>').join('')+'</tbody></table>';
}
async function api(payload){
 const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const data=await response.json().catch(()=>({error:'Invalid server response'}));
 if(!response.ok)throw Error(data?.error||'Service unavailable');
 return data;
}
async function refreshLeaderboard(){
 try{
  const data=await api({action:'leaderboard'});
  leaderboardRows=Array.isArray(data.rows)?data.rows:[];
  participantCount=Number(data.totalEntries)||0;
  deadlines=data.deadlines||{};
  leaderboardStatus='Be the first fan to submit a playoff bracket!';
 }catch(e){leaderboardStatus='The public leaderboard is temporarily unavailable. Local bracket picks still work.';}
 draw();
}
function entryToken(){
 let token='';try{token=localStorage.getItem(TOKEN_KEY)||''}catch{}
 if(/^[a-f0-9]{64}$/i.test(token))return token;
 const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);
 token=Array.from(bytes).map(v=>v.toString(16).padStart(2,'0')).join('');
 localStorage.setItem(TOKEN_KEY,token);return token;
}
async function submitEntry(event){
 event.preventDefault();
 if(submitWorking)return;
 if(ORDER.every(classLocked)){notice='All playoff classifications are locked. Existing entries are preserved; no new submissions are accepted.';draw();return;}
 const field=root.querySelector('#rusFanName');
 const username=String(field?.value||'').replace(/[^A-Za-z0-9 _.-]/g,'').replace(/\s+/g,' ').trim().slice(0,24);
 if(username.length<2){notice='Enter a fan name with at least 2 characters.';draw();return}
 try{localStorage.setItem(NAME_KEY,username)}catch{}
 submitWorking=true;notice='Submitting your playoff entry…';draw();
 try{
  const data=await api({action:'submit',username,token:entryToken(),picks});
  notice='You’re entered as '+data.username+'! '+data.picked+' picks submitted. Your fan name will appear in the leaderboard.';
  submitWorking=false;persist();await refreshLeaderboard();
 }catch(e){
  submitWorking=false;notice=String(e.message||'Could not submit picks. You can try again.');draw();
 }
}

function encodedPicks(){
 return ORDER.flatMap(c=>(defs[c]||[]).map(g=>picks[c+'|'+g.id]||'')).join('.');
}
function urlForShare(){return location.origin+location.pathname+'?p='+encodedPicks();}
async function share(){
 if(!Object.keys(picks).length){notice='Pick at least one winner before sharing.';draw();return}
 const url=urlForShare();
 if(navigator.share){
  try{await navigator.share({title:'My 2026 RUS Playoff Bracket',text:'Here are my picks for the 2026 Utah high school football playoffs.',url});return}
  catch(err){if(err?.name==='AbortError')return}
 }
 try{await navigator.clipboard.writeText(url);notice='Bracket link copied! Send it to your friends.';}
 catch(e){notice='Copy your bracket link: '+url;}
 draw();
}
function fitText(ctx,str,maxWidth,base,min){
 let size=base;while(size>min){ctx.font='900 '+size+'px Arial, sans-serif';if(ctx.measureText(str).width<=maxWidth)break;size-=2;}
 return size;
}
function readableGraphicText(bg,ink){
 // Retain the school-provided text color if legible; otherwise choose strong contrast.
 const luminosity=hex=>{
  const vals=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
  return .2126*vals[0]+.7152*vals[1]+.0722*vals[2];
 };
 const background=luminosity(bg),text=luminosity(ink);
 const ratio=(Math.max(background,text)+.05)/(Math.min(background,text)+.05);
 return ratio>=4.5?ink:background>.179?'#101010':'#FFFFFF';
}
function previewGraphicForSave(dataUrl){
 // In browsers without file sharing, display the actual image for long-press -> Save Image.
 document.querySelector('#rusPickSavePreview')?.remove();
 const modal=document.createElement('div');
 modal.id='rusPickSavePreview';
 modal.className='rus-pick-save-preview';
 modal.setAttribute('role','dialog');
 modal.setAttribute('aria-modal','true');
 modal.setAttribute('aria-label','Save your playoff champions graphic');
 modal.innerHTML='<div class="rus-pick-save-sheet"><button type="button" class="rus-pick-save-close" aria-label="Close image preview">×</button><h2>Save to your phone</h2><p>Press and hold the image, then choose <strong>Save to Photos</strong> or <strong>Save Image</strong>.</p><img alt="Your seven RUS playoff champion picks" class="rus-pick-save-image"><a class="rus-pick-primary rus-pick-save-download" download="RUS-2026-Playoff-Champions.png">Download PNG ↓</a></div>';
 modal.querySelector('img').src=dataUrl;
 modal.querySelector('a').href=dataUrl;
 modal.querySelector('.rus-pick-save-close').addEventListener('click',()=>modal.remove());
 modal.addEventListener('click',event=>{if(event.target===modal)modal.remove()});
 document.body.appendChild(modal);
 modal.querySelector('.rus-pick-save-close').focus({preventScroll:true});
}
async function downloadCard(){
 const list=ORDER.map(c=>({classification:c,champion:calculate(c).champion}));
 if(!list.some(x=>x.champion)){notice='Pick a state champion first to make your graphic.';draw();return}
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
 const ctx=canvas.getContext('2d');
 if(!ctx){notice='Image export is unavailable on this device.';draw();return}
 ctx.fillStyle='#101010';ctx.fillRect(0,0,1080,1350);
 ctx.fillStyle='#F14D07';ctx.fillRect(0,0,1080,20);
 ctx.fillStyle='#fff';ctx.font='900 40px Arial, sans-serif';ctx.fillText('RURAL UTAH SPORTS',74,101);
 ctx.fillStyle='#F14D07';ctx.font='900 27px Arial, sans-serif';ctx.fillText('2026 · PLAYOFF PICK’EM',74,154);
 ctx.fillStyle='#fff';ctx.font='900 78px Arial, sans-serif';ctx.fillText('MY STATE',70,254);ctx.fillText('CHAMPIONS',70,345);
 ctx.fillStyle='#777';ctx.fillRect(70,381,940,2);
 list.forEach((v,i)=>{
  const y=445+i*115,brand=v.champion?asset(v.champion):null;
  const teamColor=brand?.known&&/^#[0-9a-f]{6}$/i.test(brand.backgroundColor)?brand.backgroundColor:null;
  const teamInk=brand?.known&&/^#[0-9a-f]{6}$/i.test(brand.textColor)?brand.textColor:'#FFFFFF';
  const bg=teamColor||(i%2?'#191919':'#202020');
  const ink=readableGraphicText(bg,teamInk);
  ctx.fillStyle=bg;
  ctx.fillRect(70,y-49,940,100);
  // Keep the existing minimalist graphic layout, but let the champion's true school color fill each row.
  ctx.fillStyle=ink;
  ctx.fillRect(70,y-49,7,100);
  ctx.font='900 28px Arial, sans-serif';
  ctx.fillText(v.classification,94,y+9);
  const name=v.champion?.name||'TBD';
  const size=fitText(ctx,name,710,36,23);
  ctx.font='900 '+size+'px Arial, sans-serif';
  ctx.fillStyle=v.champion?ink:'#A0A0A0';
  ctx.textAlign='right';
  ctx.fillText(name,979,y+10);
  ctx.textAlign='left';
 });
 ctx.fillStyle='#F14D07';ctx.fillRect(0,1264,1080,86);
 ctx.fillStyle='#000';ctx.font='900 30px Arial, sans-serif';ctx.fillText('RURALUTAHSPORTS.COM',70,1317);
 ctx.textAlign='right';ctx.font='900 24px Arial, sans-serif';ctx.fillText('@ruralutahsports77',1002,1317);ctx.textAlign='left';
 try{
  // Synchronous canvas encoding lets navigator.share run in the original tap gesture on iOS.
  // Calling navigator.share from inside an asynchronous canvas.toBlob callback can lose user activation.
  const dataUrl=canvas.toDataURL('image/png');
  const isAppleMobile=/iPhone|iPad|iPod/i.test(navigator.userAgent||'')||
   (/Macintosh/i.test(navigator.userAgent||'')&&navigator.maxTouchPoints>1);
  if(typeof File==='function'&&typeof navigator.share==='function'&&typeof navigator.canShare==='function'){
   const binary=atob(dataUrl.split(',')[1]);
   const bytes=Uint8Array.from(binary,ch=>ch.charCodeAt(0));
   const file=new File([bytes],'RUS-2026-Playoff-Champions.png',{type:'image/png'});
   if(navigator.canShare({files:[file]})){
    try{
     await navigator.share({files:[file],title:'My RUS 2026 State Champions'});
     return;
    }catch(err){
     if(err?.name==='AbortError')return;
     // A failed share falls back to a saveable image preview on mobile.
    }
   }
  }
  if(isAppleMobile){previewGraphicForSave(dataUrl);return}
  const a=document.createElement('a');a.href=dataUrl;a.download='RUS-2026-Playoff-Champions.png';
  document.body.appendChild(a);a.click();a.remove();
 }catch(err){
  console.error('RUS playoff image export',err);
  notice='The image could not be saved. Please try opening the predictor in Safari.';
  draw();
 }
}
async function start(){
 try{
  const response=await fetch('official-brackets-2026.json?v=20261017-pickem1',{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();
  ORDER.forEach(c=>{if(data.classifications?.[c]?.status!=='official')throw Error(c+' official bracket unavailable');defs[c]=buildClass(data.classifications[c]);});
  load();draw();assets?.ready.then(draw);refreshLeaderboard();setInterval(()=>{if(!document.hidden)refreshLeaderboard()},300000);
 }catch(err){console.error('RUS bracket picker',err);root.innerHTML='<div class="rus-pick-error">The official playoff brackets could not be loaded. Please refresh the page.</div>';}
}
start();
})();
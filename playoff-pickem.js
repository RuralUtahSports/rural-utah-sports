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
function calculate(cls){
 const winners={},games=[],kept={};
 for(const def of defs[cls]||[]){
  const a=resolve(def.a,winners),b=resolve(def.b,winners);
  const key=cls+'|'+def.id,choice=picks[key],eligible=a&&b;
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
 const pick=assigned&&game.winner?.id===teamData.id;
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
 html+='<div class="rus-pick-actions"><button type="button" id="rusPickShare" class="rus-pick-primary">Share My Bracket ↗</button><button type="button" id="rusPickImage" class="rus-pick-secondary">Download Instagram Graphic ↓</button></div><p class="rus-pick-disclaimer">Picks are saved on this device. Your fan entry is submitted separately for the public leaderboard. Only your fan name and scores appear publicly.</p></section>';
 html+='<section class="rus-pick-community"><div class="rus-pick-join"><div class="rus-pick-eyebrow">ENTER THE 2026 CHALLENGE</div><h2>Put Your Bracket on the Leaderboard</h2><p>Choose a fan name and submit. You can update open classifications before their playoffs begin; submitted picks lock at that class’s first listed kickoff (Mountain Time).</p><form id="rusPickJoin"><label for="rusFanName">Fan name</label><div class="rus-pick-join-row"><input id="rusFanName" name="fanName" maxlength="24" minlength="2" autocomplete="nickname" placeholder="Your fan name" value="'+escapeHTML(readName())+'" required><button type="submit" class="rus-pick-primary"'+(submitWorking?' disabled':'')+'>'+(submitWorking?'Submitting…':'Submit My Picks →')+'</button></div></form><small>No email required. Your private entry token stays on this device, so keep your browser data to update your entry.</small></div>';
 html+='<div class="rus-pick-standings"><div class="rus-pick-eyebrow">RUS PLAYOFF BRACKET CHALLENGE</div><h2>Fan Leaderboard <small>'+participantCount+' entries</small></h2><p>1 point opening round · 2 quarterfinals · 4 semifinals · 8 championship. Automatic scores use verified results in the RUS feeds.</p><div class="rus-pick-table-wrap">'+leaderboardMarkup()+'</div><button type="button" id="rusReloadStandings" class="rus-pick-secondary">Refresh Standings ↻</button></div></section>';
 root.innerHTML=html;
 const bracket=root.querySelector('.rus-pick-visual');if(bracket)bracket.scrollLeft=oldScroll;
 root.querySelectorAll('[data-class]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.class;notice='';draw();history.replaceState(null,'',location.pathname+location.search+'#'+encodeURIComponent(selected));}));
 root.querySelectorAll('[data-game]').forEach(b=>b.addEventListener('click',()=>{picks[selected+'|'+b.dataset.game]=b.dataset.team;ORDER.forEach(sanitizeClass);shared=false;notice='Picks saved on this device.';persist();draw();if(location.search){history.replaceState(null,'',location.pathname+'#'+encodeURIComponent(selected));}}));
 root.querySelector('#rusPickReset').addEventListener('click',()=>{if(classLocked(selected))return;if(!confirm('Clear all your '+selected+' picks?'))return;Object.keys(picks).filter(k=>k.startsWith(selected+'|')).forEach(k=>delete picks[k]);persist();shared=false;notice=selected+' picks cleared.';if(location.search)history.replaceState(null,'',location.pathname+'#'+encodeURIComponent(selected));draw();});
 root.querySelector('#rusPickShare').addEventListener('click',share);
 root.querySelector('#rusPickImage').addEventListener('click',downloadCard);
 root.querySelector('#rusPickJoin').addEventListener('submit',submitEntry);
 root.querySelector('#rusReloadStandings').addEventListener('click',refreshLeaderboard);
}

function readName(){try{return localStorage.getItem(NAME_KEY)||''}catch{return''}}
function classLocked(c){
 const server=deadlines[c];
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
 leaderboardRows.map(r=>'<tr><td>#'+Number(r.rank)+'</td><td>'+escapeHTML(r.username)+'</td><td><strong>'+Number(r.points)+'</strong></td><td>'+Number(r.correct)+'</td><td>'+Number(r.champions)+'</td></tr>').join('')+'</tbody></table>';
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
function downloadCard(){
 const list=ORDER.map(c=>({classification:c,champion:calculate(c).champion}));
 if(!list.some(x=>x.champion)){notice='Pick a state champion first to make your graphic.';draw();return}
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d');
 if(!ctx){notice='Image export is unavailable on this device.';draw();return}
 ctx.fillStyle='#101010';ctx.fillRect(0,0,1080,1350);ctx.fillStyle='#F14D07';ctx.fillRect(0,0,1080,20);
 ctx.fillStyle='#fff';ctx.font='900 40px Arial, sans-serif';ctx.fillText('RURAL UTAH SPORTS',74,101);
 ctx.fillStyle='#F14D07';ctx.font='900 27px Arial, sans-serif';ctx.fillText('2026 · PLAYOFF PICK’EM',74,154);
 ctx.fillStyle='#fff';ctx.font='900 78px Arial, sans-serif';ctx.fillText('MY STATE',70,254);ctx.fillText('CHAMPIONS',70,345);
 ctx.fillStyle='#777';ctx.fillRect(70,381,940,2);
 list.forEach((v,i)=>{
  const y=445+i*115;
  ctx.fillStyle=i%2?'#191919':'#202020';ctx.fillRect(70,y-49,940,100);
  ctx.fillStyle='#F14D07';ctx.font='900 28px Arial, sans-serif';ctx.fillText(v.classification,94,y+9);
  const name=v.champion?.name||'TBD';
  const size=fitText(ctx,name,710,36,23);ctx.font='900 '+size+'px Arial, sans-serif';ctx.fillStyle=v.champion?'#fff':'#777';
  ctx.textAlign='right';ctx.fillText(name,979,y+10);ctx.textAlign='left';
 });
 ctx.fillStyle='#F14D07';ctx.fillRect(0,1264,1080,86);
 ctx.fillStyle='#000';ctx.font='900 30px Arial, sans-serif';ctx.fillText('RURALUTAHSPORTS.COM',70,1317);
 ctx.textAlign='right';ctx.font='900 24px Arial, sans-serif';ctx.fillText('@ruralutahsports77',1002,1317);ctx.textAlign='left';
 try{
  canvas.toBlob(blob=>{
   if(!blob){notice='Could not export the graphic.';draw();return}
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='RUS-2026-Playoff-Champions.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
  },'image/png');
 }catch(e){notice='The graphic could not be saved on this device.';draw();}
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
(() => {
'use strict';
const host=document.getElementById('rusOfficialPlayoffs');
if(!host)return;
const ORDER=['8-Player','1A','2A','3A','4A','5A','6A'];
const home=host.dataset.mode==='home';
let selected='8-Player', manuallySelected=false, lastPayload='', inFlight=false, currentData=null;
const assets=window.RUSOfficialBracketTeamAssets;
const teamAsset=name=>assets?.resolve(name)||{logo:'',backgroundColor:'#303030',textColor:'#fff',known:false};
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const getName=t=>typeof t==='string'?t:(t?.name||t?.team||'');
const isOfficial=c=>c?.status==='official'&&Array.isArray(c.rounds)&&c.rounds.length>0;
const isPartial=c=>c?.status==='partial'&&Array.isArray(c.rounds)&&c.rounds.length>0;
const isPublished=c=>isOfficial(c)||isPartial(c);
function team(t){
  const name=getName(t),seed=t&&typeof t==='object'&&Number.isFinite(Number(t.seed))&&String(t.seed).trim()!==''?'#'+esc(t.seed):'';
  const display=name||'TBD',isBye=/^bye$/i.test(display);
  const known=!!name&&!/^(?:TBD|Bye|Winner of |Semifinal |Quarterfinal )/i.test(name);
  const colors=known?teamAsset(name):{logo:'',backgroundColor:'#303030',textColor:'#fff',known:false};
  const real=known&&colors.known;
  const cls='rus-o-team'+(isBye?' rus-o-bye':'')+(t?.winner?' rus-o-win':'')+(real?' rus-o-real-team':'');
  const style=real?' style="--team-bg:'+colors.backgroundColor+';--team-ink:'+colors.textColor+'"':'';
  const logo=colors.logo&&known?'<span class="rus-o-logo-shell" data-team-key="'+esc(colors.key||'')+'"><img class="rus-o-logo" src="'+esc(colors.logo)+'" alt="'+esc(name)+' school logo" loading="lazy" decoding="async" width="48" height="48"></span>':'';
  const score=t&&typeof t==='object'&&t.score!==undefined&&t.score!==null?'<span class="rus-o-score">'+esc(t.score)+'</span>':'';
  return '<div class="'+cls+'"'+style+'><span class="rus-o-seed">'+seed+'</span>'+logo+'<span class="rus-o-name">'+esc(display)+'</span>'+score+'</div>';
}
function game(g){
  const a=g?.a??null,b=g?.b??null;
  const schedule=[
    g?.date?'<span><b>Date:</b> '+esc(g.date)+'</span>':'',
    g?.time?'<span><b>Kickoff:</b> '+esc(g.time)+'</span>':'',
    (g?.venue||g?.location)?'<span><b>Location:</b> '+esc(g.venue||g.location)+'</span>':'',
    g?.note?'<span>'+esc(g.note)+'</span>':''
  ].filter(Boolean).join(' <span aria-hidden="true">·</span> ');
  return '<div class="rus-o-game">'+team(a)+team(b)+(schedule?'<div class="rus-o-gamemeta">'+schedule+'</div>':'')+'</div>';
}
function draw(data){
  currentData=data;
  const classes=data.classifications||{},confirmed=ORDER.filter(c=>isOfficial(classes[c]));
  const partial=ORDER.filter(c=>isPartial(classes[c])),published=ORDER.filter(c=>isPublished(classes[c]));
  if(!manuallySelected&&published.length)selected=published[0];
  const current=classes[selected]||{},ready=isPublished(current);
  let html='<div class="rus-o-top"><div><div class="rus-o-eyebrow">2026 Utah High School Football</div><h2>Official State Playoff Brackets</h2><p class="rus-o-desc">UHSAA matchups, seeds and first-round byes, added as each classification is announced.</p></div>';
  if(home)html+='<a class="rus-o-cta" href="official-playoffs.html">Full Brackets →</a>';
  html+='</div><div class="rus-o-progress"><strong>'+confirmed.length+' of 7 classifications fully posted</strong>'+(partial.length?' · '+partial.length+' partially posted':'')+' · '+(confirmed.length===7?'All official brackets posted':published.length?'Bracket reveal in progress':'Awaiting official bracket reveal')+'</div>';
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
  host.querySelectorAll('img.rus-o-logo').forEach(img=>img.addEventListener('error',()=>{
    const shell=img.closest('.rus-o-logo-shell');
    if(shell)shell.remove();else img.remove();
  }));
}
async function refresh(){
 if(inFlight)return;
 inFlight=true;
 try{
  const r=await fetch('official-brackets-2026.json?v='+Date.now(),{cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const d=await r.json(),body=JSON.stringify(d);
  if(body!==lastPayload){lastPayload=body;draw(d);}
 }catch(e){
  if(!lastPayload)host.innerHTML='<div class="rus-o-error">The official bracket feed is temporarily unavailable. Please reload the page.</div>';
 }finally{inFlight=false;}
}
refresh();
assets?.ready.then(()=>{if(currentData)draw(currentData)});
setInterval(()=>{if(!document.hidden)refresh()},60000);
})();
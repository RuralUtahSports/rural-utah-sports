(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Number.isFinite(Number(v))?Number(v).toLocaleString('en-US',{maximumFractionDigits:2}):String(v??'');
const colors=new Map(),clean=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const color=t=>{const v=colors.get(clean(t));if(!/^#[0-9a-f]{6}$/i.test(v||''))return'#f14d07';
 const n=parseInt(v.slice(1),16),l=.2126*((n>>16)&255)+.7152*((n>>8)&255)+.0722*(n&255);
 return l>=110?v:'#ec9b66';};
const kind=a=>a.recordType==='seasonPlayer'?(a.status==='exceeds-listed-uhsaa'?'EXCEEDS LISTED UHSAA MARK':'REPORTED 2025–26 PLAYER HIGH'):
 a.status==='on-pace'?'PROVISIONAL 2026 SEASON PACE':'2026 SCHOOL SEASON RECORD';
const note=a=>a.recordType==='seasonPlayer'?
  (a.status==='exceeds-listed-uhsaa'?'Listed UHSAA: '+fmt(a.officialValue)+' '+a.unit+'; review required. ':'')+
  '2025 reported leader: '+fmt(a.previousValue)+' '+a.unit+' ('+a.previousPlayer+'). Older seasons not fully archived.':
  (a.status==='on-pace'?'Previous completed season: ':'Previous record: ')+
  fmt(a.previousValue)+' '+a.unit+' ('+a.previousSeason+').';
function css(){
 if(document.getElementById('rus-season-alert-style'))return;
 const st=document.createElement('style');st.id='rus-season-alert-style';
 st.textContent='.rus-season-alert{background:#050505;border:1px solid #333;border-left:6px solid #F14D07;border-radius:9px;margin:13px 0;overflow:hidden}'+
 '.rus-season-head{padding:11px 13px;border-bottom:1px solid #333;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}'+
 '.rus-season-head h2{font-size:17px;text-transform:uppercase}.rus-season-head p{font-size:10px;line-height:1.4;color:#aaa;margin-top:4px;max-width:800px}'+
 '.rus-season-head button{padding:8px 10px;font-size:9px;text-transform:uppercase;font-weight:900;border:1px solid #F14D07;background:#F14D07;color:#000;border-radius:5px;cursor:pointer}'+
 '.rus-season-count{font-size:11px;color:#F14D07;margin-left:10px}'+
 '.rus-season-scroller{display:flex;gap:9px;overflow-x:auto;scroll-snap-type:x mandatory;padding:12px;scrollbar-width:thin}'+
 '.rus-season-card{scroll-snap-align:start;background:#111;border:1px solid #333;border-top:4px solid var(--accent);border-radius:7px;flex:0 0 min(310px,85vw);min-width:0;padding:13px}'+
 '.rus-season-kicker{color:#F14D07;font-size:9px;font-weight:900;text-transform:uppercase}.rus-season-who{font-weight:950;font-size:15px;line-height:1.35;margin-top:8px}'+
 '.rus-season-who strong{color:var(--accent)}.rus-season-value{font-size:30px;font-weight:950;color:var(--accent);margin-top:6px}'+
 '.rus-season-category{font-size:11px;color:#fff;font-weight:800}.rus-season-note{font-size:10px;color:#aaa;line-height:1.45;margin-top:8px}'+
 '.rus-season-meta{font-size:9px;color:#888;margin-top:7px}.rus-season-link{display:inline-block;font-size:9px;color:#ff8248;font-weight:900;margin-top:9px;text-decoration:none}'+
 '.rus-season-foot{border-top:1px solid #292929;padding:10px 12px;font-size:9px;line-height:1.4;color:#888}';
 document.head.appendChild(st);
}
function card(a){
 const who=a.player?esc(a.player)+' • <strong>'+esc(a.team)+'</strong>':'<strong>'+esc(a.team)+'</strong>';
 const href=a.playerId?'player.html?id='+encodeURIComponent(a.playerId):'team.html?team='+encodeURIComponent(a.team);
 return '<article class="rus-season-card" style="--accent:'+color(a.team)+'">'+
 '<div class="rus-season-kicker">'+esc(kind(a))+'</div><div class="rus-season-who">'+who+
 '</div><div class="rus-season-value">'+esc(fmt(a.value))+' '+esc(a.unit||'')+
 '</div><div class="rus-season-category">'+esc(a.category)+'</div><div class="rus-season-note">'+esc(note(a))+
 '</div><div class="rus-season-meta">As of '+esc(a.asOf||a.date||'2026')+
 (a.status==='on-pace'?' • Not final':a.recordType==='seasonPlayer'?' • Reported stats only':' • Historical RUS game archive')+
 '</div><a class="rus-season-link" href="'+esc(href)+'">View '+(a.player?'player':'team')+' →</a></article>';
}
function draw(rows,title,page,pages){
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#050505';ctx.fillRect(0,0,1080,1350);
 ctx.fillStyle='#F14D07';ctx.fillRect(0,0,25,1350);ctx.fillStyle='#fff';
 ctx.font='900 32px Arial';ctx.fillText('RURAL UTAH SPORTS',70,76);
 ctx.fillStyle='#F14D07';ctx.font='900 49px Arial';ctx.fillText('2026 SEASON RECORDS',70,148);
 ctx.fillStyle='#aaa';ctx.font='700 19px Arial';ctx.fillText(title.toUpperCase(),70,186);
 ctx.fillStyle='#fff';ctx.textAlign='right';ctx.font='700 22px Arial';ctx.fillText(page+' / '+pages,1005,76);ctx.textAlign='left';
 function fit(str,max,initial){let s=initial;while(s>16){ctx.font='900 '+s+'px Arial';if(ctx.measureText(str).width<=max)break;s--;}return s;}
 rows.forEach((a,i)=>{
   const y=222+i*202,clr=color(a.team);ctx.fillStyle='#121212';ctx.fillRect(70,y,940,187);ctx.fillStyle=clr;ctx.fillRect(70,y,10,187);
   ctx.fillStyle='#F14D07';ctx.font='900 16px Arial';ctx.fillText(kind(a),90,y+29);
   const name=(a.player?a.player+' • ':'')+a.team;
   ctx.fillStyle='#fff';ctx.font='900 '+fit(name,560,29)+'px Arial';ctx.fillText(name,90,y+75);
   ctx.fillStyle='#bbb';ctx.font='700 '+fit(a.category,580,20)+'px Arial';ctx.fillText(a.category,90,y+106);
   ctx.fillStyle=clr;ctx.textAlign='right';const value=fmt(a.value)+' '+(a.unit||'');
   ctx.font='900 '+fit(value,330,40)+'px Arial';ctx.fillText(value,990,y+81);ctx.textAlign='left';
   ctx.fillStyle='#bbb';ctx.font='700 16px Arial';ctx.fillText('Previous: '+fmt(a.previousValue)+' ('+(a.previousSeason||'2025')+')',90,y+144);
   ctx.fillStyle='#8b8b8b';ctx.font='700 15px Arial';
   ctx.fillText(a.status==='on-pace'?'Provisional, not final':a.recordType==='seasonPlayer'?'Reported 2025–26 comparison; not all-time':'RUS recorded school history',90,y+172);
 });
 ctx.fillStyle='#999';ctx.font='700 16px Arial';ctx.fillText('Coverage varies; UHSAA listed marks require official recognition.',70,1280);
 ctx.fillStyle='#fff';ctx.font='900 21px Arial';ctx.fillText('ruralutahsports.com',70,1320);
 return canvas;
}
async function exportImages(rows,title){
 const selected=rows.slice(0,20),files=[];for(let i=0;i<selected.length;i+=5){
  const page=1+i/5,total=Math.ceil(selected.length/5);
  const canvas=draw(selected.slice(i,i+5),title,page,total);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  files.push(new File([blob],'RUS-2026-season-records-'+page+'-of-'+total+'.png',{type:'image/png'}));
 }
 if(navigator.share&&navigator.canShare&&navigator.canShare({files})){
  try{await navigator.share({title,files});return}catch(e){if(e&&e.name==='AbortError')return}
 }
 files.forEach((file,i)=>setTimeout(()=>{const url=URL.createObjectURL(file),a=document.createElement('a');
   a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),5000)},i*250));
}
function group(title,intro,rows,key){
 if(!rows.length)return null;
 const cap=key==='player'?15:20;
 const section=document.createElement('section');section.className='rus-season-alert';section.dataset.seasonRecord=key;
 section.innerHTML='<div class="rus-season-head"><div><h2>'+esc(title)+'<span class="rus-season-count">'+rows.length+
 '</span></h2><p>'+esc(intro)+'</p></div><div><button data-act="share">Share Graphics</button>'+
 (rows.length>cap?' <button data-act="more">See All</button>':'')+
 '</div></div><div class="rus-season-scroller">'+rows.slice(0,cap).map(card).join('')+
 '</div><div class="rus-season-foot">'+esc(key==='player'?'Reported 2025–26 player comparisons are not verified all-time school records. Listed UHSAA marks need official review.':
 key==='pace'?'Averages and defensive records can change before the season ends. No final record is claimed.':
 'Historical ranks cover games recorded by Rural Utah Sports; incomplete older seasons may affect totals.')+'</div>';
 section.addEventListener('click',e=>{
  const b=e.target.closest('button[data-act]');if(!b)return;
  if(b.dataset.act==='share')void exportImages(rows,title).catch(console.error);
  if(b.dataset.act==='more'){section.querySelector('.rus-season-scroller').innerHTML=rows.map(card).join('');b.remove();}
 });
 return section;
}
async function boot(){
 const r=await fetch('season-record-alerts.json?v=20261020-season-records1',{cache:'no-store'});
 if(!r.ok)return;const data=await r.json();
 const team=data.teamBroken||[],player=data.playerReportedArchive||[],pace=data.teamWatches||[];
 if(!team.length&&!player.length&&!pace.length)return;
 try{const t=await fetch('teams-data.json?v=20261020-season-records1');if(t.ok)for(const x of await t.json())colors.set(clean(x.team),x.backgroundColor)}catch(e){}
 css();const main=document.querySelector('main.container')||document.querySelector('main');if(!main)return;
 const block=document.createElement('div');block.id='rusSeasonRecordAlerts';
 const all=[
 group('Single-Season Team Records','New 2026 historical school season highs, verified against the RUS game archive.',team,'team'),
 group('Single-Season Player Milestones','Player season totals exceeding the available reported 2025 school-season benchmark.',player,'player'),
 group('2026 Season Record Watch','Strongest season paces; not labeled broken until the season is complete.',pace,'pace')
 ].filter(Boolean);for(const el of all)block.appendChild(el);
 const existing=document.querySelector('.rus-record-alert-stack');if(existing&&existing.parentNode)existing.after(block);else main.prepend(block);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void boot().catch(console.error),{once:true});
else void boot().catch(console.error);
})();
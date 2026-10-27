(()=>{
'use strict';
// Manually re-enable only after every 2026 football final and statistical review.
const SHOW_2026_SEASON_RECORDS=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Number.isFinite(Number(v))?Number(v).toLocaleString('en-US',{maximumFractionDigits:2}):String(v??'');
// Reuse the existing verified school palette; never infer or invent team colors.
const colors=new Map(),clean=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const validHex=v=>/^#[0-9a-f]{6}$/i.test(String(v||''))?String(v).toUpperCase():null;
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const mix=(a,b,f)=>'#'+rgb(a).map((v,i)=>Math.round(v*(1-f)+rgb(b)[i]*f).toString(16).padStart(2,'0')).join('').toUpperCase();
const luminance=h=>rgb(h).map(c=>{const v=c/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;})
 .reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const readable=(hex,dark='#121212')=>{
 if(contrast(hex,dark)>=4.5)return hex;
 for(let i=1;i<=12;i++){const candidate=mix(hex,'#FFFFFF',i/12);if(contrast(candidate,dark)>=4.5)return candidate;}
 return'#FFFFFF';
};
function palette(team){
 const source=colors.get(clean(team))||{};
 const primary=validHex(source.backgroundColor)||'#F14D07';
 const secondary=validHex(source.textColor)||'#FFFFFF';
 const chipText=contrast(primary,secondary)>=4.5?secondary:
   (contrast(primary,'#FFFFFF')>=contrast(primary,'#000000')?'#FFFFFF':'#000000');
 return{primary,secondary,chipText,accent:readable(primary)};
}
const color=t=>palette(t).accent;
async function loadTeamColors(){
 for(const path of ['team-colors-exact.json','teams-data.json']){
  try{
   const response=await fetch(path+'?v=20261020-season-school-colors1',{cache:'no-store'});
   if(!response.ok)continue;
   const rows=await response.json();
   if(!Array.isArray(rows))continue;
   for(const team of rows){
    const key=clean(team.team);
    if(key&&!colors.has(key))colors.set(key,{backgroundColor:team.backgroundColor,textColor:team.textColor});
   }
  }catch(e){console.warn('Season record school palette unavailable:',path,e);}
 }
}
const kind=a=>a.status==='historical-school-high'?'REPORTED SCHOOL SEASON RECORD':a.recordType==='seasonTeam'&&a.status==='reported-archive-high'?'2025–26 REPORTED TEAM STAT HIGH':a.recordType==='seasonPlayer'?(a.status==='exceeds-listed-uhsaa'?'EXCEEDS LISTED UHSAA MARK':'REPORTED 2025–26 PLAYER HIGH'):
 a.status==='on-pace'?'PROVISIONAL 2026 SEASON PACE':'2026 SCHOOL SEASON RECORD';
const note=a=>a.recordType==='seasonPlayer'?
  (a.status==='historical-school-high'?('Previous reported school leader: '+fmt(a.previousValue)+' '+a.unit+' • '+a.previousPlayer+' ('+a.previousSeason+'). Historical reporting may be incomplete.'):
    (a.status==='exceeds-listed-uhsaa'?'Listed UHSAA: '+fmt(a.officialValue)+' '+a.unit+'; review required. ':'')+
    '2025 reported leader: '+fmt(a.previousValue)+' '+a.unit+' ('+a.previousPlayer+'). Earlier seasons not fully archived.'): 
  (a.status==='on-pace'?'Previous completed season: ':a.status==='reported-archive-high'?'2025 reported team total: ':'Previous record: ')+
  fmt(a.previousValue)+' '+a.unit+' ('+a.previousSeason+').';
function css(){
 if(document.getElementById('rus-season-alert-style'))return;
 const st=document.createElement('style');st.id='rus-season-alert-style';
 st.textContent='.rus-season-alert{background:#050505;border:1px solid #333;border-left:6px solid #F14D07;border-radius:9px;margin:13px 0;overflow:hidden}'+
 '.rus-season-head{padding:11px 13px;border-bottom:1px solid #333;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}'+
 '.rus-season-head h2{font-size:17px;text-transform:uppercase}.rus-season-head p{font-size:10px;line-height:1.4;color:#aaa;margin-top:4px;max-width:800px}'+
 '.rus-season-head button{padding:8px 10px;font-size:9px;text-transform:uppercase;font-weight:900;border:1px solid #F14D07;background:#F14D07;color:#000;border-radius:5px;cursor:pointer}'+
 '.rus-season-count{font-size:11px;color:#F14D07;margin-left:10px}'+
 '.rus-season-scroller{display:flex;flex-wrap:nowrap;align-items:stretch;gap:9px;overflow-x:auto;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;scroll-snap-type:x mandatory;padding:12px;scrollbar-width:thin}'+
 '.rus-season-scroller > .rus-season-card{box-sizing:border-box;scroll-snap-align:start;background:#111;border:1px solid #333;border-top:4px solid var(--team-primary);box-shadow:inset 4px 0 var(--team-secondary);border-radius:7px;flex:0 0 min(310px,85vw);min-width:0;max-width:min(310px,85vw);padding:13px;overflow-wrap:break-word}'+
 '.rus-season-kicker{color:#F14D07;font-size:9px;font-weight:900;text-transform:uppercase}.rus-season-who{font-weight:950;font-size:15px;line-height:1.35;margin-top:8px}'+
 '.rus-season-who strong{color:var(--accent)}.rus-season-value{font-size:30px;font-weight:950;color:var(--accent);margin-top:6px}'+
 '.rus-season-category{font-size:11px;color:#fff;font-weight:800}.rus-season-note{font-size:10px;color:#aaa;line-height:1.45;margin-top:8px}'+
 '.rus-season-meta{font-size:9px;color:#888;margin-top:7px}.rus-season-link{display:inline-block;font-size:9px;color:#ff8248;font-weight:900;margin-top:9px;text-decoration:none}'+
 '.rus-season-foot{border-top:1px solid #292929;padding:10px 12px;font-size:9px;line-height:1.4;color:#888}';
 document.head.appendChild(st);
}
function card(a){
 const who=a.player?esc(a.player)+' • <strong>'+esc(a.team)+'</strong>':'<strong>'+esc(a.team)+'</strong>';
 const caution=a.negativeOutcome?' • Negative outcome: higher count, not an award.':'';
 const href=a.playerId?'player.html?id='+encodeURIComponent(a.playerId):'team.html?team='+encodeURIComponent(a.team);
 const theme=palette(a.team);
 return '<article class="rus-season-card" style="--team-primary:'+theme.primary+';--team-secondary:'+theme.secondary+';--accent:'+theme.accent+'">'+
 '<div class="rus-season-kicker">'+esc(kind(a))+'</div><div class="rus-season-who">'+who+
 '</div><div class="rus-season-value">'+esc(fmt(a.value))+' '+esc(a.unit||'')+
 '</div><div class="rus-season-category">'+esc(a.category)+'</div><div class="rus-season-note">'+esc(note(a)+caution)+
 '</div><div class="rus-season-meta">As of '+esc(a.asOf||a.date||'2026')+
 (a.status==='on-pace'?' • Not final':a.status==='reported-archive-high'?' • 2025–26 reported comparison':' • Historical RUS game archive')+
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
   const y=222+i*202,theme=palette(a.team),accent=theme.accent;
   // The primary and secondary colors are the ORIGINAL team values. Only
   // the small stat text is lightened for readability on the dark graphic.
   ctx.fillStyle='#121212';ctx.fillRect(70,y,940,187);
   const [red,green,blue]=rgb(theme.primary);
   ctx.fillStyle='rgba('+red+','+green+','+blue+',0.14)';ctx.fillRect(70,y,940,187);
   ctx.fillStyle=theme.primary;ctx.fillRect(70,y,16,187);
   ctx.fillStyle=theme.secondary;ctx.fillRect(86,y,5,187);
   ctx.fillStyle=accent;ctx.font='900 16px Arial';ctx.fillText(kind(a),102,y+29);
   const name=(a.player?a.player+' • ':'')+a.team;
   const size=fit(name,535,28),textWidth=ctx.measureText(name).width,chipWidth=Math.min(555,textWidth+28);
   ctx.fillStyle=theme.primary;ctx.fillRect(102,y+39,chipWidth,43);
   ctx.fillStyle=theme.chipText;ctx.font='900 '+size+'px Arial';ctx.fillText(name,116,y+70);
   ctx.fillStyle=theme.secondary;ctx.fillRect(102,y+82,chipWidth,3);
   ctx.fillStyle='#ddd';ctx.font='700 '+fit(a.category,565,20)+'px Arial';ctx.fillText(a.category,102,y+112);
   ctx.fillStyle=accent;ctx.textAlign='right';const value=fmt(a.value)+' '+(a.unit||'');
   ctx.font='900 '+fit(value,323,40)+'px Arial';ctx.fillText(value,990,y+80);ctx.textAlign='left';
   ctx.fillStyle='#c5c5c5';ctx.font='700 16px Arial';ctx.fillText('Previous: '+fmt(a.previousValue)+' ('+(a.previousSeason||'2025')+')',102,y+147);
   ctx.fillStyle='#aaa';ctx.font='700 15px Arial';
   ctx.fillText(a.status==='on-pace'?'Provisional, not final':a.status==='reported-archive-high'?'Reported 2025–26 comparison; not all-time':'RUS recorded school history',102,y+173);
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
 '</div><div class="rus-season-foot">'+esc(key==='player'?'2026 player totals are compared against multi-season historical Deseret school leaderboards. These are reported school-history records; incomplete historical coverage means they are not independently certified all-time school records.':
 key==='pace'?'Averages and defensive records can change before the season ends. No final record is claimed.':
 key==='teamStats'?'All available 2025–26 team statistical categories are compared. Not a verified all-time school record. Some stats vary by reporting coverage.':
 'Historical ranks cover games recorded by Rural Utah Sports; incomplete older seasons may affect totals.')+'</div>';
 section.addEventListener('click',e=>{
  const b=e.target.closest('button[data-act]');if(!b)return;
  if(b.dataset.act==='share')void exportImages(rows,title).catch(console.error);
  if(b.dataset.act==='more'){section.querySelector('.rus-season-scroller').innerHTML=rows.map(card).join('');b.remove();}
 });
 return section;
}
async function boot(){
 // Keep 2026 school-season record carousels off the homepage until the
 // postseason is complete AND regular-season statistics have been reviewed.
 // No records, archive data, or single-game alerts are deleted or changed.
 if(!SHOW_2026_SEASON_RECORDS)return;
 const r=await fetch('season-record-alerts.json?v=20261020-all-stats1',{cache:'no-store'});
 if(!r.ok)return;const data=await r.json();
 const team=data.teamBroken||[],teamStats=[],player=(data.playerReportedArchive||[]).filter(a=>['historical-school-high','exceeds-listed-uhsaa'].includes(a.status)),pace=data.teamWatches||[]; // Fail closed: never show 2025-only comparison as a record.
 if(!team.length&&!teamStats.length&&!player.length&&!pace.length)return;
 await loadTeamColors();
 css();const main=document.querySelector('main.container')||document.querySelector('main');if(!main)return;
 const block=document.createElement('div');block.id='rusSeasonRecordAlerts';
 const all=[
 group('Player Single-Season School Records','2026 player statistics exceeding documented historical school-season leaders (2000s onward where available). Historical reports may be incomplete.',player,'player'),
 group('Single-Season Team Records','New 2026 historical school season highs, verified against the RUS game archive.',team,'team'),
 group('Reported Team Stat Milestones','Passing, rushing, receiving, defensive and kicking team totals above the reported 2025 benchmark. These are not all-time records.',teamStats,'teamStats'),
 group('2026 Season Record Watch','Strongest season paces; not labeled broken until the season is complete.',pace,'pace')
 ].filter(Boolean);for(const el of all)block.appendChild(el);
 const info=document.createElement('div');
 info.setAttribute('role','status');info.style.cssText='border:1px solid #4b392e;background:#13100e;border-radius:8px;padding:11px 13px;margin:12px 0;font-size:11px;line-height:1.5;color:#d6c3b2';
 info.innerHTML='<strong style="color:#F14D07">Historical school records: coverage matters.</strong> Player season alerts now use historical Deseret school season leaderboards with at least two documented prior seasons. Some schools and categories have incomplete records; 2025-only comparisons remain excluded. All 29 published player stat categories are monitored, but only categories with reliable historical benchmarks can trigger school-record alerts.';
 block.appendChild(info);
 const existing=document.querySelector('.rus-record-alert-stack');if(existing&&existing.parentNode)existing.after(block);else main.prepend(block);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void boot().catch(console.error),{once:true});
else void boot().catch(console.error);
})();
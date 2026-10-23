(()=>{
'use strict';
// This builder uses the frozen 2026 regional roster/stats snapshot, not live playoff statistics.
if(!/all-state-watch\.html$/i.test(location.pathname))return;
const slots=['QB','RB','WR1','WR2','WR3','TE','FLEX','DL','DE','MLB','S','CB'],split=6;
const clean=v=>String(v??'').trim(),key=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const escape=v=>clean(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const token=p=>' '+clean(p.position).toUpperCase().replace(/[^A-Z0-9]+/g,' ')+' ';
const roles={QB:/\bQB\b/,RB:/\b(RB|HB|FB)\b/,WR:/\b(WR|SE|FL)\b/,TE:/\bTE\b/,FLEX:/\b(RB|HB|FB|WR|TE|ATH|SE|FL)\b/,DL:/\b(DL|DT|NT|DE)\b/,DE:/\bDE\b/,MLB:/\b(MLB|ILB|LB)\b/,S:/\b(S|FS|SS|SAF|DB)\b/,CB:/\b(CB|DB)\b/};
let region='',athletes=[],lookup=new Map(),selection={},box=null,graphic=null,generation=0;
const regionTitle=()=>/^\d+$/.test(region)?'Region '+region:region;
const siteAssets=()=>window.RUSSchoolAssets;
const src=()=>typeof view!=='undefined'&&view==='All-Region'&&typeof lockedRegionSnapshot!=='undefined'&&lockedRegionSnapshot?.status==='LOCKED'?lockedRegionSnapshot:null;
const selectedRegion=()=>typeof scope==='undefined'?'':scope;
const roleFor=s=>s.startsWith('WR')?'WR':s==='FLEX'?'FLEX':s==='DE'?'DL':s==='MLB'?'LB':s==='S'||s==='CB'?'DB':s;
const valid=(p,s)=>roles[s.startsWith('WR')?'WR':s]?.test(token(p))||false;
const n=(vals,k)=>{const v=Object.entries(vals||{}).find(([name])=>key(name)===key(k))?.[1];return v==null||v===''?null:Number(String(v).replace(/,/g,''))};
const abbrev=yr=>({2027:'SR',2028:'JR',2029:'SO',2030:'FR'})[Number(yr)]||'';
function collect(snap,scopeName){
 const teamList=new Set(snap.teamMeta.filter(t=>t.region===scopeName).map(t=>key(t.team)));
 const out=new Map(),scoring=window.RUSLockedRegionScoring;
 const contexts=scoring?.buildTeamContexts?.(snap.standings,snap.stateTop25);
 for(const [school,entry] of Object.entries(snap.data?.teams||{})){
  if(!teamList.has(key(school)))continue;
  const live=typeof data!=='undefined'?Object.entries(data?.teams||{}).find(([name])=>key(name)===key(school))?.[1]:null;
  const years=new Map((live?.roster||[]).map(p=>[p.playerId,abbrev(p.class)]));
  for(const p of entry.roster||[]){
   const id=p.playerId||school+'|'+p.number+'|'+p.name;
   out.set(id,{id,school,name:p.name||'',number:p.number||'',position:p.position||'',year:years.get(p.playerId)||'',lines:[]});
  }
  for(const stat of entry.stats||[])for(const row of stat.rows||[]){
   const id=row.playerId||school+'|'+row.number+'|'+row.name;
   if(!out.has(id))out.set(id,{id,school,name:row.name,number:row.number,position:'',year:'',lines:[]});
   out.get(id).lines.push({category:stat.category,values:row.values||{}});
  }
 }
 for(const p of out.values()){
  if(!p.position||p.position==='-')p.position=window.RUSAwardPositionCorrections2026?.[p.id]||p.position;
  p.scores={};
  for(const role of ['QB','RB','WR','TE','DL','LB','DB']){
   const base=scoring?.positionScore?.(role,p.lines)||0;
   const context=scoring?.teamContextFor?.(contexts,p.school);
   p.scores[role]=scoring?.applyTeamContext?.(base,context,'allRegion')??base;
  }
 }
 return [...out.values()].filter(p=>p.name).sort((a,b)=>a.name.localeCompare(b.name));
}
function value(p,slot){
 if(slot==='FLEX')return Math.max(p.scores.RB||0,p.scores.WR||0,p.scores.TE||0);
 return p.scores[roleFor(slot)]||0;
}
function stored(){try{return JSON.parse(localStorage.getItem('rus-region-graphic-2026:'+region)||'{}')}catch{return{}}}
function persist(){try{localStorage.setItem('rus-region-graphic-2026:'+region,JSON.stringify(selection))}catch{}}
function suggest(ignoreSaved=false){
 const old=ignoreSaved?{}:stored(),taken=new Set();selection={};
 for(const slot of ['QB','RB','WR1','WR2','WR3','TE','DE','MLB','CB','S','DL','FLEX']){
  if(old[slot]&&lookup.has(old[slot])&&!taken.has(old[slot])){selection[slot]=old[slot];taken.add(old[slot]);continue}
  const first=athletes.filter(p=>valid(p,slot)&&!taken.has(p.id)&&value(p,slot)>0)
   .sort((a,b)=>value(b,slot)-value(a,slot)||a.name.localeCompare(b.name))[0];
  selection[slot]=first?.id||'';if(first)taken.add(first.id);
 }
}
function stats(p,s){
 if(!p)return'EDIT THIS SLOT';
 const lines=p.lines||[],stat=[];
 const add=(v,name)=>{if(v!=null&&Number.isFinite(v)&&v!==0)stat.push(v.toLocaleString('en-US',{maximumFractionDigits:1})+' '+name)};
 const find=prefix=>lines.find(l=>l.category?.toLowerCase().startsWith(prefix.toLowerCase()))?.values;
 if(['DL','DE','MLB','S','CB'].includes(s)){
  const d=find('Defense');
  if(d){add(n(d,'TACKLES'),'TKL');add(n(d,'SACKS'),'SACKS');add(n(d,'PASS INT.'),'INT');add(n(d,'FUM REC'),'FR')}
 }else{
  for(const cat of s==='QB'?['Passing','Rushing']:s==='RB'||s==='FLEX'?['Rushing','Receiving']:['Receiving']){
   const d=find(cat);if(!d)continue;const prefix=cat==='Passing'?'PASS':cat==='Rushing'?'RUSH':'REC';
   add(n(d,'YARDS'),prefix+' YDS');add(n(d,'TD'),prefix+' TD');
   if(cat==='Receiving')add(n(d,'RECEPTIONS'),'REC');
   if(stat.length>=3)break;
  }
 }
 return stat.slice(0,4).join(' • ')||'STATS NOT REPORTED';
}
function image(url){
 if(!url)return Promise.resolve(null);
 try{url=new URL(url,location.href);if(url.origin!==location.origin)return Promise.resolve(null)}catch{return Promise.resolve(null)}
 return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=url.href});
}
function fit(ctx,value,max,size,min=12){
 let label=String(value);
 for(let i=size;i>=min;i--){ctx.font='900 '+i+'px Arial';if(ctx.measureText(label).width<=max)return label}
 ctx.font='900 '+min+'px Arial';
 while(label.length&&ctx.measureText(label+'…').width>max)label=label.slice(0,-1);
 return label+'…';
}
function drawImage(ctx,img,x,y,w,h){
 if(!img)return;
 const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight),iw=img.naturalWidth*scale,ih=img.naturalHeight*scale;
 ctx.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);
}
function schoolColor(name){
 const entry=typeof teams!=='undefined'?teams.find(t=>key(t.team)===key(name)):null;
 return /^#[0-9a-f]{6}$/i.test(entry?.backgroundColor||'')?entry.backgroundColor:'#F14D07';
}
async function paint(format){
 const portrait=format==='portrait',square=format==='square',w=portrait||square?1080:1600,h=portrait?1350:square?1080:900;
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');
 ctx.fillStyle='#353536';ctx.fillRect(0,0,w,h);
 const glow=ctx.createRadialGradient(w*.5,h*.53,10,w*.5,h*.53,w*.69);
 glow.addColorStop(0,'rgba(227,8,11,.8)');glow.addColorStop(.4,'rgba(152,15,19,.45)');glow.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 const margin=portrait||square?30:58,brandSize=portrait||square?80:110;
 const brand=await image('RUSlogoNew.png');drawImage(ctx,brand,margin,30,brandSize,brandSize);drawImage(ctx,brand,w-margin-brandSize,30,brandSize,brandSize);
 ctx.fillStyle='#fff';ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=5;ctx.shadowOffsetY=4;
 const name=fit(ctx,'2026 RURAL UTAH SPORTS',w-brandSize*2-margin*3,portrait||square?47:61,25);
 ctx.fillText(name,w/2,portrait||square?81:81);
 const head=fit(ctx,regionTitle().toUpperCase()+' ALL-REGION 1ST TEAM',w-margin*2,portrait||square?48:67,28);
 ctx.fillText(head,w/2,portrait||square?161:167);
 ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.font='800 '+(portrait||square?19:21)+'px Arial';
 ctx.fillStyle='#ffd6d6';ctx.fillText('RUS EDITORIAL PICKS • 2026 REGULAR SEASON',w/2,portrait||square?205:207);
 const top=portrait?269:square?256:258,bottom=h-(portrait?120:square?104:92),rh=(bottom-top)/6, gap=portrait||square?24:70,cw=(w-2*margin-gap)/2;
 const teamsUsed=[...new Set(slots.map(s=>lookup.get(selection[s])?.school).filter(Boolean))],logos=new Map();
 await Promise.all(teamsUsed.map(async team=>{logos.set(team,await image(siteAssets()?.logoUrl?.(team)||''))}));
 for(let i=0;i<slots.length;i++){
  const slot=slots[i],left=i<split,row=left?i:i-split,x=left?margin:margin+cw+gap,y=top+row*rh,p=lookup.get(selection[slot]);
  const icon=Math.min(portrait?68:square?60:67,rh*.71),tx=x+icon+16,max=cw-icon-19;
  if(p){
   ctx.fillStyle=schoolColor(p.school);ctx.fillRect(x+icon+3,y+rh*.13,3,rh*.67);
   if(logos.get(p.school))drawImage(ctx,logos.get(p.school),x,y+(rh-icon)/2,icon,icon);
   else{ctx.fillStyle='#fff';ctx.font='900 17px Arial';ctx.textAlign='center';ctx.fillText(key(p.school).slice(0,3),x+icon*.5,y+rh*.57)}
  }else{ctx.strokeStyle='#9c9999';ctx.strokeRect(x,y+(rh-icon)/2,icon,icon)}
  ctx.fillStyle='#fff';ctx.textAlign='left';ctx.shadowColor='#000';ctx.shadowBlur=4;ctx.shadowOffsetY=3;
  let label=slot+': '+(p?p.name.toUpperCase()+(p.year?' ('+p.year+')':''):'SELECTION PENDING');
  label=fit(ctx,label,max,portrait?26:square?24:32,17);ctx.fillText(label,tx,y+rh*.44);
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.fillStyle='#ffeaea';
  const sub=p?p.school.toUpperCase()+' • '+stats(p,slot):'CHOOSE A REGION PLAYER';
  ctx.fillText(fit(ctx,sub,max,portrait?15:square?14:19,11),tx,y+rh*.72);
 }
 ctx.textAlign='center';ctx.fillStyle='#eee';ctx.font='800 '+(portrait?17:square?16:18)+'px Arial';
 const missing=slots.filter(s=>!selection[s]).length;
 ctx.fillText(missing?'DRAFT • '+missing+' SELECTION'+(missing===1?'':'S')+' PENDING':'RUS PICKS • NOT OFFICIAL COACH-VOTED AWARDS',w/2,h-(portrait?67:square?56:51));
 ctx.fillStyle='#ffad90';ctx.font='800 '+(portrait?15:square?14:18)+'px Arial';
 ctx.fillText('RURALUTAHSPORTS.COM  •  @RURALUTAHSPORTS77',w/2,h-(portrait?38:square?29:23));
 return canvas;
}
function close(){box?.remove();box=null;graphic=null;generation++}
async function refresh(){
 if(!box)return;const v=++generation,save=box.querySelector('#rg-save'),share=box.querySelector('#rg-share');
 save.disabled=share.disabled=true;box.querySelector('#rg-note').textContent='Rendering saved team logos and locked regular-season statistics…';
 try{const canv=await paint(box.querySelector('#rg-size').value);if(v!==generation||!box)return;
  graphic=canv;box.querySelector('#rg-preview').src=graphic.toDataURL('image/png');
  const count=slots.filter(s=>!selection[s]).length;
  box.querySelector('#rg-note').textContent=count?count+' selections are pending. Graphic clearly marked DRAFT.':'All 13 choices filled. Review accuracy before publishing; picks are not coach-voted awards.';
  save.disabled=share.disabled=false;
 }catch(e){console.error(e);box.querySelector('#rg-note').textContent='Graphic rendering failed. Please retry.'}
}
function asBlob(){return new Promise((ok,fail)=>graphic?graphic.toBlob(b=>b?ok(b):fail(Error('PNG unavailable')),'image/png'):fail(Error('Preview still rendering')))}
function filename(){return 'RUS-2026-'+region.replace(/[^a-z0-9]+/gi,'-')+'-All-Region-1st-Team-'+box.querySelector('#rg-size').value+'.png'}
async function download(){
 try{const b=await asBlob(),url=URL.createObjectURL(b),a=document.createElement('a');a.download=filename();a.href=url;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
 catch(e){alert(e.message)}
}
async function share(){
 try{const b=await asBlob(),file=new File([b],filename(),{type:'image/png'});
  if(navigator.canShare?.({files:[file]})&&navigator.share)await navigator.share({files:[file],title:region+' All-Region Team'});
  else await download();
 }catch(e){if(e.name!=='AbortError')alert('Sharing unavailable; use Save PNG.')}
}
function open(){
 const snap=src(),sc=selectedRegion();if(!snap||!sc){alert('Choose a locked All-Region view first.');return}
 close();region=sc;athletes=collect(snap,sc);lookup=new Map(athletes.map(p=>[p.id,p]));
 if(!athletes.length){alert('No roster data is available for this region.');return}
 suggest();
 const options=slot=>{
  const matching=athletes.filter(p=>valid(p,slot)).sort((a,b)=>value(b,slot)-value(a,slot)||a.name.localeCompare(b.name));
  const others=athletes.filter(p=>!valid(p,slot));
  const toOpt=p=>'<option value="'+escape(p.id)+'">'+escape(p.name+' — '+p.school+' ('+p.position+')')+'</option>';
  return '<option value="">— Unselected —</option><optgroup label="Matching position">'+matching.map(toOpt).join('')+
   '</optgroup><optgroup label="Other region players • manual override">'+others.map(toOpt).join('')+'</optgroup>';
 };
 box=document.createElement('div');box.className='rus-region-graphic-backdrop';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
 box.innerHTML='<div class="rus-region-graphic-panel"><h2>'+escape(region)+' — 2026 All-Region First Team</h2>'+
  '<p>Edit all 12 positions. We automatically suggest the highest-ranked available players using locked regular-season statistics. Missing coach-reported stats are unknown, not zero. Your changes save only on this device and do not publish team selections to the website.</p>'+
  '<div class="rus-region-graphic-grid">'+slots.map(s=>'<div><label for="rg-'+s+'">'+s+(s==='WR1'?' (highest-ranked WR)':'')+'</label><select id="rg-'+s+'" data-slot="'+s+'">'+options(s)+'</select></div>').join('')+'</div>'+
  '<div class="rus-region-graphic-actions"><button id="rg-auto" type="button">Restore Top-Ranked Picks</button><select id="rg-size" aria-label="Graphic dimensions"><option value="landscape">Landscape · 1600 × 900</option><option value="square">Square · 1080 × 1080</option><option value="portrait">Instagram Portrait · 1080 × 1350</option></select><button id="rg-save">Save PNG</button><button id="rg-share">Share Image</button><button id="rg-close">Close</button></div>'+
  '<p id="rg-note" aria-live="polite">Only real school logos are included; otherwise school text is used.</p><img id="rg-preview" alt="Preview of your two-column All-Region first-team graphic"></div>';
 document.body.append(box);
 for(const s of slots){const sel=box.querySelector('#rg-'+s);sel.value=selection[s]||'';
  sel.addEventListener('change',()=>{const id=sel.value;if(id&&Object.entries(selection).some(([other,v])=>other!==s&&v===id)){
    alert('This player is already selected for another position.');sel.value=selection[s]||'';return}
   selection[s]=id;persist();refresh();
  });
 }
 box.querySelector('#rg-auto').onclick=()=>{if(!confirm('Replace all 12 picks with the highest-ranked available athletes from locked 2026 statistics?'))return;suggest(true);persist();for(const s of slots)box.querySelector('#rg-'+s).value=selection[s]||'';refresh()};
 box.querySelector('#rg-size').onchange=refresh;box.querySelector('#rg-save').onclick=download;
 box.querySelector('#rg-share').onclick=share;box.querySelector('#rg-close').onclick=close;
 box.addEventListener('click',e=>{if(e.target===box)close()});refresh();
}
function init(){
 const styles=document.createElement('style');styles.textContent=[
 '.rus-region-graphic-area{border-top:1px solid #333;padding-top:14px;margin-top:12px}',
 '.rus-region-graphic-btn,.rus-region-graphic-actions button{background:#F14D07;color:#000;border:0;border-radius:8px;padding:12px 16px;font-weight:900;cursor:pointer}',
 '.rus-region-graphic-area p,.rus-region-graphic-panel p{font-size:12px;color:#bbb;line-height:1.45;margin:8px 0 13px}',
 '.rus-region-graphic-backdrop{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.90);display:flex;align-items:center;justify-content:center;padding:12px}',
 '.rus-region-graphic-panel{width:min(1040px,100%);max-height:95vh;overflow:auto;background:#111;border:1px solid #555;border-top:5px solid #F14D07;padding:18px;border-radius:12px;color:#fff;font-family:Arial,sans-serif}',
 '.rus-region-graphic-panel h2{margin:0;font-size:23px}',
 '.rus-region-graphic-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 15px}',
 '.rus-region-graphic-grid label{display:block;color:#ffc2ac;font-size:11px;font-weight:900;margin:0 0 5px}',
 '.rus-region-graphic-grid select,#rg-size{display:block;width:100%;min-width:0;background:#222;color:#fff;border:1px solid #555;border-radius:6px;padding:9px;font-size:12px}',
 '.rus-region-graphic-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:16px 0}',
 '.rus-region-graphic-actions button:disabled{opacity:.55;cursor:wait}',
 '.rus-region-graphic-actions #rg-close{background:#333;color:#fff}',
 '#rg-size{width:min(235px,100%)}#rg-preview{display:block;width:100%;max-height:55vh;object-fit:contain;border:1px solid #444;background:#080808}',
 '@media(max-width:650px){.rus-region-graphic-grid{grid-template-columns:1fr}.rus-region-graphic-panel{padding:12px}.rus-region-graphic-panel h2{font-size:20px}}'
 ].join('');document.head.append(styles);
 const controls=document.querySelector('.controls');if(!controls)return;
 const area=document.createElement('div');area.className='rus-region-graphic-area';area.hidden=true;
 area.innerHTML='<button type="button" class="rus-region-graphic-btn">Create All-Region Share Graphic</button> <a id="rus-region-awards-hub-link" href="region-awards.html" style="display:inline-block;margin:8px 0 2px 8px;padding:12px 14px;border:1px solid #F14D07;border-radius:8px;color:#F14D07;font-size:12px;font-weight:900;text-decoration:none">Full Region Awards Hub →</a><p>First Team graphic, plus Second Team, honorable mentions, Region Player of the Year, school breakdowns, and editor publishing.</p>';
 controls.append(area);area.querySelector('button').onclick=open;
 const sync=()=>{area.hidden=!(src()&&selectedRegion());const link=area.querySelector('#rus-region-awards-hub-link');if(link)link.href='region-awards.html?region='+encodeURIComponent(selectedRegion())};
 for(const selector of ['#viewBtns','#scopeBtns','#results']){const el=document.querySelector(selector);if(el)new MutationObserver(sync).observe(el,{childList:true,subtree:true})}
 sync();
}
window.RUSAllRegionGraphic={open,slots:[...slots]};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
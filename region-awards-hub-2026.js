(()=>{
'use strict';
if(!/region-awards\.html$/i.test(location.pathname))return;
const YEAR=2026,BASE='https://pleggeciqvaoyxtuvczd.supabase.co',KEY='sb_publishable_xl-kjZ-aufkux3zGuNoYAw_UN9pYM_Z';
const POSITIONS=['QB','RB','WR1','WR2','WR3','TE','FLEX','DL','DE','MLB','S','CB'];
const PRIORITY=['QB','DE','MLB','CB','S','TE','RB','WR1','WR2','WR3','DL','FLEX'];
const SECTIONS=['first','second','honorable'];
const LABELS={first:'First Team',second:'Second Team',honorable:'Honorable Mention'};
const TITLES={mvp:'Region Player of the Year',opoy:'Offensive Player of the Year',dpoy:'Defensive Player of the Year'};
const selectors={
 QB:/\bQB\b/,RB:/\b(RB|HB|FB)\b/,WR:/\b(WR|SE|FL)\b/,TE:/\bTE\b/,
 FLEX:/\b(RB|HB|FB|WR|TE|ATH|SE|FL)\b/,DL:/\b(DL|DT|NT|DE)\b/,
 DE:/\bDE\b/,MLB:/\b(MLB|ILB)\b/,S:/\b(S|FS|SS|SAF)\b/,CB:/\bCB\b/
};
const backup={MLB:/\b(LB|OLB)\b/,S:/\bDB\b/,CB:/\bDB\b/,DE:/\b(DL|DT)\b/};
const el=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const norm=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const number=v=>{if(v===undefined||v===null||String(v).trim()==='')return null;const n=Number(String(v).replace(/,/g,''));return Number.isFinite(n)?n:null};
const token=p=>' '+String(p.position||'').toUpperCase().replace(/[^A-Z0-9]+/g,' ')+' ';
const slotRole=slot=>slot.startsWith('WR')?'WR':slot==='DE'?'DL':slot==='MLB'?'LB':['CB','S'].includes(slot)?'DB':slot;
const firstHalf=['QB','RB','WR1','WR2','WR3','TE'];
let snapshot=null,players=[],byID=new Map(),regions=[],region='',mode='first',picks={},winners={},status='draft',published=null,admin=false,session=null,uid='',notes='',busy=false,dirty=false,logoMap={};
function labelRegion(r){return /^\d+$/.test(r)?'Region '+r:r}
function fieldIDs(section){
 return section==='honorable'?POSITIONS.flatMap(p=>[section+':'+p+':1',section+':'+p+':2']):POSITIONS.map(p=>section+':'+p);
}
function idSlot(id){return id.split(':')[1]}
function poolFit(p,slot){return selectors[slot.startsWith('WR')?'WR':slot]?.test(token(p))||false}
function fallbackFit(p,slot){return backup[slot]?.test(token(p))||false}
function matchStatus(p,slot){if(!p)return'missing';if(poolFit(p,slot))return'accurate';if(fallbackFit(p,slot))return'review';return'override'}
function getValue(values,name){const item=Object.entries(values||{}).find(([k])=>norm(k)===norm(name));return item?number(item[1]):null}
function linesFor(p,category){return p.lines.find(l=>l.category.toLowerCase().startsWith(category.toLowerCase()))?.values||null}
function strength(p,slot){
 if(!p)return 0;
 if(slot==='FLEX')return Math.max(p.scores.RB||0,p.scores.WR||0,p.scores.TE||0);
 return p.scores[slotRole(slot)]||0;
}
function statLine(p,slot){
 if(!p)return'NO PLAYER SELECTED';
 if(['MVP','OPOY','DPOY'].includes(slot)){
  const categories=slot==='DPOY'?['Defense']:['Passing','Rushing','Receiving','Defense'];
  const lines=categories.map(category=>p.lines.find(l=>l.category.toLowerCase().startsWith(category.toLowerCase()))).filter(Boolean);
  lines.sort((a,b)=>(window.RUSLockedRegionScoring?.categoryScore?.(b.category,b.values)||0)-(window.RUSLockedRegionScoring?.categoryScore?.(a.category,a.values)||0));
  return lines.length?statLine(p,lines[0].category.toLowerCase().startsWith('defense')?'MLB':lines[0].category.toLowerCase().startsWith('passing')?'QB':lines[0].category.toLowerCase().startsWith('rushing')?'RB':'WR1'):'STATS NOT REPORTED';
 }
 const res=[],add=(v,kind)=>{if(v!==null&&v!==0&&Number.isFinite(v))res.push(v.toLocaleString('en-US',{maximumFractionDigits:1})+' '+kind)};
 if(['DL','DE','MLB','S','CB'].includes(slot)){
   const d=linesFor(p,'Defense');if(d){add(getValue(d,'TACKLES'),'TKL');add(getValue(d,'SACKS'),'SACK');add(getValue(d,'PASS INT.'),'INT');add(getValue(d,'FUM REC'),'FR');}
 }else{
   const kinds=slot==='QB'?['Passing','Rushing']:slot==='RB'||slot==='FLEX'?['Rushing','Receiving']:['Receiving'];
   for(const kind of kinds){const d=linesFor(p,kind);if(!d)continue;const prefix=kind==='Passing'?'PASS':kind==='Rushing'?'RUSH':'REC';
     add(getValue(d,'YARDS'),prefix+' YDS');add(getValue(d,'TD'),prefix+' TD');if(kind==='Receiving')add(getValue(d,'RECEPTIONS'),'REC');
   }
 }
 return res.slice(0,4).join(' · ')||'STATS NOT REPORTED';
}
function missingInfo(p,slot){
 if(!p)return'Missing selection';
 const needs=['QB'].includes(slot)?['Passing']:['RB','FLEX'].includes(slot)?['Rushing','Receiving']:['WR1','WR2','WR3','TE'].includes(slot)?['Receiving']:['Defense'];
 const reported=needs.some(x=>!!linesFor(p,x));
 return reported?'':('No '+needs.join('/')+' statistics reported');
}
function positionNote(p,slot){const kind=matchStatus(p,slot);return kind==='review'?'Position is broad on roster; verify '+slot:kind==='override'?'Manual position override; verify '+slot:''}
function logo(team){const canon=String(team||'').trim().toUpperCase();const alt=({CEDAR:'CEDAR CITY',GRAND:'GRAND COUNTY',GUNNISON:'GUNNISON VALLEY'})[canon];return logoMap[canon]||logoMap[alt]||window.RUSSchoolAssets?.customLogo?.(team)||''}
function color(team){const t=(snapshot?.teamMeta||[]).find(t=>norm(t.team)===norm(team));return /^#[0-9a-f]{6}$/i.test(t?.backgroundColor||'')?t.backgroundColor:'#F14D07'}
function playerHTML(p,slot,isWinner=false){
 if(!p)return'<span class="ar-muted">Unselected</span>';
 const warnings=isWinner?[]:[positionNote(p,slot),missingInfo(p,slot)].filter(Boolean);
 const source=logo(p.team);
 const url=source&&new URL(source,location.href).origin===location.origin?source:'';
 return '<span class="ar-player">'+(url?'<img src="'+esc(url)+'" alt="" onerror="this.remove()">':'')+
  '<span><b>'+esc(p.name)+'</b><small>'+esc(p.team)+' · '+esc(p.position||'position unlisted')+'</small>'+
  '<small>'+esc(statLine(p,slot))+'</small>'+
  warnings.map(s=>'<span class="ar-warn">⚠ '+esc(s)+'</span>').join('')+'</span></span>';
}
function collect(r){
 const teams=new Set(snapshot.teamMeta.filter(t=>t.region===r).map(t=>norm(t.team))),out=new Map();
 const scoring=window.RUSLockedRegionScoring;
 const contexts=scoring?.buildTeamContexts?.(snapshot.standings,snapshot.stateTop25);
 for(const [team,t] of Object.entries(snapshot.data.teams||{})){
  if(!teams.has(norm(team)))continue;
  for(const p of t.roster||[]){
   const id=p.playerId||team+'|'+p.number+'|'+p.name;
   out.set(id,{id,team,name:p.name,number:p.number,position:p.position||'',lines:[],scores:{}});
  }
  for(const section of t.stats||[])for(const row of section.rows||[]){
   const id=row.playerId||team+'|'+row.number+'|'+row.name;
   if(!out.has(id))out.set(id,{id,team,name:row.name,number:row.number,position:'',lines:[],scores:{}});
   out.get(id).lines.push({category:section.category,values:row.values||{}});
  }
 }
 for(const p of out.values()){
  if(!p.position||p.position==='-'){
   const verified=window.RUSAwardPositionCorrections2026?.[p.id];
   if(verified){p.position=verified;p.positionSource='MaxPreps verified roster';}
  }
  for(const role of ['QB','RB','WR','TE','DL','LB','DB']){
   const amount=scoring?.positionScore?.(role,p.lines)||0;
   const ctx=scoring?.teamContextFor?.(contexts,p.team);
   p.scores[role]=scoring?.applyTeamContext?.(amount,ctx,'allRegion')??amount;
  }
  p.offense=Math.max(p.scores.QB||0,p.scores.RB||0,p.scores.WR||0,p.scores.TE||0);
  p.defense=Math.max(p.scores.DL||0,p.scores.LB||0,p.scores.DB||0);
 }
 return [...out.values()].filter(p=>p.name).sort((a,b)=>a.name.localeCompare(b.name));
}
function candidateList(slot,used,includeUnscored=false){
 return players.filter(p=>!used.has(p.id)&&(includeUnscored||strength(p,slot)>0))
 .sort((a,b)=>{
  const ap=matchStatus(a,slot),bp=matchStatus(b,slot);
  const priority={accurate:0,review:1,override:2,missing:3};
  return priority[ap]-priority[bp]||strength(b,slot)-strength(a,slot)||a.name.localeCompare(b.name);
 });
}
function suggest(){
 const all={},used=new Set();
 for(const section of SECTIONS){
  const cycles=section==='honorable'?2:1;
  for(let index=1;index<=cycles;index++){
   for(const slot of PRIORITY){
    const id=section+':'+slot+(section==='honorable'?':'+index:'');
    // Preserve accurate exact-position candidates before fallback; never duplicate players across awards teams.
    const choices=candidateList(slot,used).filter(p=>matchStatus(p,slot)!=='override');
    const best=choices[0]||null;
    all[id]=best?.id||'';
    if(best)used.add(best.id);
   }
  }
 }
 return all;
}
function suggestWinners(){
 const offensive=players.filter(p=>p.offense>0).sort((a,b)=>b.offense-a.offense);
 const defensive=players.filter(p=>p.defense>0).sort((a,b)=>b.defense-a.defense);
 const overall=players.filter(p=>p.offense||p.defense).sort((a,b)=>Math.max(b.offense,b.defense)-Math.max(a.offense,a.defense));
 return{mvp:overall[0]?.id||'',opoy:offensive[0]?.id||'',dpoy:defensive[0]?.id||''};
}
function draftKey(){return'RUS-2026-REGION-AWARDS:'+region}
function local(){try{return JSON.parse(localStorage.getItem(draftKey())||'null')}catch{return null}}
function saveLocal(){try{localStorage.setItem(draftKey(),JSON.stringify({picks,winners,notes}))}catch{}}
function validPicks(){
 const values=Object.values(picks).filter(Boolean);
 return values.length===new Set(values).size&&values.every(id=>byID.has(id));
}
function pickChange(id,value){
 if(value&&Object.entries(picks).some(([other,v])=>other!==id&&v===value)){alert('That athlete already appears on another awards team. No duplicates are allowed.');return false;}
 picks[id]=value||'';dirty=true;saveLocal();return true;
}
function playerOptions(slot,current,expanded=false){
 const used=new Set(Object.values(picks).filter(x=>x!==current&&x));
 const choices=[...players].sort((a,b)=>{
  const category=kind=>({accurate:0,review:1,override:2})[matchStatus(kind,slot)]||3;
  return category(a)-category(b)||strength(b,slot)-strength(a,slot)||a.name.localeCompare(b.name);
 });
 const shown=expanded?choices:choices.slice(0,30).concat(current&&choices.findIndex(p=>p.id===current)>=30?[choices.find(p=>p.id===current)]:[]);
 return '<option value="">— Unselected —</option>'+shown.map(p=>'<option value="'+esc(p.id)+'"'+(p.id===current?' selected':'')+(used.has(p.id)?' disabled':'')+'>'+
 esc(p.name+' — '+p.team+' ('+(p.position||'?')+')'+(strength(p,slot)?' · '+strength(p,slot).toFixed(1):' · no reported '+slot+' points')+
 (matchStatus(p,slot)==='review'?' ⚠ verify position':matchStatus(p,slot)==='override'?' ⚠ override':''))+'</option>').join('');
}
function drawSelector(id,section){
 const slot=idSlot(id),p=byID.get(picks[id]),status=matchStatus(p,slot);
 return '<div class="ar-selection'+(status==='review'||status==='override'?' ar-attention':'')+'"><div class="ar-select-top"><strong>'+esc(slot)+(section==='honorable'?' · '+id.split(':')[2]:'')+'</strong>'+
 (p?'<span class="ar-pill">'+esc(status==='accurate'?'Position matched':status==='review'?'Verify position':'Manual override')+'</span>':'<span class="ar-warn">Empty</span>')+'</div>'+
 playerHTML(p,slot)+
 '<label class="ar-edit-label">Change player<select data-select-id="'+esc(id)+'">'+playerOptions(slot,picks[id])+'</select></label></div>';
}
function renderTeam(section){
 const ids=fieldIDs(section),left=ids.filter(id=>firstHalf.includes(idSlot(id))),right=ids.filter(id=>!firstHalf.includes(idSlot(id)));
 return '<div class="ar-columns"><div>'+left.map(id=>drawSelector(id,section)).join('')+'</div><div>'+right.map(id=>drawSelector(id,section)).join('')+'</div></div>';
}
function renderAwards(){
 return '<div class="ar-winners">'+Object.entries(TITLES).map(([role,title])=>{
  const current=winners[role],p=byID.get(current),ordered=[...players].sort((a,b)=>(role==='dpoy'?b.defense:role==='opoy'?b.offense:Math.max(b.offense,b.defense))-
  (role==='dpoy'?a.defense:role==='opoy'?a.offense:Math.max(a.offense,a.defense)));
  return '<div class="ar-winner"><strong>'+esc(title)+'</strong>'+playerHTML(p,role.toUpperCase(),true)+
   '<label class="ar-edit-label">Choose winner<select data-winner="'+role+'"><option value="">— Unselected —</option>'+
   ordered.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===current?' selected':'')+'>'+esc(x.name+' — '+x.team)+'</option>').join('')+'</select></label></div>';
 }).join('')+'</div><p class="ar-muted">Award-winner suggestions are derived from reported production only. Winners may also appear on an All-Region team.</p>';
}
function schoolBreakdown(){
 const rows=new Map();
 for(const [id,playerId] of Object.entries(picks)){const p=byID.get(playerId);if(!p)continue;
  const team=rows.get(p.team)||{team:p.team,first:0,second:0,honorable:0};
  team[id.split(':')[0]]++;rows.set(p.team,team);
 }
 const ordered=[...rows.values()].sort((a,b)=>(b.first*3+b.second*2+b.honorable)-(a.first*3+a.second*2+a.honorable)||a.team.localeCompare(b.team));
 return '<p class="ar-muted">Every selection counts. No artificial school quotas are applied.</p>'+
 '<div class="ar-tablewrap"><table><thead><tr><th>School</th><th>1st</th><th>2nd</th><th>HM</th><th>Total</th></tr></thead><tbody>'+
 ordered.map(r=>'<tr><td>'+esc(r.team)+'</td><td>'+r.first+'</td><td>'+r.second+'</td><td>'+r.honorable+'</td><td>'+Number(r.first+r.second+r.honorable)+'</td></tr>').join('')+
 '</tbody></table></div>';
}
function editorWarnings(){
 const problems=[];
 for(const [id,playerId] of Object.entries(picks)){
  if(!playerId)continue;
  const p=byID.get(playerId),slot=idSlot(id);
  if(!p){problems.push(id+': player no longer in locked roster');continue}
  const positional=positionNote(p,slot),missing=missingInfo(p,slot);
  if(positional)problems.push(LABELS[id.split(':')[0]]+' '+slot+': '+p.name+' — '+positional);
  if(missing)problems.push(LABELS[id.split(':')[0]]+' '+slot+': '+p.name+' — '+missing);
 }
 const count=fieldIDs('first').filter(id=>!picks[id]).length;
 if(count)problems.unshift(count+' First-Team spot(s) remain unfilled');
 return problems;
}
function tabs(){
 return '<div class="ar-tabs">'+[...SECTIONS,'winners','summary'].map(m=>'<button data-mode="'+m+'" class="'+(mode===m?'active':'')+'">'+
 esc(LABELS[m]||(m==='winners'?'Region Award Winners':'School Breakdown'))+'</button>').join('')+'</div>';
}
function render(){
 if(!snapshot)return;
 el('#ar-heading').textContent='2026 '+labelRegion(region)+' All-Region Awards';
 el('#ar-region').value=region;
 el('#ar-status').textContent=published?'Published publicly · '+new Date(published.published_at||published.updated_at).toLocaleString()+(dirty?' · unsaved changes':''):'Not yet published · editorial draft';
 el('#ar-tabs').innerHTML=tabs();
 const body=mode==='winners'?renderAwards():mode==='summary'?schoolBreakdown():renderTeam(mode);
 el('#ar-content').innerHTML=body;
 const warnings=editorWarnings();
 el('#ar-warnings').innerHTML='<strong>Accuracy review</strong> · '+warnings.length+' item(s) flagged for review.'+
 (warnings.length?'<details><summary>View warnings</summary><ul>'+warnings.slice(0,70).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></details>':
 '<p>No missing data or broad positions detected in currently selected player records.</p>');
 el('#ar-auto').disabled=Boolean(published&&!admin);
 el('#ar-note').disabled=Boolean(published&&!admin);
 el('#ar-publish').disabled=!admin||busy;
 el('#ar-save').disabled=!admin||busy;
 el('#ar-publish').textContent=published?'Update Published Region':'Finalize & Publish Region';
 el('#ar-preview-status').textContent=admin?'Approved editor access':session?'Signed in, but this account is not yet approved as an awards editor. Drafts remain local.':'Sign in and obtain editor approval to save drafts or publish to the live website.';
 el('#ar-editor').hidden=admin;
 el('#ar-auth-status').textContent=session?(admin?'Editor approved':'Signed in; editor approval required. Account ID: '+(uid||'still loading')):'Not signed in';
 el('#ar-note').value=notes;
 el('#ar-tabs').querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;render()});
 el('#ar-content').querySelectorAll('[data-select-id]').forEach(s=>{
  s.onfocus=()=>{if(s.dataset.loaded==='1')return;const id=s.dataset.selectId,slot=idSlot(id);s.innerHTML=playerOptions(slot,picks[id],true);s.value=picks[id]||'';s.dataset.loaded='1'};
  s.onchange=()=>{if(!pickChange(s.dataset.selectId,s.value)){s.value=picks[s.dataset.selectId]||''}render()};
 });
 el('#ar-content').querySelectorAll('[data-winner]').forEach(s=>s.onchange=()=>{winners[s.dataset.winner]=s.value;dirty=true;saveLocal();render()});
 const locked=published&&(!admin);
 if(locked)el('#ar-content').querySelectorAll('select').forEach(s=>s.disabled=true);
}
async function api(path,options={}){
 const token=session?.access_token;
 const headers={apikey:KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(options.headers||{})};
 let response=await fetch(BASE+path,{...options,headers});
 if(response.status===401&&session?.refresh_token&&path.startsWith('/rest/')){
  const refreshed=await renew();
  if(refreshed)response=await fetch(BASE+path,{...options,headers:{...headers,Authorization:'Bearer '+session.access_token}});
 }
 const raw=await response.text();let body=null;try{body=raw?JSON.parse(raw):null}catch{body={error:raw}}
 if(!response.ok)throw Error(body?.message||body?.error_description||body?.error||'Request failed ('+response.status+')');
 return body;
}
async function renew(){
 try{const response=await fetch(BASE+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
 if(!response.ok)return false;session=await response.json();localStorage.setItem('rus-award-auth-2026',JSON.stringify(session));return true}catch{return false}
}
function authRestore(){
 try{session=JSON.parse(localStorage.getItem('rus-award-auth-2026')||'null')}catch{session=null}
 const fragment=new URLSearchParams(location.hash.slice(1));
 if(fragment.get('access_token')&&fragment.get('refresh_token')){
  session={access_token:fragment.get('access_token'),refresh_token:fragment.get('refresh_token')};
  localStorage.setItem('rus-award-auth-2026',JSON.stringify(session));
  history.replaceState(null,'',location.pathname+location.search);
 }
}
async function checkEditor(){
 admin=false;uid='';
 if(!session?.access_token)return;
 try{const user=await api('/auth/v1/user');uid=user?.id||'';
 const list=await api('/rest/v1/rus_award_editors?user_id=eq.'+encodeURIComponent(uid)+'&select=user_id');
 admin=Array.isArray(list)&&list.length>0;
 }catch{session=null;localStorage.removeItem('rus-award-auth-2026')}
}
async function readPublication(){
 published=null;dirty=false;
 try{const rows=await api('/rest/v1/rus_region_awards?season=eq.'+YEAR+'&region=eq.'+encodeURIComponent(region)+'&select=*');
 const record=Array.isArray(rows)?rows[0]:null;
 if(record&&record.status==='published')published=record;
 if(record&&admin){
  picks={...suggest(),...(record.selections?.picks||{})};
  winners={...suggestWinners(),...(record.winners||{})};
  notes=record.editorial_notes||'';
 }else if(published){
  picks={...suggest(),...(record.selections?.picks||{})};
  winners={...suggestWinners(),...(record.winners||{})};
  notes=record.editorial_notes||'';
 }else{
  const draft=local();
  picks={...suggest(),...(draft?.picks||{})};
  winners={...suggestWinners(),...(draft?.winners||{})};
  notes=draft?.notes||'';
  // Preserve first-team picks created in the original template, if no advanced draft exists.
  if(!draft){try{const old=JSON.parse(localStorage.getItem('rus-region-graphic-2026:'+region)||'{}');
   for(const position of POSITIONS)if(old[position]&&byID.has(old[position]))picks['first:'+position]=old[position];
  }catch{}}
 }
 }catch(err){console.warn('Region publication lookup:',err);const draft=local();
  picks={...suggest(),...(draft?.picks||{})};winners={...suggestWinners(),...(draft?.winners||{})};notes=draft?.notes||'';
  el('#ar-error').textContent='Published award records are temporarily unavailable; showing a local draft only.';
 }
}
async function setRegion(r){
 if(!regions.includes(r))return;
 region=r;players=collect(r);byID=new Map(players.map(p=>[p.id,p]));mode='first';el('#ar-error').textContent='';
 await readPublication();render();
 const u=new URL(location.href);u.searchParams.set('region',r);history.replaceState(null,'',u.pathname+u.search);
}
async function save(statusValue){
 if(!admin||!uid){alert('You must be an approved editor to save or publish awards.');return}
 if(!validPicks()){alert('Duplicate or invalid players found. Please fix selections.');return}
 if(statusValue==='published'&&fieldIDs('first').some(id=>!picks[id])){alert('Complete every First Team slot before publishing.');return}
 if(statusValue==='published'&&fieldIDs('second').some(id=>!picks[id])){alert('Complete every Second Team slot before publishing.');return}
 if(statusValue==='published'&&Object.keys(TITLES).some(id=>!winners[id])){alert('Select all three region award winners before publishing.');return}
 if(statusValue==='draft'&&published&&!confirm('Saving a draft will temporarily unpublish this region. Continue?'))return;
 if(statusValue==='published'&&!confirm('Publish '+labelRegion(region)+' awards for everyone to see? Confirm that players, schools, positions, and missing statistics have been reviewed.'))return;
 busy=true;render();el('#ar-error').textContent='';
 try{
 const row={season:YEAR,region,status:statusValue,selections:{picks},winners,editorial_notes:notes,updated_by:uid,updated_at:new Date().toISOString(),published_at:statusValue==='published'?new Date().toISOString():null};
 await api('/rest/v1/rus_region_awards?on_conflict=season,region',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(row)});
 saveLocal();await readPublication();el('#ar-error').textContent=statusValue==='published'?'Region published successfully. Visitors can now view the awards.':'Draft securely saved to the website.';
 }catch(err){el('#ar-error').textContent='Could not save to website: '+err.message;}finally{busy=false;render()}
}
function fileName(section,format){return'RUS-2026-'+region.replace(/[^a-z0-9]+/gi,'-')+'-'+section+'-'+format+'.png'}
function safeLogo(team){
 const candidate=logo(team);if(!candidate)return'';
 try{const u=new URL(candidate,location.href);return u.origin===location.origin?u.href:''}catch{return''}
}
function loadLogo(u){return new Promise(resolve=>{if(!u){resolve(null);return}const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=u})}
function drawLogo(ctx,img,x,y,dim){
 if(!img)return false;const k=Math.min(dim/img.naturalWidth,dim/img.naturalHeight);
 ctx.drawImage(img,x+(dim-img.naturalWidth*k)/2,y+(dim-img.naturalHeight*k)/2,img.naturalWidth*k,img.naturalHeight*k);return true;
}
function fitted(ctx,t,max,start,min=11){
 for(let sz=start;sz>=min;sz--){ctx.font='900 '+sz+'px Arial';if(ctx.measureText(t).width<=max)return t}
 ctx.font='900 '+min+'px Arial';let v=t;while(v.length>2&&ctx.measureText(v+'…').width>max)v=v.slice(0,-1);return v+'…';
}
async function graphicFor(section,format){
 const portrait=format==='portrait',landscape=format==='landscape',w=landscape?1600:1080,h=landscape?900:portrait?1350:1080;
 const cvs=document.createElement('canvas');cvs.width=w;cvs.height=h;const ctx=cvs.getContext('2d');const centerX=w/2;
 ctx.fillStyle='#333436';ctx.fillRect(0,0,w,h);
 const grad=ctx.createRadialGradient(w*.5,h*.52,0,w*.5,h*.52,w*.72);
 grad.addColorStop(0,'rgba(225,17,17,.76)');grad.addColorStop(.48,'rgba(106,18,18,.44)');grad.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
 const margin=landscape?60:34,bigLogo=landscape?104:84;
 const brand=await loadLogo(new URL('RUSlogoNew.png',location.href).href);
 drawLogo(ctx,brand,margin,30,bigLogo);drawLogo(ctx,brand,w-margin-bigLogo,30,bigLogo);
 ctx.textAlign='center';ctx.fillStyle='#fff';ctx.shadowColor='#000';ctx.shadowBlur=5;ctx.shadowOffsetY=3;
 const line1=fitted(ctx,'2026 RURAL UTAH SPORTS',w-2*bigLogo-3*margin,landscape?62:45,25);
 ctx.fillText(line1,centerX,landscape?90:80);
 let sub=section==='winners'?'REGION AWARD WINNERS':section==='first'?'ALL-REGION 1ST TEAM':section==='second'?'ALL-REGION 2ND TEAM':'HONORABLE MENTION';
 const line2=fitted(ctx,labelRegion(region).toUpperCase()+' · '+sub,w-2*margin,landscape?67:49,28);
 ctx.fillText(line2,centerX,landscape?166:165);ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 ctx.font='800 '+(landscape?20:17)+'px Arial';ctx.fillStyle='#ffe4de';
 ctx.fillText(published&&!dirty?'RUS EDITORIAL AWARDS • 2026 REGULAR SEASON':'RUS EDITORIAL DRAFT • NOT FINAL AWARDS',centerX,landscape?209:209);
 const ids=section==='winners'?['mvp','opoy','dpoy']:fieldIDs(section);
 const left=ids.filter((id,i)=>section==='winners'?i<2:firstHalf.includes(idSlot(id)));
 const right=ids.filter((id,i)=>section==='winners'?i>=2:!firstHalf.includes(idSlot(id)));
 const lines=Math.max(left.length,right.length),top=landscape?260:260,bottom=h-(portrait?112:landscape?98:92),rowHeight=(bottom-top)/lines;
 const gap=landscape?65:21,cw=(w-2*margin-gap)/2,imgs=new Map();
 const used=[...new Set(ids.map(id=>byID.get(section==='winners'?winners[id]:picks[id])?.team).filter(Boolean))];
 await Promise.all(used.map(async team=>imgs.set(team,await loadLogo(safeLogo(team)))));
 for(const [col,arr] of [[0,left],[1,right]]){
  const x=margin+col*(cw+gap);
  for(let i=0;i<arr.length;i++){
   const id=arr[i],slot=section==='winners'?id.toUpperCase():idSlot(id),p=byID.get(section==='winners'?winners[id]:picks[id]);
   const y=top+i*rowHeight,logoDim=Math.min(section==='honorable'?45:65,rowHeight*.73),tx=x+logoDim+12,maxText=cw-logoDim-18;
   if(p){
    ctx.fillStyle=color(p.team);ctx.fillRect(x+logoDim+2,y+rowHeight*.15,3,rowHeight*.66);
    if(!drawLogo(ctx,imgs.get(p.team),x,y+(rowHeight-logoDim)/2,logoDim)){
     ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='900 15px Arial';ctx.fillText(norm(p.team).slice(0,3),x+logoDim/2,y+rowHeight*.54);
    }
   }
   ctx.textAlign='left';ctx.fillStyle='#fff';ctx.shadowColor='#000';ctx.shadowBlur=4;ctx.shadowOffsetY=3;
   const title=(section==='winners'?({MVP:'MVP',OPOY:'OPOY',DPOY:'DPOY'})[slot]:slot)+': '+(p?p.name.toUpperCase():'PENDING');
   ctx.fillText(fitted(ctx,title,maxText,section==='honorable'?(landscape?20:17):landscape?31:24,12),tx,y+rowHeight*.43);
   ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.fillStyle='#ffefec';
   let detail=p?p.team.toUpperCase()+' · '+statLine(p,slot):'SELECTION NOT VERIFIED';
   ctx.fillText(fitted(ctx,detail,maxText,section==='honorable'?12:landscape?19:14,10),tx,y+rowHeight*.73);
  }
 }
 ctx.textAlign='center';ctx.font='800 '+(landscape?17:14)+'px Arial';ctx.fillStyle='#fff';
 ctx.fillText((published&&!dirty?'PUBLISHED':'DRAFT · UNVERIFIED')+'  •  RURALUTAHSPORTS.COM  •  @RURALUTAHSPORTS77',centerX,h-35);
 return cvs;
}
async function downloadGraphic(){
 const section=el('#ar-share-section').value,format=el('#ar-share-format').value,btn=el('#ar-download');
 btn.disabled=true;btn.textContent='Rendering…';
 try{
 const cvs=await graphicFor(section,format);
 const blob=await new Promise((resolve,reject)=>cvs.toBlob(b=>b?resolve(b):reject(Error('PNG could not be rendered')),'image/png'));
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=fileName(section,format);
 document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }catch(e){el('#ar-error').textContent='Graphic download failed: '+e.message}
 finally{btn.disabled=false;btn.textContent='Download Graphic'}
}
function exportDraft(){
 const backup=JSON.stringify({season:YEAR,region,picks,winners,notes,source:'2026 locked region snapshot',exportedAt:new Date().toISOString()},null,2);
 const url=URL.createObjectURL(new Blob([backup],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='RUS-'+YEAR+'-'+region.replace(/[^a-z0-9]+/gi,'-')+'-awards-backup.json';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
async function sendEmail(){
 const email=el('#ar-email').value.trim();if(!email)return;
 try{await api('/auth/v1/otp?redirect_to='+encodeURIComponent(location.origin+location.pathname),{method:'POST',body:JSON.stringify({email,create_user:true,options:{email_redirect_to:location.origin+location.pathname}})});
 el('#ar-error').textContent='Login email requested. Enter the emailed code below, or follow its secure sign-in link.';
 }catch(e){el('#ar-error').textContent='Could not request login: '+e.message}
}
async function confirmCode(){
 const email=el('#ar-email').value.trim(),code=el('#ar-code').value.trim();if(!email||!code)return;
 try{
 const data=await api('/auth/v1/verify',{method:'POST',body:JSON.stringify({email,token:code,type:'email'})});
 if(!data.access_token)throw Error('No session was returned');
 session=data;localStorage.setItem('rus-award-auth-2026',JSON.stringify(session));
 await checkEditor();await readPublication();render();
 el('#ar-error').textContent=admin?'Editor access confirmed. Drafts can now be saved and published.':'Signed in. Editor approval is still required to publish.';
 }catch(e){el('#ar-error').textContent='Email code could not be verified: '+e.message}
}
async function init(){
 el('#ar-error').textContent='Loading locked regular-season region data…';
 try{
 const [r,logos]=await Promise.all([fetch('region-awards-2026.lock.json?v=20261023-lock-1',{cache:'no-store'}),fetch('school-logo-cache.json?v=20261023-hub1').catch(()=>null)]);
 if(!r.ok)throw Error('Locked awards data could not be read');snapshot=await r.json();
 if(logos?.ok){const saved=await logos.json();if(saved&&typeof saved==='object')logoMap=saved;}
 if(snapshot.status!=='LOCKED')throw Error('Expected a locked regular-season snapshot');
 await Promise.all([window.RUSSchoolAssets?.load?.().catch(()=>{})||Promise.resolve()]);
 regions=[...new Set(snapshot.teamMeta.map(t=>t.region).filter(r=>r&&r!=='Independant'))].sort((a,b)=>{
  const aNum=/^\d+$/.test(a)?Number(a):Infinity,bNum=/^\d+$/.test(b)?Number(b):Infinity;
  return aNum-bNum||a.localeCompare(b,undefined,{numeric:true});
 });
 el('#ar-region').innerHTML=regions.map(r=>'<option value="'+esc(r)+'">'+esc(labelRegion(r))+'</option>').join('');
 authRestore();await checkEditor();
 const initial=new URLSearchParams(location.search).get('region'),chosen=regions.includes(initial)?initial:regions.includes('3A North')?'3A North':regions[0];
 await setRegion(chosen);el('#ar-error').textContent='';
 el('#ar-region').addEventListener('change',e=>setRegion(e.target.value));
 el('#ar-save').onclick=()=>save('draft');
 el('#ar-publish').onclick=()=>save('published');
 el('#ar-auto').onclick=()=>{if(!confirm('Replace the current First Team, Second Team, and Honorable Mention selections with highest-scoring eligible players?'))return;
  picks=suggest();winners=suggestWinners();dirty=true;saveLocal();render()};
 el('#ar-note').onchange=e=>{notes=e.target.value;dirty=true;saveLocal();render()};
 el('#ar-download').onclick=downloadGraphic;
 el('#ar-backup').onclick=exportDraft;
 el('#ar-email-send').onclick=sendEmail;
 el('#ar-code-verify').onclick=confirmCode;
 el('#ar-signout').onclick=()=>{localStorage.removeItem('rus-award-auth-2026');session=null;admin=false;uid='';setRegion(region)};
 }catch(e){console.error(e);el('#ar-error').textContent='Unable to load the awards hub: '+e.message}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
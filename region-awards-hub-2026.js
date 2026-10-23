(()=>{
'use strict';
if(!/region-awards\.html$/i.test(location.pathname))return;
const YEAR=2026,PIN_URL='https://pleggeciqvaoyxtuvczd.supabase.co/functions/v1/rus-awards-pin',BASE='https://pleggeciqvaoyxtuvczd.supabase.co',KEY='sb_publishable_xl-kjZ-aufkux3zGuNoYAw_UN9pYM_Z';
const POSITIONS=['QB','RB','WR1','WR2','WR3','TE','FLEX','DL','DE','MLB','S','CB','K','P','RS'];
const SPECIAL_POSITIONS=['K','P','RS'];
const specialLabel={K:'Kicker',P:'Punter',RS:'KR/PR Return Specialist'};
const slotLabel=slot=>specialLabel[slot]||slot;
const PRIORITY=['QB','DE','MLB','CB','S','TE','RB','WR1','WR2','WR3','DL','FLEX','K','P','RS'];
const SECTIONS=['first','second','honorable'];
const LABELS={first:'First Team',second:'Second Team',honorable:'Honorable Mention'};
const TITLES={mvp:'Region Player of the Year',opoy:'Offensive Player of the Year',dpoy:'Defensive Player of the Year'};
const selectors={
 QB:/\bQB\b/,RB:/\b(RB|HB|FB)\b/,WR:/\b(WR|SE|FL)\b/,TE:/\bTE\b/,
 FLEX:/\b(RB|HB|FB|WR|TE|ATH|SE|FL)\b/,DL:/\b(DL|DT|NT|DE)\b/,
 DE:/\bDE\b/,MLB:/\b(MLB|ILB)\b/,S:/\b(S|FS|SS|SAF)\b/,CB:/\bCB\b/,
 K:/\b(K|PK)\b/,P:/\b(P|PUNT)\b/,RS:/\b(KR|PR|RS|RET)\b/
};
const backup={MLB:/\b(LB|OLB)\b/,S:/\bDB\b/,CB:/\bDB\b/,DE:/\b(DL|DT)\b/};
const el=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const norm=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const number=v=>{if(v===undefined||v===null||String(v).trim()==='')return null;const n=Number(String(v).replace(/,/g,''));return Number.isFinite(n)?n:null};
const token=p=>' '+String(p.position||'').toUpperCase().replace(/[^A-Z0-9]+/g,' ')+' ';
const slotRole=slot=>slot.startsWith('WR')?'WR':slot==='DE'?'DL':slot==='MLB'?'LB':['CB','S'].includes(slot)?'DB':slot;
const firstHalf=['QB','RB','WR1','WR2','WR3','TE'];
let snapshot=null,players=[],byID=new Map(),regions=[],region='',mode='first',picks={},winners={},status='draft',published=null,admin=false,session=null,uid='',notes='',busy=false,dirty=false,logoMap={},regionLocked=false,syncTimer=null,syncPending=false;
function labelRegion(r){return /^\d+$/.test(r)?'Region '+r:r}
function fieldIDs(section){
 return section==='honorable'?POSITIONS.flatMap(p=>[section+':'+p+':1',section+':'+p+':2']):POSITIONS.map(p=>section+':'+p);
}
const sideFor=slot=>['DL','DE','MLB','S','CB'].includes(slot)?'defense':slot==='K'?'kicking':slot==='P'?'punting':slot==='RS'?'returns':'offense';
function idSlot(id){return id.split(':')[1]}
function poolFit(p,slot){return selectors[slot.startsWith('WR')?'WR':slot]?.test(token(p))||false}
function fallbackFit(p,slot){return backup[slot]?.test(token(p))||false}
function matchStatus(p,slot){if(!p)return'missing';if(poolFit(p,slot))return'accurate';if(fallbackFit(p,slot))return'review';return'override'}
function getValue(values,name){const item=Object.entries(values||{}).find(([k])=>norm(k)===norm(name));return item?number(item[1]):null}
function linesFor(p,category){return p.lines.find(l=>l.category.toLowerCase().startsWith(category.toLowerCase()))?.values||null}
function returnStats(p,kind){return (kind==='kick'?(linesFor(p,'Kickoff Returns')||linesFor(p,'Kick Returns')):linesFor(p,'Punt Returns'))}
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
 if(SPECIAL_POSITIONS.includes(slot)){
   if(slot==='K'){const d=linesFor(p,'Kicking');if(d){add(getValue(d,'FG'),'FG');add(getValue(d,'PAT'),'PAT');add(getValue(d,'Pts'),'PTS');}}
   if(slot==='P'){const d=linesFor(p,'Punting');if(d){add(getValue(d,'PUNTS'),'PUNTS');add(getValue(d,'YARDS'),'PUNT YDS');add(getValue(d,'AVG'),'YDS/PN');}}
   if(slot==='RS'){for(const kind of ['kick','punt']){const d=returnStats(p,kind);if(d){add(getValue(d,'YARDS'),kind==='kick'?'KR YDS':'PR YDS');add(getValue(d,'TD'),kind==='kick'?'KR TD':'PR TD');}}}
   return res.join(' · ')||(slot==='K'?'KICKING STATS NOT REPORTED':slot==='P'?'PUNT STATS NOT REPORTED':'KR/PR STATS NOT REPORTED');
 }else if(['DL','DE','MLB','S','CB'].includes(slot)){
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
 const needs=slot==='K'?['Kicking']:slot==='P'?['Punting']:slot==='RS'?['Kickoff Returns','Kick Returns','Punt Returns']:['QB'].includes(slot)?['Passing']:['RB','FLEX'].includes(slot)?['Rushing','Receiving']:['WR1','WR2','WR3','TE'].includes(slot)?['Receiving']:['Defense'];
 const reported=needs.some(x=>!!linesFor(p,x));
 return reported?'':(slot==='P'?'Punting production not included in the locked 2026 snapshot; confirm with a coach or scorebook':slot==='RS'?'Kick/punt return production not included in the locked 2026 snapshot; confirm with a coach or scorebook':'No '+needs.join('/')+' statistics reported');
}
function positionNote(p,slot){const verification=p?.positionAudit;if(verification?.[1]==='source_difference')return 'Roster positions differ: Deseret/saved roster '+(verification[2]||verification[0]||'not listed')+'; MaxPreps '+(verification[3]||'not listed')+'. Verify '+slot;if(verification?.[1]==='identity_review')return 'Name or jersey match needs review before confirming '+slot;const kind=matchStatus(p,slot);const correction=window.RUSAwardPositionCorrections2026Status?.[p?.id]||'';if(/mismatch/.test(correction))return 'MaxPreps and Deseret roster details differ; verify athlete identity and '+slot;return unlistedPosition(p)?'Position unverified — confirm '+slot+' before selecting':kind==='review'?'Position is broad on roster; verify '+slot:kind==='override'?'Manual position override; verify '+slot:kind==='missing'?'Position not reported; editorial verification required':''}
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
   out.set(id,{id,team,name:p.name,number:p.number,position:p.position||'',grade:p.class||p.grade||'',lines:[],scores:{}});
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
  const audit=window.RUSAwardPositionAudit2026?.[p.id];
  if(audit){p.positionAudit=audit;if(audit[0])p.position=audit[0];if(audit[4])p.grade=audit[4];}
  for(const role of ['QB','RB','WR','TE','DL','LB','DB']){
   const amount=window.RUSAwardRoleScoring2026?.forRole?.(scoring,role,p.lines)??0;
   const ctx=scoring?.teamContextFor?.(contexts,p.team);
   p.scores[role]=scoring?.applyTeamContext?.(amount,ctx,'allRegion')??amount;
  }
  p.scores.K=scoring?.kickingScore?.(linesFor(p,'Kicking')||{})||0;
  // No verified individual punting or separate KR/PR data exists in the 2026 locked snapshot.
  // Do not auto-rank P or RS from tackles, defensive return TDs, or guessed statistics.
  p.scores.P=0;p.scores.RS=0;
  p.offense=Math.max(p.scores.QB||0,p.scores.RB||0,p.scores.WR||0,p.scores.TE||0);
  p.defense=Math.max(p.scores.DL||0,p.scores.LB||0,p.scores.DB||0);
 }
 return [...out.values()].filter(p=>p.name).sort((a,b)=>a.name.localeCompare(b.name));
}
function candidateList(slot,used,includeUnscored=false){
 return players.filter(p=>!used.has(p.id)&&(includeUnscored||strength(p,slot)>0))
 .sort((a,b)=>{
  // Ranked production is the primary consideration; a broad DB or LB label
  // can never hide a clearly higher-rated eligible athlete.
  const priority={accurate:0,review:1,override:2,missing:3};
  return strength(b,slot)-strength(a,slot)||
    priority[matchStatus(a,slot)]-priority[matchStatus(b,slot)]||a.name.localeCompare(b.name);
 });
}
// Score both DB positions together so a DB who can play either spot does not
// block the only eligible corner or safety. Never fabricate a specific position.
function bestSecondaryPair(used){
 const dbPool=candidateList('CB',used).filter(p=>
  matchStatus(p,'S')!=='override'||matchStatus(p,'CB')!=='override').slice(0,90);
 const safety=dbPool.filter(p=>matchStatus(p,'S')!=='override');
 const corners=dbPool.filter(p=>matchStatus(p,'CB')!=='override');
 let best=null;
 for(const s of safety)for(const cb of corners){
  if(s.id===cb.id)continue;
  const score=strength(s,'S')+strength(cb,'CB');
  const exact=Number(matchStatus(s,'S')==='accurate')+Number(matchStatus(cb,'CB')==='accurate');
  const names=s.name+'|'+cb.name;
  if(!best||score>best.score||
    (score===best.score&&(exact>best.exact||(exact===best.exact&&names<best.names)))){
    best={s,cb,score,exact,names};
  }
 }
 if(best)return{S:best.s,CB:best.cb};
 // Some small regions only have one documented DB. Fill whichever position
 // that player actually qualifies for, leaving the other slot unselected.
 const topS=safety[0]||null,topCB=corners[0]||null;
 if(!topS&&!topCB)return{S:null,CB:null};
 if(topS&&!topCB)return{S:topS,CB:null};
 if(topCB&&!topS)return{S:null,CB:topCB};
 return strength(topS,'S')>=strength(topCB,'CB')?{S:topS,CB:null}:{S:null,CB:topCB};
}
function blankPicks(){return Object.fromEntries(SECTIONS.flatMap(fieldIDs).map(id=>[id,'']))}
function blankWinners(){return {mvp:'',opoy:'',dpoy:''}}
function suggest(){
 const all={},usedBySide={offense:new Set(),defense:new Set(),kicking:new Set(),punting:new Set(),returns:new Set()};
 for(const section of SECTIONS){
  const cycles=section==='honorable'?2:1;
  for(let index=1;index<=cycles;index++){
   for(const slot of PRIORITY){
    const used=usedBySide[sideFor(slot)];
    const id=section+':'+slot+(section==='honorable'?':'+index:'');
    // Special teams have no verified punting/return production in the locked snapshot.
    // Keep manually reviewed choices instead of replacing them with invented rankings.
    if(slot==='P'||slot==='RS'){all[id]=picks[id]||'';continue;}
    if(slot==='S')continue; // S and CB are chosen as one rated defensive-back pair.
    if(slot==='CB'){
      const pair=bestSecondaryPair(used);
      for(const position of ['S','CB']){
        const pick=pair[position];
        const id=section+':'+position+(section==='honorable'?':'+index:'');
        all[id]=pick?.id||'';
        if(pick)used.add(pick.id);
      }
      continue;
    }
    const best=candidateList(slot,used).find(p=>matchStatus(p,slot)!=='override')||null;
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
async function pinApi(action,extra={}){
 const token=localStorage.getItem('rus-awards-pin-token')||'';
 const r=await fetch(PIN_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,token,...extra})});
 const data=await r.json();if(!r.ok)throw Error(data.error||'PIN service unavailable');return data;
}
async function pinUnlock(){
 const pin=el('#ar-pin').value.trim(),message=el('#ar-pin-message');
 if(!/^[0-9]{6}$/.test(pin)){message.textContent='Enter all six digits.';return}
 const button=el('#ar-pin-submit');button.disabled=true;message.textContent='Verifying…';
 try{const data=await pinApi('login',{pin});localStorage.setItem('rus-awards-pin-token',data.token);el('#ar-pin').value='';admin=true;el('#ar-pin-panel').hidden=true;await setRegion(region);message.textContent='';}
 catch(e){message.textContent=e.message;}
 finally{button.disabled=false}
}
function draftKey(){return'RUS-2026-REGION-AWARDS:'+region}
function local(){try{return JSON.parse(localStorage.getItem(draftKey())||'null')}catch{return null}}
function saveLocal(){try{localStorage.setItem(draftKey(),JSON.stringify({picks,winners,notes}))}catch{};scheduleCloudSave()}
function scheduleCloudSave(){
 if(!admin||regionLocked||published||busy)return;
 clearTimeout(syncTimer);const target=region;
 syncTimer=setTimeout(async()=>{if(region!==target||regionLocked||published||busy)return;
  syncPending=true;el('#ar-preview-status').textContent='Syncing draft to website…';
  try{await writeRegion('draft');dirty=false;el('#ar-preview-status').textContent='Draft synced across devices';}
  catch(e){el('#ar-error').textContent='Sync failed. Your draft is still saved on this device: '+e.message;}
  finally{syncPending=false;}
 },850);
}
async function writeRegion(statusValue){
 if(!admin)throw Error('Unlock the editor with your PIN first');
 const row={season:YEAR,region,status:statusValue,selections:{picks,locked:regionLocked},winners,editorial_notes:notes,updated_by:null,updated_at:new Date().toISOString(),published_at:statusValue==='published'?(published?.published_at||new Date().toISOString()):null};
 await pinApi('save',{region,record:row});
}
async function toggleRegionLock(){
 if(!admin){el('#ar-error').textContent='Editor verification is required before changing the lock on the shared website.';return}
 if(syncPending){el('#ar-error').textContent='Finish syncing the current draft before changing the lock.';return}
 clearTimeout(syncTimer);
 const next=!regionLocked;
 if(next&&!confirm('Lock '+labelRegion(region)+'? Selections will become read-only on all devices until you unlock it.'))return;
 const previous=regionLocked;regionLocked=next;busy=true;render();
 try{await writeRegion(published?'published':'draft');await readPublication();el('#ar-error').textContent=next?'Region locked on all devices.':'Region unlocked on all devices.';}
 catch(e){regionLocked=previous;el('#ar-error').textContent='Could not update shared lock: '+e.message;}
 finally{busy=false;render()}
}
function validPicks(){
 const entries=Object.entries(picks).filter(([,player])=>player);
 const keys=entries.map(([field,player])=>sideFor(idSlot(field))+':'+player);
 return keys.length===new Set(keys).size&&entries.every(([,player])=>byID.has(player));
}
function pickChange(id,value){
 if(regionLocked||!admin)return false;
 const assigned=assignmentOf(value,id);
 if(assigned){
  const player=byID.get(value);
  if(!confirm((player?.name||'This player')+' is currently on '+selectionTitle(assigned)+'. Move them to '+selectionTitle(id)+'? The previous slot will be cleared.'))return false;
  picks[assigned]='';
 }
 picks[id]=value||'';dirty=true;saveLocal();return true;
}
// Keep the normal chooser focused on players with a matching reported position.
// A separate, explicit search permits editorial overrides without flooding the dropdown.
// All top eligible players remain visible, even when already placed on another team.
// Choosing a placed player moves their selection after confirmation, without same-side duplicates.
function assignmentOf(playerId,target){
 if(!playerId)return'';
 return Object.keys(picks).find(id=>id!==target&&sideFor(idSlot(id))===sideFor(idSlot(target))&&picks[id]===playerId)||'';
}
function selectionTitle(id){
 if(!id)return'';
 const [team,slot,mention]=id.split(':');
 return (LABELS[team]||team)+' '+slotLabel(slot)+(mention?' #'+mention:'');
}
function relevantPlayers(slot,current){
 const scored=players.filter(p=>matchStatus(p,slot)!=='override'&&strength(p,slot)>0);
 const unscored=players.filter(p=>matchStatus(p,slot)!=='override'&&strength(p,slot)===0);
 const sorter=(a,b)=>{
  const weight={accurate:0,review:1,override:2};
  return strength(b,slot)-strength(a,slot)||weight[matchStatus(a,slot)]-weight[matchStatus(b,slot)]||a.name.localeCompare(b.name);
 };
 scored.sort(sorter);unscored.sort(sorter);
 const selected=byID.get(current);
 const pool=[...(selected?[selected]:[]),...scored.slice(0,18),...unscored.slice(0,3)];
 return [...new Map(pool.map(p=>[p.id,p])).values()];
}
function optionFor(p,slot,current,target){
 const mismatch=matchStatus(p,slot);
 const detail=mismatch==='review'?' · VERIFY POSITION':mismatch==='override'?' · MANUAL OVERRIDE':'';
 const stats=strength(p,slot)>0?' · '+strength(p,slot).toFixed(1)+' pts':' · no reported stats';
 const assigned=assignmentOf(p.id,target);
 const already=assigned?' · MOVE FROM '+selectionTitle(assigned).toUpperCase():'';
 return '<option value="'+esc(p.id)+'"'+(p.id===current?' selected':'')+'>'+
 esc(p.name+' — '+p.team+' ('+(p.position||'unknown')+')'+stats+detail+already)+'</option>';
}
function playerOptions(slot,current,target){
 const choices=relevantPlayers(slot,current);
 return '<option value="">— Unselected —</option>'+choices.map(p=>optionFor(p,slot,current,target)).join('');
}
function manualOptions(slot,text,target){
 const q=norm(text);
 if(q.length<2)return '<option value="">Type at least 2 characters to search</option>';
 const found=players.filter(p=>norm(p.name+' '+p.team+' '+p.number).includes(q))
  .sort((a,b)=>{
   const rank={accurate:0,review:1,override:2};
   return strength(b,slot)-strength(a,slot)||rank[matchStatus(a,slot)]-rank[matchStatus(b,slot)]||a.name.localeCompare(b.name);
  }).slice(0,20);
 return '<option value="">'+(found.length?'Select a matching player…':'No players found')+'</option>'+
 found.map(p=>optionFor(p,slot,'',target)).join('');
}
// Show relevant reported production for every team, even if a roster position is missing or incomplete.
// Visibility is not verified position eligibility; manual selection still requires review.
function unlistedPosition(p){return !norm(p.position)||['NA','UNKNOWN','UNLISTED'].includes(norm(p.position))}
function visibleCandidate(p,slot){
 if(matchStatus(p,slot)!=='override')return true;
 const categories=sideFor(slot)==='defense'?['Defense']:slot==='K'?['Kicking']:slot==='P'?['Punting']:slot==='RS'?['Kickoff Returns','Kick Returns','Punt Returns']:slot==='QB'?['Passing']:slot==='RB'?['Rushing']:slot==='FLEX'?['Rushing','Receiving']:['Receiving'];
 return categories.some(category=>p.lines.some(line=>line.category.toLowerCase().startsWith(category.toLowerCase())&&Object.values(line.values||{}).some(v=>number(v)!==null)));
}
function rosterCheck(p){
 return ({both_agree:'Both sources agree',deseret_only:'Deseret listed',maxpreps_only:'MaxPreps listed',source_difference:'Sources differ — review',identity_review:'Identity needs review',snapshot_only:'Saved roster only',unverified:'Position unverified'})[p.positionAudit?.[1]]||'Saved roster';
}
function sourceLinks(p){
 const source=window.RUSAwardPositionSources2026?.[p.team]||{};
 return ['deseret','maxpreps'].map(key=>{const u=source[key]?.url;if(!u)return '';try{const url=new URL(u);if(url.protocol!=='https:'||!['sports.deseret.com','www.maxpreps.com'].includes(url.hostname))return ''}catch{return ''}return '<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+(key==='deseret'?'Deseret roster':'MaxPreps roster')+'</a>'}).filter(Boolean).join(' · ');
}
function candidateColumns(slot){
 const stat=(label,category,...names)=>({label,get:p=>{const values=linesFor(p,category);for(const name of names){const v=getValue(values,name);if(v!==null)return v}return null}});
 const receiving=[stat('Receptions','Receiving','RECEPTIONS'),stat('Rec yards','Receiving','YARDS'),{label:'Yards / catch',get:p=>{const d=linesFor(p,'Receiving'),y=getValue(d,'YARDS'),r=getValue(d,'RECEPTIONS');return y!==null&&r>0?y/r:null}},stat('Rec TD','Receiving','TD')];
 if(slot==='K')return [stat('Field goals','Kicking','FG'),stat('PATs','Kicking','PAT'),stat('Total kick points','Kicking','Pts')];
 if(slot==='P')return [stat('Punts','Punting','PUNTS'),stat('Punt yards','Punting','YARDS'),stat('Punt average','Punting','AVG','AVERAGE'),stat('Inside 20','Punting','INSIDE 20')];
 if(slot==='RS')return [
  {label:'KR yards',get:p=>getValue(returnStats(p,'kick'),'YARDS')},
  {label:'KR TD',get:p=>getValue(returnStats(p,'kick'),'TD')},
  {label:'PR yards',get:p=>getValue(returnStats(p,'punt'),'YARDS')},
  {label:'PR TD',get:p=>getValue(returnStats(p,'punt'),'TD')}
 ];
 if(sideFor(slot)==='defense')return [stat('Tackles','Defense','TACKLES'),stat('TFL','Defense','TFL','TACKLES FOR LOSS'),stat('Sacks','Defense','SACKS'),stat('INT','Defense','PASS INT.','INTERCEPTIONS'),stat('Forced fumbles','Defense','FORCED FUMBLES','FUM FORCED','CAUSED FUM','FF'),stat('Fumble recoveries','Defense','FUM REC')];
 if(slot==='QB')return [stat('Pass yards','Passing','YARDS'),stat('Pass TD','Passing','TD'),stat('INT','Passing','INT'),stat('Rush yards','Rushing','YARDS'),stat('Rush TD','Rushing','TD')];
 if(slot==='RB'||slot==='FLEX')return [stat('Rush yards','Rushing','YARDS'),stat('Rush TD','Rushing','TD'),...receiving];
 return receiving;
}
function gradeLabel(p){const g=String(p.grade||'');return ({2027:'SR',2028:'JR',2029:'SO',2030:'FR',12:'SR',11:'JR',10:'SO',9:'FR'})[g]||(g==='-'?'Not reported':g)||'Not reported'}
function compareCandidates(a,b,column,descending){
 const av=column.get(a),bv=column.get(b);
 if(av===null||av==='')return bv===null||bv===''?a.name.localeCompare(b.name):1;
 if(bv===null||bv==='')return -1;
 const diff=typeof av==='number'&&typeof bv==='number'?av-bv:String(av).localeCompare(String(bv),undefined,{numeric:true});
 return (descending?-diff:diff)||a.name.localeCompare(b.name);
}
function openCandidates(target){
 if((published&&!admin)||regionLocked||!admin)return;
 const slot=idSlot(target),opener=document.activeElement;
 const columns=[{label:'Name',get:p=>p.name},{label:'School',get:p=>p.team},{label:'Grade',get:gradeLabel},{label:'Position',get:p=>unlistedPosition(p)?'Position unverified':p.position},...candidateColumns(slot),{label:'Roster check',get:rosterCheck}];
 let sort=4,descending=true;
 const dialog=document.createElement('dialog');dialog.className='ar-candidate-dialog';dialog.setAttribute('aria-labelledby','ar-candidate-title');
 dialog.innerHTML='<div class="ar-candidate-head"><h2 id="ar-candidate-title">Choose '+esc(selectionTitle(target))+'</h2><button type="button" data-close>Close</button></div><p>Compare locked regular-season statistics. Players may earn separate offense, defense, kicking, punting and return honors. Missing statistics are not zero; punting and KR/PR numbers are not available in the frozen snapshot and require manual review. Players with relevant stats remain visible even when roster positions are missing or incomplete. Confirm any flagged position before selecting.</p><label>Search name or school<input type="search" data-search placeholder="Search players or schools" autocomplete="off"></label><label class="ar-candidate-toggle"><input type="checkbox" data-all> Include entire region roster, including unreported stats</label><p data-count aria-live="polite"></p><div class="ar-tablewrap" tabindex="0" aria-label="Player comparison table; scroll horizontally for more statistics"><table><thead></thead><tbody></tbody></table></div>';
 document.body.append(dialog);
 const close=()=>dialog.close();
 dialog.querySelector('[data-close]').onclick=close;
 dialog.addEventListener('close',()=>{dialog.remove();if(opener?.isConnected)opener.focus();else document.querySelector('[data-choose-id="'+target+'"]')?.focus()},{once:true});
 const draw=()=>{
  const q=norm(dialog.querySelector('[data-search]').value),all=dialog.querySelector('[data-all]').checked;
  const rows=players.filter(p=>(all||q||visibleCandidate(p,slot)||p.id===picks[target])&&(!q||norm(p.name+' '+p.team+' '+p.number).includes(q))).sort((a,b)=>compareCandidates(a,b,columns[sort],descending));
  dialog.querySelector('[data-count]').textContent=rows.length+' candidates · search checks the entire region roster. Tap a heading to sort; scroll across for all stats.';
  dialog.querySelector('thead').innerHTML='<tr>'+columns.map((c,i)=>'<th scope="col"'+(sort===i?' aria-sort="'+(descending?'descending':'ascending')+'"':'')+'><button type="button" data-sort="'+i+'">'+esc(c.label)+(sort===i?(descending?' ▼':' ▲'):'')+'</button></th>').join('')+'<th scope="col">Selections / action</th></tr>';
  dialog.querySelector('tbody').innerHTML=rows.length?rows.map(p=>{
   const assigned=assignmentOf(p.id,target),placements=Object.entries(picks).filter(([,id])=>id===p.id).map(([id])=>selectionTitle(id)),warning=positionNote(p,slot);
   return '<tr>'+columns.map(c=>{const v=c.get(p);return '<td>'+esc(v===null?'Not reported':typeof v==='number'?v.toLocaleString('en-US',{maximumFractionDigits:1}):v)+'</td>'}).join('')+'<td>'+placements.map(x=>'<small>'+esc(x)+'</small>').join('')+(warning?'<small class="ar-warn">'+esc(warning)+'</small>':'')+'<small>'+sourceLinks(p)+'</small>'+'<button type="button" data-pick="'+esc(p.id)+'">'+(picks[target]===p.id?'Selected':assigned?'Move here':'Select')+'</button></td></tr>';
  }).join(''):'<tr><td colspan="'+(columns.length+1)+'">No matching players. Try another search or include all region players.</td></tr>';
  dialog.querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>{const next=Number(b.dataset.sort);descending=sort===next?!descending:next>=4;sort=next;draw()});
  dialog.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{
   if((published&&!admin)||regionLocked||!admin)return;
   const player=byID.get(b.dataset.pick);
   if((matchStatus(player,slot)==='override'||['source_difference','identity_review'].includes(player.positionAudit?.[1]))&&!confirm(player.name+': '+(positionNote(player,slot)||'Verify the reported '+slot+' position')+'. Select after editorial review?'))return;
   if(pickChange(target,player.id)){render();close()}
  });
 };
 dialog.querySelector('[data-search]').oninput=draw;dialog.querySelector('[data-all]').onchange=draw;
 draw();dialog.showModal();dialog.querySelector('[data-search]').focus();
}

function drawSelector(id,section){
 const slot=idSlot(id),p=byID.get(picks[id]),status=matchStatus(p,slot);
 return '<div class="ar-selection'+(status==='review'||status==='override'?' ar-attention':'')+'"><div class="ar-select-top"><strong>'+esc(slotLabel(slot))+(section==='honorable'?' · '+id.split(':')[2]:'')+'</strong>'+
 (p?'<span class="ar-pill">'+esc(status==='accurate'?rosterCheck(p):status==='review'?'Check specific role':'Manual override')+'</span>':'<span class="ar-warn">Empty</span>')+'</div>'+
 playerHTML(p,slot)+
 '<button type="button" data-choose-id="'+esc(id)+'">'+(p?'Compare / Change Player':'Choose '+esc(slotLabel(slot)))+'</button>'+ 
 (p?'<button type="button" class="secondary" data-clear-id="'+esc(id)+'">Clear spot</button>':'')+'</div>';
}
function renderTeam(section){
 const ids=fieldIDs(section),left=ids.filter(id=>firstHalf.includes(idSlot(id))),right=ids.filter(id=>!firstHalf.includes(idSlot(id))&&!SPECIAL_POSITIONS.includes(idSlot(id))),special=ids.filter(id=>SPECIAL_POSITIONS.includes(idSlot(id)));
 return '<div class="ar-columns"><div>'+left.map(id=>drawSelector(id,section)).join('')+'</div><div>'+right.map(id=>drawSelector(id,section)).join('')+'</div></div>'+
  '<div class="ar-special-section"><h3>Special Teams · Kicker / Punter / KR-PR</h3><p class="ar-muted">Kickers use reported field goals and PATs. Punter and return specialist selections require manual review where punting and return production is not reported.</p><div class="ar-special-grid">'+special.map(id=>drawSelector(id,section)).join('')+'</div></div>';
}
function renderAwards(){
 return '<div class="ar-winners">'+Object.entries(TITLES).map(([role,title])=>{
  const current=winners[role],p=byID.get(current),ordered=[...players].sort((a,b)=>(role==='dpoy'?b.defense:role==='opoy'?b.offense:Math.max(b.offense,b.defense))-
  (role==='dpoy'?a.defense:role==='opoy'?a.offense:Math.max(a.offense,a.defense)));
  return '<div class="ar-winner"><strong>'+esc(title)+'</strong>'+playerHTML(p,role.toUpperCase(),true)+
   '<label class="ar-edit-label">Choose winner<select data-winner="'+role+'"><option value="">— Unselected —</option>'+
   ordered.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===current?' selected':'')+'>'+esc(x.name+' — '+x.team)+'</option>').join('')+'</select></label></div>';
 }).join('')+'</div><p class="ar-muted">Award-winner suggestions are derived from reported production only. Winners may also appear on an All-Region team. Players may earn separate offensive, defensive, kicker, punter and return-specialist honors across First Team, Second Team and Honorable Mention.</p>';
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
 const count=fieldIDs('first').filter(id=>!picks[id]&&!SPECIAL_POSITIONS.includes(idSlot(id))).length;
 if(count)problems.unshift(count+' offensive/defensive First-Team spot(s) remain unfilled');
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
 el('#ar-status').textContent=!admin?'Editor locked · PIN required':published?'Published publicly · '+new Date(published.published_at||published.updated_at).toLocaleString()+(dirty?' · unsaved changes':''):'Not yet published · editorial draft';
 el('#ar-tabs').innerHTML=tabs();
 const body=mode==='winners'?renderAwards():mode==='summary'?schoolBreakdown():renderTeam(mode);
 el('#ar-content').innerHTML=body;
 const warnings=editorWarnings();
 el('#ar-warnings').innerHTML='<strong>Accuracy review</strong> · '+warnings.length+' item(s) flagged for review.'+
 (warnings.length?'<details><summary>View warnings</summary><ul>'+warnings.slice(0,70).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></details>':
 '<p>No missing data or broad positions detected in currently selected player records.</p>')+
 '<details class="ar-verify-guide"><summary>How do I verify a player’s position?</summary><p>Check the athlete’s 2026 school or MaxPreps football roster. Roster-listed means that the saved position matches the selected slot; it is not an independent coach confirmation. For broad labels such as LB or DB, confirm the exact MLB, CB or safety assignment with the school or coaching staff. If no reliable position exists, leave it flagged for manual review. Never determine defensive positions from statistics alone.</p></details>';
 el('#ar-auto').disabled=regionLocked||Boolean(published&&!admin);
 el('#ar-note').disabled=regionLocked||Boolean(published&&!admin);
 el('#ar-publish').disabled=!admin||busy||regionLocked;
 el('#ar-save').disabled=!admin||busy||regionLocked;
 el('#ar-publish').textContent=published?'Update Published Region':'Finalize & Publish Region';
 el('#ar-lock').textContent=regionLocked?'🔓 Unlock This Region':'🔒 Lock This Region';
 el('#ar-lock').disabled=!admin||busy||syncPending;
 el('#ar-lock-status').textContent=regionLocked?'🔒 Locked on all devices':'🔓 Unlocked for editor changes';
 el('#ar-preview-status').textContent=admin?'PIN unlocked · changes to unpublished regions sync across devices':'Enter your editor PIN to unlock shared editing.';
 el('#ar-editor').hidden=true;el('#ar-pin-panel').hidden=admin;
 el('#ar-auth-status').textContent=session?(admin?'Editor approved':'Signed in; editor approval required. Account ID: '+(uid||'still loading')):'Not signed in';
 el('#ar-note').value=notes;
 el('#ar-tabs').querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;render()});
 el('#ar-content').querySelectorAll('[data-select-id]').forEach(s=>{
  s.onchange=()=>{if(!pickChange(s.dataset.selectId,s.value)){s.value=picks[s.dataset.selectId]||''}render()};
 });
 el('#ar-content').querySelectorAll('[data-player-search]').forEach(input=>{
  input.oninput=()=>{
   const field=input.closest('.ar-manual-search')?.querySelector('[data-manual-id]');
   if(field)field.innerHTML=manualOptions(idSlot(input.dataset.playerSearch),input.value,input.dataset.playerSearch);
  };
 });
 el('#ar-content').querySelectorAll('[data-manual-id]').forEach(s=>{
  s.onchange=()=>{if(!pickChange(s.dataset.manualId,s.value)){s.value='';return;}render()};
 });
 el('#ar-content').querySelectorAll('[data-winner]').forEach(s=>s.onchange=()=>{if(regionLocked)return;winners[s.dataset.winner]=s.value;dirty=true;saveLocal();render()});
 el('#ar-content').querySelectorAll('[data-choose-id]').forEach(b=>b.onclick=()=>openCandidates(b.dataset.chooseId));
 el('#ar-content').querySelectorAll('[data-clear-id]').forEach(b=>b.onclick=()=>{if(published&&!admin)return;pickChange(b.dataset.clearId,'');render()});
 const locked=regionLocked||busy||(published&&!admin);
 if(locked)el('#ar-content').querySelectorAll('select,[data-choose-id],[data-clear-id]').forEach(s=>s.disabled=true);
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
 try{await pinApi('check');admin=true;return}catch{localStorage.removeItem('rus-awards-pin-token');return}
}
 /*
 if(!session?.access_token)return;
 try{const user=await api('/auth/v1/user');uid=user?.id||'';
 const list=await api('/rest/v1/rus_award_editors?user_id=eq.'+encodeURIComponent(uid)+'&select=user_id');
 admin=Array.isArray(list)&&list.length>0;
 }catch{session=null;localStorage.removeItem('rus-award-auth-2026')}
}
*/
async function readPublication(){
 published=null;dirty=false;regionLocked=false;
 try{const rows=admin?(await pinApi('read',{region})).record:null;
 const record=rows;
 regionLocked=Boolean(record?.selections?.locked);
 if(record&&record.status==='published')published=record;
 if(record&&admin){
  picks={...blankPicks(),...(record.selections?.picks||{})};
  winners={...blankWinners(),...(record.winners||{})};
  notes=record.editorial_notes||'';
 }else if(published){
  picks={...blankPicks(),...(record.selections?.picks||{})};
  winners={...blankWinners(),...(record.winners||{})};
  notes=record.editorial_notes||'';
 }else{
  const draft=local();
  picks={...blankPicks(),...(draft?.picks||{})};
  winners={...blankWinners(),...(draft?.winners||{})};
  notes=draft?.notes||'';
  // Preserve first-team picks created in the original template, if no advanced draft exists.
  if(!draft){try{const old=JSON.parse(localStorage.getItem('rus-region-graphic-2026:'+region)||'{}');
   for(const position of POSITIONS)if(old[position]&&byID.has(old[position]))picks['first:'+position]=old[position];
  }catch{}}
 }
 }catch(err){console.warn('Region publication lookup:',err);const draft=local();
  picks={...blankPicks(),...(draft?.picks||{})};winners={...blankWinners(),...(draft?.winners||{})};notes=draft?.notes||'';
  el('#ar-error').textContent='Published award records are temporarily unavailable; showing a local draft only.';
 }
}
async function setRegion(r){
 if(!regions.includes(r))return;
 clearTimeout(syncTimer);
 region=r;players=collect(r);byID=new Map(players.map(p=>[p.id,p]));mode='first';el('#ar-error').textContent='';
 await readPublication();render();
 const u=new URL(location.href);u.searchParams.set('region',r);history.replaceState(null,'',u.pathname+u.search);
}
async function save(statusValue){
 if(!admin){alert('Enter your editor PIN to save or publish awards.');return}
 if(regionLocked){alert('Unlock this region before saving or publishing.');return}
 if(!validPicks()){alert('Duplicate players on the same side of the ball or invalid players found. Each player may earn one offensive and one defensive selection.');return}
 if(statusValue==='published'&&fieldIDs('first').filter(id=>!SPECIAL_POSITIONS.includes(idSlot(id))).some(id=>!picks[id])){alert('Complete the offensive and defensive First Team slots before publishing. Unverified special-teams picks can remain pending.');return}
 if(statusValue==='published'&&fieldIDs('second').filter(id=>!SPECIAL_POSITIONS.includes(idSlot(id))).some(id=>!picks[id])){alert('Complete the offensive and defensive Second Team slots before publishing. Unverified special-teams picks can remain pending.');return}
 if(statusValue==='published'&&Object.keys(TITLES).some(id=>!winners[id])){alert('Select all three region award winners before publishing.');return}
 if(statusValue==='draft'&&published&&!confirm('Saving a draft will temporarily unpublish this region. Continue?'))return;
 if(statusValue==='published'&&!confirm('Publish '+labelRegion(region)+' awards for everyone to see? Confirm that players, schools, positions, and missing statistics have been reviewed.'))return;
 busy=true;render();el('#ar-error').textContent='';
 try{
 clearTimeout(syncTimer);
 await writeRegion(statusValue);
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
 grad.addColorStop(0,'rgba(241,77,7,.80)');grad.addColorStop(.48,'rgba(145,45,7,.44)');grad.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
 const margin=landscape?60:34,bigLogo=landscape?104:84;
 const brand=await loadLogo(new URL('RUSlogoNew.png',location.href).href);
 drawLogo(ctx,brand,margin,30,bigLogo);drawLogo(ctx,brand,w-margin-bigLogo,30,bigLogo);
 ctx.textAlign='center';ctx.fillStyle='#fff';ctx.shadowColor='#000';ctx.shadowBlur=5;ctx.shadowOffsetY=3;
 const line1=fitted(ctx,'2026 RURAL UTAH SPORTS',w-2*bigLogo-3*margin,landscape?62:45,25);
 ctx.fillText(line1,centerX,landscape?90:80);
 let sub=section==='special'?'ALL-REGION SPECIAL TEAMS':section==='winners'?'REGION AWARD WINNERS':section==='first'?'ALL-REGION 1ST TEAM':section==='second'?'ALL-REGION 2ND TEAM':'HONORABLE MENTION';
 const line2=fitted(ctx,labelRegion(region).toUpperCase()+' · '+sub,w-2*margin,landscape?67:49,28);
 ctx.fillText(line2,centerX,landscape?166:165);ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 ctx.font='800 '+(landscape?20:17)+'px Arial';ctx.fillStyle='#ffe8d8';
 ctx.fillText(published&&!dirty?'RUS EDITORIAL AWARDS • 2026 REGULAR SEASON':'RUS EDITORIAL DRAFT • NOT FINAL AWARDS',centerX,landscape?209:209);
 const ids=section==='winners'?['mvp','opoy','dpoy']:section==='special'?SPECIAL_POSITIONS.map(slot=>'first:'+slot):fieldIDs(section).filter(id=>!SPECIAL_POSITIONS.includes(idSlot(id)));
 const left=ids.filter((id,i)=>section==='winners'?i<2:firstHalf.includes(idSlot(id)));
 const right=ids.filter((id,i)=>section==='winners'?i>=2:!firstHalf.includes(idSlot(id)));
 const lines=Math.max(left.length,right.length),top=landscape?260:260,bottom=h-(portrait?112:landscape?98:92),rowHeight=(bottom-top)/lines;
 const gap=landscape?65:21,cw=(w-2*margin-gap)/2,imgs=new Map();
 const used=[...new Set(ids.map(id=>byID.get(section==='winners'?winners[id]:picks[id])?.team).filter(Boolean))];
 await Promise.all(used.map(async team=>imgs.set(team,await loadLogo(safeLogo(team)))));
 if(section==='special'){
  const cardTop=landscape?248:275,cardBottom=h-(portrait?100:90),cardGap=landscape?13:22,cardHeight=(cardBottom-cardTop-cardGap*2)/3;
  for(let i=0;i<ids.length;i++){
   const slot=idSlot(ids[i]),p=byID.get(picks[ids[i]]),y=cardTop+i*(cardHeight+cardGap);
   ctx.fillStyle='rgba(7,7,9,.82)';ctx.fillRect(margin,y,w-2*margin,cardHeight);
   ctx.fillStyle='#f14d07';ctx.fillRect(margin,y,8,cardHeight);
   const dim=Math.min(landscape?100:130,cardHeight*.68),lx=margin+30,ly=y+(cardHeight-dim)/2;
   if(p){
    if(!drawLogo(ctx,imgs.get(p.team),lx,ly,dim)){
     ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='900 18px Arial';ctx.fillText(norm(p.team).slice(0,3),lx+dim/2,ly+dim*.54);
    }
   }
   ctx.textAlign='left';const tx=lx+dim+23,available=w-margin-tx-25;
   ctx.fillStyle='#ffb98e';ctx.fillText(fitted(ctx,slotLabel(slot).toUpperCase(),available,landscape?29:33,16),tx,y+cardHeight*.24);
   ctx.fillStyle='#fff';ctx.fillText(fitted(ctx,p?p.name.toUpperCase():'SELECTION PENDING',available,landscape?43:48,17),tx,y+cardHeight*.51);
   ctx.fillStyle='#eee0d6';ctx.fillText(fitted(ctx,p?p.team.toUpperCase()+' · '+statLine(p,slot):'UNVERIFIED · NO PLAYER SELECTED',available,landscape?23:21,12),tx,y+cardHeight*.76);
  }
  ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText(fitted(ctx,(published&&!dirty?'PUBLISHED':'DRAFT · UNVERIFIED')+'  •  RURALUTAHSPORTS.COM  •  @RURALUTAHSPORTS77',w-2*margin,landscape?17:14,10),centerX,h-35);
  return cvs;
 }
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
   ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.fillStyle='#fff2e9';
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
 await checkEditor();
 const initial=new URLSearchParams(location.search).get('region'),chosen=regions.includes(initial)?initial:regions.includes('3A North')?'3A North':regions[0];
 await setRegion(chosen);el('#ar-error').textContent='';
 el('#ar-region').addEventListener('change',e=>setRegion(e.target.value));
 el('#ar-pin-submit').onclick=pinUnlock;
 el('#ar-pin').onkeydown=e=>{if(e.key==='Enter')pinUnlock()};
 el('#ar-save').onclick=()=>save('draft');
 el('#ar-lock').onclick=toggleRegionLock;
 el('#ar-publish').onclick=()=>save('published');
 el('#ar-auto').onclick=()=>{if(regionLocked)return;if(!confirm('Replace the current First Team, Second Team, and Honorable Mention selections with highest-scoring eligible players?'))return;
  picks=suggest();winners=suggestWinners();dirty=true;saveLocal();render()};
 el('#ar-note').onchange=e=>{if(regionLocked)return;notes=e.target.value;dirty=true;saveLocal();render()};
 el('#ar-download').onclick=downloadGraphic;
 el('#ar-backup').onclick=exportDraft;
 el('#ar-email-send').onclick=sendEmail;
 el('#ar-code-verify').onclick=confirmCode;
 el('#ar-signout').onclick=()=>{localStorage.removeItem('rus-award-auth-2026');session=null;admin=false;uid='';setRegion(region)};
 }catch(e){console.error(e);el('#ar-error').textContent='Unable to load the awards hub: '+e.message}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();


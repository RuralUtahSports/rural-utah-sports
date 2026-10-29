(()=>{
'use strict';
// Region Awards share graphics: grade labels prominent in player headings, export revision r3.
// Graphic exporter refresh 2026-10-23: distinct URL to bypass stale CDN/browser asset caches.
if(!/region-awards(?:-latest|-grades)?\.html$/i.test(location.pathname))return;
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
// UHSAA 2025–27 football alignment: Enterprise belongs to 1A South.
// The regular-season award snapshot is frozen, so correct its metadata
// in memory without changing player statistics or saved editorial picks.
function correctLockedFootballAlignment(data){
 if(!Array.isArray(data?.teamMeta))return;
 const enterprise=data.teamMeta.filter(row=>norm(row.team)==='ENTERPRISE');
 if(enterprise.length!==1){console.warn('Enterprise alignment: expected one team record');return}
 enterprise[0].classification='1A';
 enterprise[0].region='1A South';
}
function oldEnterprisePickIds(){
 const enterprise=Object.entries(snapshot?.data?.teams||{}).find(([name])=>norm(name)==='ENTERPRISE')?.[1];
 if(!enterprise)return new Set();
 const ids=new Set();
 for(const p of enterprise.roster||[])if(p.playerId)ids.add(p.playerId);
 for(const section of enterprise.stats||[])for(const p of section.rows||[])if(p.playerId)ids.add(p.playerId);
 return ids;
}
function misplacedEnterprisePicks(){
 if(region!=='2A South')return [];
 const ids=oldEnterprisePickIds();
 return Object.entries(picks).filter(([,playerId])=>ids.has(playerId));
}
let publication=null,snapshot=null,players=[],byID=new Map(),regions=[],region='',mode='first',picks={},winners={},status='draft',published=null,admin=false,session=null,uid='',notes='',busy=false,dirty=false,logoMap={},regionLocked=false,syncTimer=null,syncPending=false;
function labelRegion(r){return /^\d+$/.test(r)?'Region '+r:r}
function fieldIDs(section){
 return section==='honorable'?POSITIONS.filter(p=>!SPECIAL_POSITIONS.includes(p)).flatMap(p=>[section+':'+p+':1',section+':'+p+':2']):POSITIONS.map(p=>section+':'+p);
}
const sideFor=slot=>['DL','DE','MLB','S','CB'].includes(slot)?'defense':slot==='K'?'kicking':slot==='P'?'punting':slot==='RS'?'returns':'offense';
function idSlot(id){return id.split(':')[1]}
function poolFit(p,slot){return selectors[slot.startsWith('WR')?'WR':slot]?.test(token(p))||false}
function fallbackFit(p,slot){return backup[slot]?.test(token(p))||false}
function matchStatus(p,slot){if(!p)return'missing';if(poolFit(p,slot))return'accurate';if(fallbackFit(p,slot))return'review';if(slot==='P'&&p.specialStats?.punt)return'review';if(slot==='RS'&&(p.specialStats?.kr||p.specialStats?.pr))return'review';return'override'}
function getValue(values,name){const item=Object.entries(values||{}).find(([k])=>norm(k)===norm(name));return item?number(item[1]):null}
function linesFor(p,category){return p.lines.find(l=>l.category.toLowerCase().startsWith(category.toLowerCase()))?.values||null}
function returnStats(p,kind){return kind==='kick'?(linesFor(p,'Kickoff Returns')||linesFor(p,'Kick Returns')):linesFor(p,'Punt Returns')}
function maxprepsSpecialStatus(){const src=window.RUSAwardSpecialTeamsMaxPreps2026;
 const matches=players.filter(p=>p.specialStats?.punt||p.specialStats?.kr||p.specialStats?.pr);
 const punters=matches.filter(p=>p.specialStats.punt).length,returners=matches.filter(p=>p.specialStats.kr||p.specialStats.pr).length;
 return 'MaxPreps 2026 reported stats · '+punters+' punters / '+returners+' return specialists in this region · checked '+(src?.checkedAt||'unknown')+'. Unverified cumulative special-team totals are excluded from regular-season scoring. Missing ≠ zero.';
}
function strength(p,slot){
 if(!p)return 0;
 if(slot==='FLEX')return Math.max(p.scores.RB||0,p.scores.WR||0,p.scores.TE||0);
 return p.scores[slotRole(slot)]||0;
}
function statLine(p,slot){
 if(!p)return'NO PLAYER SELECTED';
 if(['MVP','OPOY','DPOY'].includes(slot)){
  const categories=slot==='DPOY'?['Defense']:slot==='OPOY'?['Passing','Rushing','Receiving']:['Passing','Rushing','Receiving','Defense'];
  const lines=categories.map(category=>p.lines.find(l=>l.category.toLowerCase().startsWith(category.toLowerCase()))).filter(Boolean);
  lines.sort((a,b)=>(window.RUSLockedRegionScoring?.categoryScore?.(b.category,b.values)||0)-(window.RUSLockedRegionScoring?.categoryScore?.(a.category,a.values)||0));
  return lines.length?statLine(p,lines[0].category.toLowerCase().startsWith('defense')?'MLB':lines[0].category.toLowerCase().startsWith('passing')?'QB':lines[0].category.toLowerCase().startsWith('rushing')?'RB':'WR1'):slot==='OPOY'?'OFFENSIVE STATS NOT REPORTED':slot==='DPOY'?'DEFENSIVE STATS NOT REPORTED':'STATS NOT REPORTED';
 }
 const res=[],add=(v,kind)=>{if(v!==null&&v!==0&&Number.isFinite(v))res.push(v.toLocaleString('en-US',{maximumFractionDigits:1})+' '+kind)};
 if(SPECIAL_POSITIONS.includes(slot)){
   if(slot==='K'){const d=linesFor(p,'Kicking');if(d){add(getValue(d,'FG'),'FG');add(getValue(d,'PAT'),'PAT');add(getValue(d,'Pts'),'PTS');}}
   if(slot==='P'){const d=linesFor(p,'Punting');if(d){add(getValue(d,'PUNTS'),'PUNTS');add(getValue(d,'YARDS'),'PUNT YDS');add(getValue(d,'AVG'),'YDS/PUNT');add(getValue(d,'INSIDE 20'),'IN20');}}
   if(slot==='RS'){for(const kind of ['kick','punt']){const d=returnStats(p,kind);if(d){add(getValue(d,'RETURNS'),kind==='kick'?'KR':'PR');add(getValue(d,'YARDS'),kind==='kick'?'KR YDS':'PR YDS');}}}
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
 return reported?'':(slot==='P'?'Punting stats not reported for this player in the MaxPreps supplemental coverage; check the team stats or coach':slot==='RS'?'KR/PR stats not reported for this player in the MaxPreps supplemental coverage; check the team stats or coach':'No '+needs.join('/')+' statistics reported');
}
function positionNote(p,slot){if(p?.sourceOnly)return 'MaxPreps stats-only entry; confirm player identity and school roster';const verification=p?.positionAudit;if(verification?.[1]==='source_difference')return 'Roster positions differ: Deseret/saved roster '+(verification[2]||verification[0]||'not listed')+'; MaxPreps '+(verification[3]||'not listed')+'. Verify '+slot;if(verification?.[1]==='identity_review')return 'Name or jersey match needs review before confirming '+slot;const kind=matchStatus(p,slot);const correction=window.RUSAwardPositionCorrections2026Status?.[p?.id]||'';if(/mismatch/.test(correction))return 'MaxPreps and Deseret roster details differ; verify athlete identity and '+slot;return unlistedPosition(p)?'Position unverified — confirm '+slot+' before selecting':kind==='review'?'Position is broad on roster; verify '+slot:kind==='override'?'Manual position override; verify '+slot:kind==='missing'?'Position not reported; editorial verification required':''}
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
// A cumulative supplement is not regular-season evidence. Candidate identities
// remain available, but counts require a reviewed set of classified game cells.
function regularSeasonSpecialStats(athlete,player=null){
 const accepted={};
 for(const [kind,row] of Object.entries(athlete||{})){
  const certificate=typeof publication!=='undefined'&&player&&publication?.specialTeams?.[player.id+'|'+kind];
  if(!certificate||JSON.stringify(certificate)!==JSON.stringify(row))continue;
  const proof=row?.regularSeasonEvidence;
  if(proof?.season!==2026||proof.status!=='verified'||proof.scope!=='regular-season'||!proof.reviewedBy||!Array.isArray(proof.games)||!proof.games.length)continue;
  if(proof.games.some(g=>g.phase!=='regular-season'||!g.gameKey||!/^https:\/\/(?:www\.)?(?:maxpreps\.com|sports\.deseret\.com|uhsaa\.org)\//.test(g.sourceUrl||'')||!g.competitionEvidence?.some(e=>e.phase==='regular-season'&&e.url)))continue;
  if(new Set(proof.games.map(g=>g.gameKey)).size!==proof.games.length)continue;
  accepted[kind]=row;
 }
 return accepted;
}
function collect(r){
 const teams=new Set(snapshot.teamMeta.filter(t=>t.region===r).map(t=>norm(t.team))),out=new Map();
 const supplemental=window.RUSAwardSpecialTeamsMaxPreps2026;
 const canonTeam=supplemental?.canonTeam||norm;
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
 // Do not silently drop documented special-team production when a school omitted a
 // punter or returner from its published roster. Keep the source-only player flagged.
 if(supplemental?.rows){
  const known=new Set([...out.values()].map(p=>canonTeam(p.team)+'|'+norm(p.name)));
  for(const item of supplemental.rows){
   const key=canonTeam(item.team)+'|'+norm(item.name);
   if(![...teams].some(t=>canonTeam(t)===canonTeam(item.team))||known.has(key))continue;
   const school=snapshot.teamMeta.find(t=>t.region===r&&canonTeam(t.team)===canonTeam(item.team))?.team||item.team;
   const id='maxpreps-st-2026|'+canonTeam(school)+'|'+norm(item.name);
   out.set(id,{id,team:school,name:item.name,number:'',position:'',positionSource:'MaxPreps stat line — verify identity',lines:[],scores:{},sourceOnly:true});
   known.add(key);
  }
 }
 for(const p of out.values()){
  p.specialStats=regularSeasonSpecialStats(supplemental?.athlete(p.team,p.name),p);
  const pRow=p.specialStats.punt,kr=p.specialStats.kr,pr=p.specialStats.pr;
  if(pRow)p.lines.push({category:'Punting (MaxPreps)',values:{PUNTS:String(pRow.attempts),YARDS:String(pRow.yards),AVG:pRow.attempts?(pRow.yards/pRow.attempts).toFixed(2):'',LONG:String(pRow.long),'INSIDE 20':String(pRow.inside20),GP:String(pRow.gp)}});
  if(kr)p.lines.push({category:'Kickoff Returns (MaxPreps)',values:{RETURNS:String(kr.attempts),YARDS:String(kr.yards),AVG:kr.attempts?(kr.yards/kr.attempts).toFixed(2):'',LONG:String(kr.long),GP:String(kr.gp)}});
  if(pr)p.lines.push({category:'Punt Returns (MaxPreps)',values:{RETURNS:String(pr.attempts),YARDS:String(pr.yards),AVG:pr.attempts?(pr.yards/pr.attempts).toFixed(2):'',LONG:String(pr.long),GP:String(pr.gp)}});
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
  p.scores.P=pRow&&pRow.attempts>=1?(pRow.yards/pRow.attempts)*Math.min(1,pRow.attempts/10)+pRow.inside20*.4:0;
  const returnAttempts=(kr?.attempts||0)+(pr?.attempts||0);
  const returnYards=(kr?.yards||0)+(pr?.yards||0);
  p.scores.RS=returnAttempts>0?returnYards/12+(returnYards/returnAttempts)*.4:0;
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
function normalizedPicks(stored){const result=blankPicks();for(const id of Object.keys(result))result[id]=stored?.[id]||'';return result}
function blankWinners(){return {mvp:'',opoy:'',dpoy:''}}
function suggest(){
 const all={},usedBySide={offense:new Set(),defense:new Set(),kicking:new Set(),punting:new Set(),returns:new Set()};
 for(const section of SECTIONS){
  const cycles=section==='honorable'?2:1;
  for(let index=1;index<=cycles;index++){
   for(const slot of PRIORITY){
    if(section==='honorable'&&SPECIAL_POSITIONS.includes(slot))continue;
    const used=usedBySide[sideFor(slot)];
    const id=section+':'+slot+(section==='honorable'?':'+index:'');
    // Special teams have no verified punting/return production in the locked snapshot.
    // Keep manually reviewed choices instead of replacing them with invented rankings.
    if(slot==='P'||slot==='RS'){
     const current=picks[id];
     // Keep explicitly reviewed picks, otherwise rank only verified MaxPreps numbers.
     const choice=current||candidateList(slot,used).find(p=>p.scores[slot]>0)?.id||'';
     all[id]=choice;if(choice)used.add(choice);continue;
    }
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
function saveLocal(){try{localStorage.setItem(draftKey(),JSON.stringify({picks:normalizedPicks(picks),winners,notes}))}catch{};scheduleCloudSave()}
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
 const row={season:YEAR,region,status:statusValue,selections:{picks:normalizedPicks(picks),locked:regionLocked},winners,editorial_notes:notes,updated_by:null,updated_at:new Date().toISOString(),published_at:statusValue==='published'?(published?.published_at||new Date().toISOString()):null};
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
 const special=Object.values(p.specialStats||{}).filter(x=>x?.source).map(x=>x.source);
 const extra=[...new Set(special)].map((url,i)=>'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">MaxPreps special teams '+(i+1)+'</a>');
 const source=window.RUSAwardPositionSources2026?.[p.team]||{};
 return [...extra,...['deseret','maxpreps'].map(key=>{const u=source[key]?.url;if(!u)return '';try{const url=new URL(u);if(url.protocol!=='https:'||!['sports.deseret.com','www.maxpreps.com'].includes(url.hostname))return ''}catch{return ''}return '<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+(key==='deseret'?'Deseret roster':'MaxPreps roster')+'</a>'}).filter(Boolean)].join(' · ');
}
function candidateColumns(slot){
 const stat=(label,category,...names)=>({label,get:p=>{const values=linesFor(p,category);for(const name of names){const v=getValue(values,name);if(v!==null)return v}return null}});
 const receiving=[stat('Receptions','Receiving','RECEPTIONS'),stat('Rec yards','Receiving','YARDS'),{label:'Yards / catch',get:p=>{const d=linesFor(p,'Receiving'),y=getValue(d,'YARDS'),r=getValue(d,'RECEPTIONS');return y!==null&&r>0?y/r:null}},stat('Rec TD','Receiving','TD')];
 if(slot==='K')return [stat('Field goals','Kicking','FG'),stat('PATs','Kicking','PAT'),stat('Total kick points','Kicking','Pts')];
 if(slot==='P')return [stat('Punts','Punting','PUNTS'),stat('Punt yards','Punting','YARDS'),stat('Punt average','Punting','AVG','AVERAGE'),stat('Long punt','Punting','LONG'),stat('Inside 20','Punting','INSIDE 20'),stat('Games reported','Punting','GP')];
 if(slot==='RS')return [
  {label:'KR att',get:p=>getValue(returnStats(p,'kick'),'RETURNS')},
  {label:'KR yards',get:p=>getValue(returnStats(p,'kick'),'YARDS')},
  {label:'KR average',get:p=>getValue(returnStats(p,'kick'),'AVG')},
  {label:'PR att',get:p=>getValue(returnStats(p,'punt'),'RETURNS')},
  {label:'PR yards',get:p=>getValue(returnStats(p,'punt'),'YARDS')},
  {label:'PR average',get:p=>getValue(returnStats(p,'punt'),'AVG')},
  {label:'Total return yards',get:p=>{const k=getValue(returnStats(p,'kick'),'YARDS'),q=getValue(returnStats(p,'punt'),'YARDS');return k===null&&q===null?null:(k||0)+(q||0)}}
 ];
 if(sideFor(slot)==='defense')return [stat('Tackles','Defense','TACKLES'),stat('TFL','Defense','TFL','TACKLES FOR LOSS'),stat('Sacks','Defense','SACKS'),stat('INT','Defense','PASS INT.','INTERCEPTIONS'),stat('Forced fumbles','Defense','FORCED FUMBLES','FUM FORCED','CAUSED FUM','FF'),stat('Fumble recoveries','Defense','FUM REC')];
 if(slot==='QB')return [stat('Pass yards','Passing','YARDS'),stat('Pass TD','Passing','TD'),stat('INT','Passing','INT'),stat('Rush yards','Rushing','YARDS'),stat('Rush TD','Rushing','TD')];
 if(slot==='RB'||slot==='FLEX')return [stat('Rush yards','Rushing','YARDS'),stat('Rush TD','Rushing','TD'),...receiving];
 return receiving;
}
function gradeLabel(p){const g=String(p.grade||'');return ({2027:'SR',2028:'JR',2029:'SO',2030:'FR',12:'SR',11:'JR',10:'SO',9:'FR'})[g]||(g==='-'?'Not reported':g)||'Not reported'}
/** Display roster-confirmed class on share graphics; never infer from unknown labels. */
function shareGrade(p,full=false){
 const g=String(p?.grade??'').trim().toUpperCase();
 const labels={
  '2027':['SR','SENIOR'],'2028':['JR','JUNIOR'],
  '2029':['SO','SOPHOMORE'],'2030':['FR','FRESHMAN'],
  '12':['SR','SENIOR'],'11':['JR','JUNIOR'],
  '10':['SO','SOPHOMORE'],'9':['FR','FRESHMAN'],
  'SR':['SR','SENIOR'],'JR':['JR','JUNIOR'],
  'SO':['SO','SOPHOMORE'],'FR':['FR','FRESHMAN'],
  'SENIOR':['SR','SENIOR'],'JUNIOR':['JR','JUNIOR'],
  'SOPHOMORE':['SO','SOPHOMORE'],'FRESHMAN':['FR','FRESHMAN']
 };
 const value=labels[g];
 return value?value[full?1:0]:'';
}
function shareSchoolGrade(p,full=false){
 if(!p)return 'AWAITING SELECTION';
 const className=shareGrade(p,full);
 return p.team.toUpperCase()+(className?' · '+className:'');
}

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
   if((matchStatus(player,slot)==='override'||player.sourceOnly||['source_difference','identity_review'].includes(player.positionAudit?.[1]))&&!confirm(player.name+': '+(positionNote(player,slot)||'Verify the reported '+slot+' position')+'. Select after editorial review?'))return;
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
  (special.length?'<div class="ar-special-section"><h3>Special Teams · Kicker / Punter / KR-PR</h3><p class="ar-muted">Kickers use reported field goals and PATs. Punter and return comparison tables use available 2026 MaxPreps statistics. Reported games may vary; missing entries are not zero.</p><div class="ar-special-grid">'+special.map(id=>drawSelector(id,section)).join('')+'</div></div>':'');
}
function renderSpecialTeams(){
 const blocks=['first','second'].map(section=>{
  const title=LABELS[section]||section;
  const ids=fieldIDs(section).filter(id=>SPECIAL_POSITIONS.includes(idSlot(id)));
  return '<section class="ar-special-group"><h3>'+esc(title)+' Special Teams</h3><div class="ar-special-grid">'+ids.map(id=>drawSelector(id,section)).join('')+'</div></section>';
 }).join('');
 return '<div class="ar-special-top"><h2>Kicker · Punter · KR/PR</h2><p>Choose First Team and Second Team special-teams selections (no Honorable Mentions). Kicker comparisons use the frozen regular season; punting and return totals require reviewed regular-season game evidence; unverified cumulative supplements are excluded. Review GP, missing data and roster identity before finalizing.</p><button id="ar-special-share" type="button">Download First Team Special Teams Graphic ↓</button></div>'+blocks+'<p class="ar-muted">'+esc(maxprepsSpecialStatus())+'</p>';
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
 const displaced=misplacedEnterprisePicks().length;
 return (displaced?'<p class="ar-warn"><strong>'+displaced+' previous Enterprise pick(s) were excluded from 2A South.</strong> Enterprise is in 1A South. Your old draft selections were not deleted; review and replace these invalid 2A slots before publishing.</p>':'')+
 '<p class="ar-muted">Every selection counts. No artificial school quotas are applied.</p>'+
 '<div class="ar-tablewrap"><table><thead><tr><th>School</th><th>1st</th><th>2nd</th><th>HM</th><th>Total</th></tr></thead><tbody>'+
 ordered.map(r=>'<tr><td>'+esc(r.team)+'</td><td>'+r.first+'</td><td>'+r.second+'</td><td>'+r.honorable+'</td><td>'+Number(r.first+r.second+r.honorable)+'</td></tr>').join('')+
 '</tbody></table></div>';
}
function editorWarnings(){
 const problems=[];
 for(const [id,playerId] of Object.entries(picks)){
  if(!playerId)continue;
  const p=byID.get(playerId),slot=idSlot(id);
  if(!p){
   problems.push(id+(misplacedEnterprisePicks().some(([field])=>field===id)?': Enterprise belongs to 1A South; this old draft pick must be replaced in 2A South':': player is not in the selected region roster'));
   continue
  }
  const positional=positionNote(p,slot),missing=missingInfo(p,slot);
  if(positional)problems.push(LABELS[id.split(':')[0]]+' '+slot+': '+p.name+' — '+positional);
  if(missing)problems.push(LABELS[id.split(':')[0]]+' '+slot+': '+p.name+' — '+missing);
 }
 const count=fieldIDs('first').filter(id=>!picks[id]&&!SPECIAL_POSITIONS.includes(idSlot(id))).length;
 if(count)problems.unshift(count+' offensive/defensive First-Team spot(s) remain unfilled');
 return problems;
}
function tabs(){
 return '<div class="ar-tabs">'+[...SECTIONS,'special','winners','summary'].map(m=>'<button data-mode="'+m+'" class="'+(mode===m?'active':'')+'">'+
 esc(LABELS[m]||(m==='special'?'🏈 Special Teams · K / P / KR-PR':m==='winners'?'Region Award Winners':'School Breakdown'))+'</button>').join('')+'</div>';
}
function render(){
 if(!snapshot)return;
 el('#ar-heading').textContent='2026 '+labelRegion(region)+' All-Region Awards';
 el('#ar-region').value=region;
 el('#ar-status').textContent=!admin?'Editor locked · PIN required':published?'Published publicly · '+new Date(published.published_at||published.updated_at).toLocaleString()+(dirty?' · unsaved changes':''):'Not yet published · editorial draft';
 el('#ar-tabs').innerHTML=tabs();
 const body=mode==='special'?renderSpecialTeams():mode==='winners'?renderAwards():mode==='summary'?schoolBreakdown():renderTeam(mode);
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
 el('#ar-special-shortcut').onclick=()=>{mode='special';render();el('#ar-tabs').scrollIntoView({block:'start',behavior:'smooth'})};
 const graphicButton=el('#ar-special-share');
 if(graphicButton)graphicButton.onclick=()=>{el('#ar-share-section').value='special';el('#ar-share-format').value='portrait';downloadGraphic()};
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
  picks=normalizedPicks(record.selections?.picks||{});
  winners={...blankWinners(),...(record.winners||{})};
  notes=record.editorial_notes||'';
 }else if(published){
  picks=normalizedPicks(record.selections?.picks||{});
  winners={...blankWinners(),...(record.winners||{})};
  notes=record.editorial_notes||'';
 }else{
  const draft=local();
  picks=normalizedPicks(draft?.picks||{});
  winners={...blankWinners(),...(draft?.winners||{})};
  notes=draft?.notes||'';
  // Preserve first-team picks created in the original template, if no advanced draft exists.
  if(!draft){try{const old=JSON.parse(localStorage.getItem('rus-region-graphic-2026:'+region)||'{}');
   for(const position of POSITIONS)if(old[position]&&byID.has(old[position]))picks['first:'+position]=old[position];
  }catch{}}
 }
 }catch(err){console.warn('Region publication lookup:',err);const draft=local();
  picks=normalizedPicks(draft?.picks||{});winners={...blankWinners(),...(draft?.winners||{})};notes=draft?.notes||'';
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
function shareStatLine(p,slot){
 if(!p)return 'STATS NOT REPORTED';
 if(slot==='P'){
  const v=linesFor(p,'Punting');
  if(!v)return 'PUNTING STATS NOT REPORTED';
  const n=getValue(v,'PUNTS'),yards=getValue(v,'YARDS'),avg=getValue(v,'AVG'),inside=getValue(v,'INSIDE 20');
  return [n!==null?n+' PUNTS':'',yards!==null?yards.toLocaleString('en-US')+' YDS':'',avg!==null?avg.toFixed(1)+' AVG':'',inside!==null?inside+' INSIDE 20':''].filter(Boolean).join(' · ');
 }
 if(slot==='RS'){
  const kr=p.specialStats?.kr,pr=p.specialStats?.pr;
  if(kr||pr)return [kr?'KR: '+kr.attempts+' RET · '+kr.yards.toLocaleString('en-US')+' YDS':'',pr?'PR: '+pr.attempts+' RET · '+pr.yards.toLocaleString('en-US')+' YDS':''].filter(Boolean).join(' · ');
  return statLine(p,slot);
 }
 return statLine(p,slot);
}
/**
 * Keep player names prominent while showing the verified class at 65% size.
 * Measure the three text runs together so long names fit without leaving the canvas.
 */
function drawAwardHeading(ctx,role,grade,player,x,y,maxWidth,start,min){
 const position=role+': ',tag=grade?'('+grade+') ':'';
 let size=min,small=Math.max(10,Math.round(min*.65));
 for(let candidate=start;candidate>=min;candidate--){
  const candidateSmall=Math.max(10,Math.round(candidate*.65));
  ctx.font='900 '+candidate+'px Arial';
  const largeWidth=ctx.measureText(position).width+ctx.measureText(player).width;
  ctx.font='900 '+candidateSmall+'px Arial';
  const tagWidth=tag?ctx.measureText(tag).width:0;
  if(largeWidth+tagWidth<=maxWidth){size=candidate;small=candidateSmall;break;}
 }
 ctx.font='900 '+size+'px Arial';ctx.fillStyle='#fff';
 ctx.fillText(position,x,y);
 let cursor=x+ctx.measureText(position).width;
 if(tag){
  ctx.font='900 '+small+'px Arial';ctx.fillStyle='#ffb48c';
  ctx.fillText(tag,cursor,y);cursor+=ctx.measureText(tag).width;
 }
 ctx.font='900 '+size+'px Arial';ctx.fillStyle='#fff';
 const space=Math.max(0,maxWidth-(cursor-x));
 const display=ctx.measureText(player).width<=space?player:fitted(ctx,player,space,size,min);
 if(space>5)ctx.fillText(display,cursor,y);
}

async function graphicFor(section,format){
 const portrait=format==='portrait',landscape=format==='landscape',w=landscape?1600:1080,h=landscape?900:portrait?1350:1080;
 const cvs=document.createElement('canvas');cvs.width=w;cvs.height=h;
 const ctx=cvs.getContext('2d');if(!ctx)throw Error('Canvas rendering unavailable');
 const centerX=w/2,margin=landscape?60:34;
 ctx.fillStyle='#252326';ctx.fillRect(0,0,w,h);
 const grad=ctx.createRadialGradient(w*.5,h*.55,0,w*.5,h*.55,w*.75);
 grad.addColorStop(0,'rgba(241,77,7,.83)');grad.addColorStop(.47,'rgba(140,42,7,.44)');grad.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
 // Keep the original authentic RUS logos, but reserve the middle of the masthead for type.
 const brandLogo=landscape?98:80;
 const brand=await loadLogo(new URL('RUSlogoNew.png',location.href).href);
 drawLogo(ctx,brand,margin,24,brandLogo);
 drawLogo(ctx,brand,w-margin-brandLogo,24,brandLogo);
 ctx.textAlign='center';ctx.fillStyle='#fff';ctx.shadowColor='#000';ctx.shadowBlur=5;ctx.shadowOffsetY=3;
 const centerWidth=w-2*(margin+brandLogo+20);
 const masthead=fitted(ctx,'2026 RURAL UTAH SPORTS',centerWidth,landscape?57:37,24);
 ctx.fillText(masthead,centerX,landscape?82:77);
 ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 ctx.fillStyle='#ffb48c';
 ctx.fillText(fitted(ctx,labelRegion(region).toUpperCase(),w-2*margin,landscape?29:27,20),centerX,137);
 const title=section==='special'?'ALL-REGION 1ST TEAM SPECIAL TEAMS':section==='winners'?'REGION AWARD WINNERS':section==='first'?'ALL-REGION 1ST TEAM':section==='second'?'ALL-REGION 2ND TEAM':'HONORABLE MENTION';
 ctx.fillStyle='#fff';ctx.shadowBlur=4;ctx.shadowOffsetY=2;
 ctx.fillText(fitted(ctx,title,w-2*margin,landscape?48:41,25),centerX,187);
 ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 const finalized=Boolean(published&&!dirty);
 const subtitle=section==='special'?'REPORTED 2026 SEASON STATS':'2026 REGULAR SEASON';
 ctx.fillStyle='#f6e1d5';
 ctx.fillText(fitted(ctx,'RUS EDITORIAL AWARDS'+'  •  '+subtitle,w-2*margin,landscape?18:16,12),centerX,223);
 ctx.fillStyle='#f14d07';ctx.fillRect(margin,247,w-2*margin,3);
 const ids=section==='winners'?['mvp','opoy','dpoy']:section==='special'?SPECIAL_POSITIONS.map(slot=>'first:'+slot):fieldIDs(section).filter(id=>!SPECIAL_POSITIONS.includes(idSlot(id)));
 const imgs=new Map();
 const used=[...new Set(ids.map(id=>byID.get(section==='winners'?winners[id]:picks[id])?.team).filter(Boolean))];
 await Promise.all(used.map(async team=>imgs.set(team,await loadLogo(safeLogo(team)))));
 const footerY=h-30;
 function footer(){
  ctx.fillStyle='rgba(0,0,0,.36)';ctx.fillRect(0,h-66,w,66);
  ctx.fillStyle='#f14d07';ctx.fillRect(margin,h-66,w-2*margin,2);
  ctx.textAlign='center';ctx.fillStyle='#fff';
  ctx.fillText(fitted(ctx,'2026 REGION AWARD WINNERS'+'  •  RURALUTAHSPORTS.COM  •  @RURALUTAHSPORTS77',w-2*margin,landscape?17:15,11),centerX,footerY);
 }
 if(section==='special'){
  const top=portrait?290:278,bottom=h-84,gap=landscape?15:portrait?23:17;
  const cardHeight=(bottom-top-gap*2)/3;
  for(let i=0;i<ids.length;i++){
   const slot=idSlot(ids[i]),p=byID.get(picks[ids[i]]);
   const y=top+i*(cardHeight+gap),x=margin,cardWidth=w-2*margin;
   ctx.fillStyle='rgba(10,9,11,.86)';ctx.fillRect(x,y,cardWidth,cardHeight);
   ctx.fillStyle='#f14d07';ctx.fillRect(x,y,8,cardHeight);
   ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(x+8,y+1,cardWidth-8,1);
   const dim=Math.min(landscape?132:portrait?154:126,cardHeight*(landscape?.77:.53));
   const lx=x+27,ly=y+(cardHeight-dim)/2;
   if(p&&!drawLogo(ctx,imgs.get(p.team),lx,ly,dim)){
    ctx.textAlign='center';ctx.fillStyle='#fff';
    ctx.fillText(fitted(ctx,norm(p.team).slice(0,4),dim,17,12),lx+dim/2,ly+dim*.55);
   }
   ctx.textAlign='left';
   const tx=lx+dim+(landscape?31:21);
   const role=slot==='RS'?'RETURN SPECIALIST · KR/PR':slotLabel(slot).toUpperCase();
   if(landscape){
    const statsX=Math.max(Math.round(w*.63),tx+280);
    const leftWidth=statsX-tx-46,rightWidth=w-margin-35-statsX;
    ctx.fillStyle='#ffb48c';
    ctx.fillText(fitted(ctx,role,leftWidth,27,17),tx,y+cardHeight*.32);
    ctx.fillStyle='#fff';
    ctx.fillText(fitted(ctx,p?p.name.toUpperCase():'SELECTION PENDING',leftWidth,44,23),tx,y+cardHeight*.59);
    ctx.fillStyle='#eeded4';
    ctx.fillText(fitted(ctx,shareSchoolGrade(p,true),leftWidth,23,15),tx,y+cardHeight*.81);
    ctx.fillStyle='rgba(241,77,7,.63)';ctx.fillRect(statsX-20,y+30,2,cardHeight-60);
    ctx.fillStyle='#ffb48c';
    ctx.fillText(fitted(ctx,slot==='K'?'RUS REGULAR SEASON':'MAXPREPS REPORTED',rightWidth,17,12),statsX,y+cardHeight*.39);
    ctx.fillStyle='#fff';
    ctx.fillText(fitted(ctx,p?shareStatLine(p,slot):'STATS PENDING',rightWidth,22,13),statsX,y+cardHeight*.64);
   }else{
    const available=w-margin-tx-23;
    ctx.fillStyle='#ffb48c';
    ctx.fillText(fitted(ctx,role,available,portrait?28:24,16),tx,y+cardHeight*.27);
    ctx.fillStyle='#fff';
    ctx.fillText(fitted(ctx,p?p.name.toUpperCase():'SELECTION PENDING',available,portrait?44:35,19),tx,y+cardHeight*.48);
    ctx.fillStyle='#f7e7dd';
    ctx.fillText(fitted(ctx,shareSchoolGrade(p,true),available,portrait?22:19,12),tx,y+cardHeight*.66);
    ctx.fillStyle='#ffbd97';
    ctx.fillText(fitted(ctx,p?shareStatLine(p,slot):'STATS PENDING',available,portrait?20:17,11),tx,y+cardHeight*.82);
   }
  }
  footer();return cvs;
 }
 if(section==='winners'){
  // Award winners have a dedicated hierarchy: a full-width MVP, then OPOY and DPOY.
  // Keep this responsive across landscape, square and Instagram portrait exports.
  const top=landscape?269:274,bottom=h-84,gap=landscape?16:portrait?22:18;
  const totalHeight=bottom-top-gap,mvpHeight=Math.round(totalHeight*(landscape?.43:.44));
  const lowerTop=top+mvpHeight+gap,lowerHeight=bottom-lowerTop,cardGap=landscape?22:portrait?24:20;
  const cardWidth=(w-2*margin-cardGap)/2;
  const labels={
   mvp:'MOST VALUABLE PLAYER',opoy:'OFFENSIVE PLAYER OF THE YEAR',dpoy:'DEFENSIVE PLAYER OF THE YEAR'
  };
  function drawWinnerCard(role,x,y,cw,ch,featured){
   const p=byID.get(winners[role]);
   ctx.fillStyle='rgba(10,9,12,.79)';ctx.fillRect(x,y,cw,ch);
   ctx.fillStyle='#f14d07';ctx.fillRect(x,y,8,ch);
   ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(x+8,y,cw-8,2);
   if(p){
    ctx.fillStyle=color(p.team);
    ctx.fillRect(x+8,y+ch-5,cw-8,5);
   }
   ctx.shadowBlur=0;ctx.shadowOffsetY=0;
   if(featured || landscape){
    const logoDim=Math.min(featured?(landscape?156:portrait?182:147):118,ch*(featured?.60:.62));
    const lx=x+(featured?29:20),ly=y+(ch-logoDim)/2;
    if(p&&!drawLogo(ctx,imgs.get(p.team),lx,ly,logoDim)){
     ctx.fillStyle='#fff';ctx.textAlign='center';
     ctx.fillText(fitted(ctx,norm(p.team).slice(0,4),logoDim,19,11),lx+logoDim/2,ly+logoDim*.55);
    }
    const tx=lx+logoDim+(featured?31:24),textWidth=Math.max(20,cw-(tx-x)-25);
    ctx.textAlign='left';ctx.fillStyle='#ffb48c';
    ctx.fillText(fitted(ctx,labels[role],textWidth,featured?(landscape?26:29):20,13),
     tx,y+ch*(featured?.24:.24));
    ctx.shadowColor='#000';ctx.shadowBlur=3;ctx.shadowOffsetY=2;
    drawAwardHeading(ctx,role.toUpperCase(),p?shareGrade(p):'',p?p.name.toUpperCase():'PENDING',
     tx,y+ch*(featured?.46:.49),textWidth,featured?(landscape?41:42):29,featured?20:15);
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.fillStyle='#f6e5dc';
    ctx.fillText(fitted(ctx,p?p.team.toUpperCase():'AWAITING SELECTION',textWidth,featured?24:21,12),
     tx,y+ch*(featured?.68:.70));
    ctx.fillStyle='#ffdfce';
    ctx.fillText(fitted(ctx,p?statLine(p,role.toUpperCase()):'STATS NOT VERIFIED',textWidth,
     featured?(landscape?22:portrait?22:20):17,11),tx,y+ch*(featured?.84:.87));
   }else{
    // Square and portrait: stack school logo above names on two equal bottom cards.
    ctx.textAlign='center';ctx.fillStyle='#ffb48c';
    ctx.fillText(fitted(ctx,labels[role],cw-28,portrait?20:18,12),x+cw/2,y+ch*.115);
    const logoDim=Math.min(portrait?148:123,ch*.32),lx=x+(cw-logoDim)/2,ly=y+ch*.19;
    if(p&&!drawLogo(ctx,imgs.get(p.team),lx,ly,logoDim)){
     ctx.fillStyle='#fff';
     ctx.fillText(fitted(ctx,norm(p.team).slice(0,4),logoDim,17,10),x+cw/2,ly+logoDim*.55);
    }
    const tx=x+21,textWidth=cw-42;
    ctx.textAlign='left';ctx.shadowColor='#000';ctx.shadowBlur=3;ctx.shadowOffsetY=2;
    drawAwardHeading(ctx,role.toUpperCase(),p?shareGrade(p):'',p?p.name.toUpperCase():'PENDING',
     tx,y+ch*.66,textWidth,portrait?28:26,15);
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.fillStyle='#f5e4d9';
    ctx.fillText(fitted(ctx,p?p.team.toUpperCase():'AWAITING SELECTION',textWidth,portrait?21:19,11),
     tx,y+ch*.77);
    ctx.fillStyle='#ffdfce';
    ctx.fillText(fitted(ctx,p?statLine(p,role.toUpperCase()):'STATS NOT VERIFIED',textWidth,
     portrait?17:16,10),tx,y+ch*.88);
   }
  }
  drawWinnerCard('mvp',margin,top,w-2*margin,mvpHeight,true);
  drawWinnerCard('opoy',margin,lowerTop,cardWidth,lowerHeight,false);
  drawWinnerCard('dpoy',margin+cardWidth+cardGap,lowerTop,cardWidth,lowerHeight,false);
  footer();return cvs;
 }
 const isTeam=section!=='winners';
 const left=ids.filter((id,i)=>!isTeam?i<2:firstHalf.includes(idSlot(id))||idSlot(id)==='FLEX');
 const right=ids.filter((id,i)=>!isTeam?i>=2:!firstHalf.includes(idSlot(id))&&idSlot(id)!=='FLEX');
 const columnGap=landscape?68:26,columnWidth=(w-2*margin-columnGap)/2;
 const rowTop=isTeam?306:283,bottom=h-83;
 if(isTeam){
  for(const [col,name] of [[0,'OFFENSE'],[1,'DEFENSE']]){
   const x=margin+col*(columnWidth+columnGap);
   ctx.textAlign='left';ctx.fillStyle='#ffb48c';
   ctx.fillText(fitted(ctx,name,columnWidth,landscape?21:19,14),x+3,285);
   ctx.fillStyle='rgba(241,77,7,.75)';ctx.fillRect(x+3,295,columnWidth-6,2);
  }
 }
 for(const [col,arr] of [[0,left],[1,right]]){
  if(!arr.length)continue;
  const x=margin+col*(columnWidth+columnGap),rowHeight=(bottom-rowTop)/arr.length;
  for(let i=0;i<arr.length;i++){
   const id=arr[i],slot=isTeam?idSlot(id):id.toUpperCase(),p=byID.get(isTeam?picks[id]:winners[id]);
   const y=rowTop+i*rowHeight;
   ctx.fillStyle=i%2?'rgba(10,10,12,.23)':'rgba(10,10,12,.33)';
   ctx.fillRect(x,y+2,columnWidth,rowHeight-4);
   const logoDim=Math.min(section==='honorable'?landscape?44:53:landscape?79:portrait?92:74,rowHeight*.90);
   const logoX=x+5,tx=x+logoDim+21,maxText=columnWidth-logoDim-34;
   if(p){
    ctx.fillStyle=color(p.team);ctx.fillRect(x+logoDim+10,y+rowHeight*.12,3,rowHeight*.76);
    if(!drawLogo(ctx,imgs.get(p.team),logoX,y+(rowHeight-logoDim)/2,logoDim)){
     ctx.fillStyle='#fff';ctx.textAlign='center';
     ctx.fillText(fitted(ctx,norm(p.team).slice(0,3),logoDim,16,11),logoX+logoDim/2,y+rowHeight*.55);
    }
   }
   ctx.textAlign='left';ctx.shadowColor='#000';ctx.shadowBlur=3;ctx.shadowOffsetY=2;
   ctx.fillStyle='#fff';
   const role=isTeam?slotLabel(slot):({MVP:'MVP',OPOY:'OPOY',DPOY:'DPOY'})[slot];
   const titleSize=section==='honorable'?landscape?20:18:landscape?30:portrait?30:26;
   const titleMin=section==='honorable'?11:14;
   drawAwardHeading(ctx,role,p?shareGrade(p):'',p?p.name.toUpperCase():'PENDING',
    tx,y+rowHeight*.42,maxText,titleSize,titleMin);
   ctx.shadowBlur=0;ctx.shadowOffsetY=0;
   ctx.fillStyle='#f5e4d9';
   const detail=p?p.team.toUpperCase()+' · '+statLine(p,slot):'SELECTION NOT VERIFIED';
   const detailSize=section==='honorable'?landscape?12:13:landscape?18:portrait?17:14;
   ctx.fillText(fitted(ctx,detail,maxText,detailSize,10),tx,y+rowHeight*.73);
  }
 }
 footer();return cvs;
}

function zipU16(v){return[v&255,(v>>>8)&255]}
function zipU32(v){return[v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255]}
function zipCRC(bytes){
 let c=0xffffffff;
 for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}
 return(c^0xffffffff)>>>0;
}
async function zipAwardGraphics(entries){
 const encoder=new TextEncoder(),local=[],central=[];let offset=0;
 for(const item of entries){
  const name=encoder.encode(item.name),bytes=new Uint8Array(await item.blob.arrayBuffer());
  const crc=zipCRC(bytes),size=bytes.length;
  const head=new Uint8Array([80,75,3,4,20,0,0,0,0,0,0,0,0,0,...zipU32(crc),...zipU32(size),...zipU32(size),...zipU16(name.length),0,0]);
  local.push(head,name,bytes);
  central.push(new Uint8Array([80,75,1,2,20,0,20,0,0,0,0,0,0,0,...zipU32(crc),...zipU32(size),...zipU32(size),...zipU16(name.length),0,0,0,0,0,0,0,0,0,0,0,0,...zipU32(offset)]),name);
  offset+=head.length+name.length+size;
 }
 const directorySize=central.reduce((n,b)=>n+b.length,0);
 const end=new Uint8Array([80,75,5,6,0,0,0,0,...zipU16(entries.length),...zipU16(entries.length),...zipU32(directorySize),...zipU32(offset),0,0]);
 return new Blob([...local,...central,end],{type:'application/zip'});
}
async function downloadAwardBundle(scope){
 const btn=el(scope==='all'?'#ar-download-all':'#ar-download-region');
 const original=btn.textContent,previous=region,format=el('#ar-share-format').value;
 const saved={region,players,byID,picks,winners,status,published,dirty,notes,regionLocked,mode};
 btn.disabled=true;
 const entries=[],errors=[];
 try{
  if(scope==='all'&&!admin)throw Error('Unlock the editor with your PIN to download saved awards across all regions.');
  const targets=scope==='all'?regions:[region],sections=['first','second','honorable','winners','special'];
  for(let i=0;i<targets.length;i++){
   const r=targets[i];btn.textContent='Rendering '+(i+1)+'/'+targets.length+' regions…';
   if(r!==region){
    region=r;players=collect(r);byID=new Map(players.map(p=>[p.id,p]));
    await readPublication();
   }
   for(const section of sections){
    const canvas=await graphicFor(section,format);
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PNG export failed')),'image/png'));
    entries.push({name:r.replace(/[^a-z0-9-]+/gi,'-')+'/'+fileName(section,format),blob});
   }
  }
  if(!entries.length)throw Error('No graphics to export');
  btn.textContent='Packaging '+entries.length+' graphics…';
  const blob=await zipAwardGraphics(entries);
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='RUS-2026-'+(scope==='all'?'All-Regions':previous.replace(/[^a-z0-9]+/gi,'-'))+'-Awards-'+format+'.zip';
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  el('#ar-error').textContent='';
 }catch(e){el('#ar-error').textContent='Bulk download failed: '+e.message}
 finally{
  Object.assign(saved,{});
  region=saved.region;players=saved.players;byID=saved.byID;picks=saved.picks;winners=saved.winners;status=saved.status;published=saved.published;dirty=saved.dirty;notes=saved.notes;regionLocked=saved.regionLocked;mode=saved.mode;
  btn.disabled=false;btn.textContent=original;
 }
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
 const [r,logos,proof]=await Promise.all([fetch('region-awards-2026.lock.json?v=20261023-lock-1',{cache:'no-store'}),fetch('school-logo-cache.json?v=20261023-hub1').catch(()=>null),fetch('regular-season-publication-2026.json?v=20261027-publication1',{cache:'no-store'})]);
 if(!r.ok)throw Error('Locked awards data could not be read');if(!proof.ok)throw Error('Regular-season publication unavailable');publication=window.RUSRegularSeasonPolicy2026.requirePublication(await proof.json());snapshot=await window.RUSRegularSeasonPolicy2026.verifyLockedSnapshot(await r.text(),publication);correctLockedFootballAlignment(snapshot);
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
 el('#ar-download-region').onclick=()=>downloadAwardBundle('region');
 el('#ar-download-all').onclick=()=>downloadAwardBundle('all');
 el('#ar-backup').onclick=exportDraft;
 el('#ar-email-send').onclick=sendEmail;
 el('#ar-code-verify').onclick=confirmCode;
 el('#ar-signout').onclick=()=>{localStorage.removeItem('rus-award-auth-2026');session=null;admin=false;uid='';setRegion(region)};
 }catch(e){console.error(e);el('#ar-error').textContent='Unable to load the awards hub: '+e.message}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();


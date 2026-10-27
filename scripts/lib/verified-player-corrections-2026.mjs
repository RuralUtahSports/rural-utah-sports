import {createCompetitionIndex,gameKey,teamKey} from './competition-scope-2026.mjs';
const norm=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const category=v=>['DEFENSE','DEFENSESPECIALTEAMS','TACKLES','DEFENSIVESTATISTICS','SACKS'].includes(norm(v))?'DEFENSE':norm(v)==='PATSANDFIELDGOALS'?'KICKING':norm(v);
const header=(values,field)=>Object.keys(values||{}).find(k=>norm(k)===norm(field));
const value=(values,field)=>{const k=header(values,field);return k===undefined?null:values[k]};
const number=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))?Number(v):null;
const rounded=n=>String(Math.round((n+Number.EPSILON)*100)/100);
const primaryURL=url=>/^https:\/\/(?:www\.)?(?:maxpreps\.com|sports\.deseret\.com)\//.test(url||'');
const same=(a,b)=>a===b||(a!==null&&b!==null&&a!==''&&b!==''&&Number.isFinite(Number(a))&&Number(a)===Number(b));
const findTeam=(teams,name)=>{const hits=Object.entries(teams||{}).filter(([key])=>teamKey(key)===teamKey(name));if(hits.length!==1)throw Error(`Ambiguous/missing team: ${name}`);return hits[0][1]};
function identity(rosters,evidence){
 const school=findTeam(rosters.teams,evidence.team),hits=(school.roster||[]).filter(p=>p.playerId===evidence.identity.playerId);
 if(hits.length!==1)throw Error('Ambiguous/missing stable player ID');
 const person=hits[0];
 for(const k of ['name','number','class','height','weight'])if(String(person[k]??'')!==String(evidence.identity[k]??''))throw Error('Identity changed: '+k);
 if(evidence.sourceProfileMetadata)for(const k of ['number','class','height','weight'])if(String(person[k]??'')!==String(evidence.sourceProfileMetadata[k]??''))throw Error('Provider identity mismatch: '+k);
 return {school,person};
}
function sourceValue(e,decision){
 const rows=(e.sourceSeasonRows||[]).filter(r=>category(r.category)===category(decision.category)&&norm(r.name)===norm(e.identity.name));
 const hits=rows.map(r=>value(r.values,decision.field)).filter(v=>v!==null);
 if(hits.length!==1)throw Error('Missing/ambiguous reported season field: '+decision.id);
 return hits[0];
}
function reportedSum(e,decision){
 let total=0,comp=0,att=0,cells=0;
 for(const g of e.games){
  const hits=(g.statLines||[]).filter(l=>category(l.category)===category(decision.category)).map(l=>value(l.values,decision.field)).filter(v=>v!==null&&String(v).trim()!=='');
  if(hits.length>1)throw Error('Duplicate category field in a source game');
  if(!hits.length)continue;
  if(norm(decision.field)==='COMPATT'){
   const pair=String(hits[0]).match(/^(\d+)-(\d+)$/);if(!pair||Number(pair[1])>Number(pair[2]))throw Error('Invalid completion/attempt pair');comp+=Number(pair[1]);att+=Number(pair[2]);
  }else{const n=number(hits[0]);if(n===null)throw Error('Unreported/non-numeric game cell');total+=n;}
  cells++;
 }
 if(!cells)throw Error('No corroborating game cells: '+decision.id);
 return norm(decision.field)==='COMPATT'?`${comp}-${att}`:String(total);
}
export function applyVerifiedPlayerBatch(rosters,games,batch,{brackets,review}){
 if(batch.season!==2026||batch.scope!=='regular-season'||!batch.id)throw Error('Wrong batch season/scope');
 const output=structuredClone(rosters),gameOutput=structuredClone(games),index=createCompetitionIndex({brackets,review});
 const sets=new Map();
 for(const e of batch.evidenceSets||[]){
  if(sets.has(e.id)||e.season!==2026||e.phase!=='regular-season'||e.status!=='source-verified-pending-PR-review')throw Error('Invalid evidence set');
  identity(output,e);
  const seen=new Set();
  for(const g of e.games||[]){const k=gameKey(g,e.team),url=g.url||g.source;if(!primaryURL(url)||index.classify(g,e.team).phase!=='regular-season'||seen.has(k))throw Error('Duplicate, unknown or postseason source game');seen.add(k);}
  if(!seen.size||seen.size!==e.reportedGameCount)throw Error('Reported game coverage differs');sets.set(e.id,e);
 }
 const seenDecisions=new Set(),changes=[];
 for(const d of batch.decisions||[]){
  if(seenDecisions.has(d.id)||d.status!=='verified'||!primaryURL(d.source)||!/^2026-\d\d-\d\d/.test(d.reportingDate||''))throw Error('Invalid or duplicate decision');seenDecisions.add(d.id);
  const e=sets.get(d.evidenceId);if(!e||teamKey(e.team)!==teamKey(d.team)||e.identity.playerId!==d.playerId)throw Error('Decision identity/evidence mismatch');
  const {school,person}=identity(output,e);let row;
  if(d.target==='season'){
   if(e.heldSeasonTotal)throw Error('Unseparated cumulative evidence cannot authorize a season correction');
   const sections=(school.stats||[]).filter(s=>category(s.category)===category(d.category));
   const rows=sections.flatMap(s=>(s.rows||[]).filter(p=>p.playerId===d.playerId));if(rows.length!==1)throw Error('Ambiguous/missing season row');row=rows[0];
   if(d.method!=='derived-from-verified-operands'){
    if(!same(sourceValue(e,d),d.verifiedReplacement)||!same(reportedSum(e,d),d.verifiedReplacement))throw Error('Reported season and unique regular-game evidence disagree: '+d.id);
   }
  }else if(d.target==='game'){
   const matches=findTeam(gameOutput.teams,d.team).games.filter(g=>gameKey(g,d.team)===gameKey(d,d.team));if(matches.length!==1)throw Error('Ambiguous/missing target game');
   const game=matches[0],observed=e.games.find(g=>gameKey(g,e.team)===gameKey(d,d.team));
   if(index.classify(game,d.team).phase!=='regular-season'||!observed||!same(value(observed.values,d.field),d.verifiedReplacement))throw Error('Game value/phase not verified');
   let player=game.players.find(p=>p.playerId===d.playerId);
   if(!player){player={playerId:person.playerId,number:person.number,name:person.name,position:person.position||'',rosterMatched:true,statLines:[],scoringPlays:[]};game.players.push(player);}
   const lines=player.statLines.filter(l=>category(l.category)===category(d.category));if(lines.length>1)throw Error('Ambiguous target game category');
   row=lines[0];if(!row){row={category:d.category,values:{}};player.statLines.push(row);}
  }else throw Error('Unknown decision target');
  row.values||={};const k=header(row.values,d.field)||d.field,current=value(row.values,d.field);
  if(!same(current,d.originalValue)&&!same(current,d.verifiedReplacement))throw Error('Retained value changed; source review required: '+d.id);
  if(!same(current,d.verifiedReplacement)){
   row.values[k]=d.verifiedReplacement;(row.statSources||={})[k]=`Verified regular-season batch ${batch.id} · ${d.source} · reported ${d.reportingDate}`;
   (row.statEvidence||={})[k]={batchId:batch.id,evidenceId:d.evidenceId,scope:'regular-season',reportingDate:d.reportingDate,source:d.source,gamesIncluded:d.gamesIncluded,method:d.method};
   changes.push(d.id);
  }
 }
 // Verify derived rates only after all source-backed numerators/denominators are installed.
 for(const d of batch.decisions.filter(d=>d.target==='season'&&d.method==='derived-from-verified-operands')){
  const row=findTeam(output.teams,d.team).stats.find(s=>category(s.category)===category(d.category)).rows.find(r=>r.playerId===d.playerId);
  const get=h=>number(value(row.values,h));let expected;
  if(category(d.category)==='KICKING'&&norm(d.field)==='PTS'){if(get('PAT')!==null&&get('FG')!==null)expected=String(get('PAT')+3*get('FG'));}
  else if(norm(d.field)==='COMPPCT'||d.field==='COMP%'){const p=String(value(row.values,'COMP-ATT')).match(/^(\d+)-(\d+)$/);if(p&&Number(p[2])>0)expected=rounded(Number(p[1])/Number(p[2])*100);}
  else if(norm(d.field)==='YARDSCOMP'){const p=String(value(row.values,'COMP-ATT')).match(/^(\d+)-(\d+)$/);if(p&&Number(p[1])>0&&get('YARDS')!==null)expected=rounded(get('YARDS')/Number(p[1]));}
  else {const denominator=get(category(d.category)==='RUSHING'?'CARRIES':'RECEPTIONS');if(denominator>0&&get('YARDS')!==null)expected=rounded(get('YARDS')/denominator);}
  if(expected===undefined||!same(expected,d.verifiedReplacement))throw Error('Derived rate does not match verified operands: '+d.id);
 }
 return {rosters:output,games:gameOutput,changes};
}
export function syncVerifiedBatchViews({rosters,games,metrics,shards},batch){
 const slim=structuredClone(metrics),copies=structuredClone(shards);
 const selected=new Set(batch.decisions.filter(d=>d.target==='season').map(d=>d.team));
 for(const team of selected){
  const full=findTeam(rosters.teams,team),target=findTeam(slim.teams,team);
  for(const section of target.stats||[])for(const row of section.rows||[]){
   const src=full.stats.filter(s=>category(s.category)===category(section.category)).flatMap(s=>s.rows).find(p=>p.playerId===row.playerId);if(!src)continue;
   for(const key of Object.keys(row.values||{})){
    if(batch.decisions.some(d=>d.target==='season'&&d.team===team&&d.playerId===row.playerId&&category(d.category)===category(section.category)&&norm(d.field)===norm(key)))row.values[key]=value(src.values,key);
   }
  }
 }
 for(const [slug,shard] of Object.entries(copies)){
  if(!batch.evidenceSets.some(e=>teamKey(e.team)===teamKey(shard.team)))continue;
  if(selected.has(shard.team))shard.rosterStats=structuredClone(findTeam(rosters.teams,shard.team));
  if(batch.decisions.some(d=>d.target==='game'&&teamKey(d.team)===teamKey(shard.team)))shard.gameStats=structuredClone(findTeam(games.teams,shard.team));
 }
 return {metrics:slim,shards:copies};
}

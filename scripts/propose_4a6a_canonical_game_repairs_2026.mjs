// Explicit source-repair proposal for verified 2026 4A-6A opponent reports.
// This file NEVER mutates the canonical source. It records exact guarded repairs
// and blocks unreviewed contest phases, missing identities and unreported cells.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createCompetitionIndex,gameKey as stableGameKey,teamKey} from './lib/competition-scope-2026.mjs';

const require=createRequire(import.meta.url);
const {validate}=require('../reviewed-4a6a-five-player-2026.js');
const norm=x=>String(x??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const get=(v,k)=>{const keys=Object.keys(v||{}).filter(a=>norm(a)===norm(k));if(keys.length>1)throw Error('Ambiguous stat field '+k);return keys.length===1?{key:keys[0],value:v[keys[0]]}:null};
const choose=(teams,team)=>{const rows=Object.entries(teams||{}).filter(([k])=>teamKey(k)===teamKey(team));if(rows.length!==1)throw Error('Missing/ambiguous school '+team);return rows[0][1]};
const same=(a,b)=>String(a)===String(b);
const unverified=(d,g,reason)=>({team:d.team,playerId:d.playerId,date:g.date,opponent:g.opponent,reason,source:g.sourceUrl});

function attachTaylorGame({out,rosters,review,index,proposals,holds,strictPhase}){
 if(!review)return;
 if(review.id!=='westlake-ashton-taylor-2026-10-15-rushing-yards'||review.season!==2026||review.scope!=='regular-season-single-game-only'||review.status!=='source-reviewed-conflict-resolved'||
    review.team!=='WESTLAKE'||review.identity?.playerId!=='westlake-5-ashton-taylor'||review.identity?.name!=='Ashton Taylor'||String(review.identity?.number)!=='5'||
    review.game?.date!=='2026-10-15'||teamKey(review.game?.opponent)!==teamKey('MOUNTAIN RIDGE')||
    review.game?.teamScore!==13||review.game?.opponentScore!==21||
    review.category!=='Rushing'||review.field!=='YARDS'||review.verifiedValue!==203||
    review.priorConflictValue!==211||review.priorConflictPublished!=='2026-10-19'||
    review.primaryPublished!=='2026-10-27'||
    !/^https:\/\/www\.maxpreps\.com\/news\//.test(review.primarySource)||
    !/^https:\/\/www\.maxpreps\.com\/news\//.test(review.additionalSource))
  throw Error('Westlake source conflict or athlete/game identity changed; re-review required');
 const roster=choose(rosters.teams,review.team).roster.filter(p=>p.playerId===review.identity.playerId&&p.name===review.identity.name&&String(p.number)==='5');
 if(roster.length!==1)throw Error('Missing/ambiguous Westlake roster identity');
 const phase=index.classify({date:review.game.date,opponent:review.game.opponent,url:review.primarySource},review.team);
 if(phase.phase!=='regular-season'){holds.push({team:review.team,playerId:review.identity.playerId,date:review.game.date,opponent:review.game.opponent,reason:'Competition index lacks positively reviewed regular-season phase',source:review.primarySource});return;}
 const games=choose(out.teams,review.team).games||[];
 const matches=games.filter(g=>g.date===review.game.date&&teamKey(g.opponent)===teamKey(review.game.opponent));
 if(matches.length>1)throw Error('Duplicate Westlake Oct 15 game');
 if(matches.length===1){
  const game=matches[0],people=(game.players||[]).filter(p=>p.playerId===review.identity.playerId);
  if(game.manualPartialStats&&people.length===1&&people[0].name===review.identity.name&&String(people[0].number)==='5'){
   const lines=(people[0].statLines||[]).filter(l=>norm(l.category)==='RUSHING'),v=lines.length===1?get(lines[0].values,'YARDS'):null;
   if(v&&same(v.value,'203')&&game.teamScore===13&&game.opponentScore===21)return;
  }
  holds.push({team:review.team,playerId:review.identity.playerId,date:review.game.date,opponent:review.game.opponent,reason:'A complete or changed Oct 15 game already exists; do not overwrite it with a partial player report',source:review.primarySource});
  return;
 }
 const game={gameKey:'2026-10-15|MOUNTAINRIDGE|WESTLAKE',date:review.game.date,opponent:review.game.opponent,
  status:'Final',final:true,teamScore:13,opponentScore:21,url:review.primarySource,maxprepsUrl:review.primarySource,
  manualPartialStats:true,playerDataCoverage:'reviewed partial rushing-yard report; carries/TD and other athletes remain unknown',
  players:[{playerId:review.identity.playerId,name:review.identity.name,number:'5',rosterMatched:true,statLines:[{category:'Rushing',values:{YARDS:'203'},statSources:{YARDS:'2026-10-27 updated MaxPreps recap, corroborated by second Oct 27 recap'}}],scoringPlays:[]}]};
 if(!stableGameKey(game,review.team))throw Error('Westlake recovered game has invalid competition identity');
 games.push(game);games.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 proposals.push({kind:'recover-missing-game',team:review.team,playerId:review.identity.playerId,date:game.date,
  opponent:game.opponent,source:review.primarySource,fields:['YARDS'],reviewedValue:203,manualPartialStats:true,
  conflictingOlderRecap:review.priorConflictSource,seasonTotalHeld:true});
}


function attachDahlGame({out,rosters,review,index,proposals,holds}){
 if(!review)return;
 const source='https://www.maxpreps.com/ut/football/game/farmington-vs-layton/10-14-2026/?c=3d420072-cdf0-4e47-aa5d-8cad041b3bee';
 const expected={YARDS:'190','COMP-ATT':'17-29',TD:'0',Int:'0'};
 const before={YARDS:'2157','COMP-ATT':'172-318',TD:'12',Int:'11'};
 const after={YARDS:'2347','COMP-ATT':'189-347',TD:'12',Int:'11'};
 if(review.id!=='farmington-alton-dahl-oct14-2026-passing'||review.season!==2026||
  review.scope!=='regular-season-single-game-only'||review.status!=='source-reviewed-partial-box'||
  review.team!=='FARMINGTON'||review.classification!=='6A'||
  review.identity?.playerId!=='farmington-17-alton-dahl'||review.identity?.name!=='Alton Dahl'||String(review.identity?.number)!=='17'||
  review.game?.date!=='2026-10-14'||teamKey(review.game?.opponent)!=='LAYTON'||
  review.game?.teamScore!==27||review.game?.opponentScore!==17||
  review.game?.sourceUrl!==source||review.game?.canonicalKey!=='2026-10-14|FARMINGTON|LAYTON'||
  review.category!=='Passing'||JSON.stringify(review.reportedFields)!==JSON.stringify(expected)||
  JSON.stringify(review.previouslySavedNineGameFields)!==JSON.stringify(before)||
  JSON.stringify(review.reconciledTenGameFields)!==JSON.stringify(after)||
  review.corroboration?.url!=='https://www.deseret.com/sports/2026/10/29/high-school-football-6a-first-round-previews/')
  throw Error('Farmington Dahl game/source/evidence changed; independent review required');
 const roster=choose(rosters.teams,review.team).roster.filter(p=>
  p.playerId===review.identity.playerId&&p.name===review.identity.name&&String(p.number)==='17');
 if(roster.length!==1)throw Error('Farmington Dahl roster identity missing or ambiguous');
 const phase=index.classify({date:review.game.date,opponent:review.game.opponent,url:source},review.team);
 if(phase.phase!=='regular-season'){
  holds.push({team:review.team,playerId:review.identity.playerId,date:review.game.date,
   reason:'Farmington-Layton competition phase not positively reviewed',source});return;
 }
 const games=choose(out.teams,review.team).games;
 if(!Array.isArray(games))throw Error('Missing Farmington canonical games');
 const existing=games.filter(g=>g.date===review.game.date&&teamKey(g.opponent)===teamKey('LAYTON'));
 if(existing.length>1)throw Error('Duplicate Farmington October 14 source game');
 // Require all nine earlier games, not just the provider season total. Any
 // missing match, unknown field or new game after the review blocks the write.
 const earlier=games.filter(g=>String(g.date).startsWith('2026-')&&g.date!=='2026-10-14');
 if(earlier.length!==9||new Set(earlier.map(g=>g.date+'|'+teamKey(g.opponent))).size!==9)
  throw Error('Farmington nine-game source coverage changed; review again');
 const sums={YARDS:0,COMP:0,ATT:0,TD:0,Int:0};
 for(const game of earlier){
  const people=(game.players||[]).filter(p=>p.playerId===review.identity.playerId&&p.name==='Alton Dahl'&&String(p.number)==='17');
  if(people.length!==1||!/^https:\/\/(?:www\.)?maxpreps\.com\//.test(game.maxprepsUrl||''))
   throw Error('Farmington old game lacks uniquely sourced Dahl row '+game.date);
  const lines=(people[0].statLines||[]).filter(line=>norm(line.category)==='PASSING');
  if(lines.length!==1)throw Error('Farmington Dahl passing game line missing '+game.date);
  const vals=lines[0].values||{};
  for(const field of ['YARDS','TD','Int']){
   const cell=get(vals,field);
   if(!cell||!Number.isInteger(Number(cell.value)))throw Error('Farmington missing game field '+field+' '+game.date);
   sums[field]+=Number(cell.value);
  }
  const pair=get(vals,'COMP-ATT')?.value;
  if(!/^\d+-\d+$/.test(String(pair??'')))throw Error('Farmington passing completions unavailable '+game.date);
  const [cmp,att]=String(pair).split('-').map(Number);
  if(cmp>att)throw Error('Invalid Farmington game passing pair');
  sums.COMP+=cmp;sums.ATT+=att;
 }
 if(sums.YARDS!==2157||sums.COMP!==172||sums.ATT!==318||sums.TD!==12||sums.Int!==11)
  throw Error('Farmington historical nine-game subtotal changed; re-audit before applying');
 if(sums.YARDS+Number(expected.YARDS)!==2347||sums.COMP+17!==189||sums.ATT+29!==347)
  throw Error('Farmington ten-game reconciliation failed');
 if(existing.length===1){
  const game=existing[0],people=(game.players||[]).filter(p=>
   p.playerId===review.identity.playerId&&p.name==='Alton Dahl'&&String(p.number)==='17');
  const lines=people.flatMap(p=>(p.statLines||[]).filter(l=>norm(l.category)==='PASSING'));
  if(game.teamScore!==27||game.opponentScore!==17||people.length!==1||lines.length!==1||
   Object.entries(expected).some(([field,value])=>String(get(lines[0].values,field)?.value)!==value))
   throw Error('Farmington October 14 now has conflicting source fields; hold');
  return; // A complete reported game may replace the partial row if all reviewed fields agree.
 }
 const newGame={
  gameKey:'2026-10-14|FARMINGTON|LAYTON',date:'2026-10-14',opponent:'LAYTON',
  status:'Final',final:true,teamScore:27,opponentScore:17,url:source,maxprepsUrl:source,
  manualPartialStats:true,playerDataCoverage:'reviewed Dahl passing-only box; other players and categories unknown',
  players:[{playerId:review.identity.playerId,name:'Alton Dahl',number:'17',rosterMatched:true,
   statLines:[{category:'Passing',values:structuredClone(expected),
    statSources:Object.fromEntries(Object.keys(expected).map(field=>[field,'Reviewed 2026-10-14 MaxPreps game box']))}],
   scoringPlays:[]}]
 };
 if(stableGameKey(newGame,review.team)!==review.game.canonicalKey)
  throw Error('Farmington recovered game key does not match independently reviewed identity');
 games.push(newGame);games.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 proposals.push({kind:'recover-missing-game',team:review.team,playerId:review.identity.playerId,
  date:newGame.date,opponent:newGame.opponent,source,fields:Object.keys(expected),
  manualPartialStats:true,seasonTotalHeld:true});
}


function attachFarmingtonSkillBoxes({out,rosters,review,index,proposals,holds}){
 if(!review)return;
 const gameSource='https://www.maxpreps.com/ut/football/game/farmington-vs-layton/10-14-2026/?c=3d420072-cdf0-4e47-aa5d-8cad041b3bee';
 if(review.id!=='farmington-layton-oct14-2026-skill-player-boxes'||review.season!==2026||
  review.scope!=='regular-season-single-game-only'||review.status!=='source-reviewed-partial-game-addendum'||
  review.team!=='FARMINGTON'||review.classification!=='6A'||
  review.game?.date!=='2026-10-14'||review.game?.opponent!=='LAYTON'||
  review.game?.teamScore!==27||review.game?.opponentScore!==17||
  review.game?.canonicalKey!=='2026-10-14|FARMINGTON|LAYTON'||review.game?.url!==gameSource||
  review.independentSeasonCorroboration?.url!=='https://www.deseret.com/sports/2026/10/29/high-school-football-6a-first-round-previews/'||
  review.decisions?.length!==2)throw Error('Farmington skill-game review manifest changed; re-review required');
 const expected=[
  {id:'farmington-32-brogan-jeppesen',name:'Brogan Jeppesen',number:'32',category:'Rushing',
   old:{YARDS:316,CARRIES:73},newFields:{YARDS:'94',CARRIES:'18',TD:'1'},final:{YARDS:410,CARRIES:91,TD:3}},
  {id:'farmington-14-thayne-boyle',name:'Thayne Boyle',number:'14',category:'Receiving',
   old:{YARDS:326,RECEPTIONS:34,TD:3},newFields:{YARDS:'54',RECEPTIONS:'5',TD:'0'},final:{YARDS:380,RECEPTIONS:39,TD:3}}
 ];
 const roster=choose(rosters.teams,'FARMINGTON').roster;
 const sourceGames=choose(out.teams,'FARMINGTON').games;
 if(!Array.isArray(sourceGames))throw Error('Farmington missing source games');
 const prior=sourceGames.filter(g=>String(g.date).startsWith('2026-')&&g.date!=='2026-10-14');
 if(prior.length!==9||new Set(prior.map(g=>g.date+'|'+teamKey(g.opponent))).size!==9)
  throw Error('Farmington nine historical source games have changed');
 const scope=index.classify({date:'2026-10-14',opponent:'LAYTON',url:gameSource},'FARMINGTON');
 if(scope.phase!=='regular-season'){
  holds.push({team:'FARMINGTON',date:'2026-10-14',reason:'Skill-player reports lack positive regular-season phase',source:gameSource});return;
 }
 const node=sourceGames.filter(g=>g.date==='2026-10-14'&&teamKey(g.opponent)==='LAYTON');
 if(node.length!==1){holds.push({team:'FARMINGTON',date:'2026-10-14',reason:'Missing or duplicated reviewed Dahl Farmington game; publish first',source:gameSource});return;}
 const game=node[0];
 if(game.teamScore!==27||game.opponentScore!==17||
  stableGameKey(game,'FARMINGTON')!=='2026-10-14|FARMINGTON|LAYTON'||
  !game.manualPartialStats||game.maxprepsUrl!==gameSource)
  throw Error('Farmington October 14 has unexpected existing source game data');
 const inserted=[];
 for(let i=0;i<expected.length;i++){
  const e=expected[i],d=review.decisions[i];
  if(d.identity?.playerId!==e.id||d.identity?.name!==e.name||String(d.identity?.number)!==e.number||
   d.category!==e.category||JSON.stringify(d.gameValues)!==JSON.stringify(e.newFields)||
   JSON.stringify(d.reconciledReportedTotals)!==JSON.stringify(e.final)||
   Object.entries(e.old).some(([f,v])=>d.previousNineGameSubtotal?.[f]!==v))
   throw Error('Farmington skill-player source manifest fields changed '+e.name);
  if(roster.filter(p=>p.playerId===e.id&&p.name===e.name&&String(p.number)===e.number).length!==1)
   throw Error('Farmington skill athlete roster missing or ambiguous '+e.id);
  const totals=Object.fromEntries(Object.keys(e.old).map(f=>[f,0]));
  let missingTD=0;
  for(const old of prior){
   if(!/^https:\/\/(?:www\.)?maxpreps\.com\//.test(old.maxprepsUrl||''))
    throw Error('Farmington previous game has no MaxPreps source '+old.date);
   const people=(old.players||[]).filter(p=>p.playerId===e.id&&p.name===e.name&&String(p.number)===e.number);
   if(people.length!==1)throw Error('Missing prior skill player game '+e.id+' '+old.date);
   const lines=(people[0].statLines||[]).filter(l=>norm(l.category)===norm(e.category));
   if(lines.length!==1)throw Error('Missing prior skill category '+e.id+' '+old.date);
   for(const field of Object.keys(e.old)){
    const cell=get(lines[0].values,field);
    if(!cell||!/^[-]?\d+$/.test(String(cell.value))){
     if(field==='TD'){missingTD++;continue;}
     throw Error('Unreported prior skill field '+e.id+' '+old.date+' '+field);
    }
    totals[field]+=Number(cell.value);
   }
  }
  if(Object.entries(e.old).some(([f,v])=>totals[f]!==v)||missingTD!==d.previousNineGameSubtotal.tdSourceFieldGaps)
   throw Error('Farmington nine-game skill subtotal changed '+e.name);
  for(const field of Object.keys(e.old)){
   if(field!=='TD'&&totals[field]+Number(e.newFields[field])!==e.final[field])
    throw Error('Farmington skill ten-game sum changed '+e.name+' '+field);
  }
  if(e.category==='Rushing'&&d.seasonTDCertification!=='held-game-source-blank-in-one-of-nine-earlier-boxes')
   throw Error('Cannot certify Jeppesen touchdown total');
  const rows=(game.players||[]).filter(p=>p.playerId===e.id);
  if(rows.length>1)throw Error('Duplicate October 14 Farmington athlete '+e.id);
  if(rows.length===1){
   if(rows[0].name!==e.name||String(rows[0].number)!==e.number)throw Error('Changed October 14 athlete identity');
   const lines=(rows[0].statLines||[]).filter(l=>norm(l.category)===norm(e.category));
   if(lines.length!==1||Object.entries(e.newFields).some(([field,value])=>String(get(lines[0].values,field)?.value)!==value))
    throw Error('Conflicting Farmington Oct 14 skill values '+e.id);
   continue; // Previously published exact reviewed game stats.
  }
  game.players.push({playerId:e.id,name:e.name,number:e.number,rosterMatched:true,
   statLines:[{category:e.category,values:structuredClone(e.newFields),statSources:Object.fromEntries(Object.keys(e.newFields).map(f=>[f,'Reviewed October 14 MaxPreps game box']))}],
   scoringPlays:[]});
  inserted.push(e.id);
 }
 if(inserted.length){
  game.playerDataCoverage='reviewed partial Dahl/Jeppesen/Boyle game lines; all other athlete fields remain unknown';
  proposals.push({kind:'augment-reviewed-partial-game',team:'FARMINGTON',
   playerId:inserted[0],playerIds:inserted,date:'2026-10-14',opponent:'LAYTON',
   source:gameSource,fields:['Jeppesen rushing YARDS/CARRIES/TD','Boyle receiving YARDS/RECEPTIONS/TD'],
   manualPartialStats:true,seasonTotalsHeld:true});
 }
}

export function proposeSourceRepairs(gameStats,rosters,manifest,{index,strictPhase=true,taylorReview=null,dahlReview=null,farmingtonSkillReview=null}={}){
 if(typeof index?.classify!=='function')throw Error('Explicit reviewed competition identity index required');
 validate(manifest);
 const out=structuredClone(gameStats),proposals=[],holds=[];
 if(out.season!==2026||rosters.season!==2026)throw Error('Unexpected source season');
 for(const d of manifest.decisions){
  const school=choose(rosters.teams,d.team),roster=school.roster.filter(x=>x.playerId===d.playerId&&x.name===d.name&&String(x.number)===String(d.number));
  if(roster.length!==1)throw Error('Unmatched athlete in canonical roster '+d.playerId);
  const games=choose(out.teams,d.team).games;
  if(!Array.isArray(games))throw Error('No canonical game array '+d.team);
  // Only fields already approved for the verified regular season may be repaired.
  const approved=new Set(Object.keys(d.verified));
  const relevant=d.sourceGames.filter(g=>g.change||g.newlyRecovered);
  for(const g of relevant){
   const phase=index.classify({date:g.date,opponent:g.opponent,url:g.sourceUrl},d.team);
   if(phase.phase!=='regular-season'){
    holds.push(unverified(d,g,'Competition index does not positively identify this as regular season: '+phase.phase));
    if(strictPhase)continue;
   }
   const matches=games.filter(x=>String(x.date)===g.date&&teamKey(x.opponent)===teamKey(g.opponent));
   if(matches.length>1)throw Error('Duplicate canonical game for '+d.team+' '+g.date);
   if(g.change){
    if(matches.length!==1)throw Error('Reviewed correction lost its original game '+d.team+' '+g.date);
    const match=matches[0],players=(match.players||[]).filter(p=>p.playerId===d.playerId);
    if(players.length!==1||players[0].name!==d.name||String(players[0].number)!==String(d.number))throw Error('Game player mismatch '+d.playerId);
    const lines=(players[0].statLines||[]).filter(s=>norm(s.category)===norm(d.category));
    if(lines.length!==1)throw Error('Game source line is missing/ambiguous '+d.playerId);
    const changes=[];
    for(const [field,next] of Object.entries(g.change.newValues||{})){
     if(!approved.has(field))continue; // Unverified TD and other values remain untouched.
     const existing=get(lines[0].values,field),baseline=get(g.change.oldValues,field);
     if(!existing||!baseline||!same(existing.value,baseline.value)&&!same(existing.value,next))throw Error('Conflicting saved game field '+d.team+' '+g.date+' '+field);
     if(!same(existing.value,next)){
      lines[0].values[existing.key]=String(next);
      (lines[0].statSources||={})[existing.key]='Reviewed MaxPreps box, '+g.sourceUrl;
      changes.push({field,previous:existing.value,reviewed:String(next)});
     }
    }
    if(changes.length){proposals.push({kind:'correct-archived-game',team:d.team,playerId:d.playerId,date:g.date,opponent:g.opponent,source:g.sourceUrl,fields:changes});}
   }else if(g.newlyRecovered){
    if(matches.length===1){
     // A later build is allowed to preserve an already reviewed, explicitly
     // partial record. Any altered metadata/player/cell requires new review.
     const old=matches[0],players=(old.players||[]).filter(p=>p.playerId===d.playerId&&p.name===d.name&&String(p.number)===String(d.number));
     const lines=players.flatMap(p=>(p.statLines||[]).filter(l=>norm(l.category)===norm(d.category)));
     if(!old.manualPartialStats||old.gameKey!==g.gameKey||old.teamScore!==g.verifiedScore.for||old.opponentScore!==g.verifiedScore.against||players.length!==1||lines.length!==1)
      throw Error('Recovered game was changed after source review: '+d.team+' '+g.date);
     for(const field of approved){
      const cell=get(lines[0].values,field);
      if(!cell||!same(cell.value,g.sourceFieldValues?.[field]))throw Error('Recovered partial source field changed: '+d.team+' '+g.date+' '+field);
     }
     continue;
    }
    if(matches.length!==0){holds.push(unverified(d,g,'Newly recovered game has duplicate canonical records'));continue;}
    if(!g.verifiedScore||!Number.isInteger(g.verifiedScore.for)||!Number.isInteger(g.verifiedScore.against)||!/^https:\/\/(?:www\.)?maxpreps\.com\//.test(g.sourceUrl))throw Error('Missing independent game evidence');
    const values={};
    for(const field of approved){
     const value=g.sourceFieldValues?.[field];
     if(value===undefined||value===null||String(value).trim()==='')throw Error('Approved source field missing in recovered game '+d.team+' '+g.date+' '+field);
     values[field]=String(value);
    }
    const node={
     gameKey:g.gameKey,date:g.date,opponent:g.opponent,status:'Final',final:true,
     teamScore:g.verifiedScore.for,opponentScore:g.verifiedScore.against,
     url:g.sourceUrl,maxprepsUrl:g.sourceUrl,
     manualPartialStats:true,
     playerDataCoverage:'reviewed-partial-box; other athletes and fields unknown',
     players:[{playerId:d.playerId,name:d.name,number:String(d.number),rosterMatched:true,statLines:[{category:d.category,values,statSources:Object.fromEntries(Object.keys(values).map(field=>[field,'Reviewed MaxPreps game source']))}],scoringPlays:[]}]
    };
    if(!stableGameKey(node,d.team))throw Error('Recovered game lacks stable canonical identity '+d.team+' '+g.date);
    games.push(node);games.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    proposals.push({kind:'recover-missing-game',team:d.team,playerId:d.playerId,date:g.date,opponent:g.opponent,source:g.sourceUrl,fields:Object.keys(values),manualPartialStats:true});
   }
  }
 }
 attachTaylorGame({out,rosters,review:taylorReview,index,proposals,holds,strictPhase});
 attachDahlGame({out,rosters,review:dahlReview,index,proposals,holds});
 attachFarmingtonSkillBoxes({out,rosters,review:farmingtonSkillReview,index,proposals,holds});
 // Reconcile the metadata only after all source-field approvals are checked.
 if(proposals.length){
  out.summary||={};
  out.summary.teamGames=Object.values(out.teams||{}).reduce((n,t)=>n+(t.games||[]).length,0);
  out.summary.verified2026SourceRepairs={manifestId:manifest.id,reviewDate:manifest.reviewDate,method:'unique source game + reviewed competition phase + stable player ID',changes:proposals.length};
 }
 return {repaired:out,proposals,holds,status:'REVIEWED: only exact permitted game fields or explicitly partial sourced games are changed'};
}

function read(filename){return JSON.parse(fs.readFileSync(filename,'utf8'));}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const files=['player-game-stats-2026.json','deseret-rosters-stats-2026.json','audits/2026-regular-season/reconciled-4a6a-player-cases-2026.json','official-brackets-2026.json','competition-scope-review-2026.json','audits/2026-regular-season/westlake-taylor-oct15-reviewed-2026.json','audits/2026-regular-season/farmington-dahl-oct14-reviewed-2026.json','audits/2026-regular-season/farmington-layton-oct14-skills-reviewed-2026.json'];
 const raw=Object.fromEntries(files.map(file=>[file,fs.readFileSync(file,'utf8')]));
 const [games,rosters,manifest,brackets,review,taylorReview,dahlReview,farmingtonSkillReview]=files.map(file=>JSON.parse(raw[file]));
 const result=proposeSourceRepairs(games,rosters,manifest,{index:createCompetitionIndex({brackets,review}),taylorReview,dahlReview,farmingtonSkillReview});
 if(process.argv.includes('--apply')){
  if(result.holds.length)throw Error('Cannot publish canonical source while unverified game phases remain');
  const pathToSource='player-game-stats-2026.json';
  // No unreviewed source file, game identity, TD or award data is ever written.
  if(result.proposals.length){
   const tmp=pathToSource+'.source-review-tmp';
   fs.writeFileSync(tmp,JSON.stringify(result.repaired,null,2)+'\n');
   fs.renameSync(tmp,pathToSource);
  }
 }
 const output=process.argv.find(x=>x.startsWith('--output='))?.slice(9)||'/tmp/rus-2026-player-source-repairs';
 if(!path.isAbsolute(output)||path.resolve(output)===process.cwd())throw Error('Output must be outside the repository');
 fs.mkdirSync(output,{recursive:true});
 const simple={status:process.argv.includes('--apply')?'APPLIED VERIFIED SOURCE GAME CORRECTIONS: no season or playoff value changed':result.status,proposals:result.proposals,holds:result.holds,playersCovered:manifest.decisions.map(x=>x.name)};
 fs.writeFileSync(path.join(output,'proposed-source-fixes.json'),JSON.stringify(simple,null,2)+'\n');
 fs.writeFileSync(path.join(output,'REVIEW.md'),[
  '# Proposed 2026 4A–6A source game repairs',
  '',
  '**Read only. The canonical player-game-stats-2026.json file has not been modified.**',
  '',
  '## Exact game-cell repairs / additions',
  ...result.proposals.map(p=>'- '+p.team+' '+p.date+' '+p.opponent+': '+p.kind+' '+JSON.stringify(p.fields)+' ('+p.source+')'),
  '',
  '## Competition-phase / identity holds',
  ...result.holds.map(x=>'- '+x.team+' '+x.date+' '+x.opponent+': '+x.reason+' ('+x.source+')'),
  '',
  'Existing reviewed leaderboard corrections remain unchanged. Newly reconstructed game rows are explicitly partial; no other players or unknown stat fields are filled with zeros.',
  ''
 ].join('\n'));
 for(const f of files)if(f!=='player-game-stats-2026.json'||!process.argv.includes('--apply'))if(fs.readFileSync(f,'utf8')!==raw[f])throw Error('Source repair unexpectedly changed protected input '+f);
 console.log(JSON.stringify(simple));
}

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

export function proposeSourceRepairs(gameStats,rosters,manifest,{index,strictPhase=true}={}){
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
 const files=['player-game-stats-2026.json','deseret-rosters-stats-2026.json','audits/2026-regular-season/reconciled-4a6a-player-cases-2026.json','official-brackets-2026.json','competition-scope-review-2026.json'];
 const raw=Object.fromEntries(files.map(file=>[file,fs.readFileSync(file,'utf8')]));
 const [games,rosters,manifest,brackets,review]=files.map(file=>JSON.parse(raw[file]));
 const result=proposeSourceRepairs(games,rosters,manifest,{index:createCompetitionIndex({brackets,review})});
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

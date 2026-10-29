// Focused, idempotent restoration of the two owner-confirmed October 15 finals.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalTeam,isoDate} from './reconcile-final-games.mjs';
const wanted=[['MOUNTAIN RIDGE','WESTLAKE',21,13],['MANTI','CANYON VIEW',21,28]];
const numeric=['wins','losses','ties','regionWins','regionLosses','regionTies','nonRegionWins','nonRegionLosses','nonRegionTies','pointsFor','pointsAgainst','nonRegionPointsFor','nonRegionPointsAgainst'];
const pct=(r,region=false)=>{const [w,l,t]=region?[r.regionWins,r.regionLosses,r.regionTies]:[r.wins,r.losses,r.ties],n=w+l+t;return n?(w+t*.5)/n:0};
const margin=r=>r.pointsFor-r.pointsAgainst;
const overall=(a,b)=>pct(b)-pct(a)||b.wins-a.wins||margin(b)-margin(a)||a.team.localeCompare(b.team);
const regional=(a,b)=>pct(b,true)-pct(a,true)||b.regionWins-a.regionWins||pct(b)-pct(a)||margin(b)-margin(a)||a.team.localeCompare(b.team);
function calculate(team,games,metadata){
 const row=Object.fromEntries(numeric.map(k=>[k,0])),results=[];
 for(const g of games){
  const away=canonicalTeam(g.awayTeam)===canonicalTeam(team),home=canonicalTeam(g.homeTeam)===canonicalTeam(team);if(!away&&!home)continue;
  if(![g.actualAway,g.actualHome].every(v=>v!==null&&v!==''&&Number.isFinite(Number(v))))throw Error('Unknown final score; stop restoration');
  const own=Number(away?g.actualAway:g.actualHome),other=Number(away?g.actualHome:g.actualAway),opponent=metadata.get(canonicalTeam(away?g.homeTeam:g.awayTeam)),meta=metadata.get(canonicalTeam(team));
  const region=!!(opponent&&meta.classification===opponent.classification&&meta.region&&meta.region===opponent.region),prefix=region?'region':'nonRegion';
  row.pointsFor+=own;row.pointsAgainst+=other;if(!region){row.nonRegionPointsFor+=own;row.nonRegionPointsAgainst+=other;}
  const result=own>other?'W':own<other?'L':'T',field=result==='W'?'Wins':result==='L'?'Losses':'Ties';row[field.toLowerCase()]++;row[prefix+field]++;results.push({date:isoDate(g.date),result});
 }
 results.sort((a,b)=>a.date.localeCompare(b.date));let streak='—';if(results.length){const last=results.at(-1).result;let n=0;for(let i=results.length-1;i>=0&&results[i].result===last;i--)n++;streak=last+n;}return {...row,streak};
}
export function restoreVerifiedOctoberFinals(standings,verified){
 if(standings.season!==2026)throw Error('Wrong season');
 const output=structuredClone(standings),metadata=new Map(Object.values(standings.byClassification).flat().map(r=>[canonicalTeam(r.team),r])),affected=new Set(),changes=[];
 for(const [away,home,aa,ah] of wanted){
  const rows=verified.filter(g=>isoDate(g.date)==='2026-10-15'&&canonicalTeam(g.awayTeam)===canonicalTeam(away)&&canonicalTeam(g.homeTeam)===canonicalTeam(home));
  if(rows.length!==1||rows[0].actualAway!==aa||rows[0].actualHome!==ah||rows[0].phase!=='regular-season'||!rows[0].sourceUrl)throw Error('Missing or conflicting owner-verified final');
  const existing=output.games.filter(g=>isoDate(g.date)==='2026-10-15'&&[canonicalTeam(g.awayTeam),canonicalTeam(g.homeTeam)].sort().join('|')===[canonicalTeam(away),canonicalTeam(home)].sort().join('|'));
  if(existing.length>1)throw Error('Duplicate contest; stop restoration');
  if(existing.length){const g=existing[0];if(canonicalTeam(g.awayTeam)!==canonicalTeam(away)||canonicalTeam(g.homeTeam)!==canonicalTeam(home)||Number(g.actualAway)!==aa||Number(g.actualHome)!==ah)throw Error('Existing game result conflict; stop restoration');continue;}
  output.games.push({date:'2026-10-15',awayTeam:away,homeTeam:home,actualAway:aa,actualHome:ah,source:'verified'});affected.add(away);affected.add(home);
 }
 for(const team of affected){
  const old=metadata.get(canonicalTeam(team)),expectedBefore=calculate(team,standings.games,metadata),after=calculate(team,output.games,metadata);if(!old)throw Error('Missing team record');
  for(const k of [...numeric,'streak'])if(old[k]!==expectedBefore[k])throw Error('Pre-existing record mismatch: '+team+'.'+k);
  changes.push({team,before:Object.fromEntries([...numeric,'streak'].map(k=>[k,old[k]])),after});
  for(const rows of Object.values(output.byClassification))for(const r of rows)if(r.team===team)Object.assign(r,after);
  for(const groups of Object.values(output.byRegion))for(const rows of Object.values(groups))for(const r of rows)if(r.team===team)Object.assign(r,after);
 }
 if(affected.size){
  output.games.sort((a,b)=>Date.parse(isoDate(a.date))-Date.parse(isoDate(b.date))||a.awayTeam.localeCompare(b.awayTeam)||a.homeTeam.localeCompare(b.homeTeam));
  for(const rows of Object.values(output.byClassification))rows.sort(overall);
  for(const groups of Object.values(output.byRegion))for(const rows of Object.values(groups))rows.sort(regional);
  const added=output.games.length-standings.games.length;output.summary.completedGames+=added;output.summary.deseretFinals+=added;
 }
 return {standings:output,changes};
}
export function restoreVerifiedFinalTeamViews(shards,standings,verified){
 const output=structuredClone(shards),metadata=new Map(Object.values(standings.byClassification).flat().map(r=>[canonicalTeam(r.team),r]));
 for(const [away,home,aa,ah] of wanted){
  const pin=verified.filter(g=>isoDate(g.date)==='2026-10-15'&&canonicalTeam(g.awayTeam)===canonicalTeam(away)&&canonicalTeam(g.homeTeam)===canonicalTeam(home)&&g.actualAway===aa&&g.actualHome===ah&&g.phase==='regular-season');if(pin.length!==1)throw Error('Missing reviewed final for team views');
  for(const [team,opponent,own,other] of [[away,home,aa,ah],[home,away,ah,aa]]){
   const matches=Object.entries(output).filter(([,s])=>canonicalTeam(s.team)===canonicalTeam(team));if(matches.length!==1)throw Error('Missing/duplicate final team view');const shard=matches[0][1];
   const after=calculate(team,standings.games,metadata),before=calculate(team,standings.games.filter(g=>!(isoDate(g.date)==='2026-10-15'&&canonicalTeam(g.awayTeam)===canonicalTeam(away)&&canonicalTeam(g.homeTeam)===canonicalTeam(home))),metadata);
   for(const k of [...numeric,'streak'])if(shard.standing[k]!==before[k]&&shard.standing[k]!==after[k])throw Error('Unexpected team view record: '+team+'.'+k);
   Object.assign(shard.standing,after,{games:after.wins+after.losses+after.ties});
   const games=shard.current.schedule.filter(g=>isoDate(g.date)==='2026-10-15'&&canonicalTeam(g.opponent)===canonicalTeam(opponent));if(games.length!==1)throw Error('Missing/duplicate final schedule row');const game=games[0];
   if(canonicalTeam(game.awayTeam)!==canonicalTeam(away)||canonicalTeam(game.homeTeam)!==canonicalTeam(home))throw Error('Conflicting designated final teams');
   for(const [k,v] of [['teamScore',own],['opponentScore',other]])if(game[k]!==undefined&&game[k]!==null&&game[k]!==''&&Number(game[k])!==v)throw Error('Conflicting final team-view score');
   Object.assign(game,{teamScore:own,opponentScore:other,result:own>other?'W':'L',rusStatus:'Final',rusVerified:true});
  }
 }
 return output;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),result=restoreVerifiedOctoberFinals(read('standings-2026.json'),read('verified-finals-2026.json'));
 if(result.changes.length&&!process.argv.includes('--check'))fs.writeFileSync('standings-2026.json',JSON.stringify(result.standings));
 console.log(JSON.stringify({affectedTeams:result.changes.length,changes:result.changes,policy:'Only two owner-verified finals and four dependent records; no player or unrelated team-stat writes.'}));
}

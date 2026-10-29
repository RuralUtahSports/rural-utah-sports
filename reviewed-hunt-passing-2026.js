/* Reviewed 2026 regular-season player correction with independent contest evidence.
 * This overlay fixes published display paths until the 6MB source and 17MB
 * game-log snapshot can be atomically materialized in a separate guarded batch.
 * Never treat this file as approval for unrelated player or team totals.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.RUSReviewedHunt2026=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const id='mountain-ridge-11-jaxon-hunt',team='MOUNTAIN RIDGE';
 const games=[
  {date:'2026-08-13',opponent:'SKYRIDGE',yards:385},
  {date:'2026-08-21',opponent:'LEHI',yards:368},
  {date:'2026-08-27',opponent:'DAVIS',yards:296},
  {date:'2026-09-04',opponent:'CEDAR VALLEY',yards:312},
  {date:'2026-09-11',opponent:'COPPER HILLS',yards:300},
  {date:'2026-09-18',opponent:'CHAPARRAL, CA',yards:336},
  {date:'2026-09-25',opponent:'RIVERTON',yards:481},
  {date:'2026-10-02',opponent:'HERRIMAN',yards:364},
  {date:'2026-10-09',opponent:'BINGHAM',yards:319},
  {date:'2026-10-15',opponent:'WESTLAKE',yards:225}
 ];
 const evidence={
  priorStoredYards:3164,
  reviewedRegularSeasonYards:3386,
  category:'Passing',
  playerId:id,team,name:'Jaxon Hunt',number:'11',
  source:'MaxPreps/UHSAA; independent game reports',
  seasonLeaderboard:'https://www.uhsaa.org/stats/football.php',
  chaparral:'https://www.maxpreps.com/inter-state/football/game/chaparral-temecula-ca-vs-mountain-ridge-herriman-ut/9-18-2026/?c=a57e41a5-aec9-411d-adbb-c1f9cf2d6590',
  westlake:'https://www.maxpreps.com/news/5hRAOSGRX02hmhnetj43bg/jaxon-hunt-game-report-%40-westlake.htm',
  reviewedAsOf:'2026-10-29',games
 };
 const norm=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 const assertEvidence=()=>{
  if(games.length!==10||new Set(games.map(g=>g.date)).size!==10||games.some(g=>g.date>'2026-10-15'||g.date<'2026-08-13')||
    games.reduce((sum,g)=>sum+g.yards,0)!==3386||games.filter(g=>g.date!=='2026-10-15').reduce((sum,g)=>sum+g.yards,0)!==3161)
   throw Error('Jaxon Hunt reviewed 10-game evidence changed');
 };
 // Mutate the loaded, in-memory data only. Fail closed on unexpected IDs or
 // an upstream source value that has changed since the review.
 function applyReported(data){
  assertEvidence();
  if(data?.season!==2026||!data.teams)throw Error('Wrong season/source for Hunt correction');
  const t=Object.entries(data.teams).filter(([k])=>norm(k)===norm(team));
  if(t.length!==1)throw Error('Mountain Ridge reporting source unavailable');
  const school=t[0][1],roster=(school.roster||[]).filter(p=>p.playerId===id);
  if(roster.length!==1||norm(roster[0].name)!=='JAXONHUNT'||String(roster[0].number)!=='11')
   throw Error('Hunt stable roster identity changed');
  const matches=(school.stats||[]).filter(s=>norm(s.category)==='PASSING').flatMap(s=>(s.rows||[]).filter(p=>p.playerId===id));
  if(matches.length!==1)throw Error('Hunt passing season field missing/duplicated');
  const row=matches[0],field=Object.keys(row.values||{}).find(k=>norm(k)==='YARDS');
  if(!field||String(row.values[field])!==String(evidence.priorStoredYards)&&String(row.values[field])!==String(evidence.reviewedRegularSeasonYards))
   throw Error('Hunt source passing yards changed; review before publishing');
  const wasChanged=String(row.values[field])!==String(evidence.reviewedRegularSeasonYards);
  if(wasChanged){
   row.values[field]=String(evidence.reviewedRegularSeasonYards);
   (row.statSources||={})[field]='Reviewed 2026 regular season · MaxPreps/UHSAA';
   (row.statEvidence||={})[field]={scope:'regular-season',reviewedAsOf:evidence.reviewedAsOf,source:evidence.seasonLeaderboard,gameCount:10,corroboration:[evidence.chaparral,evidence.westlake]};
  }
  return {corrected:wasChanged,playerId:id,displayYards:evidence.reviewedRegularSeasonYards,scope:'regular-season'};
 }
 // The separately protected publication only contains a few already-reviewed
 // fields. Add this single evidence-backed reviewed field in-memory, not other
 // cumulative numbers or dependent passing rates.
 function applyVerified(proof,report){
  assertEvidence();
  if(proof?.season!==2026||proof.scope!=='verified-regular-season'||report?.playerId!==id||
     report.displayYards!==3386)throw Error('Unreviewed Hunt publication input');
  const school=Object.entries(proof.teams||{}).filter(([k])=>norm(k)===norm(team));
  if(school.length!==1)throw Error('Reviewed team roster not found');
  const roster=(school[0][1].roster||[]).filter(p=>p.playerId===id);
  if(roster.length!==1||norm(roster[0].name)!=='JAXONHUNT'||String(roster[0].number)!=='11')throw Error('Reviewed Hunt roster identity changed');
  let section=(school[0][1].stats||[]).find(s=>norm(s.category)==='PASSING');
  if(!section){section={category:'Passing',headers:['YARDS'],rows:[]};school[0][1].stats.push(section);}
  const existing=section.rows.filter(p=>p.playerId===id);
  if(existing.length>1||existing.length===1&&Object.keys(existing[0].values||{}).some(k=>norm(k)==='YARDS'&&String(existing[0].values[k])!=='3386'))
   throw Error('Existing reviewed Hunt yards disagree');
  if(!existing.length)section.rows.push({playerId:id,number:'11',name:'Jaxon Hunt',values:{YARDS:'3386'},statEvidence:{YARDS:{scope:'regular-season',source:evidence.seasonLeaderboard,reviewedAsOf:evidence.reviewedAsOf,gameCount:10}}});
  if(!section.headers.includes('YARDS'))section.headers.push('YARDS');
  return proof;
 }
 return {evidence,applyReported,applyVerified};
});

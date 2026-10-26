import test from 'node:test';
import assert from 'node:assert/strict';
import {numeric,matchPlayer,preserveTeamComponents,categoryKey} from '../scripts/lib/player-stat-integrity.mjs';
import {aggregateGames,reconcileSeasonStats,refreshRates} from '../scripts/reconcile_season_stats_from_game_logs.mjs';
import {mergeMaxPrepsGameLogs} from '../scripts/merge_maxpreps_game_logs.mjs';
import {mergeTeam} from '../scripts/merge_maxpreps_stats_fallback.mjs';

const person={playerId:'p',name:'Player One',number:'1'};
const line=(values,category='Rushing')=>({category,values});
const game=(values,date='2026-10-16',extra={})=>({date,opponent:'Opponent',final:true,players:[{...person,statLines:[line(values)]}],...extra});
const roster=(values={YARDS:'500'})=>({season:2026,teams:{SCHOOL:{team:'SCHOOL',roster:[person],stats:[{category:'Rushing',headers:Object.keys(values),rows:[{...person,values}]}]}}});
const value=r=>r.teams.SCHOOL.stats[0].rows[0].values;
function evidence(values={YARDS:'600'},date='2026-10-16'){
 return {maxprepsSeason:{season:2026,updatedAt:'2026-10-26',teams:{SCHOOL:{sourceUrl:'https://www.maxpreps.com/source/',lastUpdated:'2026-10-17',rows:[{...person,...line(values)}]}}},maxprepsGames:{season:2026,teams:{SCHOOL:{team:'SCHOOL',games:[{...person,date,opponent:'Opponent',url:'https://www.maxpreps.com/game/',statLines:[line(structuredClone(values))]}]}}}};
}
test('unreported is unknown; explicit zero and fractional sacks remain numeric',()=>{
 for(const v of [undefined,null,'',' ','—','N/A'])assert.equal(numeric(v),null);
 assert.equal(numeric('0'),0);assert.equal(numeric('2.5'),2.5);assert.equal(numeric('-12'),-12);
});
test('one player line in every final never proves another player/category/field complete',()=>{
 const r=roster();reconcileSeasonStats(r,{teams:{SCHOOL:{games:[game({YARDS:'100'})]}}});assert.equal(value(r).YARDS,'500');
});
test('matching source season and unique source game evidence repairs a stale season cell',()=>{
 const r=roster();const result=reconcileSeasonStats(r,{teams:{}},evidence());assert.equal(value(r).YARDS,'600');assert.equal(result.fields,1);
});
test('a larger uncorroborated source total is not automatically accepted',()=>{
 const r=roster(),e=evidence();e.maxprepsGames.teams.SCHOOL.games[0].statLines[0].values.YARDS='100';
 const result=reconcileSeasonStats(r,{teams:{}},e);assert.equal(value(r).YARDS,'500');assert.equal(result.decisions[0].status,'review');
});
test('higher season totals survive partial logs and lower source totals in all categories',()=>{
 for(const category of ['Rushing','Passing','Receiving','Defense/Special Teams','Kicking']){
  const r=roster({YARDS:'900'}),e=evidence();r.teams.SCHOOL.stats[0].category=category;
  e.maxprepsSeason.teams.SCHOOL.rows[0].category=category;e.maxprepsGames.teams.SCHOOL.games[0].statLines[0].category=category;
  reconcileSeasonStats(r,{teams:{}},e);assert.equal(value(r).YARDS,'900');
 }
});
test('explicit exact correction wins, while verified minimum corrections can grow',()=>{
 const r=roster(),e=evidence();e.corrections=[{team:'SCHOOL',targetPlayer:person.name,category:'Rushing',stat:'YARDS',exactValue:500}];
 reconcileSeasonStats(r,{teams:{}},e);assert.equal(value(r).YARDS,'500');
 e.corrections=[{team:'SCHOOL',targetPlayer:person.name,category:'Rushing',stat:'YARDS',minimumValue:500}];reconcileSeasonStats(r,{teams:{}},e);assert.equal(value(r).YARDS,'600');
});
test('identical repeated game and category cells are counted once; conflicting duplicates are flagged',()=>{
 const g=game({YARDS:'100'}),t={team:'SCHOOL',games:[g,structuredClone(g)]};
 let totals=aggregateGames(t,[person]);assert.equal(totals.totals.get('p|RUSHING|YARDS').value,100);
 t.games[1].players[0].statLines[0].values.YARDS='200';totals=aggregateGames(t,[person]);assert.equal(totals.totals.get('p|RUSHING|YARDS').conflict,true);
});
test('nonfinal and postseason rows do not enter regular-season totals',()=>{
 const t={team:'SCHOOL',games:[game({YARDS:'100'}),game({YARDS:'200'},'2026-10-23'),game({YARDS:'900'},'2026-10-09',{final:false})]};
 assert.equal(aggregateGames(t,[person],{cutoff:'2026-10-16'}).totals.get('p|RUSHING|YARDS').value,100);
 const r=roster();reconcileSeasonStats(r,{teams:{}},{...evidence({YARDS:'600'},'2026-10-23'),cutoff:'2026-10-16'});assert.equal(value(r).YARDS,'500');
});
test('aliases are school scoped and jersey alone or ambiguous surnames never identify a person',()=>{
 const p={playerId:'old',name:'DaShawn Gordan',number:'2'};
 assert.equal(matchPlayer([p],{name:'Dashawn Gordon',number:'2'},'BEN LOMOND'),p);
 assert.equal(matchPlayer([p],{name:'Dashawn Gordon',number:'2'},'OTHER'),null);
 assert.equal(matchPlayer([person],{name:'Different Person',number:'1'}),null);
 assert.equal(matchPlayer([person,{playerId:'p2',name:'Peter One',number:'1'}],{name:'P. One',number:'1'}),null);
 assert.equal(matchPlayer([person],{name:'Player One',number:'99'}),person);
});
test('partial and empty fetch results retain independently available roster/stat components',()=>{
 const old=roster().teams.SCHOOL;
 for(const incoming of [{roster:[person],stats:[],rosterFetched:true,statsFetched:false},{roster:[],stats:[],rosterFetched:true,statsFetched:true}]){
  const result=preserveTeamComponents(old,incoming);assert.deepEqual(result.stats,old.stats);assert.deepEqual(result.roster,old.roster);assert.ok(result.sourceStatus.preservedComponents.includes('stats'));
 }
});
test('derived averages follow retained numerator and denominator; zero denominator remains unknown',()=>{
 const row={values:{YARDS:'1060',RECEPTIONS:'32','YARDS/RECEP.':'39.18'}};refreshRates(row,'RECEIVING');assert.equal(row.values['YARDS/RECEP.'],'33.13');
 row.values.RECEPTIONS='0';refreshRates(row,'RECEIVING');assert.equal(row.values['YARDS/RECEP.'],'');
});
test('kicking aliases and defensive categories aggregate without double counting',()=>{
 assert.equal(categoryKey('PATs and Field Goals'),'KICKING');
 const g=game({});g.players[0].statLines=[line({TACKLES:'5',SACKS:'1.5'},'Tackles'),line({'PASS INT.':'1'},'Defensive Statistics'),line({PAT:'3',FG:'1',Pts:'6'},'PATs and Field Goals')];
 const totals=aggregateGames({team:'SCHOOL',games:[g]},[person]).totals;
 assert.equal(totals.get('p|DEFENSESPECIALTEAMS|SACKS').value,1.5);assert.equal(totals.get('p|KICKING|PTS').value,6);
});
test('cached scored final recovers a missing game once and merging is repeatable',()=>{
 const o={teams:{SCHOOL:{team:'SCHOOL',games:[]}}},cache={teams:{SCHOOL:{games:[{...person,date:'2026-10-23',opponent:'Opponent',score:'21-7',result:'W',url:'https://www.maxpreps.com/ut/football/game/school-vs-opponent/10-23-2026/',statLines:[line({YARDS:'100'})]}]}}};
 assert.equal(mergeMaxPrepsGameLogs(o,cache).gamesAdded,1);assert.equal(mergeMaxPrepsGameLogs(o,cache).gamesAdded,0);assert.equal(o.teams.SCHOOL.games[0].players.length,1);
});
test('conflicting source final scores cannot create invented games',()=>{
 const o={teams:{}},row={...person,date:'2026-10-23',opponent:'Opponent',score:'21-7',result:'W',url:'https://www.maxpreps.com/ut/football/game/example/',statLines:[line({YARDS:'100'})]};
 assert.equal(mergeMaxPrepsGameLogs(o,{teams:{SCHOOL:{games:[row,{...row,score:'14-7'}]}}}).gamesAdded,0);
});
test('MaxPreps fill never overwrites a verified manual defensive correction',()=>{
 const team={team:'SCHOOL',roster:[person],stats:[{category:'Defense/Special Teams',headers:['TACKLES'],rows:[{...person,values:{TACKLES:'5'},statSources:{TACKLES:'Manual verified'}}]}]};
 mergeTeam(team,[{...person,category:'Defense/Special Teams',values:{TACKLES:'15'}}],'fixture');assert.equal(team.stats[0].rows[0].values.TACKLES,'5');
});

test('failed partial imports preserve individual missing category cells',()=>{
 const old=roster({YARDS:'500',CARRIES:'60'}).teams.SCHOOL;
 const incoming={...old,statsFetched:true,stats:[{category:'Rushing',rows:[{...person,values:{YARDS:'600',CARRIES:''}}]}]};
 const merged=preserveTeamComponents(old,incoming);assert.equal(merged.stats[0].rows[0].values.CARRIES,'60');assert.equal(merged.stats[0].rows[0].values.YARDS,'600');
});
test('a second reconciliation retains accepted totals and creates no duplicates',()=>{
 const r=roster(),e=evidence();reconcileSeasonStats(r,{teams:{}},e);
 const saved=structuredClone(r.teams);const next=reconcileSeasonStats(r,{teams:{}},e);assert.equal(next.fields,0);assert.deepEqual(r.teams,saved);
});
test('partial refreshed source game lists retain earlier games and missing category cells',async()=>{
 const {mergeSourceGameRows}=await import('../scripts/lib/player-stat-integrity.mjs');
 const old=[{...person,date:'2026-10-02',opponent:'A',statLines:[line({YARDS:'100',CARRIES:'5'})]},{...person,date:'2026-10-09',opponent:'B',statLines:[line({YARDS:'200'})]}];
 const fresh=[{...person,date:'2026-10-02',opponent:'A',statLines:[line({YARDS:'110'})]}];
 const merged=mergeSourceGameRows(old,fresh);assert.equal(merged.length,2);assert.equal(merged[0].statLines[0].values.CARRIES,'5');assert.equal(merged[0].statLines[0].values.YARDS,'110');
});
test('contradictory manual rules are detected instead of relying on file order',async()=>{
 const {findCorrectionConflicts}=await import('../scripts/apply_manual_stat_corrections.mjs');
 const base={team:'SCHOOL',targetPlayer:person.name,category:'Rushing',stat:'TD'};
 const rules=[{...base,id:'conditional',whenValue:27,exactValue:9},{...base,id:'floor',minimumValue:27}];
 assert.equal(findCorrectionConflicts(rules).length,1);assert.equal(findCorrectionConflicts([...rules].reverse()).length,1);
});
test('invalid completion pairs and negative counts remain unknown, while negative yards remain valid',()=>{
 const g=game({CARRIES:'-2',YARDS:'-12'});g.players[0].statLines.push(line({'COMP-ATT':'20-10'},'Passing'));
 const sums=aggregateGames({team:'SCHOOL',games:[g]},[person]).totals;
 assert.equal(sums.has('p|RUSHING|CARRIES'),false);assert.equal(sums.has('p|PASSING|COMPATT'),false);assert.equal(sums.get('p|RUSHING|YARDS').value,-12);
});
test('award UI applies only through-October-16 candidate corrections and preserves saved selections',async()=>{
 const fs=await import('node:fs'),vm=await import('node:vm');
 let source=fs.readFileSync(new URL('../region-awards-hub-2026-r3.js',import.meta.url),'utf8');
 source=source.replace("if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();", "window.testHooks={applyRegularSeasonStatCorrections,correctLockedFootballAlignment,collect,missingInfo,setSnapshot:value=>{snapshot=value}};");
 const context={location:{pathname:'/region-awards.html'},document:{querySelector:()=>null},console,URL};context.window=context;
 vm.runInNewContext(source,context);
 const data={teamMeta:[{team:'SCHOOL',region:'R'}],data:{teams:{SCHOOL:{roster:[person],stats:[{category:'Rushing',rows:[{...person,values:{YARDS:'500'}}]}]}}},winners:{mvp:'saved'},selections:{first:'saved'}};
 const input={season:2026,cutoff:'2026-10-16',coverage:{},changes:[{team:'SCHOOL',playerId:'p',category:'Rushing',header:'YARDS',value:'600',evidence:{throughDate:'2026-10-16'}},{team:'SCHOOL',playerId:'p',category:'Rushing',header:'YARDS',value:'900',evidence:{throughDate:'2026-10-23'}}]};
 context.testHooks.applyRegularSeasonStatCorrections(data,input);
 assert.equal(data.data.teams.SCHOOL.stats[0].rows[0].values.YARDS,'600');assert.deepEqual(data.winners,{mvp:'saved'});assert.deepEqual(data.selections,{first:'saved'});
 context.testHooks.setSnapshot(data);assert.equal(context.testHooks.collect('R')[0].lines[0].values.YARDS,'600');
 const alignment={teamMeta:[{team:'GRAND',region:'8P'},{team:'LAYTON CHRISTIAN',region:'Independant'},{team:'ENTERPRISE',region:'2A South'}]};context.testHooks.correctLockedFootballAlignment(alignment);
 assert.deepEqual(alignment.teamMeta.map(t=>t.region),['2A South','2A North','1A South']);
 context.RUSAwardSpecialTeamsMaxPreps2026={rows:[{team:'SCHOOL',name:'Source Only Punter'}],canonTeam:v=>v,athlete:()=>({punt:{attempts:10,yards:400,inside20:2}})};
 const sourceOnly=context.testHooks.collect('R').find(p=>p.name==='Source Only Punter');
 assert.ok(sourceOnly);assert.equal(sourceOnly.scores.P,0);assert.equal(sourceOnly.lines.length,0);
 data.statCoverage={SCHOOL:{status:'incomplete',message:'Missing statistics are unknown, not zero'}};
 assert.match(context.testHooks.missingInfo(sourceOnly,'P'),/unknown/);

});
test('actual import CLIs leave saved datasets byte-for-byte intact on source failure',async()=>{
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path'),{spawnSync}=await import('node:child_process');
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'rus-import-failure-'));
 try{
  const saved=JSON.stringify(roster());
  fs.writeFileSync(path.join(directory,'deseret-rosters-stats-2026.json'),saved);
  fs.writeFileSync(path.join(directory,'deseret-team-data-2026.json'),JSON.stringify({teams:{SCHOOL:{team:'SCHOOL',deseretSlug:'school'}}}));
  fs.writeFileSync(path.join(directory,'maxpreps-stats-fallback-2026.json'),'{"season":2026,"teams":{}}');
  fs.writeFileSync(path.join(directory,'maxpreps-player-game-stats-2026.json'),'{"season":2026,"teams":{}}');
  fs.writeFileSync(path.join(directory,'offline.mjs'),"globalThis.fetch=async()=>{throw Error('source unavailable fixture')};");
  const files=['deseret-rosters-stats-2026.json','maxpreps-stats-fallback-2026.json','maxpreps-player-game-stats-2026.json'];
  const before=files.map(f=>fs.readFileSync(path.join(directory,f),'utf8'));
  for(const script of ['build_deseret_rosters_stats.mjs','merge_deseret_stats_endpoints.mjs','merge_maxpreps_stats_fallback.mjs']){
   const command=spawnSync(process.execPath,['--import',path.join(directory,'offline.mjs'),new URL('../scripts/'+script,import.meta.url).pathname],{cwd:directory,encoding:'utf8',timeout:15000});
   assert.equal(command.error,undefined);assert.notEqual(command.status,0,script+' must report failure');
   assert.deepEqual(files.map(f=>fs.readFileSync(path.join(directory,f),'utf8')),before,script+' must preserve saved files');
  }
 }finally{fs.rmSync(directory,{recursive:true,force:true})}
});
test('record imports recognize merged defense/kicking and require actual game source links',async()=>{
 const {statsFromPlayer,gameEvidenceUrl}=await import('../scripts/merge_current_player_single_game_records.mjs');
 const p={statLines:[line({TACKLES:'12',SACKS:'2.5','PASS INT.':'1','DEFENSE TD':'1','RETURN TD':'1'},'Defense/Special Teams'),line({PAT:'3',FG:'2'},'Kicking')]};
 const stats=statsFromPlayer(p);assert.equal(stats.tackles,12);assert.equal(stats.sacks,2.5);assert.equal(stats.defensiveTouchdowns,1);assert.equal(stats.fieldGoals,2);
 const url='https://www.maxpreps.com/ut/football/game/a-vs-b/9-25-2026/';
 assert.equal(gameEvidenceUrl({url:'https://sports.deseret.com/high-school/school/a/football/scores-schedule',maxprepsUrl:url}),url);
 assert.equal(gameEvidenceUrl({url:'https://sports.deseret.com/high-school/school/a/football/scores-schedule'}),'');
 assert.equal(statsFromPlayer({statLines:[line({Yards:'200'},'Passing')]}).totalOffenseYards,undefined);
 assert.equal(statsFromPlayer({statLines:[line({Yards:'200'},'Passing'),line({Yards:'0'},'Rushing')]}).totalOffenseYards,200);
});
test('duplicate game cells cannot inflate weekly scoring and conflicts become explicit unknowns',async()=>{
 const {normalizePlayerStatLines}=await import('../scripts/lib/player-stat-integrity.mjs');
 const p={statLines:[line({TACKLES:'5',SACKS:'1'},'Tackles'),line({Tackles:'5',Sacks:'1.0'},'Defense'),line({'PASS INT.':'1'},'Defensive Statistics')]};
 normalizePlayerStatLines(p);assert.equal(p.statLines.length,1);assert.equal(p.statLines[0].values.TACKLES,'5');
 p.statLines.push(line({Tackles:'2'},'Defense'));normalizePlayerStatLines(p);assert.equal(p.statLines[0].values.TACKLES,'');assert.deepEqual(p.statLines[0].statConflicts.TACKLES,['5','2']);
 const sums=aggregateGames({team:'SCHOOL',games:[{date:'2026-10-16',opponent:'Other',final:true,players:[{...person,...p}]}]},[person]);assert.equal(sums.conflicts.length,1);
});
test('weather-moved copies with the same source game ID are counted only once',()=>{
 const url='https://sports.deseret.com/high-school/football/game/2026-09-18/a-vs-b/12345';
 const one=game({YARDS:'100'},'2026-09-18',{url}),two=game({YARDS:'100'},'2026-09-19',{url});
 const totals=aggregateGames({team:'SCHOOL',games:[one,two]},[person]).totals;assert.equal(totals.get('p|RUSHING|YARDS').value,100);
});
test('reported rates survive unavailable operands without inventing new rates',()=>{
 const row={values:{'YARDS/CARRY':'7.1'}};refreshRates(row,'RUSHING');assert.equal(row.values['YARDS/CARRY'],'7.1');assert.equal(numeric('9'.repeat(400)),null);
});
test('conditional manual fixes reject the known bad value without freezing later corroborated totals',()=>{
 const e=evidence(),r=roster();e.corrections=[{team:'SCHOOL',targetPlayer:person.name,category:'Rushing',stat:'YARDS',whenValue:100,exactValue:500}];
 reconcileSeasonStats(r,{teams:{}},e);assert.equal(value(r).YARDS,'600');
 const bad=evidence({YARDS:'100'});bad.corrections=e.corrections;reconcileSeasonStats(r,{teams:{}},bad);assert.equal(value(r).YARDS,'600');
});

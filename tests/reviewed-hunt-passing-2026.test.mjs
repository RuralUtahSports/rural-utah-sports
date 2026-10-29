import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const fix=require('../reviewed-hunt-passing-2026.js');
const roster=()=>({season:2026,teams:{'MOUNTAIN RIDGE':{
 roster:[{playerId:'mountain-ridge-11-jaxon-hunt',name:'Jaxon Hunt',number:'11'}],
 stats:[{category:'Passing',headers:['YARDS','TD'],rows:[{
  playerId:'mountain-ridge-11-jaxon-hunt',number:'11',name:'Jaxon Hunt',values:{YARDS:'3164',TD:'41'}
 }]}]
}}});
const proof=()=>({season:2026,scope:'verified-regular-season',teams:{'MOUNTAIN RIDGE':{
 roster:[{playerId:'mountain-ridge-11-jaxon-hunt',name:'Jaxon Hunt',number:'11'}],stats:[]
}}});
const games=()=>({games:[
 {date:'2026-09-18',opponent:'CHAPARRAL, CA',players:[{playerId:'mountain-ridge-11-jaxon-hunt',number:'11',name:'Jaxon Hunt',statLines:[{category:'Passing',values:{YARDS:'339',TD:'5'}}]}]},
 {date:'2026-10-15',opponent:'WESTLAKE',players:[]}
]});
test('ten independent regular-season game cells sum to 3,386 and adjust stored nine-game subtotal by 222',()=>{
 const g=fix.evidence.games;
 assert.equal(g.length,10);assert.equal(g.reduce((n,x)=>n+x.yards,0),3386);
 assert.equal(g.filter(x=>x.date!=='2026-10-15').reduce((n,x)=>n+x.yards,0),3161);
 assert.equal(3164-339+336+225,3386);
 assert.equal(fix.evidence.reviewedRegularSeasonYards,3386);
 assert.match(fix.evidence.seasonLeaderboard,/uhsaa\.org/);
});
test('correct only uniquely matched Hunt passing yards; preserve other season fields and original source',()=>{
 const source=roster(),pr=proof(),before=JSON.stringify(source);
 const result=fix.applyReported(source);
 assert.equal(result.corrected,true);
 assert.equal(source.teams['MOUNTAIN RIDGE'].stats[0].rows[0].values.YARDS,'3386');
 assert.equal(source.teams['MOUNTAIN RIDGE'].stats[0].rows[0].values.TD,'41');
 assert.notEqual(JSON.stringify(source),before);
 assert.match(source.teams['MOUNTAIN RIDGE'].stats[0].rows[0].statSources.YARDS,/Reviewed/);
 const v=fix.applyVerified(pr,result);
 assert.equal(v.teams['MOUNTAIN RIDGE'].stats[0].rows[0].values.YARDS,'3386');
 assert.equal(v.teams['MOUNTAIN RIDGE'].stats[0].rows[0].values.TD,undefined);
 assert.equal(fix.applyReported(source).corrected,false);
});
test('fail closed on changed totals, mismatched names or ambiguous athletes',()=>{
 const stale=roster();stale.teams['MOUNTAIN RIDGE'].stats[0].rows[0].values.YARDS='3200';
 assert.throws(()=>fix.applyReported(stale),/source passing yards changed/);
 const swapped=roster();swapped.teams['MOUNTAIN RIDGE'].roster[0].name='Another Player';
 assert.throws(()=>fix.applyReported(swapped),/roster identity changed/);
 const repeated=roster();repeated.teams['MOUNTAIN RIDGE'].stats[0].rows.push(structuredClone(repeated.teams['MOUNTAIN RIDGE'].stats[0].rows[0]));
 assert.throws(()=>fix.applyReported(repeated),/missing\/duplicated/);
});
test('correct game boxes only for specific reviewed opponents and preserve unrelated statistics',()=>{
 const data=games(),before=JSON.stringify(data);
 const result=fix.applyProfileGames(data);
 assert.notEqual(JSON.stringify(data),before);
 assert.deepEqual(result,{chaparral:336,westlake:225});
 assert.equal(data.games[0].players[0].statLines[0].values.YARDS,'336');
 assert.equal(data.games[0].players[0].statLines[0].values.TD,'5');
 assert.equal(data.games[1].players[0].statLines[0].values.YARDS,'225');
 assert.equal(data.games.length,2);
 assert.deepEqual(fix.applyProfileGames(data),result);
});
test('user-facing pages both include reviewed correction, without changing stored JSON',()=>{
 const leaders=fs.readFileSync('stat-leaders.html','utf8'),player=fs.readFileSync('player.html','utf8');
 assert.match(leaders,/reviewed-hunt-passing-2026\.js/);
 assert.match(leaders,/RUSReviewedHunt2026\.applyReported\(reportedStats\)/);
 assert.match(leaders,/RUSReviewedHunt2026\.applyVerified\(regularPublication,reviewed\)/);
 assert.match(player,/RUSReviewedHunt2026\.applyProfileGames/);
 for(const file of ['deseret-rosters-stats-2026.json','player-game-stats-2026.json','regular-season-publication-2026.json']){
  assert.ok(fs.statSync(file).size>100000,'Expected underlying file '+file+' remains intact');
 }
});

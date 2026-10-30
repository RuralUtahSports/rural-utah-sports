import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {validate,applyVerified}=require('../reviewed-4a6a-five-player-2026.js');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const proof=read('audits/2026-regular-season/reconciled-4a6a-player-cases-2026.json');
const norm=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const value=(obj,k)=>{const xs=Object.keys(obj||{}).filter(h=>norm(h)===norm(k));return xs.length===1?obj[xs[0]]:null};

test('Shockey/Thomas/Thayer exactly reconcile distinct ten regular games and source records',()=>{
 assert.equal(validate(proof).length,3);
 for(const d of proof.decisions){
  const source=read(d.sourceShard);
  const roster=source.rosterStats.roster.filter(p=>p.playerId===d.playerId&&p.name===d.name&&p.number===d.number);
  assert.equal(roster.length,1,'Stable original identity: '+d.name);
  const original=source.rosterStats.stats.filter(s=>s.category===d.category).flatMap(s=>s.rows.filter(p=>p.playerId===d.playerId));
  assert.equal(original.length,1);
  for(const [field,baseline] of Object.entries(d.baseline))assert.equal(String(value(original[0].values,field)),String(baseline));
  assert.equal(d.sourceGames.length,10);
  const seen=new Set();
  for(const g of d.sourceGames){
   assert.ok(!seen.has(g.gameKey),'Duplicate games '+d.name);seen.add(g.gameKey);
   const cached=source.gameStats.games.filter(x=>x.gameKey===g.gameKey&&x.date===g.date);
   if(g.newlyRecovered){
    assert.ok(cached.length<=1,'A previously recovered game must never be duplicated');
    assert.ok(g.verifiedScore&&Number.isInteger(g.verifiedScore.for)&&Number.isInteger(g.verifiedScore.against));
    if(cached.length===1){
     const entry=cached[0];
     assert.equal(entry.manualPartialStats,true,'Recovered report must remain explicitly partial');
     assert.equal(entry.teamScore,g.verifiedScore.for);
     assert.equal(entry.opponentScore,g.verifiedScore.against);
     const lines=entry.players.filter(p=>p.playerId===d.playerId&&p.name===d.name&&p.number===d.number)
      .flatMap(p=>p.statLines.filter(s=>s.category===d.category));
     assert.equal(lines.length,1,'Published recovery must retain a single reviewed player row');
     for(const f of Object.keys(d.verified)){
      assert.equal(String(value(lines[0].values,f)),String(g.sourceFieldValues[f]),'Reviewed recovered source field drifted');
     }
    }
    continue;
   }
   assert.equal(cached.length,1,'Original regular game entry '+g.gameKey);
   const lines=cached[0].players.filter(p=>p.playerId===d.playerId&&p.name===d.name&&p.number===d.number).flatMap(p=>p.statLines.filter(x=>x.category===d.category));
   assert.equal(lines.length,1);
   if(g.change){
    assert.equal(g.change.correctedSource,g.sourceUrl);
    for(const [f,v] of Object.entries(g.change.oldValues)){
     const actual=String(value(lines[0].values,f));
     const revised=value(g.change.newValues,f);
     // A previous guarded main-branch publication is just as valid as
     // the original archived input, but a third value is never accepted.
     assert.ok(actual===String(v)||(revised!==null&&actual===String(revised)),
      'Reviewed source changed beyond original/approved values: '+g.gameKey+' '+f);
    }
    for(const [f,v] of Object.entries(g.change.newValues))assert.equal(String(g.sourceFieldValues[f]),String(v));
   }else{
    for(const [f,v] of Object.entries(g.sourceFieldValues))assert.equal(String(value(lines[0].values,f)),String(v),'Archived game stat changed: '+g.gameKey+' '+f);
   }
  }
 }
});
test('reviewed correction totals are 1110/105-201/12, 2175/180-311/15 and 892 yards',()=>{
 const expected={
  'west-jordan-3-kenyon-shockey':{YARDS:1110,'COMP-ATT':'105-201',Int:12},
  'layton-5-tillman-thomas':{YARDS:2175,'COMP-ATT':'180-311',Int:15},
  'mountain-ridge-7-xander-thayer':{YARDS:892}
 };
 for(const d of proof.decisions)assert.deepEqual(d.verified,expected[d.playerId]);
 const p=read('regular-season-publication-2026.json'),snapshot=JSON.stringify(p),copy=structuredClone(p);
 const changed=applyVerified(copy,proof);
 assert.deepEqual({players:changed.players,fields:changed.fields},{players:3,fields:7});
 for(const d of proof.decisions){
  const t=Object.entries(copy.teams).find(([key])=>norm(key)===norm(d.team))[1];
  const row=t.stats.filter(s=>norm(s.category)===norm(d.category)).flatMap(s=>s.rows||[]).find(r=>r.playerId===d.playerId);
  assert.ok(row);
  for(const [f,v] of Object.entries(d.verified))assert.equal(String(value(row.values,f)),String(v));
 }
 assert.equal(applyVerified(copy,proof).fields,7,'Overlay is idempotent');
 assert.equal(JSON.stringify(p),snapshot,'Does not mutate stored verified publication');
 const page=fs.readFileSync('stat-leaders.html','utf8');
 assert.match(page,/RUSReviewedFivePlayer2026\.applyVerified\(regularPublication,await evidence\.json\(\)\)/);
 assert.match(page,/sourceMode==='reported'\?reportedStats:regularPublication/);
});
test('original source does not certify unknown TD/catches nor overwrite postseason data',()=>{
 const layton=proof.decisions.find(d=>d.team==='LAYTON'),thayer=proof.decisions.find(d=>d.team==='MOUNTAIN RIDGE');
 assert.equal(layton.verified.TD,undefined);
 assert.equal(thayer.verified.TD,undefined);
 assert.equal(thayer.verified.RECEPTIONS,undefined);
 const p=read('regular-season-publication-2026.json');
 assert.throws(()=>applyVerified({...p,scope:'reported'},proof),/Only 2026 verified/);
 assert.deepEqual(proof.holds.map(x=>x.team).sort(),['KEARNS','WESTLAKE']);
});
test('tampered source, duplicate or partial game history, identity error all fail before writes',()=>{
 const mutations=[
  x=>x.decisions[0].sourceGames.pop(),
  x=>x.decisions[1].sourceGames[1].sourceFieldValues.YARDS++,
  x=>x.decisions[2].sourceGames[9].sourceUrl='https://untrusted.test',
  x=>x.decisions[0].sourceGames[1].gameKey=x.decisions[0].sourceGames[0].gameKey,
  x=>x.decisions[0].sourceGames[1].sourceFieldValues['COMP-ATT']='??',
  x=>x.decisions[1].playerId='wrong-id',
  x=>x.decisions[0].verified.Int=11
 ];
 for(const change of mutations){
  const doc=structuredClone(proof),data=read('regular-season-publication-2026.json'),before=JSON.stringify(data);change(doc);
  assert.throws(()=>applyVerified(data,doc));
  assert.equal(JSON.stringify(data),before);
 }
 const data=read('regular-season-publication-2026.json'),first=applyVerified(data,proof);
 assert.equal(first.players,3);
 const target=Object.entries(data.teams).find(([name])=>norm(name)==='WESTJORDAN')[1];
 target.stats.find(s=>s.category==='Passing').rows.find(p=>p.playerId==='west-jordan-3-kenyon-shockey').values.YARDS='1111';
 const before=JSON.stringify(data);
 assert.throws(()=>applyVerified(data,proof),/Supersession/);
 assert.equal(JSON.stringify(data),before);
});

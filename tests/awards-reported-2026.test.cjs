const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const helper=fs.readFileSync('awards-reported-2026.js','utf8');
const watch=fs.readFileSync('all-state-watch.html','utf8');
const utah=fs.readFileSync('all-utah.html','utf8');
test('reported awards use full-season data and keep locked regional source independent',async()=>{
 const original={season:2026,teams:{WHITEHORSE:{stats:[{rows:[{values:{YARDS:'379'}}]}]},RICH:{stats:[{rows:[{}]}]}}};
 const publication={season:2026,scope:'verified-regular-season',teams:{},lockedSnapshotSha256:'fixture',gamePhases:{}};
 const snapshot={status:'LOCKED',data:{teams:{RICH:{stats:[]}}},teamMeta:[],standings:{},stateTop25:{}};
 const sources={'deseret-rosters-stats-2026.json':original,'teams-data.json':[],'maxpreps-stats-fallback-2026.json':{season:2026,teams:{}},'standings-2026.json':{},'state-top25-history-2026.json':{},'regular-season-publication-2026.json':publication,'region-awards-2026.lock.json':snapshot};
 const context={console,Map,structuredClone,fetch:async u=>{const x=sources[u.split('?')[0]];return {ok:Boolean(x),json:async()=>structuredClone(x),text:async()=>JSON.stringify(x)};},
  RUSMaxPrepsPrimary2026:{applyPrimary:(source,cache,meta)=>({data:structuredClone(source),summary:{schoolsWithMaxPreps:1}})},
  RUSWhitehorseLate2026:{apply:d=>{d.teams.WHITEHORSE.stats[0].rows[0].values.YARDS='2623';}},
  RUSAwardScoring:{buildTeamContexts:()=>new Map()},
  RUSRegularSeasonPolicy2026:{requirePublication:p=>assert.equal(p.scope,'verified-regular-season'),verifyLockedSnapshot:async(s,p)=>{assert.equal(p.lockedSnapshotSha256,'fixture');return JSON.parse(s);}}};
 vm.runInNewContext(helper,context);
 const [reported,locked]=await Promise.all([context.RUSAwardsReported2026.loadReported(),context.RUSAwardsReported2026.loadLocked()]);
 assert.equal(reported.teamsWithStats,2);assert.equal(reported.data.teams.WHITEHORSE.stats[0].rows[0].values.YARDS,'2623');
 assert.equal(locked.snapshot.status,'LOCKED');assert.equal(locked.snapshot.data.teams.WHITEHORSE,undefined);
 delete sources['regular-season-publication-2026.json'];
 await assert.rejects(context.RUSAwardsReported2026.loadLocked());assert.equal((await context.RUSAwardsReported2026.loadReported()).teamsWithStats,2);
 delete sources['maxpreps-stats-fallback-2026.json'];assert.equal((await context.RUSAwardsReported2026.loadReported()).primary,false);
});
test('award pages parse and use separate reported and locked sources',()=>{
 for(const html of [watch,utah]){assert.match(html,/awards-reported-2026\.js/);assert.match(html,/RUSAwardsReported2026\.loadReported\(\)/);for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){if(m[1].trim())new vm.Script(m[1]);}}
 assert.match(watch,/RUSAwardsReported2026\.loadLocked\(\)/);assert.match(watch,/Promise\.allSettled/);assert.match(watch,/build\(lock\?lock\.data:data,lock\?lock\.teamMeta:teams\)/);
});

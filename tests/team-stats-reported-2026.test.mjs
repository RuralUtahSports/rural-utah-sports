import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('Team Stats inline script parses and exposes reported 2026 data without certifying ranks',()=>{
 const html=fs.readFileSync('team-stats.html','utf8');
 const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(x=>x.trim());
 assert.equal(inline.length,1,'Expected exactly one inline page controller');
 assert.doesNotThrow(()=>new vm.Script(inline[0],{filename:'team-stats.html'}));
 assert.match(inline[0],/2026 REPORTED DATA/);
 assert.match(inline[0],/Rank held/);
 assert.match(inline[0],/requirePublication\(await proof\.json\(\)\)/);
 assert.doesNotMatch(inline[0],/teamRows\s*=\s*teamRows\.filter\([^\n]*eligibleTeamTotals/);
});

test('2026 reported team-stat cache contains broadly reported passing without changing its certification gate',()=>{
 const totals=JSON.parse(fs.readFileSync('team-stats-2026.json','utf8'));
 const teams=Object.values(totals.teams||{});
 const reported=teams.filter(t=>t.categories?.passing&&t.passing?.yardsPerGame!=null&&Number.isFinite(Number(t.passing.yardsPerGame)));
 assert.ok(teams.length>=100,'Expected statewide team inventory');
 assert.ok(reported.length>=100,'Reported passing values should not silently disappear');
 assert.ok(reported.length<=teams.length);
});

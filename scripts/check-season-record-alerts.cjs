#!/usr/bin/env node
const fs=require('node:fs'),assert=require('node:assert/strict');
const data=JSON.parse(fs.readFileSync('season-record-alerts.json','utf8'));
assert.equal(data.season,2026);
assert.ok(data.coverageNote.includes('NOT verified school all-time records'),'Missing player-data coverage warning');
for(const k of ['teamBroken','teamWatches','teamReportedArchive','playerReportedArchive','unbenchmarkedPlayerMetrics'])assert.ok(Array.isArray(data[k]),k+' missing');
const seen=new Set();
for(const item of [...data.teamBroken,...data.teamWatches,...data.teamReportedArchive,...data.playerReportedArchive]){
 assert.ok(item.team&&item.categoryKey,'Missing team/category');
 assert.equal(Number(item.season),2026);
 assert.ok(Number.isFinite(item.value)&&Number.isFinite(item.previousValue));
 const key=[item.recordType,item.status,item.team,item.categoryKey].join('|');
 assert.ok(!seen.has(key),'Duplicate season alert '+key);seen.add(key);
}
for(const a of data.teamBroken){
 assert.equal(a.recordType,'seasonTeam');
 assert.equal(a.status,'broken');
 assert.ok(['wins','pointsFor','shutouts','winningStreak'].includes(a.categoryKey));
 assert.ok(a.value>a.previousValue,'Not a true historical high');
 assert.match(a.date,/^2026-\d\d-\d\d$/);
 assert.ok(a.previousSeason<2026);
}
for(const a of data.teamWatches){
 assert.equal(a.status,'on-pace');
 assert.ok(['pointsPerGame','pointsAllowedPerGame','averageMargin','fewestPointsAllowed'].includes(a.categoryKey));
 assert.ok(a.previousSeason<2026);
}
// Only third-party listed UHSAA benchmarks, never just 2025, can enter record-watch alerts.
assert.equal(data.teamReportedArchive.length,0,'Two-season team comparisons falsely published as records');
for(const a of data.playerReportedArchive){
 assert.equal(a.recordType,'seasonPlayer');
 assert.equal(a.status,'exceeds-listed-uhsaa','2025-only player comparison falsely published as record');
 assert.equal(a.previousSeason,2025);
 assert.ok(a.section&&a.categoryKey&&a.category);
 assert.equal(typeof a.negativeOutcome,'boolean');
 assert.ok(a.value>a.previousValue);
 assert.ok(a.player&&a.previousPlayer);
 assert.match(a.asOf,/^2026-\d\d-\d\d$/);
 assert.ok(a.status==='exceeds-listed-uhsaa'||a.note.includes('NOT a verified all-time school record'));
 if(a.status==='exceeds-listed-uhsaa')assert.ok(a.value>a.officialValue);
}
assert.ok(Array.isArray(data.comparisonOnly?.player)&&Array.isArray(data.comparisonOnly?.team));
for(const a of data.comparisonOnly.player){
 assert.equal(a.status,'reported-archive-high');
 assert.equal(a.previousSeason,2025);
 assert.ok(a.note.includes('NOT a verified all-time school record'));
}
for(const a of data.comparisonOnly.team){
 assert.equal(a.recordType,'seasonTeam');
 assert.equal(a.status,'reported-archive-high');
 assert.equal(a.previousSeason,2025);
 assert.ok(a.value>a.previousValue);
 assert.ok(a.categoryKey.startsWith('teamStat_'));
 assert.match(a.asOf,/^2026-\d\d-\d\d$/);
}
assert.equal(data.metricCatalog.player.length,29,'Some raw player season stat fields were omitted');
assert.equal(data.metricCatalog.team.length,28,'Some team season stats were omitted');
const observed=data.metricCatalog.coverage.player.observed;
for(const x of ['Defense/Special Teams|TACKLES','Defense/Special Teams|FUM REC','Defense/Special Teams|PD',
 'Defense/Special Teams|CAUSED FUM','Defense/Special Teams|PASS INT YDS','Defense/Special Teams|PASS INT AVG',
 'Defense/Special Teams|FR YDS','Kicking|Pts','Passing|COMP-ATT', 'Passing|INT', 'Passing|Int']){
 assert.ok(observed.includes(x),'Missing tracked field: '+x);
}
const actualPlayerKeys=new Set(data.comparisonOnly.player.map(a=>a.categoryKey));
for(const key of ['tackles','rushingYards','passingAttempts','passingCompletions','kickingPoints',
 'receivingYards','defensiveTouchdowns','returnTouchdowns']){
 assert.ok(actualPlayerKeys.has(key),'No reported benchmark alerts for '+key);
}
const count=data.counts;
assert.equal(count.teamBroken,data.teamBroken.length);
assert.equal(count.teamProvisional,data.teamWatches.length);
assert.equal(count.playerReportedArchive,data.playerReportedArchive.length);
assert.equal(count.playerCategoriesMonitored,29);
assert.equal(count.teamStatCategoriesMonitored,28);
assert.equal(count.teamReportedArchive,data.teamReportedArchive.length);
assert.equal(count.playerComparisonOnly,data.comparisonOnly.player.length);
assert.equal(count.teamComparisonOnly,data.comparisonOnly.team.length);
assert.equal(data.playerReportedArchive.filter(a=>a.status==='reported-archive-high').length,0);
assert.equal(count.unbenchmarkedPlayerStats,data.unbenchmarkedPlayerMetrics.length);
assert.equal(count.playerExceedingUhsaa,data.playerReportedArchive.filter(x=>x.status==='exceeds-listed-uhsaa').length);
const code=fs.readFileSync('scripts/build-season-record-alerts.mjs','utf8');
assert.ok(code.includes('validatePlayerMetricCoverage'),'Missing future-field coverage guard');
const ui=fs.readFileSync('index.html','utf8');
assert.ok(ui.includes('home-season-record-alerts.js'),'Home loader missing');
console.log('PASS season record alerts',JSON.stringify(count));

#!/usr/bin/env node
const fs=require('node:fs'),assert=require('node:assert/strict');
const data=JSON.parse(fs.readFileSync('season-record-alerts.json','utf8'));
assert.equal(data.season,2026);
assert.ok(data.coverageNote.includes('NOT verified school all-time records'),'Missing player-data coverage warning');
for(const k of ['teamBroken','teamWatches','playerReportedArchive'])assert.ok(Array.isArray(data[k]),k+' missing');
const seen=new Set();
for(const item of [...data.teamBroken,...data.teamWatches,...data.playerReportedArchive]){
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
for(const a of data.playerReportedArchive){
 assert.equal(a.recordType,'seasonPlayer');
 assert.ok(['reported-archive-high','exceeds-listed-uhsaa'].includes(a.status));
 assert.equal(a.previousSeason,2025);
 assert.ok(a.value>a.previousValue);
 assert.ok(a.player&&a.previousPlayer);
 assert.match(a.asOf,/^2026-\d\d-\d\d$/);
 assert.ok(!a.note.includes('verified all-time school record'));
 if(a.status==='exceeds-listed-uhsaa')assert.ok(a.value>a.officialValue);
}
const count=data.counts;
assert.equal(count.teamBroken,data.teamBroken.length);
assert.equal(count.teamProvisional,data.teamWatches.length);
assert.equal(count.playerReportedArchive,data.playerReportedArchive.length);
assert.equal(count.playerExceedingUhsaa,data.playerReportedArchive.filter(x=>x.status==='exceeds-listed-uhsaa').length);
const code=fs.readFileSync('scripts/build-season-record-alerts.mjs','utf8');
assert.ok(code.includes("'TACKLES','tackles','Tackles'"),'Tackles season record category omitted');
const ui=fs.readFileSync('index.html','utf8');
assert.ok(ui.includes('home-season-record-alerts.js'),'Home loader missing');
console.log('PASS season record alerts',JSON.stringify(count));

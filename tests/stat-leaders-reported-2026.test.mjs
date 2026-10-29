import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('2026 player Stat Leaders controller parses and separates reported from verified source',()=>{
 const html=fs.readFileSync('stat-leaders.html','utf8');
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(x=>x.trim());
 assert.equal(scripts.length,1,'Expected one inline stat-leaders controller');
 assert.doesNotThrow(()=>new vm.Script(scripts[0],{filename:'stat-leaders.html'}));
 assert.match(html,/id="leaderSourceMode"/);
 assert.match(html,/src="maxpreps-missing-totals-2026\.js/);
 assert.match(scripts[0],/RUSMaxPrepsMissingTotals2026\.applyMissing\(reportedStats,cachedMaxPreps\)/);
 assert.match(scripts[0],/RUSMaxPrepsPrimary2026\.applyPrimary\(reportedStats,cachedMaxPreps,metadata\)/);
 assert.match(html,/src="maxpreps-primary-reported-2026\.js/);
 assert.match(scripts[0],/statSources:r\.statSources/);
 assert.match(html,/<option value="reported">Reported — MaxPreps first \(4A–6A\)<\/option>/);
 assert.match(scripts[0],/requirePublication\(await s\.json\(\)\)/);
 assert.match(scripts[0],/deseret-rosters-stats-2026\.json/);
 assert.match(scripts[0],/const unverified=reported2026View\(\)/);
 assert.match(scripts[0],/unverified\?'#'\+\(i\+1\):i\+1/);
 assert.match(scripts[0],/NOT regular-season-only/i);
 assert.match(scripts[0],/share\.disabled=share\.disabled\|\|unverified/);
});
test('2026 reported player source does not gain official season certification',()=>{
 const proof=JSON.parse(fs.readFileSync('regular-season-publication-2026.json','utf8'));
 assert.equal(proof.scope,'verified-regular-season');
 assert.ok(Array.isArray(proof.eligibleTeamTotals));
 assert.equal(proof.eligibleTeamTotals.length,0);
 // The reported source is deliberately not modified or certified here.
 const reportedFile=fs.statSync('deseret-rosters-stats-2026.json');
 assert.ok(reportedFile.size>100000);
});

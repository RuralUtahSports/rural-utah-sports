import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyRosterStatCorrections} from './apply_manual_stat_corrections.mjs';

const scoreboard=fs.readFileSync('scoreboard.html','utf8');
const gameWeek=fs.readFileSync('game-week-live.js','utf8');

assert.match(scoreboard,/day>=1&&day<=3/,'Scoreboard must roll Monday-Wednesday into the upcoming Thursday football week');
assert.match(gameWeek,/get\('weekly-simulation\.json'/,'Game Week must verify its slate against the full weekly source');
assert.match(gameWeek,/gamesForCurrentWeek\(weekly\?\.games\)/,'Game Week must select the current football week instead of trusting a stale compact payload');

const fixture=value=>({teams:{UNION:{team:'UNION',stats:[{category:'Defense/Special Teams',rows:[{name:'Brett Meeks',values:{'PASS INT.':String(value)}}]}]}}});
for(const bad of [16,18]){
  const output=fixture(bad);
  applyRosterStatCorrections(output);
  assert.equal(output.teams.UNION.stats[0].rows[0].values['PASS INT.'],'0',`Known bad Meeks value ${bad} must be blocked`);
}
for(const legitimate of [1,2]){
  const output=fixture(legitimate);
  applyRosterStatCorrections(output);
  assert.equal(output.teams.UNION.stats[0].rows[0].values['PASS INT.'],String(legitimate),'A legitimate future interception total must survive rebuilds');
}

console.log('Current-week selection and conditional stat corrections verified.');

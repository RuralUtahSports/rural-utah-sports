import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyRosterStatCorrections} from './apply_manual_stat_corrections.mjs';
import {applyGameDetailCorrections} from './apply_manual_stat_corrections.mjs';

const scoreboard=fs.readFileSync('scoreboard.html','utf8');
const gameWeek=fs.readFileSync('game-week-live.js','utf8');

assert.match(scoreboard,/day>=1&&day<=3/,'Scoreboard must roll Monday-Wednesday into the upcoming Thursday football week');
assert.match(gameWeek,/get\('weekly-simulation\.json'/,'Game Week must verify its slate against the full weekly source');
assert.match(gameWeek,/gamesForCurrentWeek\(weekly\?\.games\)/,'Game Week must select the current football week instead of trusting a stale compact payload');
const statLeaders=fs.readFileSync('stat-leaders.html','utf8');
assert.match(statLeaders,/buildWeeks\(playerGames,allStats\.weeklySchedule/,'Stat Leaders must build current weeks from the schedule, not only games that already have stats');

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

const details={'2026-08-21|UNION|UINTAH':{stats:[{category:'Defense',team:'UNION',headers:['NO','PLAYER','Tackles','Sacks','Pass Int.','TD'],rows:[['24','Brett Meeks','8','','18','']]}]}};
applyGameDetailCorrections(details);
assert.equal(details['2026-08-21|UNION|UINTAH'].stats[0].rows[0][4],'0','The Meeks correction must match the game-detail Defense category used by the weekly-awards source');

for(const file of ['deseret-game-details.json','player-game-stats-2026.json','weekly-awards-2026.json']){
  const text=fs.readFileSync(file,'utf8');
  assert.doesNotMatch(text,/Brett Meeks[\s\S]{0,500}Pass Int\.?(?:\&quot;|\")?\s*[: ]\s*(?:\&quot;|\")?18/i,`${file} must not republish Brett Meeks with 18 interceptions`);
}

console.log('Current-week selection and conditional stat corrections verified.');

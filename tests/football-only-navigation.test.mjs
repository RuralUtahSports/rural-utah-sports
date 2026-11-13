import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const footballPages = [
  'index.html',
  'teams.html',
  'scoreboard.html',
  'greatest-seasons.html',
  'championships.html',
  'stat-leaders.html',
  'stat-leaders-hub.html',
];
for (const page of footballPages) {
  assert.doesNotMatch(read(page), /href=["'][^"']*(?:boys-basketball|basketball-stat-leaders)/i, `${page} still promotes basketball`);
}
const nav = read('nav-menu.js');
const menuEntries = nav.slice(nav.indexOf('const groups ='), nav.indexOf('const path ='));
assert.doesNotMatch(menuEntries, /Boys Basketball/i, 'Shared navigation still promotes basketball');
assert.match(read('records.html'), /class="record-sport-switch" style="display:none"/, 'Records sport switch should be hidden');
assert.match(read('players.html'), /class="sport-switch" style="display:none"/, 'Players sport switch should be hidden');
assert.match(read('boys-basketball-teams.html'), /basketball/i, 'Archived basketball pages should remain intact');
console.log('Football-only navigation checks passed');

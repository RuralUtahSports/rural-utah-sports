// Navigation regression test for 2026 football/basketball site grouping.
// Run: node tests/sports-navigation.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const page = (file) => readFileSync(join(root, file), 'utf8');
const nav = page('nav-menu.js');
const teams = page('boys-basketball-teams.html');
const footballScoreboard = page('scoreboard.html');
const basketballScoreboard = page('boys-basketball-scoreboard.html');
const footballGreatest = page('greatest-seasons.html');
const basketballGreatest = page('boys-basketball-greatest-seasons.html');
let count = 0;
function check(ok, name){ assert.ok(ok, name); console.log('ok - ' + name); count++; }
function area(text, start){
  const i=text.indexOf(start),j=text.indexOf('</div>',i);
  assert.ok(i>=0&&j>i, 'navigation block exists: ' + start);
  return text.slice(i,j);
}
const teamsBar=area(teams,'<div class="sport-switch"');
const fScore=area(footballScoreboard,'<div class="rus-sport-switch"');
const bScore=area(basketballScoreboard,'<div class="sport-nav"');
const fGreat=area(footballGreatest,'<div class="rus-sport-switch"');
const bGreat=area(basketballGreatest,'<div class="sport-switch"');
check(teamsBar.includes('href="teams.html"'), 'football teams remains in Teams switch');
check(teamsBar.includes('href="boys-basketball-teams.html"'), 'basketball teams remains in Teams switch');
check(!/Scoreboard|Stat Leaders|Greatest Seasons|Brackets/.test(teamsBar), 'Teams switch has no unrelated links');
check(!teams.includes('2026–27 Basketball Scoreboard →'), 'duplicate scoreboard banner removed from Teams');
check(!teams.includes('2025–26 Brackets →'), 'duplicate brackets banner removed from Teams');
check(fScore.includes('href="scoreboard.html"') && fScore.includes('aria-current="page"'), 'football scoreboard has active sport');
check(fScore.includes('href="boys-basketball-scoreboard.html"'), 'football scoreboard links to basketball scoreboard');
check(bScore.includes('href="scoreboard.html"'), 'basketball scoreboard links to football scoreboard');
check(bScore.includes('href="boys-basketball-scoreboard.html"') && bScore.includes('aria-current="page"'), 'basketball scoreboard has active sport');
check(!/Stat Leaders|Greatest Seasons|Brackets/.test(bScore), 'scoreboard switch contains scoreboard options only');
check(fGreat.includes('href="greatest-seasons.html"'), 'football greatest seasons has active link');
check(fGreat.includes('href="boys-basketball-greatest-seasons.html"'), 'football greatest seasons links basketball');
check(bGreat.includes('href="greatest-seasons.html"'), 'basketball greatest seasons links football');
check(bGreat.includes('href="boys-basketball-greatest-seasons.html"') && bGreat.includes('aria-current="page"'), 'basketball greatest seasons has active link');
check(!bGreat.includes('Basketball Teams'), 'greatest seasons switch does not show Teams');
check(nav.includes('["Football Scoreboard", "scoreboard.html"]') && nav.includes('["Boys Basketball Scoreboard", "boys-basketball-scoreboard.html"]'), 'global Scoreboard dropdown lists both sports');
check(nav.includes('["Football Greatest Seasons", "greatest-seasons.html"]') && nav.includes('["Boys Basketball Greatest Seasons", "boys-basketball-greatest-seasons.html"]'), 'global History dropdown lists both seasons pages');
check(nav.includes('["Stat Leaders", "stat-leaders-hub.html"]'), 'global Stats dropdown remains intact');
check(footballScoreboard.includes('@media(max-width:600px){.rus-sport-switch a'), 'football scoreboard switch wraps on mobile');
check(footballGreatest.includes('@media(max-width:600px){.rus-sport-switch a'), 'football greatest switch wraps on mobile');
console.log('All ' + count + ' navigation checks passed.');

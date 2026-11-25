import test from 'node:test';
import assert from 'node:assert/strict';
import {postseasonFinals,normalizePlayoffSubmission} from '../scripts/lib/postseason-finals-2026.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),hunt=require('../reviewed-hunt-postseason-2026.js');
test('official bracket recovery excludes nonfinals and requires URL date for rollover',()=>{
 const brackets={season:2026,classifications:{'6A':{status:'official',sourceUrl:'https://www.maxpreps.com/tournament/example',rounds:[{name:'First Round',games:[{date:'Oct 30, 2026',a:{name:'Mountain Ridge',score:50},b:{name:'Cedar Valley',score:6}},{date:'Nov 6, 2026',a:{name:'A'},b:{name:'B'}}]}]}}};
 const finals=postseasonFinals(brackets);assert.equal(finals.length,1);assert.equal(finals[0].date,'2026-10-30');
 const row={date:'2026-10-31',opponent:'Cedar Valley',url:'https://www.maxpreps.com/ut/football/game/a-vs-b/10-30-2026/?c=example'};
 assert.equal(normalizePlayoffSubmission(row,'Mountain Ridge',finals).date,'2026-10-30');
 assert.equal(normalizePlayoffSubmission({...row,url:''},'Mountain Ridge',finals).date,'2026-10-31');
 assert.equal(normalizePlayoffSubmission(row,'Other',finals).date,'2026-10-31');
});
test('Hunt postseason evidence only fills reviewed games and preserves conflicting reported fields',()=>{
 const data={games:[]};hunt.applyGames(data);assert.equal(data.games.length,3);assert.equal(data.games[0].players[0].statLines[0].values.YARDS,'167');
 assert.equal(data.games[2].players[0].statLines[0].values.YARDS,'350');hunt.applyGames(data);assert.equal(data.games.length,3);
 data.games[0].players[0].statLines[0].values.YARDS='166';hunt.applyGames(data);assert.equal(data.games[0].players[0].statLines[0].values.YARDS,'166');
 assert.equal(hunt.apply({season:2025,teams:{}}),0);
});

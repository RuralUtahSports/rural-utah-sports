import assert from 'node:assert/strict';

process.env.PLAYER_RECORDS_SKIP_MAIN='1';
const {gameLinks,MANUAL,mergeManual,parseGame,loadUhsaaSingleGameEntries}=await import('./build_player_single_game_records.mjs');

const scheduleLinks=gameLinks(`
  <a href="/high-school/football/game/2012-10-26/viewmont-football-vs-syracuse-football/110951">current game</a>
  <a href="/high-school/football/game/1996-09-20/skyline-football-vs-bountiful-football/77779">bad historical cross-link</a>
`,'2012-10-26');
assert.deepEqual(scheduleLinks,[
  'https://sports.deseret.com/high-school/football/game/2012-10-26/viewmont-football-vs-syracuse-football/110951'
]);

const modernHtml=`
  <title>Viewmont vs Woods Cross - Football Game</title>
  <table>
    <tr><th>Team</th><th>Total</th></tr>
    <tr><td>Viewmont</td><td>7</td></tr>
    <tr><td>Woods Cross</td><td>47</td></tr>
  </table>
  <h2>Rushing</h2>
  <table>
    <tr><th colspan="5">Viewmont Rushing</th></tr>
    <tr><th>NO</th><th>PLAYER</th><th>Carries</th><th>Yards</th><th>TD</th></tr>
    <tr><td>1</td><td><span class="d-inline d-md-none">D.</span><span class="d-none d-md-inline">Dax</span> Nielsen</td><td>8</td><td>34</td><td></td></tr>
    <tr><td>7</td><td><span class="d-inline d-md-none">T.</span><span class="d-none d-md-inline">Titan</span> Longson</td><td>311</td><td></td><td></td></tr>
    <tr><td>18</td><td>Chase Birchell</td><td>57</td><td></td><td>1</td></tr>
    <tr><td>4</td><td>Skyler Armenta</td><td>54</td><td>16</td><td>1</td></tr>
  </table>
  <table>
    <tr><th colspan="5">Woods Cross Rushing</th></tr>
    <tr><th>NO</th><th>PLAYER</th><th>Carries</th><th>Yards</th><th>TD</th></tr>
    <tr><td>30</td><td>Cash Henderson</td><td>16</td><td>136</td><td>1</td></tr>
  </table>
  <h2>Passing</h2>
  <table>
    <tr><th colspan="7">Viewmont Passing</th></tr>
    <tr><th>NO</th><th>PLAYER</th><th>Comp-Att</th><th>Comp %</th><th>Yards</th><th>TD</th><th>Int</th></tr>
    <tr><td>7</td><td>Titan Longson</td><td>4-9</td><td>44%</td><td>2</td><td></td><td></td></tr>
  </table>
  <h2>Receiving</h2>
  <table>
    <tr><th colspan="5">Viewmont Receiving</th></tr>
    <tr><th>NO</th><th>PLAYER</th><th>Receptions</th><th>Yards</th><th>TD</th></tr>
    <tr><td>8</td><td>Gareth Anderson</td><td>19</td><td></td><td></td></tr>
    <tr><td>2</td><td>Seth Kaelin</td><td>23</td><td>183</td><td>2</td></tr>
  </table>
  <h2>Defense</h2>
  <table>
    <tr><th colspan="6">Viewmont Defense</th></tr>
    <tr><th>NO</th><th>PLAYER</th><th>Tackles</th><th>Sacks</th><th>Pass Int</th><th>TD</th></tr>
    <tr><td>3</td><td>Source Outlier</td><td>41</td><td>8</td><td>6</td><td></td></tr>
  </table>
`;

const modern=parseGame(
  modernHtml,
  'https://sports.deseret.com/high-school/football/game/2023-09-15/woods-cross-football-vs-viewmont-football/228149',
  2023
);
const dax=modern.find(record=>record.player==='Dax Nielsen');
const cash=modern.find(record=>record.player==='Cash Henderson');
const titan=modern.find(record=>record.player==='Titan Longson');
const chase=modern.find(record=>record.player==='Chase Birchell');
const skyler=modern.find(record=>record.player==='Skyler Armenta');
const gareth=modern.find(record=>record.player==='Gareth Anderson');
const seth=modern.find(record=>record.player==='Seth Kaelin');
const outlier=modern.find(record=>record.player==='Source Outlier');
assert.equal(dax.team,'VIEWMONT');
assert.equal(dax.teamScore,7);
assert.equal(dax.opponentScore,47);
assert.equal(dax.stats.carries,8);
assert.equal(dax.stats.rushingYards,34);
assert.equal(cash.team,'WOODS CROSS');
assert.equal(cash.teamScore,47);
assert.equal(cash.opponentScore,7);
assert.equal(cash.stats.rushingYards,136);
assert.equal(titan.stats.carries,undefined);
assert.equal(titan.stats.passingYards,2);
assert.deepEqual(chase.stats,{rushingTouchdowns:1});
assert.deepEqual(skyler.stats,{rushingYards:16,rushingTouchdowns:1,totalOffenseYards:16});
assert.equal(gareth,undefined);
assert.deepEqual(seth.stats,{receivingYards:183,receivingTouchdowns:2});
assert.equal(outlier,undefined);

const legacyHtml=`
  <title>Alta vs Bingham - Football Game</title>
  <table>
    <tr><th>Team</th><th>Total</th></tr>
    <tr><td>Alta</td><td>17</td></tr>
    <tr><td>Bingham</td><td>21</td></tr>
  </table>
  <h2>Rushing</h2>
  <table>
    <tr><th colspan="5">Bingham Rushing</th></tr>
    <tr><th>NO</th><th>PLAYER</th><th>Carries</th><th>Yards</th><th>TD</th></tr>
    <tr><td>-</td><td>Harvey Langi</td><td>206</td><td>1373</td><td>1</td></tr>
  </table>
  <h2>Passing</h2>
  <table>
    <tr><th colspan="7">Bingham Passing</th></tr>
    <tr><th>NO</th><th>PLAYER</th><th>Comp-Att</th><th>Comp %</th><th>Yards</th><th>TD</th><th>Int</th></tr>
    <tr><td>-</td><td>Jake Soffe</td><td>146-208</td><td>70%</td><td>2110</td><td>1</td><td></td></tr>
  </table>
`;

const legacy=parseGame(
  legacyHtml,
  'https://sports.deseret.com/high-school/football/game/2008-11-21/alta-football-vs-bingham-football/64687',
  2008
);
const langi=legacy.find(record=>record.player==='Harvey Langi');
const soffe=legacy.find(record=>record.player==='Jake Soffe');
assert.deepEqual(langi.stats,{rushingTouchdowns:1});
assert.deepEqual(soffe.stats,{passingTouchdowns:1});

const manuallyVerified=mergeManual([]);
const puka=manuallyVerified.find(record=>record.player==='Puka Nacua');
const cooper=manuallyVerified.find(record=>record.player==='Cooper Legas');
assert.equal(MANUAL.length,3);
assert.equal(puka.team,'OREM');
assert.equal(puka.gameId,'168535');
assert.deepEqual(puka.stats,{receivingYards:321,receptions:16,receivingTouchdowns:3});
assert.equal(cooper.team,'OREM');
assert.equal(cooper.teamScore,51);
assert.equal(cooper.opponentScore,46);
assert.deepEqual(cooper.stats,{passingYards:438,passingTouchdowns:4,completions:24,passAttempts:37,rushingYards:190,rushingTouchdowns:1,carries:16,totalOffenseYards:628});
const uhsaa=loadUhsaaSingleGameEntries();
assert(uhsaa.length>=132, `Expected at least 132 official UHSAA game entries, got ${uhsaa.length}`);
assert.equal(uhsaa.filter(entry=>entry.key==='tackles').length,9);
assert(uhsaa.some(entry=>entry.team==='MORGAN'&&entry.player==='Kenny Adams'&&entry.value===36));
console.log('Player single-game record parser regression tests passed.');

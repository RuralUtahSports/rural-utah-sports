import assert from 'node:assert/strict';

process.env.PLAYER_RECORDS_SKIP_MAIN='1';
const {gameLinks,parseGame}=await import('./build_player_single_game_records.mjs');

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
`;

const modern=parseGame(
  modernHtml,
  'https://sports.deseret.com/high-school/football/game/2023-09-15/woods-cross-football-vs-viewmont-football/228149',
  2023
);
const dax=modern.find(record=>record.player==='Dax Nielsen');
const cash=modern.find(record=>record.player==='Cash Henderson');
const titan=modern.find(record=>record.player==='Titan Longson');
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
console.log('Player single-game record parser regression tests passed.');

import assert from 'node:assert/strict';

process.env.PLAYER_RECORDS_SKIP_MAIN='1';
const {parseGame}=await import('./build_player_single_game_records.mjs');

const html=`
  <title>Hillcrest vs Layton - Football Game</title>
  <table>
    <tr><th>Team</th><th>Total</th></tr>
    <tr><td>Hillcrest</td><td>26</td></tr>
    <tr><td>Layton</td><td>46</td></tr>
  </table>
  <h2>Passing</h2>
  <h3>Hillcrest</h3>
  <table>
    <tr><th>Player</th><th>Comp-Att</th><th>Yards</th><th>TD</th></tr>
    <tr><td>Brad Leggat</td><td>30-49</td><td>538</td><td>3</td></tr>
  </table>
`;

const records=parseGame(
  html,
  'https://sports.deseret.com/high-school/football/game/2001-08-31/hillcrest-football-vs-layton-football/60618',
  2001
);

assert.equal(records.length,1);
assert.equal(records[0].player,'Brad Leggat');
assert.equal(records[0].teamScore,26);
assert.equal(records[0].opponentScore,46);
assert.equal(records[0].stats.passingYards,538);
assert.equal(records[0].stats.totalOffenseYards,538);
console.log('Player single-game record parser regression test passed.');

/* Matches scripts/build_rpi_standings.mjs; no predicted scores are used. */
(function(scope){'use strict';
function calculate(teams, weekly, oosData = {teams:{}}){






const CLASS_ORDER = ['6A', '5A', '4A', '3A', '2A', '1A', '8P'];
const BORDER_STATES = new Set(['AZ', 'CO', 'ID', 'NM', 'NV', 'WY']);
const INDEPENDENT = new Set(['GRAND', 'LAYTONCHRISTIAN']);
const FOOTBALL_CLASSIFICATION = new Map([['ENTERPRISE', '1A']]);

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const compact = (value) => clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
const alias = (value) => ({
  ALA: 'ALA',
  AMERICANLEADERSHIP: 'ALA',
  AMERICANLEADERSHIPACADEMY: 'ALA',
  CEDAR: 'CEDARCITY',
  CEDARCITY: 'CEDARCITY',
  GRANDCOUNTY: 'GRAND',
  GUNNISON: 'GUNNISONVALLEY',
  JUANDIEGOCATHOLIC: 'JUANDIEGO',
  JUDGEMEMORIALCATHOLIC: 'JUDGEMEMORIAL',
  MONUMENTVAL: 'MONUMENTVALLEY',
  STJOSEPH: 'SAINTJOSEPH',
  UTAHMILITARYACADEMYCAMPWILLIAMS: 'UMALEHI',
  UTAHMILITARYCAMPWILLIAMS: 'UMALEHI',
  UTAHMILITARYACADEMYHILLFIELD: 'UMAHILLFIELD',
  UTAHMILITARYHILLFIELD: 'UMAHILLFIELD',
}[compact(value)] || compact(value));
const number = (value) => {
  if (value === null || value === undefined || clean(value) === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const average = (values) => {
  const usable = values.filter(Number.isFinite);
  return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : null;
};
const gameFinal = (game) => number(game.actualAway) !== null && number(game.actualHome) !== null;
const resultFor = (game, team) => {
  const away = alias(game.awayTeam) === alias(team);
  const own = number(away ? game.actualAway : game.actualHome);
  const opponent = number(away ? game.actualHome : game.actualAway);
  return own === opponent ? 0.5 : own > opponent ? 1 : 0;
};
const opponentFor = (game, team) => alias(game.awayTeam) === alias(team) ? game.homeTeam : game.awayTeam;
const stateFor = (name) => clean(name).toUpperCase().match(/,\s*([A-Z]{2})\s*$/)?.[1] || '';

const teamByKey = new Map(teams.map((team) => [alias(team.team), team]));
const memberKeys = new Set(teamByKey.keys());
const eligibleTeams = teams.filter((team) => !INDEPENDENT.has(alias(team.team)));
const gamesByTeam = new Map();

function addGame(team, game) {
  const key = alias(team);
  if (!gamesByTeam.has(key)) gamesByTeam.set(key, []);
  gamesByTeam.get(key).push(game);
}

for (const game of weekly.games || []) {
  if (!gameFinal(game)) continue;
  const away = alias(game.awayTeam);
  const home = alias(game.homeTeam);
  if (INDEPENDENT.has(away) || INDEPENDENT.has(home)) continue;
  if (memberKeys.has(away)) addGame(game.awayTeam, game);
  if (memberKeys.has(home)) addGame(game.homeTeam, game);
}

function oosEntry(name) {
  const wanted = compact(name);
  const key = Object.keys(oosData.teams || {}).find((candidate) => compact(candidate) === wanted);
  return key ? oosData.teams[key] : null;
}

function wp(team, excludeOpponent = '') {
  const key = alias(team);
  if (!memberKeys.has(key)) return null;
  const excluded = alias(excludeOpponent);
  const games = (gamesByTeam.get(key) || []).filter((game) => !excluded || alias(opponentFor(game, team)) !== excluded);
  return average(games.map((game) => resultFor(game, team)));
}

function opponentWp(opponent, versusTeam) {
  const opponentKey = alias(opponent);
  if (memberKeys.has(opponentKey)) return wp(opponent, versusTeam);
  const entry = oosEntry(opponent);
  if (!entry) return 0.5;
  const direct = entry.wpByUtahTeam?.[alias(versusTeam)] ?? entry.wpByUtahTeam?.[clean(versusTeam).toUpperCase()];
  return number(direct) ?? number(entry.wp) ?? 0.5;
}

function opponentOwp(opponent, versusTeam) {
  const opponentKey = alias(opponent);
  if (!memberKeys.has(opponentKey)) {
    const entry = oosEntry(opponent);
    if (!entry || !BORDER_STATES.has(clean(entry.state).toUpperCase())) return 0.5;
    const direct = entry.owpByUtahTeam?.[alias(versusTeam)] ?? entry.owpByUtahTeam?.[clean(versusTeam).toUpperCase()];
    return number(direct) ?? number(entry.owp) ?? 0.5;
  }
  const rows = gamesByTeam.get(opponentKey) || [];
  return average(rows.map((game) => opponentWp(opponentFor(game, opponent), opponent))) ?? 0.5;
}

function calculate(team) {
  const games = gamesByTeam.get(alias(team.team)) || [];
  const mwp = wp(team.team);
  const owp = average(games.map((game) => opponentWp(opponentFor(game, team.team), team.team)));
  const oowp = average(games.map((game) => opponentOwp(opponentFor(game, team.team), team.team)));
  const wins = games.filter((game) => resultFor(game, team.team) === 1).length;
  const ties = games.filter((game) => resultFor(game, team.team) === 0.5).length;
  const losses = games.length - wins - ties;
  return {
    team: team.team,
    classification: FOOTBALL_CLASSIFICATION.get(alias(team.team)) || team.classification,
    region: team.region,
    record: `${wins}-${losses}${ties ? `-${ties}` : ''}`,
    wins,
    losses,
    ties,
    games: games.length,
    rpi: 0.45 * (mwp ?? 0) + 0.45 * (owp ?? 0) + 0.10 * (oowp ?? 0),
    mwp: mwp ?? 0,
    owp: owp ?? 0,
    oowp: oowp ?? 0,
    postseasonEligible: games.length >= 6,
  };
}

const classifications = {};
for (const classification of CLASS_ORDER) {
  const rows = eligibleTeams
    .map(calculate)
    .filter((team) => team.classification === classification)
    .sort((a, b) => b.rpi - a.rpi || b.mwp - a.mwp || a.team.localeCompare(b.team));
  rows.forEach((row, index) => { row.rank = index + 1; });
  classifications[classification] = rows;
}


return classifications;
}
const api={calculate};
if(typeof module==='object' && module.exports)module.exports=api;
else scope.RUSRpiPicks=api;
})(typeof window==='object'?window:globalThis);

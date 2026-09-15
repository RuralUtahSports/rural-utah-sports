import fs from 'node:fs';

const SEASON = 2026;
const GAMES_FILE = 'weekly-simulation.json';
const TEAMS_FILE = 'teams-data.json';
const OOS_FILE = 'rpi-oos-2026.json';
const OFFICIAL_FILE = 'uhsaa-rpi-official-2026.json';
const OUT = 'rpi-standings-2026.json';
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

const teams = JSON.parse(fs.readFileSync(TEAMS_FILE, 'utf8'));
const weekly = JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8'));
const oosData = fs.existsSync(OOS_FILE) ? JSON.parse(fs.readFileSync(OOS_FILE, 'utf8')) : {teams: {}};
const official = fs.existsSync(OFFICIAL_FILE) ? JSON.parse(fs.readFileSync(OFFICIAL_FILE, 'utf8')) : null;
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

function officialRows() {
  return CLASS_ORDER.flatMap((classification) => official?.classifications?.[classification]?.rows || []);
}

const calculatedRows = CLASS_ORDER.flatMap((classification) => classifications[classification] || []);
const comparison = official ? officialRows().map((row) => {
  const calculated = calculatedRows.find((candidate) => alias(candidate.team) === alias(row.team));
  return {
    classification: row.classification,
    team: calculated?.team || row.team,
    officialTeam: row.team,
    officialRank: row.rank,
    rusRank: calculated?.rank ?? null,
    rankDifference: calculated ? calculated.rank - row.rank : null,
    officialRecord: row.record,
    rusRecord: calculated?.record ?? null,
    recordMatch: calculated?.record === row.record,
    officialRpi: row.rpi,
    rusRpi: calculated?.rpi ?? null,
    rpiDifference: calculated ? calculated.rpi - row.rpi : null,
    componentDifference: calculated ? {
      mwp: calculated.mwp - row.mwp,
      owp: calculated.owp - row.owp,
      oowp: calculated.oowp - row.oowp,
    } : null,
    likelyCause: !calculated
      ? 'Team missing from the RUS calculation.'
      : calculated.record !== row.record
        ? 'Completed-game record differs from the official table.'
        : Math.abs(calculated.owp - row.owp) > 0.0005
          ? 'One or more opponent records differ from the official table.'
          : Math.abs(calculated.oowp - row.oowp) > 0.0005
            ? 'One or more second-level opponent records differ from the official table.'
            : Math.abs(calculated.rpi - row.rpi) > 0.0005
              ? 'Difference is within the displayed component precision.'
              : null,
  };
}) : [];

const payload = {
  season: SEASON,
  updatedAt: new Date().toISOString(),
  formula: {
    rpi: '0.45 × MWP + 0.45 × OWP + 0.10 × OOWP',
    footballMwp: 'Unadjusted game-result winning percentage; football classifications are not weighted.',
    owp: 'Average opponent winning percentage with the head-to-head game removed.',
    oowp: 'Average opponent OWP with the original head-to-head game removed.',
    outOfState: 'Border-state opponents use direct WP and OWP; non-border-state opponents use direct WP and assigned .500 OWP.',
    excluded: [...INDEPENDENT],
  },
  sourceUpdatedAt: oosData.updatedAt || null,
  classifications,
  comparison: official ? {
    officialFetchedAt: official.fetchedAt,
    teamsCompared: comparison.length,
    exactRankMatches: comparison.filter((row) => row.rankDifference === 0).length,
    recordMatches: comparison.filter((row) => row.recordMatch).length,
    exactRpiMatches: comparison.filter((row) => Number.isFinite(row.rpiDifference) && Math.abs(row.rpiDifference) < 0.0000005).length,
    withinOneThousandth: comparison.filter((row) => Number.isFinite(row.rpiDifference) && Math.abs(row.rpiDifference) <= 0.001).length,
    meanAbsoluteRpiDifference: average(comparison.map((row) => Math.abs(row.rpiDifference)).filter(Number.isFinite)),
    rows: comparison,
  } : null,
};

fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Built ${calculatedRows.length} RPI standings rows.`);
if (payload.comparison) {
  console.log(`Compared ${payload.comparison.teamsCompared} teams: ${payload.comparison.exactRankMatches} exact ranks, ${payload.comparison.recordMatches} matching records, ${payload.comparison.withinOneThousandth} RPI values within .001.`);
}

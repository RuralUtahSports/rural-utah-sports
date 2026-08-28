import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'player-single-game-records';
const BY_TEAM = path.join(ROOT, 'by-team');
const START_SEASON = 2001;
const EXPECTED_CATEGORIES = [
  'passingYards',
  'passingTouchdowns',
  'completions',
  'passAttempts',
  'rushingYards',
  'rushingTouchdowns',
  'carries',
  'receivingYards',
  'receptions',
  'receivingTouchdowns',
  'totalOffenseYards',
  'tackles',
  'sacks',
  'interceptions',
  'defensiveTouchdowns',
  'fieldGoals',
  'extraPoints',
  'returnTouchdowns'
];
const PLAUSIBLE_MAX = {
  passingYards: 800,
  passingTouchdowns: 12,
  completions: 60,
  passAttempts: 90,
  rushingYards: 600,
  rushingTouchdowns: 12,
  carries: 60,
  receivingYards: 500,
  receptions: 20,
  receivingTouchdowns: 8,
  totalOffenseYards: 1000,
  tackles: 40,
  sacks: 7.5,
  interceptions: 5,
  defensiveTouchdowns: 4,
  fieldGoals: 8,
  extraPoints: 20,
  returnTouchdowns: 4
};

const clean = value => String(value ?? '').trim();
const slug = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const fail = message => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };

function validateRankedEntries(category, entries, limit, expectedTeam = null) {
  assert(Array.isArray(entries) && entries.length > 0, `${category}: entries are empty`);
  assert(entries.length <= limit, `${category}: ${entries.length} entries exceeds limit ${limit}`);
  const seen = new Set();
  let previousValue = Infinity;
  let previousRank = 0;
  let previousRankValue = null;

  entries.forEach((entry, index) => {
    const value = Number(entry?.value);
    assert(clean(entry?.player), `${category}: entry ${index + 1} has no player`);
    assert(clean(entry?.team), `${category}: entry ${index + 1} has no team`);
    if (expectedTeam) assert(entry.team === expectedTeam, `${category}: ${entry.player} is assigned to ${entry.team}, expected ${expectedTeam}`);
    assert(Number.isFinite(value) && value > 0, `${category}: ${entry.player} has invalid value ${entry?.value}`);
    assert(value <= PLAUSIBLE_MAX[category], `${category}: ${entry.player} has implausible value ${value}`);
    assert(value <= previousValue, `${category}: entries are not sorted descending at ${entry.player}`);
    assert(Number.isInteger(entry.rank) && entry.rank >= 1, `${category}: ${entry.player} has invalid rank ${entry.rank}`);
    const expectedRank = value === previousRankValue ? previousRank : index + 1;
    assert(entry.rank === expectedRank, `${category}: ${entry.player} has rank ${entry.rank}, expected ${expectedRank}`);
    const officialUhsaa = clean(entry?.source).toLowerCase().includes('uhsaa record book');
    if (officialUhsaa) {
      assert(Number.isInteger(Number(entry.season)) && Number(entry.season) >= 1, `${category}: ${entry.player} has invalid official season ${entry.season}`);
      assert(!clean(entry.gameUrl) || /^https:\/\/sports\.deseret\.com\/high-school\/football\/game\//.test(clean(entry.gameUrl)), `${category}: ${entry.player} has invalid official game URL ${entry.gameUrl}`);
    } else {
      assert(Number.isInteger(Number(entry.season)) && Number(entry.season) >= START_SEASON, `${category}: ${entry.player} has invalid season ${entry.season}`);
      assert(/^https:\/\/sports\.deseret\.com\/high-school\/football\/game\//.test(clean(entry.gameUrl)), `${category}: ${entry.player} has invalid game URL`);
    }
    assert(/^\d{4}-\d{2}-\d{2}$/.test(clean(entry.date)), `${category}: ${entry.player} has invalid date ${entry.date}`);
    assert(clean(entry.gameId), `${category}: ${entry.player} has no game ID`);
    const key = `${entry.gameId}|${entry.team}|${entry.player}`;
    assert(!seen.has(key), `${category}: duplicate entry ${key}`);
    seen.add(key);
    previousValue = value;
    previousRank = entry.rank;
    previousRankValue = value;
  });
}

function validateCategories(categories, limit, expectedTeam = null, requireAll = false) {
  assert(Array.isArray(categories), `${expectedTeam || 'statewide'}: categories are not an array`);
  const keys = categories.map(category => category?.key);
  assert(new Set(keys).size === keys.length, `${expectedTeam || 'statewide'}: duplicate category keys`);
  for (const key of keys) assert(EXPECTED_CATEGORIES.includes(key), `${expectedTeam || 'statewide'}: unexpected category ${key}`);
  if (requireAll) {
    const missing = EXPECTED_CATEGORIES.filter(key => !keys.includes(key));
    assert(!missing.length, `Statewide categories missing: ${missing.join(', ')}`);
  }
  for (const category of categories) validateRankedEntries(category.key, category.entries, limit, expectedTeam);
}

const index = readJson(path.join(ROOT, 'index.json'));
const statewide = readJson(path.join(ROOT, 'statewide.json'));
const teams = readJson('teams-data.json').map(team => clean(team?.team)).filter(Boolean);
const expectedFiles = teams.map(team => `${slug(team)}.json`).sort();
const actualFiles = fs.readdirSync(BY_TEAM).filter(file => file.endsWith('.json')).sort();

assert(index.startSeason === START_SEASON, `Expected start season ${START_SEASON}, got ${index.startSeason}`);
assert(index.structuredSingleGameStartSeason === 2009, `Expected structured single-game data to start in 2009, got ${index.structuredSingleGameStartSeason}`);
assert(Number(index.endSeason) >= START_SEASON, `Invalid end season ${index.endSeason}`);
assert(Number(index.uniqueGamePages) >= 14000, `Historical discovery incomplete: ${index.uniqueGamePages} games`);
assert(Number(index.performances) >= 10000, `Player performance output incomplete: ${index.performances}`);
assert(Number(index.teams) === teams.length, `Summary has ${index.teams} teams; teams-data has ${teams.length}`);
assert(Number(index.teamsWithPerformances) >= Math.min(100, teams.length), `Only ${index.teamsWithPerformances} teams have performances`);
assert(Number(index.categories) === EXPECTED_CATEGORIES.length, `Expected ${EXPECTED_CATEGORIES.length} statewide categories, got ${index.categories}`);
assert(Number(index.gamePageFailures) <= Math.max(50, Math.floor(Number(index.uniqueGamePages) * 0.02)), `Too many game-page failures: ${index.gamePageFailures}`);
assert(expectedFiles.length === new Set(expectedFiles).size, 'Team names produce duplicate output filenames');
assert(JSON.stringify(actualFiles) === JSON.stringify(expectedFiles), `Team file set is incomplete or stale: expected ${expectedFiles.length}, got ${actualFiles.length}`);

for (let season = START_SEASON; season <= Number(index.endSeason); season += 1) {
  const discovery = index.seasonDiscovery?.[season];
  assert(discovery, `Missing discovery summary for ${season}`);
  if (season < Number(index.endSeason)) assert(Number(discovery.uniqueGamesFound) >= 400, `${season}: only ${discovery.uniqueGamesFound} games discovered`);
}

validateCategories(statewide.categories, 100, null, true);
assert(/2009 to present/.test(clean(statewide.coverageNote)) && /2001.2008/.test(clean(statewide.coverageNote)), 'Coverage note does not explain the 2001–2008 cumulative-table exclusion');
const passing = statewide.categories.find(category => category.key === 'passingYards');
assert(passing.entries.some(entry => entry.player === 'Brad Leggat' && clean(entry.team).toUpperCase() === 'HILLCREST' && Number(entry.value) >= 538), 'Verified Brad Leggat 538-yard game is missing');
assert(passing.entries.some(entry => entry.player === 'Cooper Legas' && clean(entry.team).toUpperCase() === 'OREM' && Number(entry.value) === 438 && entry.gameId === '168535'), 'Verified Cooper Legas 438-yard game is missing');
const receiving = statewide.categories.find(category => category.key === 'receivingYards');
assert(receiving.entries.some(entry => entry.player === 'Puka Nacua' && clean(entry.team).toUpperCase() === 'OREM' && Number(entry.value) === 321 && entry.gameId === '168535'), 'Verified Puka Nacua 321-yard game is missing');
const totalOffense = statewide.categories.find(category => category.key === 'totalOffenseYards');
assert(totalOffense.entries.some(entry => entry.player === 'Cooper Legas' && clean(entry.team).toUpperCase() === 'OREM' && Number(entry.value) === 628 && entry.gameId === '168535'), 'Verified Cooper Legas 628-yard total-offense game is missing');

for (const team of teams) {
  const payload = readJson(path.join(BY_TEAM, `${slug(team)}.json`));
  assert(payload.team === team, `${team}: payload team is ${payload.team}`);
  assert(clean(payload.range).startsWith(`${START_SEASON}`), `${team}: invalid coverage range ${payload.range}`);
  validateCategories(payload.categories, 15, team, false);
}

console.log({
  uniqueGamePages: index.uniqueGamePages,
  gamePageFailures: index.gamePageFailures,
  performances: index.performances,
  teams: index.teams,
  teamsWithPerformances: index.teamsWithPerformances,
  categories: index.categories,
  teamFiles: actualFiles.length,
  verifiedRecords: [
    'Brad Leggat, Hillcrest, 538 passing yards',
    'Puka Nacua, Orem, 321 receiving yards',
    'Cooper Legas, Orem, 628 total-offense yards'
  ]
});

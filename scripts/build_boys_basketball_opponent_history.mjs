import fs from 'node:fs';

const SEASONS = ['2002-03', '2003-04', '2004-05', '2005-06', '2006-07', '2007-08', '2008-09', '2009-10', '2010-11', '2011-12', '2012-13', '2013-14', '2014-15', '2015-16', '2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26'];
const OUT_DIR = 'boys-basketball-opponents';
const INDEX_FILE = OUT_DIR + '/index.json';

const clean = value => String(value ?? '').trim();
const norm = value => clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '');

const ALIASES = {
  UTAHMILITARYACADEMYCAMPWILLIAMS: 'UMALEHI',
  UMACAMPWILLIAMS: 'UMALEHI',
  UTAHMILITARYACADEMYHILLFIELD: 'UMAHILLFIELD',
  STJOSEPH: 'SAINTJOSEPH',
  GRAND: 'GRANDCOUNTY',
  MERITPREPARATORYACADEMY: 'MERITPREP',
  AMERICANLEADERSHIPACADEMY: 'ALA',
  AMERICANPREPARATORYACADEMYWESTVALLEY: 'AMERICANPREPWV',
  MAESERPREPARATORYACADEMY: 'MAESERPREPACADEMY',
  JUANDIEGOCATHOLIC: 'JUANDIEGO',
  JUDGEMEMORIALCATHOLIC: 'JUDGEMEMORIAL',
  UTAHSCHOOLFORTHEDEAFBLIND: 'USDB',
  CEDARCITY: 'CEDAR',
  GUNNISON: 'GUNNISONVALLEY',
  LAYTONCHRISTIAN: 'LAYTONCHRISTIANACADEMY',
  WASATCHACAD: 'WASATCHACADEMY'
};

const canonicalKey = value => ALIASES[norm(value)] || norm(value);
const safeFile = key => key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

const directory = readJson('boys-basketball-teams.json');
const currentNames = new Map();
for (const team of directory) {
  currentNames.set(canonicalKey(team.team), team.team);
}
const displayName = value => currentNames.get(canonicalKey(value)) || clean(value);

function validGame(game) {
  const teamScore = Number(game?.teamScore);
  const opponentScore = Number(game?.opponentScore);
  return clean(game?.opponent) &&
    Number.isFinite(teamScore) &&
    Number.isFinite(opponentScore) &&
    !(teamScore === 0 && opponentScore === 0);
}

function gameResult(teamScore, opponentScore) {
  if (teamScore > opponentScore) return 'W';
  if (teamScore < opponentScore) return 'L';
  return 'T';
}

function gameSortValue(game) {
  const raw = clean(game.date);
  const parsed = Date.parse(raw.includes('T') ? raw : raw + 'T12:00:00');
  return Number.isFinite(parsed) ? parsed : 0;
}

function summarizeOpponent(opponent) {
  const games = opponent.games.slice().sort((a, b) =>
    gameSortValue(b) - gameSortValue(a) || clean(b.season).localeCompare(clean(a.season))
  );
  let wins = 0, losses = 0, ties = 0, pointsFor = 0, pointsAgainst = 0;
  let biggestWin = null, biggestLoss = null;

  for (const game of games) {
    pointsFor += game.teamScore;
    pointsAgainst += game.opponentScore;
    if (game.result === 'W') {
      wins++;
      const margin = game.teamScore - game.opponentScore;
      if (!biggestWin || margin > biggestWin.margin || (margin === biggestWin.margin && gameSortValue(game) > gameSortValue(biggestWin))) {
        biggestWin = { ...game, margin };
      }
    } else if (game.result === 'L') {
      losses++;
      const margin = game.opponentScore - game.teamScore;
      if (!biggestLoss || margin > biggestLoss.margin || (margin === biggestLoss.margin && gameSortValue(game) > gameSortValue(biggestLoss))) {
        biggestLoss = { ...game, margin };
      }
    } else {
      ties++;
    }
  }

  let currentStreak = null;
  if (games.length) {
    const result = games[0].result;
    let count = 0;
    for (const game of games) {
      if (game.result !== result) break;
      count++;
    }
    currentStreak = { result, count };
  }

  return {
    key: opponent.key,
    name: opponent.name,
    state: opponent.state,
    meetings: games.length,
    wins,
    losses,
    ties,
    winPct: games.length ? (wins + ties * 0.5) / games.length : 0,
    pointsFor,
    pointsAgainst,
    currentStreak,
    lastMeeting: games[0] || null,
    biggestWin,
    biggestLoss,
    games
  };
}

const teams = new Map();

for (const season of SEASONS) {
  const payload = readJson('boys-basketball-games-' + season + '.json');
  for (const [sourceTeamName, entry] of Object.entries(payload.teams || {})) {
    const ownKey = canonicalKey(sourceTeamName);
    if (!ownKey) continue;
    const ownName = displayName(sourceTeamName);
    let team = teams.get(ownKey);
    if (!team) {
      team = { key: ownKey, team: ownName, opponents: new Map() };
      teams.set(ownKey, team);
    } else if (currentNames.has(ownKey)) {
      team.team = currentNames.get(ownKey);
    }

    for (const game of Array.isArray(entry?.games) ? entry.games : []) {
      if (!validGame(game)) continue;

      const opponentName = displayName(game.opponent);
      const opponentKey = canonicalKey(game.opponent);
      const stateRaw = clean(game.opponentState).toUpperCase();
      const state = stateRaw && stateRaw !== 'UTAH' ? stateRaw : 'UT';
      const opponentId = opponentKey + '|' + state;
      let opponent = team.opponents.get(opponentId);
      if (!opponent) {
        opponent = { key: opponentKey, name: opponentName, state, games: [] };
        team.opponents.set(opponentId, opponent);
      } else if (state === 'UT' && currentNames.has(opponentKey)) {
        opponent.name = currentNames.get(opponentKey);
      }

      const teamScore = Number(game.teamScore);
      const opponentScore = Number(game.opponentScore);
      opponent.games.push({
        season,
        date: clean(game.date),
        location: clean(game.location),
        result: gameResult(teamScore, opponentScore),
        teamScore,
        opponentScore,
        sourceUrl: clean(game.sourceUrl || entry.sourceUrl)
      });
    }
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const index = {
  schemaVersion: 1,
  updatedAt: new Date().toISOString(),
  range: { start: SEASONS[0], end: SEASONS[SEASONS.length - 1] },
  source: 'Completed boys basketball results by season; 0-0 placeholders excluded',
  teams: {}
};

for (const [key, team] of [...teams.entries()].sort((a, b) => a[1].team.localeCompare(b[1].team))) {
  const opponents = [...team.opponents.values()]
    .map(summarizeOpponent)
    .sort((a, b) => b.meetings - a.meetings || a.name.localeCompare(b.name));

  const filename = safeFile(key) + '.json';
  const totalMeetings = opponents.reduce((sum, row) => sum + row.meetings, 0);
  const output = {
    schemaVersion: 1,
    updatedAt: index.updatedAt,
    range: index.range,
    team: team.team,
    teamKey: key,
    opponentCount: opponents.length,
    recordedGames: totalMeetings,
    opponents
  };
  fs.writeFileSync(OUT_DIR + '/' + filename, JSON.stringify(output, null, 2) + '\n');
  index.teams[key] = {
    team: team.team,
    file: OUT_DIR + '/' + filename,
    opponentCount: opponents.length,
    recordedGames: totalMeetings
  };
}

fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2) + '\n');
console.log('Built opponent history for ' + Object.keys(index.teams).length + ' teams.');

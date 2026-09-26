import fs from 'node:fs';

const FILES = {
  teams: 'teams-data.json',
  standings: 'standings-2026.json',
  seasons: 'season-records.json',
  weekly: 'weekly-simulation.json',
  details: 'deseret-game-details.json',
  scorigami: 'scorigami.json',
  scoringCorrections: 'manual-team-scoring-corrections-2026.json'
};
const OUTPUT = 'team-scoring-records.json';

for (const [key, file] of Object.entries(FILES)) {
  if (key === 'scoringCorrections') continue;
  if (!fs.existsSync(file)) throw new Error(file + ' not found');
}

const teams = JSON.parse(fs.readFileSync(FILES.teams, 'utf8'));
const standings = JSON.parse(fs.readFileSync(FILES.standings, 'utf8'));
const seasons = JSON.parse(fs.readFileSync(FILES.seasons, 'utf8'));
const weekly = JSON.parse(fs.readFileSync(FILES.weekly, 'utf8'));
const details = JSON.parse(fs.readFileSync(FILES.details, 'utf8'));
const scorigami = JSON.parse(fs.readFileSync(FILES.scorigami, 'utf8'));
const scoringCorrections = fs.existsSync(FILES.scoringCorrections)
  ? JSON.parse(fs.readFileSync(FILES.scoringCorrections, 'utf8'))
  : [];

const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ');
const norm = value => clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
const finite = value => {
  if (value === null || value === undefined || clean(value) === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const yearOf = value => {
  const match = clean(value).match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : null;
};
const isoDate = value => {
  const s = clean(value);
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return m[3] + '-' + String(m[1]).padStart(2, '0') + '-' + String(m[2]).padStart(2, '0');
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return m[1] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[3]).padStart(2, '0');
  const t = Date.parse(s);
  if (!Number.isFinite(t)) return s;
  const d = new Date(t);
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
};

const activeByNorm = new Map(teams.map(team => [norm(team.team), clean(team.team)]));
const teamMeta = new Map(teams.map(team => [norm(team.team), team]));
const aliases = new Map(Object.entries({
  AMERICANLEADERSHIP: 'ALA',
  AMERICANLEADERSHIPACADEMY: 'ALA',
  CEDAR: 'CEDAR CITY',
  GRANDCOUNTY: 'GRAND',
  GUNNISON: 'GUNNISON VALLEY',
  MAPLEMTN: 'MAPLE MOUNTAIN',
  MONUMENTVAL: 'MONUMENT VAL',
  MONUMENTVALLEY: 'MONUMENT VAL',
  STJOSEPH: 'SAINT JOSEPH',
  UMACAMPWILLIAMS: 'UMA-LEHI',
  UTAHMILITARYCAMPWILLIAMS: 'UMA-LEHI',
  UTAHMILITARYACADEMYCAMPWILLIAMS: 'UMA-LEHI',
  UMAHILLFIELD: 'UMA-HILLFIELD',
  UTAHMILITARYACADEMYHILLFIELD: 'UMA-HILLFIELD',
  WASATCHACAD: 'WASATCH ACADEMY'
}));

function activeTeam(value) {
  const k = norm(value);
  if (activeByNorm.has(k)) return activeByNorm.get(k);
  const alias = aliases.get(k);
  return alias ? activeByNorm.get(norm(alias)) || alias : null;
}

const currentRecords = new Map();
for (const rows of Object.values(standings?.byClassification || {})) {
  for (const row of rows || []) currentRecords.set(norm(row.team), row);
}

// For current-season leader rows, show the team's record immediately after
// that specific game rather than today's later record.
const recordAfterGameMap = new Map();
const runningRecords = new Map(teams.map(team => [norm(team.team), { wins: 0, losses: 0, ties: 0 }]));
const currentGames = [...(standings?.games || [])].sort((a, b) =>
  Date.parse(isoDate(a.date)) - Date.parse(isoDate(b.date)) ||
  clean(a.awayTeam).localeCompare(clean(b.awayTeam))
);
for (const game of currentGames) {
  const awayTeam = activeTeam(game.awayTeam);
  const homeTeam = activeTeam(game.homeTeam);
  const awayScore = finite(game.actualAway);
  const homeScore = finite(game.actualHome);
  if (awayScore === null || homeScore === null) continue;
  for (const [team, pf, pa] of [[awayTeam, awayScore, homeScore], [homeTeam, homeScore, awayScore]]) {
    if (!team) continue;
    const key = norm(team);
    const record = runningRecords.get(key) || { wins: 0, losses: 0, ties: 0 };
    if (pf > pa) record.wins++;
    else if (pf < pa) record.losses++;
    else record.ties++;
    runningRecords.set(key, record);
    recordAfterGameMap.set(isoDate(game.date) + '|' + key, { ...record });
  }
}

const seasonRecordMap = new Map();
for (const [year, rows] of Object.entries(seasons?.seasons || {})) {
  for (const row of rows || []) seasonRecordMap.set(Number(year) + '|' + norm(row.team), row);
}

function recordString(team, year, date = '') {
  const source = Number(year) === 2026
    ? recordAfterGameMap.get(isoDate(date) + '|' + norm(team)) ||
      currentRecords.get(norm(team)) ||
      seasonRecordMap.get('2026|' + norm(team))
    : seasonRecordMap.get(Number(year) + '|' + norm(team));
  if (!source) return '';
  const w = Number(source.wins), l = Number(source.losses), t = Number(source.ties || 0);
  if (!Number.isFinite(w) || !Number.isFinite(l)) return '';
  return t > 0 ? w + '-' + l + '-' + t : w + '-' + l;
}

function classification(team) {
  return clean(teamMeta.get(norm(team))?.classification);
}

function gameResult(teamScore, opponentScore) {
  return teamScore > opponentScore ? 'W' : teamScore < opponentScore ? 'L' : 'T';
}

function makeEvent({
  team, opponent, date, teamScore, opponentScore,
  teamPoints, opponentPoints, segment, type, url = ''
}) {
  const canonicalTeam = activeTeam(team);
  if (!canonicalTeam) return null;
  const canonicalOpponent = activeTeam(opponent) || clean(opponent);
  const year = yearOf(date);
  if (!year) return null;
  const tp = finite(teamPoints), op = finite(opponentPoints);
  const ts = finite(teamScore), os = finite(opponentScore);
  if (tp === null || op === null) return null;
  return {
    team: canonicalTeam,
    classification: classification(canonicalTeam),
    record: recordString(canonicalTeam, year, date),
    opponent: canonicalOpponent,
    date: isoDate(date),
    season: year,
    segment,
    type,
    teamPoints: tp,
    opponentPoints: op,
    combinedPoints: tp + op,
    differential: tp - op,
    teamScore: ts,
    opponentScore: os,
    result: ts !== null && os !== null ? gameResult(ts, os) : '',
    url: clean(url)
  };
}

function pushPerspective(target, base, awayPoints, homePoints, segment, type) {
  const away = makeEvent({
    team: base.awayTeam,
    opponent: base.homeTeam,
    date: base.date,
    teamScore: base.awayTotal,
    opponentScore: base.homeTotal,
    teamPoints: awayPoints,
    opponentPoints: homePoints,
    segment,
    type,
    url: base.url
  });
  const home = makeEvent({
    team: base.homeTeam,
    opponent: base.awayTeam,
    date: base.date,
    teamScore: base.homeTotal,
    opponentScore: base.awayTotal,
    teamPoints: homePoints,
    opponentPoints: awayPoints,
    segment,
    type,
    url: base.url
  });
  if (away) target.push(away);
  if (home) target.push(home);
}

// Current-season full-game leaders merge every verified final source.
// This intentionally does not depend on weekly-simulation containing the game:
// late-added scoreboard finals can live in standings/details before weekly catches up.
const currentGame = [];
const currentFinals = new Map();
const addCurrentFinal = (game, awayScore, homeScore, url = '', priority = 0) => {
  const awayTeam = activeTeam(game.awayTeam) || clean(game.awayTeam);
  const homeTeam = activeTeam(game.homeTeam) || clean(game.homeTeam);
  const date = isoDate(game.date);
  const away = finite(awayScore), home = finite(homeScore);
  if (yearOf(date) !== 2026 || !awayTeam || !homeTeam || away === null || home === null) return;
  const id = date + '|' + norm(awayTeam) + '|' + norm(homeTeam);
  const prior = currentFinals.get(id);
  if (!prior || priority >= prior.priority) currentFinals.set(id, {priority,date,awayTeam,homeTeam,away,home,url:clean(url)});
};
for (const game of weekly.games || []) addCurrentFinal(game, game.actualAway, game.actualHome, game.deseretUrl || '', 20);
for (const game of standings?.games || []) addCurrentFinal(game, game.actualAway, game.actualHome, game.deseretUrl || '', 30);
for (const [key, detail] of Object.entries(details.games || {})) {
  if (detail?.final !== true && !/^final$/i.test(clean(detail?.status))) continue;
  const parts = String(key).split('|');
  const rows = detail?.boxScore?.rows;
  if (!Array.isArray(rows) || rows.length < 2) continue;
  addCurrentFinal({
    date: detail?.date || parts[0],
    awayTeam: detail?.awayTeam || parts[1],
    homeTeam: detail?.homeTeam || parts[2]
  }, rows[0]?.total, rows[1]?.total, detail?.url || detail?.deseretUrl || '', 40);
}
for (const game of currentFinals.values()) {
  pushPerspective(currentGame, {
    awayTeam: game.awayTeam, homeTeam: game.homeTeam, date: game.date,
    awayTotal: game.away, homeTotal: game.home, url: game.url
  }, game.away, game.home, 'GAME', 'game');
}

// Deduplicate Deseret detail rows before building quarter/half records.
const detailByGame = new Map();
for (const [key, detail] of Object.entries(details.games || {})) {
  const parts = String(key).split('|');
  const date = detail?.date || parts[0];
  const awayTeam = detail?.awayTeam || parts[1];
  const homeTeam = detail?.homeTeam || parts[2];
  const away = activeTeam(awayTeam) || clean(awayTeam), home = activeTeam(homeTeam) || clean(homeTeam);
  if (!date || (!activeTeam(awayTeam) && !activeTeam(homeTeam))) continue;
  const rows = detail?.boxScore?.rows;
  if (!Array.isArray(rows) || rows.length < 2) continue;
  const quarters0 = Array.isArray(rows[0]?.quarters) ? rows[0].quarters : [];
  const quarters1 = Array.isArray(rows[1]?.quarters) ? rows[1].quarters : [];
  const numericCells = [...quarters0.slice(0, 4), ...quarters1.slice(0, 4)].filter(v => finite(v) !== null).length;
  const awayTotal = finite(rows[0]?.total);
  const homeTotal = finite(rows[1]?.total);
  const quality = numericCells * 10 + (detail?.final === true ? 5 : 0) + (awayTotal !== null && homeTotal !== null ? 2 : 0);
  const id = isoDate(date) + '|' + norm(away) + '|' + norm(home);
  const prior = detailByGame.get(id);
  if (!prior || quality > prior.quality) {
    detailByGame.set(id, {
      quality,
      date,
      awayTeam: away,
      homeTeam: home,
      awayTotal,
      homeTotal,
      awayQuarters: quarters0.slice(0, 4),
      homeQuarters: quarters1.slice(0, 4),
      url: detail?.url || detail?.deseretUrl || ''
    });
  }
}


// Verified quarter-table corrections override or fill games that the local
// Deseret detail cache missed. Keep these game-shaped so the normal quarter
// and half calculations use the same path as scraped detail rows.
for (const correction of scoringCorrections || []) {
  const date = correction?.date;
  const away = activeTeam(correction?.awayTeam) || clean(correction?.awayTeam);
  const home = activeTeam(correction?.homeTeam) || clean(correction?.homeTeam);
  if (!date || (!activeTeam(correction?.awayTeam) && !activeTeam(correction?.homeTeam))) continue;
  const awayQuarters = Array.isArray(correction.awayQuarters) ? correction.awayQuarters.slice(0, 4) : [];
  const homeQuarters = Array.isArray(correction.homeQuarters) ? correction.homeQuarters.slice(0, 4) : [];
  const numericCells = [...awayQuarters, ...homeQuarters].filter(v => finite(v) !== null).length;
  if (!numericCells) continue;
  const id = isoDate(date) + '|' + norm(away) + '|' + norm(home);
  detailByGame.set(id, {
    quality: 10000 + numericCells,
    date,
    awayTeam: away,
    homeTeam: home,
    awayTotal: finite(correction.awayTotal),
    homeTotal: finite(correction.homeTotal),
    awayQuarters,
    homeQuarters,
    url: clean(correction.url || ''),
    source: clean(correction.source || 'verified-manual-quarter-correction'),
    note: clean(correction.note || '')
  });
  console.log('Applied verified scoring correction:', id);
}

const currentQuarter = [], currentHalf = [];
const recordQuarterAll = [], recordHalfAll = [];
let quarterHalfGames = 0;
const reportedYears = [];

for (const game of detailByGame.values()) {
  const year = yearOf(game.date);
  if (!year || year < 2001) continue;
  let used = false;
  for (let q = 0; q < 4; q++) {
    const away = finite(game.awayQuarters[q]), home = finite(game.homeQuarters[q]);
    if (away === null || home === null) continue;
    const target = year === 2026 ? currentQuarter : null;
    if (target) pushPerspective(target, game, away, home, 'Q' + (q + 1), 'quarter');
    pushPerspective(recordQuarterAll, game, away, home, 'Q' + (q + 1), 'quarter');
    used = true;
  }
  const q = game.awayQuarters.map(finite), h = game.homeQuarters.map(finite);
  if (q[0] !== null && q[1] !== null && h[0] !== null && h[1] !== null) {
    const away = q[0] + q[1], home = h[0] + h[1];
    if (year === 2026) pushPerspective(currentHalf, game, away, home, 'H1', 'half');
    pushPerspective(recordHalfAll, game, away, home, 'H1', 'half');
    used = true;
  }
  if (q[2] !== null && q[3] !== null && h[2] !== null && h[3] !== null) {
    const away = q[2] + q[3], home = h[2] + h[3];
    if (year === 2026) pushPerspective(currentHalf, game, away, home, 'H2', 'half');
    pushPerspective(recordHalfAll, game, away, home, 'H2', 'half');
    used = true;
  }
  if (used) {
    quarterHalfGames++;
    reportedYears.push(year);
  }
}

// 2001-present full-game record book from the historical score database.
const historicalGameAll = [];
for (const scoreGroup of scorigami.scores || []) {
  for (const game of Array.isArray(scoreGroup.games) ? scoreGroup.games : []) {
    const year = Number(game.year) || yearOf(game.date);
    if (!year || year < 2001 || year > 2026) continue;
    const s1 = finite(game.score1), s2 = finite(game.score2);
    if (s1 === null || s2 === null) continue;
    const team1 = activeTeam(game.team1), team2 = activeTeam(game.team2);
    if (team1) {
      const e = makeEvent({
        team: team1, opponent: team2 || game.team2, date: game.date,
        teamScore: s1, opponentScore: s2, teamPoints: s1, opponentPoints: s2,
        segment: 'GAME', type: 'game'
      });
      if (e) historicalGameAll.push(e);
    }
    if (team2) {
      const e = makeEvent({
        team: team2, opponent: team1 || game.team1, date: game.date,
        teamScore: s2, opponentScore: s1, teamPoints: s2, opponentPoints: s1,
        segment: 'GAME', type: 'game'
      });
      if (e) historicalGameAll.push(e);
    }
  }
}

const metricDefs = {
  pointsScored: e => e.teamPoints,
  pointsAllowed: e => e.opponentPoints,
  combinedPoints: e => e.combinedPoints,
  marginVictory: e => e.result === 'W' ? e.teamScore - e.opponentScore : null,
  marginDefeat: e => e.result === 'L' ? e.opponentScore - e.teamScore : null
};
const eventId = e => [e.type, e.segment, e.date, norm(e.team), norm(e.opponent), e.teamPoints, e.opponentPoints].join('|');

function recordCandidates(events, type) {
  const metrics = type === 'game'
    ? ['pointsScored', 'pointsAllowed', 'combinedPoints', 'marginVictory', 'marginDefeat']
    : ['pointsScored', 'pointsAllowed', 'combinedPoints'];
  const selected = new Map();
  const classes = [...new Set(events.map(e => e.classification).filter(Boolean))];
  const addTop = (rows, metric, limit) => {
    const fn = metricDefs[metric];
    rows
      .map(e => ({ e, value: fn(e) }))
      .filter(x => Number.isFinite(x.value))
      .sort((a, b) => b.value - a.value || Date.parse(b.e.date) - Date.parse(a.e.date))
      .slice(0, limit)
      .forEach(x => selected.set(eventId(x.e), x.e));
  };
  for (const metric of metrics) {
    addTop(events, metric, 300);
    for (const cls of classes) addTop(events.filter(e => e.classification === cls), metric, 75);
  }
  return [...selected.values()];
}

// Last time each active team scored 80+, 90+ and 100+ points (2001-present).
// Include today's merged verified finals even if scorigami has not rebuilt yet.
const milestoneSource = new Map();
for (const e of [...historicalGameAll, ...currentGame]) milestoneSource.set(eventId(e), e);
const scoringMilestones = {};
for (const team of teams) {
  const rows = [...milestoneSource.values()]
    .filter(e => norm(e.team) === norm(team.team))
    .sort((a,b) => Date.parse(b.date) - Date.parse(a.date));
  const out = {};
  for (const threshold of [80,90,100]) {
    const hit = rows.find(e => Number(e.teamPoints) >= threshold);
    out[String(threshold)] = hit ? {
      date: hit.date, opponent: hit.opponent, points: hit.teamPoints,
      opponentPoints: hit.opponentPoints, result: hit.result, classification: hit.classification
    } : null;
  }
  scoringMilestones[team.team] = out;
}

const payload = {
  updatedAt: new Date().toISOString(),
  coverage: {
    currentSeason: 2026,
    gameRecordStartYear: 2001,
    quarterHalfStartYear: reportedYears.length ? Math.min(...reportedYears) : null,
    quarterHalfEndYear: reportedYears.length ? Math.max(...reportedYears) : null,
    quarterHalfGames
  },
  current: {
    game: currentGame,
    quarter: currentQuarter,
    half: currentHalf
  },
  records: {
    game: recordCandidates(historicalGameAll, 'game'),
    quarter: recordCandidates(recordQuarterAll, 'quarter'),
    half: recordCandidates(recordHalfAll, 'half')
  },
  milestones: scoringMilestones,
  summary: {
    currentGamePerspectives: currentGame.length,
    currentQuarterPerspectives: currentQuarter.length,
    currentHalfPerspectives: currentHalf.length,
    historicalGameCandidates: historicalGameAll.length,
    reportedQuarterPerspectives: recordQuarterAll.length,
    reportedHalfPerspectives: recordHalfAll.length
  }
};

fs.writeFileSync(OUTPUT, JSON.stringify(payload) + '\n');
console.log('Built ' + OUTPUT, payload.summary, payload.coverage);

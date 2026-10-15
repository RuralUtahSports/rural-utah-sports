import fs from 'node:fs';

const SEASON = 2026;
const GAMES_FILE = 'weekly-simulation.json';
const TEAMS_FILE = 'teams-data.json';
const OOS_FILE = 'rpi-oos-2026.json';
const OFFICIAL_FILE = 'uhsaa-rpi-official-2026.json';
const VERIFIED_FILE = 'verified-finals-2026.json';
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
const verifiedFinals = fs.existsSync(VERIFIED_FILE) ? JSON.parse(fs.readFileSync(VERIFIED_FILE, 'utf8')) : [];
const teamByKey = new Map(teams.map((team) => [alias(team.team), team]));
const memberKeys = new Set(teamByKey.keys());
const eligibleTeams = teams.filter((team) => !INDEPENDENT.has(alias(team.team)));
const gamesByTeam = new Map();
// Preserve all results on the main site. UHSAA RPI excludes non-varsity opponents.
const isNonVarsity = game => /\bJV\b|JUNIOR VARSITY|NON[\s-]?VARSITY/i.test(String(game.awayTeam) + ' ' + String(game.homeTeam))
  || /\bEXHIBITION\b|\bSCRIMMAGE\b/i.test(String(game.status || game.type || ''));
const gameDate = value => {
  const parts = clean(value).split(/[/-]/);
  if (parts.length !== 3) return '';
  const [year, month, day] = parts[0].length === 4 ? parts : [parts[2], parts[0], parts[1]];
  return year + '-' + month.padStart(2, '0') + '-' + day.padStart(2, '0');
};
const matchupKey = game => [alias(game.awayTeam), alias(game.homeTeam)].sort().join('|');
const verifiedGameAudit = { added: 0, filled: 0, excludedNonVarsity: 0, conflictingScores: 0 };
const eligibleSchedule = (weekly.games || []).map(game => ({ ...game }));
for (const verified of Array.isArray(verifiedFinals) ? verifiedFinals : []) {
  if (!gameFinal(verified) || isNonVarsity(verified)) continue;
  const candidates = eligibleSchedule.filter(game => matchupKey(game) === matchupKey(verified));
  const existing = candidates.find(game => gameDate(game.date) === gameDate(verified.date));
  if (existing) {
    const sameOrientation = alias(existing.awayTeam) === alias(verified.awayTeam);
    const away = sameOrientation ? verified.actualAway : verified.actualHome;
    const home = sameOrientation ? verified.actualHome : verified.actualAway;
    if (!gameFinal(existing)) {
      existing.actualAway = away;
      existing.actualHome = home;
      verifiedGameAudit.filled++;
    } else if (Number(existing.actualAway) !== Number(away) || Number(existing.actualHome) !== Number(home)) {
      // Do not overwrite already-entered finals; flag conflicts for manual audit.
      verifiedGameAudit.conflictingScores++;
    }
  } else if (!candidates.length && (memberKeys.has(alias(verified.awayTeam)) || memberKeys.has(alias(verified.homeTeam)))) {
    eligibleSchedule.push({ ...verified });
    verifiedGameAudit.added++;
  }
}

function addGame(team, game) {
  const key = alias(team);
  if (!gamesByTeam.has(key)) gamesByTeam.set(key, []);
  gamesByTeam.get(key).push(game);
}

for (const game of eligibleSchedule) {
  if (!gameFinal(game)) continue;
  if (isNonVarsity(game)) { verifiedGameAudit.excludedNonVarsity++; continue; }
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

// OWP always excludes the actual head-to-head game. For out-of-state
// opponents we can derive that adjustment from their cached W/L record even
// when MaxPreps hasn't supplied an explicit per-Utah-team WP.
function adjustedExternalWp(entry, opponent, versusTeam) {
  const record = entry?.record;
  const wins = number(record?.wins), losses = number(record?.losses);
  const ties = number(record?.ties) ?? 0, total = number(record?.games);
  const played = (gamesByTeam.get(alias(versusTeam)) || [])
    .filter(game => alias(opponentFor(game, versusTeam)) === alias(opponent));
  if (!played.length || [wins, losses, total].some(value => value === null) || total <= played.length) return null;
  let opponentWins = 0, opponentLosses = 0, opponentTies = 0;
  for (const game of played) {
    const result = resultFor(game, versusTeam);
    if (result === 0) opponentWins++;
    else if (result === 1) opponentLosses++;
    else opponentTies++;
  }
  if (wins < opponentWins || losses < opponentLosses || ties < opponentTies) return null;
  return (wins - opponentWins + (ties - opponentTies) * 0.5) / (total - played.length);
}
const uncertainExternalOwp = new Set();
function borderOpponentOwp(entry, opponent) {
  const border = BORDER_STATES.has(clean(entry?.state).toUpperCase());
  if (!entry || !border) return 0.5;
  const cached = number(entry.owp);
  const failed = !!entry.error && (!entry.dataQuality || entry.dataQuality.verified !== true);
  // An extreme OWP from an incomplete/cached MaxPreps scrape can be based
  // on only one or two opponents, not the full schedule. Neutral fallback is
  // an estimate, never a claim to know the official Nevada/Idaho/etc. OWP.
  if (failed && cached !== null && (cached < 0.20 || cached > 0.80)) {
    uncertainExternalOwp.add(clean(opponent));
    return 0.5;
  }
  return cached;
}
function opponentWp(opponent, versusTeam) {
  const opponentKey = alias(opponent);
  if (memberKeys.has(opponentKey)) return wp(opponent, versusTeam);
  const entry = oosEntry(opponent);
  if (!entry) return 0.5;
  const direct = entry.wpByUtahTeam?.[alias(versusTeam)] ?? entry.wpByUtahTeam?.[clean(versusTeam).toUpperCase()];
  return number(direct) ?? adjustedExternalWp(entry, opponent, versusTeam) ?? number(entry.wp) ?? 0.5;
}

function opponentOwp(opponent, versusTeam) {
  const opponentKey = alias(opponent);
  if (!memberKeys.has(opponentKey)) {
    const entry = oosEntry(opponent);
    if (!entry || !BORDER_STATES.has(clean(entry.state).toUpperCase())) return 0.5;
    const fallback = borderOpponentOwp(entry, opponent);
    if (uncertainExternalOwp.has(clean(opponent))) return fallback;
    const direct = entry.owpByUtahTeam?.[alias(versusTeam)] ?? entry.owpByUtahTeam?.[clean(versusTeam).toUpperCase()];
    return number(direct) ?? fallback ?? 0.5;
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
  verifiedGameAudit,
  provisionalOutOfStateOwp: [...uncertainExternalOwp].sort(),
  calibrationNotes: 'Failed external opponent scrapes with extreme historical OWP use a clearly tracked neutral .500 estimate; successful verified sources continue to use their actual OWP.',
  rpiRules: {
    nonVarsityGames: 'Excluded from postseason RPI; retained in historical game results.',
    verifiedFinals: 'Supplement missing finals without overwriting already-entered scoreboard scores.',
  },
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

// A direct comparison to the most recently fetched UHSAA table can be
// misleading after newer games finish. Reconstruct RUS standings using only
// games completed by the official snapshot date for an apples-to-apples check.
if (official?.fetchedAt) {
  const officialDate = new Date(official.fetchedAt);
  if (!Number.isNaN(officialDate.getTime())) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(officialDate)
        .filter(part => part.type !== 'literal')
        .map(part => [part.type, part.value])
    );
    const snapshotDay = [parts.year, parts.month, parts.day].join('-');
    gamesByTeam.clear();
    for (const game of eligibleSchedule) {
      if (!gameFinal(game) || isNonVarsity(game) || gameDate(game.date) > snapshotDay) continue;
      const away = alias(game.awayTeam), home = alias(game.homeTeam);
      if (INDEPENDENT.has(away) || INDEPENDENT.has(home)) continue;
      if (memberKeys.has(away)) addGame(game.awayTeam, game);
      if (memberKeys.has(home)) addGame(game.homeTeam, game);
    }
    const asOfRows = CLASS_ORDER.flatMap(classification =>
      eligibleTeams.map(calculate)
        .filter(row => row.classification === classification)
        .sort((a, b) => b.rpi - a.rpi || b.mwp - a.mwp || a.team.localeCompare(b.team))
        .map((row, index) => ({ ...row, rank: index + 1 }))
    );
    const rows = officialRows().map(row => {
      const rus = asOfRows.find(candidate => alias(candidate.team) === alias(row.team));
      return {
        classification: row.classification,
        team: row.team,
        officialRank: row.rank,
        rusRank: rus?.rank ?? null,
        officialRpi: row.rpi,
        rusRpi: rus?.rpi ?? null,
        rankDifference: rus ? rus.rank - row.rank : null,
        rpiDifference: rus ? rus.rpi - row.rpi : null,
        officialRecord: row.record,
        rusRecord: rus?.record ?? null,
      };
    });
    payload.snapshotComparison = {
      officialFetchedAt: official.fetchedAt,
      asOfUtahDate: snapshotDay,
      note: 'Date-aligned historical back-test only. Current RUS standings may include newer games and out-of-state records.',
      teamsCompared: rows.length,
      exactRankMatches: rows.filter(row => row.officialRank === row.rusRank).length,
      recordMatches: rows.filter(row => row.officialRecord === row.rusRecord).length,
      meanAbsoluteRpiDifference: average(rows.map(row => Math.abs(row.rpiDifference)).filter(Number.isFinite)),
      mismatches: rows.filter(row => row.officialRank !== row.rusRank),
    };
  }
}

fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Built ${calculatedRows.length} RPI standings rows.`);
if (payload.comparison) {
  console.log(`Compared ${payload.comparison.teamsCompared} teams: ${payload.comparison.exactRankMatches} exact ranks, ${payload.comparison.recordMatches} matching records, ${payload.comparison.withinOneThousandth} RPI values within .001.`);
}

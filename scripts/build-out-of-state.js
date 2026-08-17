const fs = require('fs');

const SHEET_ID = process.env.SHEET_ID;
const OOS_GID = process.env.OOS_GID;
const SIM_FILE = process.env.SIM_FILE || 'weekly-simulation.json';
const OUT_FILE = process.env.OUT_FILE || 'out-of-state.json';

if (!SHEET_ID || !OOS_GID) {
  console.error('SHEET_ID and OOS_GID are required.');
  process.exit(1);
}

const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${OOS_GID}&range=${encodeURIComponent('A1:I5000')}`;

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else {
      if (c === '"') quoted = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

const clean = v => String(v ?? '').trim();
const norm = v => clean(v).replace(/\s+/g, ' ').toUpperCase();
const num = v => {
  if (v === null || v === undefined || clean(v) === '') return null;
  const n = Number(clean(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

const aliases = {
  'GUNNISON': 'GUNNISON VALLEY',
  'MAPLE MTN': 'MAPLE MOUNTAIN',
  'MONUMENT VAL': 'MONUMENT VALLEY',
  'CEDAR': 'CEDAR CITY',
  'SUMMIT': 'SUMMIT ACADEMY',
  'WASATCH ACAD': 'WASATCH ACADEMY',
  'WASATCH ACAD.': 'WASATCH ACADEMY'
};
function canonical(v) {
  const n = norm(v).replace(/\.+$/, '').trim();
  if (n.startsWith('WASATCH ACAD')) return 'WASATCH ACADEMY';
  return aliases[n] || n;
}

const stateNames = {
  AK:'Alaska', AL:'Alabama', AR:'Arkansas', AZ:'Arizona', CA:'California', CO:'Colorado', CT:'Connecticut', DE:'Delaware', FL:'Florida', GA:'Georgia', HI:'Hawaii', IA:'Iowa', ID:'Idaho', IL:'Illinois', IN:'Indiana', KS:'Kansas', KY:'Kentucky', LA:'Louisiana', MA:'Massachusetts', MD:'Maryland', ME:'Maine', MI:'Michigan', MN:'Minnesota', MO:'Missouri', MS:'Mississippi', MT:'Montana', NC:'North Carolina', ND:'North Dakota', NE:'Nebraska', NH:'New Hampshire', NJ:'New Jersey', NM:'New Mexico', NV:'Nevada', NY:'New York', OH:'Ohio', OK:'Oklahoma', OR:'Oregon', PA:'Pennsylvania', RI:'Rhode Island', SC:'South Carolina', SD:'South Dakota', TN:'Tennessee', TX:'Texas', VA:'Virginia', VT:'Vermont', WA:'Washington', WI:'Wisconsin', WV:'West Virginia', WY:'Wyoming', DC:'District of Columbia', AS:'American Samoa'
};
const stateCodes = new Set(Object.keys(stateNames));

function outOfStateInfo(name) {
  const raw = clean(name).replace(/\s+/g, ' ');
  const upper = raw.toUpperCase();
  if (/,[ ]*AMERICAN SAMOA$/.test(upper)) {
    return { state: 'AS', opponent: raw.replace(/,[ ]*AMERICAN SAMOA$/i, '').trim() };
  }
  const match = upper.match(/,[ ]*([A-Z]{2})$/);
  if (!match || !stateCodes.has(match[1]) || match[1] === 'UT') return null;
  return { state: match[1], opponent: raw.replace(/,[ ]*[A-Z]{2}$/i, '').trim() };
}

function gameResult(pf, pa) { return pf > pa ? 'W' : pf < pa ? 'L' : 'T'; }
function makeGame(team, year, date, opponent, state, pf, pa) {
  return {
    team: canonical(team),
    year: Number(year),
    date: clean(date),
    opponent: clean(opponent).replace(/\s+/g, ' ').trim(),
    state,
    stateName: stateNames[state] || state,
    pf: Number(pf),
    pa: Number(pa),
    result: gameResult(Number(pf), Number(pa)),
    margin: Number(pf) - Number(pa)
  };
}

function rec() { return { wins:0, losses:0, ties:0, games:0, pointsFor:0, pointsAgainst:0 }; }
function add(r, g) {
  r.games++; r.pointsFor += g.pf; r.pointsAgainst += g.pa;
  if (g.result === 'W') r.wins++;
  else if (g.result === 'L') r.losses++;
  else r.ties++;
}
function finish(r) {
  return {
    ...r,
    winPct: r.games ? (r.wins + r.ties * 0.5) / r.games : 0,
    avgMargin: r.games ? (r.pointsFor - r.pointsAgainst) / r.games : 0
  };
}

function readPreviousGames() {
  try {
    if (!fs.existsSync(OUT_FILE)) return [];
    const parsed = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
    return Array.isArray(parsed.games) ? parsed.games : [];
  } catch (err) {
    console.warn(`Could not read previous ${OUT_FILE}: ${err.message}`);
    return [];
  }
}

function readLiveGames() {
  try {
    if (!fs.existsSync(SIM_FILE)) {
      console.warn(`${SIM_FILE} not found; using Sheet plus previously generated newer seasons.`);
      return [];
    }
    const parsed = JSON.parse(fs.readFileSync(SIM_FILE, 'utf8'));
    const rows = Array.isArray(parsed.games) ? parsed.games : [];
    const out = [];
    for (const g of rows) {
      const awayActual = num(g.actualAway), homeActual = num(g.actualHome);
      if (awayActual === null || homeActual === null) continue;
      const awayOos = outOfStateInfo(g.awayTeam), homeOos = outOfStateInfo(g.homeTeam);
      if (!!awayOos === !!homeOos) continue;
      const date = clean(g.date);
      const yearMatch = date.match(/(19|20)\d{2}$/);
      if (!yearMatch) continue;
      const year = Number(yearMatch[0]);
      if (awayOos) out.push(makeGame(g.homeTeam, year, date, awayOos.opponent, awayOos.state, homeActual, awayActual));
      else out.push(makeGame(g.awayTeam, year, date, homeOos.opponent, homeOos.state, awayActual, homeActual));
    }
    return out;
  } catch (err) {
    console.warn(`Could not read live games from ${SIM_FILE}: ${err.message}`);
    return [];
  }
}

(async () => {
  const res = await fetch(sheetUrl);
  if (!res.ok) throw new Error(`Sheet download failed ${res.status}`);
  const rows = parseCSV(await res.text());

  const sheetGames = [];
  let sheetSourceRows = 0;
  for (const r of rows.slice(1)) {
    const team = canonical(r[0]), year = num(r[1]), date = clean(r[2]);
    const opponent = clean(r[3]).replace(/\s+/g, ' ').trim(), state = norm(r[4]);
    const pf = num(r[5]), pa = num(r[6]);
    if (!team || !year || !date || !opponent || !state || pf === null || pa === null) continue;
    sheetSourceRows++;
    sheetGames.push(makeGame(team, year, date, opponent, state, pf, pa));
  }

  const sheetMaxYear = sheetGames.reduce((m, g) => Math.max(m, g.year), 0);
  const liveGames = readLiveGames();
  const liveYears = new Set(liveGames.map(g => g.year));
  const previousGames = readPreviousGames();

  // Preserve seasons newer than the helper Sheet so they cannot disappear when the
  // Sheet lags behind. If the live feed contains that season, rebuild it from live
  // completed results so score corrections replace stale generated data.
  const carriedGames = previousGames.filter(g => Number(g.year) > sheetMaxYear && !liveYears.has(Number(g.year)));

  const games = [];
  const exactIndex = new Map();
  const semanticSeen = new Set();
  let duplicatesRemoved = 0, conflicts = 0;

  function addGame(g, prefer = false) {
    const exactKey = `${g.date}|${g.team}|${canonical(g.opponent)}|${g.state}`;
    const semanticKey = `${g.year}|${g.team}|${canonical(g.opponent)}|${g.state}|${g.pf}|${g.pa}`;
    if (semanticSeen.has(semanticKey)) { duplicatesRemoved++; return; }
    if (exactIndex.has(exactKey)) {
      const idx = exactIndex.get(exactKey), old = games[idx];
      if (old.pf === g.pf && old.pa === g.pa) { duplicatesRemoved++; return; }
      conflicts++;
      if (!prefer) return;
      semanticSeen.delete(`${old.year}|${old.team}|${canonical(old.opponent)}|${old.state}|${old.pf}|${old.pa}`);
      games[idx] = g;
      semanticSeen.add(semanticKey);
      return;
    }
    exactIndex.set(exactKey, games.length);
    semanticSeen.add(semanticKey);
    games.push(g);
  }

  sheetGames.forEach(g => addGame(g));
  carriedGames.forEach(g => addGame(makeGame(g.team, g.year, g.date, g.opponent, g.state, g.pf, g.pa)));
  liveGames.forEach(g => addGame(g, true));

  games.sort((a,b) => b.year - a.year || Date.parse(b.date) - Date.parse(a.date) || a.team.localeCompare(b.team));

  const byState = {}, byYear = {}, byTeamState = {};
  for (const g of games) {
    if (!byState[g.state]) byState[g.state] = rec(); add(byState[g.state], g);
    if (!byYear[g.year]) byYear[g.year] = rec(); add(byYear[g.year], g);
    const k = `${g.team}|${g.state}`; if (!byTeamState[k]) byTeamState[k] = rec(); add(byTeamState[k], g);
  }

  const stateRecords = Object.entries(byState).map(([state,r]) => ({state,stateName:stateNames[state]||state,...finish(r)})).sort((a,b)=>b.games-a.games||b.winPct-a.winPct||a.state.localeCompare(b.state));
  const yearlyRecords = Object.entries(byYear).map(([year,r]) => ({year:Number(year),...finish(r)})).sort((a,b)=>b.year-a.year);
  const teamStateRecords = Object.entries(byTeamState).map(([k,r]) => { const [team,state] = k.split('|'); return {team,state,stateName:stateNames[state]||state,...finish(r)}; }).sort((a,b)=>a.team.localeCompare(b.team)||a.state.localeCompare(b.state));
  const teams = [...new Set(games.map(g=>g.team))].sort();
  const states = stateRecords.map(r=>({state:r.state,stateName:r.stateName})).sort((a,b)=>a.stateName.localeCompare(b.stateName));
  const totals = finish(games.reduce((r,g)=>(add(r,g),r),rec()));
  const sourceRows = sheetSourceRows + carriedGames.length + liveGames.length;

  const payload = {
    summary: {
      sourceRows,
      sheetSourceRows,
      liveSourceRows: liveGames.length,
      carriedForwardRows: carriedGames.length,
      sheetMaxYear,
      uniqueGames: games.length,
      duplicatesRemoved,
      conflicts,
      ...totals
    },
    states, teams, stateRecords, yearlyRecords, teamStateRecords, games
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(payload));
  const newestYear = yearlyRecords.length ? yearlyRecords[0].year : 'none';
  console.log(`Out-of-state rows: ${sourceRows}; unique: ${games.length}; latest season: ${newestYear}; live rows: ${liveGames.length}; duplicates removed: ${duplicatesRemoved}`);
  if (!games.length) throw new Error('No out-of-state games generated');
})().catch(err => { console.error(err); process.exit(1); });

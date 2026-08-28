const fs = require('fs');

const SHEET_ID = process.env.SHEET_ID;
const OOS_GID = process.env.OOS_GID;
const SIM_FILE = process.env.SIM_FILE || 'weekly-simulation.json';
const OUT_FILE = process.env.OUT_FILE || 'out-of-state.json';
const LIVE_FILE = process.env.LIVE_FILE || 'out-of-state-live.json';
if (!SHEET_ID || !OOS_GID) throw new Error('SHEET_ID and OOS_GID are required');

const clean = v => String(v ?? '').trim();
const norm = v => clean(v).replace(/\s+/g, ' ').toUpperCase();
const num = v => {
  if (v === null || v === undefined || clean(v) === '') return null;
  const n = Number(clean(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};
const aliases = {
  GUNNISON:'GUNNISON VALLEY','MAPLE MTN':'MAPLE MOUNTAIN','MONUMENT VAL':'MONUMENT VALLEY',
  CEDAR:'CEDAR CITY',SUMMIT:'SUMMIT ACADEMY','WASATCH ACAD':'WASATCH ACADEMY','WASATCH ACAD.':'WASATCH ACADEMY'
};
function canonical(v) {
  const n = norm(v).replace(/\.+$/, '').trim();
  return n.startsWith('WASATCH ACAD') ? 'WASATCH ACADEMY' : (aliases[n] || n);
}

const stateNames = {
  AK:'Alaska',AL:'Alabama',AR:'Arkansas',AZ:'Arizona',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',IA:'Iowa',ID:'Idaho',IL:'Illinois',IN:'Indiana',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',MA:'Massachusetts',MD:'Maryland',ME:'Maine',MI:'Michigan',MN:'Minnesota',MO:'Missouri',MS:'Mississippi',MT:'Montana',NC:'North Carolina',ND:'North Dakota',NE:'Nebraska',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NV:'Nevada',NY:'New York',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',VA:'Virginia',VT:'Vermont',WA:'Washington',WI:'Wisconsin',WV:'West Virginia',WY:'Wyoming',DC:'District of Columbia',AS:'American Samoa'
};
const stateCodes = new Set(Object.keys(stateNames));

function parseCSV(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

function oosInfo(name) {
  const raw = clean(name).replace(/\s+/g, ' '), upper = raw.toUpperCase();
  if (/,[ ]*AMERICAN SAMOA$/.test(upper)) return {state:'AS', opponent:raw.replace(/,[ ]*AMERICAN SAMOA$/i, '').trim()};
  const m = upper.match(/,[ ]*([A-Z]{2})$/);
  if (!m || !stateCodes.has(m[1]) || m[1] === 'UT') return null;
  return {state:m[1], opponent:raw.replace(/,[ ]*[A-Z]{2}$/i, '').trim()};
}
function makeGame(team, year, date, opponent, state, pf, pa) {
  pf = Number(pf); pa = Number(pa);
  return {
    team:canonical(team), year:Number(year), date:clean(date), opponent:clean(opponent).replace(/\s+/g, ' ').trim(),
    state, stateName:stateNames[state] || state, pf, pa, result:pf > pa ? 'W' : pf < pa ? 'L' : 'T', margin:pf - pa
  };
}
function readJson(path, fallback) {
  try { return fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, 'utf8')) : fallback; }
  catch (e) { console.warn(`Could not read ${path}: ${e.message}`); return fallback; }
}
function liveGames() {
  const rows = readJson(SIM_FILE, {games:[]}).games || [], out = [];
  for (const g of rows) {
    const as = num(g.actualAway), hs = num(g.actualHome);
    if (as === null || hs === null) continue;
    const away = oosInfo(g.awayTeam), home = oosInfo(g.homeTeam);
    if (!!away === !!home) continue;
    const date = clean(g.date), ym = date.match(/(19|20)\d{2}$/);
    if (!ym) continue;
    if (away) out.push(makeGame(g.homeTeam, ym[0], date, away.opponent, away.state, hs, as));
    else out.push(makeGame(g.awayTeam, ym[0], date, home.opponent, home.state, as, hs));
  }
  return out;
}
function dayNumber(date) {
  const m = clean(date).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2])) / 86400000;
  const t = Date.parse(date); return Number.isFinite(t) ? Math.floor(t / 86400000) : null;
}
function nearbySameScore(a, b) {
  if (a.year !== b.year || a.team !== b.team || canonical(a.opponent) !== canonical(b.opponent) || a.state !== b.state || a.pf !== b.pf || a.pa !== b.pa) return false;
  const da = dayNumber(a.date), db = dayNumber(b.date);
  return da !== null && db !== null && Math.abs(da - db) <= 7;
}
function rec() { return {wins:0,losses:0,ties:0,games:0,pointsFor:0,pointsAgainst:0}; }
function add(r,g) { r.games++; r.pointsFor += g.pf; r.pointsAgainst += g.pa; if (g.result === 'W') r.wins++; else if (g.result === 'L') r.losses++; else r.ties++; }
function finish(r) { return {...r,winPct:r.games?(r.wins+r.ties*.5)/r.games:0,avgMargin:r.games?(r.pointsFor-r.pointsAgainst)/r.games:0}; }

(async () => {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${OOS_GID}&range=${encodeURIComponent('A1:I5000')}`;
  const res = await fetch(url); if (!res.ok) throw new Error(`Sheet download failed ${res.status}`);
  const rows = parseCSV(await res.text());
  const sheetGames = []; let sheetSourceRows = 0;
  for (const r of rows.slice(1)) {
    const team = canonical(r[0]), year = num(r[1]), date = clean(r[2]), opponent = clean(r[3]).replace(/\s+/g,' ').trim();
    const state = norm(r[4]), pf = num(r[5]), pa = num(r[6]);
    if (!team || !year || !date || !opponent || !state || pf === null || pa === null) continue;
    sheetSourceRows++; sheetGames.push(makeGame(team, year, date, opponent, state, pf, pa));
  }

  const sheetMaxYear = sheetGames.reduce((m,g)=>Math.max(m,g.year),0);
  const current = liveGames(), liveYears = new Set(current.map(g=>g.year));
  const prior = readJson(OUT_FILE, {games:[]}).games || [];
  const carried = prior.filter(g=>Number(g.year)>sheetMaxYear && !liveYears.has(Number(g.year)));

  const games = [], exact = new Map(); let duplicatesRemoved = 0, conflicts = 0;
  function push(g, source) {
    const key = `${g.date}|${g.team}|${canonical(g.opponent)}|${g.state}`;
    if (exact.has(key)) {
      const i = exact.get(key), old = games[i];
      if (old.pf === g.pf && old.pa === g.pa) { duplicatesRemoved++; return; }
      conflicts++;
      if (source !== 'live') return;
      games[i] = g; return;
    }
    // Only use fuzzy date matching for live-vs-existing merges. Never collapse two
    // historical Sheet rows just because the same teams happened to repeat a score.
    if (source === 'live' && games.some(old=>nearbySameScore(old,g))) { duplicatesRemoved++; return; }
    exact.set(key, games.length); games.push(g);
  }
  sheetGames.forEach(g=>push(g,'sheet'));
  carried.forEach(g=>push(makeGame(g.team,g.year,g.date,g.opponent,g.state,g.pf,g.pa),'carried'));
  current.forEach(g=>push(g,'live'));
  games.sort((a,b)=>b.year-a.year||Date.parse(b.date)-Date.parse(a.date)||a.team.localeCompare(b.team));

  const byState={}, byYear={}, byTeamState={};
  for (const g of games) {
    if (!byState[g.state]) byState[g.state]=rec(); add(byState[g.state],g);
    if (!byYear[g.year]) byYear[g.year]=rec(); add(byYear[g.year],g);
    const k=`${g.team}|${g.state}`; if (!byTeamState[k]) byTeamState[k]=rec(); add(byTeamState[k],g);
  }
  const stateRecords=Object.entries(byState).map(([state,r])=>({state,stateName:stateNames[state]||state,...finish(r)})).sort((a,b)=>b.games-a.games||b.winPct-a.winPct||a.state.localeCompare(b.state));
  const yearlyRecords=Object.entries(byYear).map(([year,r])=>({year:Number(year),...finish(r)})).sort((a,b)=>b.year-a.year);
  const teamStateRecords=Object.entries(byTeamState).map(([k,r])=>{const [team,state]=k.split('|');return{team,state,stateName:stateNames[state]||state,...finish(r)}}).sort((a,b)=>a.team.localeCompare(b.team)||a.state.localeCompare(b.state));
  const teams=[...new Set(games.map(g=>g.team))].sort();
  const states=stateRecords.map(r=>({state:r.state,stateName:r.stateName})).sort((a,b)=>a.stateName.localeCompare(b.stateName));
  const totals=finish(games.reduce((r,g)=>(add(r,g),r),rec()));
  const sourceRows=sheetSourceRows+carried.length+current.length;
  const payload={summary:{sourceRows,sheetSourceRows,liveSourceRows:current.length,carriedForwardRows:carried.length,sheetMaxYear,uniqueGames:games.length,duplicatesRemoved,conflicts,...totals},states,teams,stateRecords,yearlyRecords,teamStateRecords,games};
  fs.writeFileSync(OUT_FILE,JSON.stringify(payload));
  fs.writeFileSync(LIVE_FILE,JSON.stringify({games:games.filter(g=>Number(g.year)===2026)}));
  console.log(`Out-of-state rows: ${sourceRows}; unique: ${games.length}; latest season: ${yearlyRecords[0]?.year ?? 'none'}; live rows: ${current.length}; duplicates removed: ${duplicatesRemoved}`);
  if (!games.length) throw new Error('No out-of-state games generated');
})().catch(e=>{console.error(e);process.exit(1)});

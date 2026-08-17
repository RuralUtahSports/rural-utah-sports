import fs from 'node:fs';
import path from 'node:path';

const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ');
const aliases = {
  'GUNNISON': 'GUNNISON VALLEY',
  'MAPLE MTN': 'MAPLE MOUNTAIN',
  'MONUMENT VAL': 'MONUMENT VALLEY',
  'CEDAR': 'CEDAR CITY',
  'SUMMIT': 'SUMMIT ACADEMY',
  'WASATCH ACAD': 'WASATCH ACADEMY',
  'HINKLEY': 'HINCKLEY',
  'BY HIGH': 'BYH',
  'BRIGHAM YOUNG': 'BYH',
  'FREMOND': 'FREMONT'
};

const canonical = value => {
  const key = clean(value).toUpperCase().replace(/\.+$/, '').trim();
  if (key.startsWith('WASATCH ACAD')) return 'WASATCH ACADEMY';
  return aliases[key] || key;
};

const slug = value => canonical(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const resultFor = game => {
  const a = Number(game?.teamScore);
  const b = Number(game?.opponentScore);
  if (Number.isFinite(a) && Number.isFinite(b)) return a > b ? 'W' : a < b ? 'L' : 'T';
  const result = clean(game?.result).toUpperCase();
  return ['W', 'L', 'T'].includes(result) ? result : '';
};

const dateInfo = value => {
  const s = clean(value);
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return { year: Number(m[3]), ms: Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2])) };
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return { year: Number(m[1]), ms: Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) };
  return null;
};

const mergeGame = (keep, dropped) => {
  const keepNotes = clean(keep?.notes);
  const dropNotes = clean(dropped?.notes);
  if (dropNotes.length > keepNotes.length) keep.notes = dropped.notes;
  if (keep.playoff || dropped.playoff) keep.playoff = true;
  for (const [key, value] of Object.entries(dropped || {})) {
    if ((keep[key] === undefined || keep[key] === null || keep[key] === '') && value !== undefined && value !== null && value !== '') {
      keep[key] = value;
    }
  }
};

let removedExact = 0;
let removedNearDate = 0;
let normalizedOpponents = 0;
const affectedTeams = new Set();

function sanitizeScheduleSet(teamName, schedules) {
  const team = canonical(teamName);
  const output = {};
  let changed = false;

  for (const [season, rawGames] of Object.entries(schedules || {})) {
    if (!Array.isArray(rawGames)) {
      output[season] = rawGames;
      continue;
    }

    const firstPass = [];
    const exact = new Map();

    for (const sourceGame of rawGames) {
      const game = { ...sourceGame };
      const date = clean(game.date);
      const opponent = canonical(game.opponent);
      const result = resultFor(game);

      if (opponent && clean(game.opponent) !== opponent) {
        game.opponent = opponent;
        normalizedOpponents++;
        changed = true;
      }

      if (!date || !opponent) {
        firstPass.push(game);
        continue;
      }

      const scoreSig = `${game.teamScore ?? ''}|${game.opponentScore ?? ''}|${result}`;
      const exactKey = `${date}|${opponent}|${scoreSig}`;
      if (exact.has(exactKey)) {
        mergeGame(firstPass[exact.get(exactKey)], game);
        removedExact++;
        affectedTeams.add(team);
        changed = true;
        continue;
      }

      exact.set(exactKey, firstPass.length);
      firstPass.push(game);
    }

    const ordered = firstPass
      .map((game, index) => ({ game, index, d: dateInfo(game.date) }))
      .filter(item => item.d)
      .sort((a, b) => a.d.ms - b.d.ms || a.index - b.index);

    const drop = new Set();
    const lastBySignature = new Map();

    for (const item of ordered) {
      const game = item.game;
      const opponent = canonical(game.opponent);
      const result = resultFor(game);
      const signature = `${opponent}|${game.teamScore ?? ''}|${game.opponentScore ?? ''}|${result}`;
      const prior = lastBySignature.get(signature);

      if (prior && item.d.ms > prior.d.ms) {
        const days = (item.d.ms - prior.d.ms) / 86400000;
        // Same opponent, same final score and same result inside one week is treated
        // as a shifted-date duplicate. This catches source rows whose date was copied
        // from the neighboring week while preserving normal rematches with new scores.
        if (days <= 7) {
          mergeGame(firstPass[prior.index], game);
          drop.add(item.index);
          removedNearDate++;
          affectedTeams.add(team);
          changed = true;
          continue;
        }
      }

      lastBySignature.set(signature, item);
    }

    output[season] = firstPass.filter((_, index) => !drop.has(index));
  }

  return { schedules: output, changed };
}

const emptyRecord = () => ({ wins: 0, losses: 0, ties: 0, games: 0 });
const addResult = (record, result) => {
  record.games++;
  if (result === 'W') record.wins++;
  else if (result === 'L') record.losses++;
  else if (result === 'T') record.ties++;
};

function breakdownFor(schedules) {
  const decades = {};
  const opponents = {};

  for (const [season, games] of Object.entries(schedules || {})) {
    if (!Array.isArray(games)) continue;
    for (const game of games) {
      const opponent = canonical(game.opponent);
      const result = resultFor(game);
      if (!opponent || !result) continue;

      if (!opponents[opponent]) opponents[opponent] = emptyRecord();
      addResult(opponents[opponent], result);

      const year = dateInfo(game.date)?.year ?? Number(season);
      if (Number.isFinite(year)) {
        const decade = String(Math.floor(year / 10) * 10);
        if (!decades[decade]) decades[decade] = emptyRecord();
        addResult(decades[decade], result);
      }
    }
  }

  return { decades, opponents };
}

function statsForGames(games) {
  let wins = 0;
  let losses = 0;
  let ties = 0;
  let pointsFor = 0;
  let pointsAgainst = 0;
  let counted = 0;

  for (const game of games || []) {
    const result = resultFor(game);
    if (!result) continue;
    counted++;
    if (result === 'W') wins++;
    else if (result === 'L') losses++;
    else ties++;

    const pf = Number(game.teamScore);
    const pa = Number(game.opponentScore);
    if (Number.isFinite(pf)) pointsFor += pf;
    if (Number.isFinite(pa)) pointsAgainst += pa;
  }

  return {
    wins,
    losses,
    ties,
    games: counted,
    winPct: counted ? (wins + 0.5 * ties) / counted : 0,
    pointsFor,
    pointsAgainst,
    ppg: counted ? pointsFor / counted : 0,
    papg: counted ? pointsAgainst / counted : 0,
    avgMargin: counted ? (pointsFor - pointsAgainst) / counted : 0
  };
}

function syncSeasonRows(rows, schedules) {
  if (!Array.isArray(rows)) return false;
  let changed = false;
  const byYear = new Map(rows.map(row => [String(row?.year), row]));

  for (const [year, games] of Object.entries(schedules || {})) {
    if (!Array.isArray(games) || !games.length) continue;
    const row = byYear.get(String(year));
    if (!row) continue;
    const stats = statsForGames(games);
    for (const [key, value] of Object.entries(stats)) {
      if (row[key] !== value) {
        row[key] = value;
        changed = true;
      }
    }
  }

  return changed;
}

if (!fs.existsSync('team-schedules.json')) throw new Error('team-schedules.json not found');
if (!fs.existsSync('team-page-data')) throw new Error('team-page-data directory not found');

const teamsData = fs.existsSync('teams-data.json') ? JSON.parse(fs.readFileSync('teams-data.json', 'utf8')) : [];
const slugToTeam = new Map(teamsData.map(row => [slug(row.team), canonical(row.team)]));

const globalSchedules = JSON.parse(fs.readFileSync('team-schedules.json', 'utf8'));
let globalChanged = false;
for (const [team, schedules] of Object.entries(globalSchedules)) {
  const cleaned = sanitizeScheduleSet(team, schedules);
  if (cleaned.changed) globalChanged = true;
  globalSchedules[team] = cleaned.schedules;
}

if (globalChanged) fs.writeFileSync('team-schedules.json', JSON.stringify(globalSchedules) + '\n');

const rebuiltBreakdowns = {};
for (const [team, schedules] of Object.entries(globalSchedules)) rebuiltBreakdowns[team] = breakdownFor(schedules);
fs.writeFileSync('team-record-breakdowns.json', JSON.stringify(rebuiltBreakdowns) + '\n');

if (fs.existsSync('season-history.json')) {
  const seasonHistory = JSON.parse(fs.readFileSync('season-history.json', 'utf8'));
  let seasonHistoryChanged = false;
  for (const [team, schedules] of Object.entries(globalSchedules)) {
    const key = Object.keys(seasonHistory).find(name => canonical(name) === canonical(team));
    if (!key) continue;
    if (syncSeasonRows(seasonHistory[key], schedules)) seasonHistoryChanged = true;
  }
  if (seasonHistoryChanged) fs.writeFileSync('season-history.json', JSON.stringify(seasonHistory) + '\n');
}

let pageFilesChanged = 0;
for (const file of fs.readdirSync('team-page-data').filter(name => name.endsWith('.json'))) {
  const fullPath = path.join('team-page-data', file);
  const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const pageSlug = file.replace(/\.json$/i, '');
  const team = slugToTeam.get(pageSlug) || canonical(pageSlug.replace(/-/g, ' '));
  const schedules = globalSchedules[team];
  if (!schedules) continue;

  let changed = false;
  if (JSON.stringify(data.schedules || {}) !== JSON.stringify(schedules)) {
    data.schedules = schedules;
    changed = true;
  }

  const breakdown = rebuiltBreakdowns[team] || breakdownFor(schedules);
  if (JSON.stringify(data.breakdown || {}) !== JSON.stringify(breakdown)) {
    data.breakdown = breakdown;
    changed = true;
  }

  if (syncSeasonRows(data.seasonHistory, schedules)) changed = true;

  if (changed) {
    fs.writeFileSync(fullPath, JSON.stringify(data) + '\n');
    pageFilesChanged++;
  }
}

console.log(`Schedule sanitizer complete.`);
console.log(`Exact duplicate rows removed: ${removedExact}`);
console.log(`Shifted-date duplicate rows removed: ${removedNearDate}`);
console.log(`Opponent names normalized: ${normalizedOpponents}`);
console.log(`Teams affected by duplicate removal: ${affectedTeams.size}`);
console.log(`Team-page files changed: ${pageFilesChanged}`);
if (affectedTeams.size) console.log(`Affected teams: ${[...affectedTeams].sort().join(', ')}`);

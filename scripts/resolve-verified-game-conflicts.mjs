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
  'BRIGHAM YOUNG': 'BYH'
};
const canonical = value => {
  const key = clean(value).toUpperCase().replace(/\.+$/, '').trim();
  if (key.startsWith('WASATCH ACAD')) return 'WASATCH ACADEMY';
  return aliases[key] || key;
};
const slug = value => canonical(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// These are the WRONG score versions from same-date conflicts found by the
// site-wide duplicate audit. Each game was verified against published results.
// Only the bad score signature is removed; the verified game remains.
const badScores = new Set([
  'ALTAMONT|10/10/2003|RICH|48|6',
  'RICH|10/10/2003|ALTAMONT|6|48',

  'JUAB|9/21/2001|GUNNISON VALLEY|14|19',
  'GUNNISON VALLEY|9/21/2001|JUAB|19|14',

  'GUNNISON VALLEY|8/28/1998|NORTH SEVIER|30|13',
  'NORTH SEVIER|8/28/1998|GUNNISON VALLEY|13|30',

  'GUNNISON VALLEY|9/7/2001|KANAB|16|20',
  'KANAB|9/7/2001|GUNNISON VALLEY|20|16',

  'GUNNISON VALLEY|10/18/2001|MANTI|39|12',
  'MANTI|10/18/2001|GUNNISON VALLEY|12|39',

  'GUNNISON VALLEY|9/2/2005|RICHFIELD|27|7',
  'RICHFIELD|9/2/2005|GUNNISON VALLEY|7|27',

  'GUNNISON VALLEY|9/12/2014|LAYTON CHRISTIAN|20|47',
  'LAYTON CHRISTIAN|9/12/2014|GUNNISON VALLEY|47|20',

  'GUNNISON VALLEY|10/18/2024|MILLARD|41|6',
  'MILLARD|10/18/2024|GUNNISON VALLEY|6|41',

  'ENTERPRISE|10/31/2008|RICH|21|46',
  'RICH|10/31/2008|ENTERPRISE|46|21',

  'MONTICELLO|9/30/2022|MONUMENT VALLEY|41|20',
  'MONUMENT VALLEY|9/30/2022|MONTICELLO|20|41'
]);

const scoreKey = (team, game) => `${canonical(team)}|${clean(game?.date)}|${canonical(game?.opponent)}|${game?.teamScore ?? ''}|${game?.opponentScore ?? ''}`;
const resultFor = game => {
  const a = Number(game?.teamScore), b = Number(game?.opponentScore);
  if (Number.isFinite(a) && Number.isFinite(b)) return a > b ? 'W' : a < b ? 'L' : 'T';
  const result = clean(game?.result).toUpperCase();
  return ['W', 'L', 'T'].includes(result) ? result : '';
};
const dateYear = value => {
  const m = clean(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? Number(m[3]) : null;
};
const emptyRecord = () => ({wins:0, losses:0, ties:0, games:0});
const addResult = (record, result) => {
  record.games++;
  if (result === 'W') record.wins++;
  else if (result === 'L') record.losses++;
  else if (result === 'T') record.ties++;
};

function removeBadScores(team, schedules) {
  let removed = 0;
  const output = {};
  for (const [season, games] of Object.entries(schedules || {})) {
    if (!Array.isArray(games)) { output[season] = games; continue; }
    output[season] = games.filter(game => {
      if (!badScores.has(scoreKey(team, game))) return true;
      removed++;
      return false;
    });
  }
  return {schedules:output, removed};
}

function breakdownFor(schedules) {
  const decades = {}, opponents = {};
  for (const [season, games] of Object.entries(schedules || {})) {
    if (!Array.isArray(games)) continue;
    for (const game of games) {
      const opponent = canonical(game?.opponent), result = resultFor(game);
      if (!opponent || !result) continue;
      if (!opponents[opponent]) opponents[opponent] = emptyRecord();
      addResult(opponents[opponent], result);
      const year = dateYear(game?.date) ?? Number(season);
      if (Number.isFinite(year)) {
        const decade = String(Math.floor(year / 10) * 10);
        if (!decades[decade]) decades[decade] = emptyRecord();
        addResult(decades[decade], result);
      }
    }
  }
  return {decades, opponents};
}

function seasonTotals(schedules) {
  const totals = {};
  for (const [season, games] of Object.entries(schedules || {})) {
    if (!Array.isArray(games) || !games.length) continue;
    let wins=0, losses=0, ties=0, count=0, pointsFor=0, pointsAgainst=0;
    for (const game of games) {
      const result = resultFor(game);
      if (!result) continue;
      count++;
      if (result === 'W') wins++;
      else if (result === 'L') losses++;
      else ties++;
      const pf = Number(game?.teamScore), pa = Number(game?.opponentScore);
      if (Number.isFinite(pf)) pointsFor += pf;
      if (Number.isFinite(pa)) pointsAgainst += pa;
    }
    if (!count) continue;
    totals[Number(season)] = {
      wins, losses, ties, games:count,
      winPct:(wins + ties * 0.5) / count,
      pointsFor, pointsAgainst,
      ppg:pointsFor / count,
      papg:pointsAgainst / count,
      avgMargin:(pointsFor - pointsAgainst) / count
    };
  }
  return totals;
}

function patchSeasonRows(rows, totals) {
  if (!Array.isArray(rows)) return false;
  let changed = false;
  for (const row of rows) {
    const year = Number(row?.year);
    const next = totals[year];
    if (!next) continue;
    for (const [key, value] of Object.entries(next)) {
      if (row[key] !== value) {
        row[key] = value;
        changed = true;
      }
    }
  }
  return changed;
}

const teams = JSON.parse(fs.readFileSync('teams-data.json', 'utf8'));
const slugToTeam = new Map(teams.map(row => [slug(row.team), canonical(row.team)]));
const globalSchedules = JSON.parse(fs.readFileSync('team-schedules.json', 'utf8'));
const rebuiltBreakdowns = {};
const totalsByTeam = {};
let globalRemoved = 0;

for (const [teamName, schedules] of Object.entries(globalSchedules)) {
  const team = canonical(teamName);
  const cleaned = removeBadScores(team, schedules);
  globalRemoved += cleaned.removed;
  globalSchedules[teamName] = cleaned.schedules;
  rebuiltBreakdowns[team] = breakdownFor(cleaned.schedules);
  totalsByTeam[team] = seasonTotals(cleaned.schedules);
}

if (globalRemoved) fs.writeFileSync('team-schedules.json', JSON.stringify(globalSchedules) + '\n');
fs.writeFileSync('team-record-breakdowns.json', JSON.stringify(rebuiltBreakdowns) + '\n');

let pageRemoved = 0, pageFilesChanged = 0;
const pageDir = 'team-page-data';
if (fs.existsSync(pageDir)) {
  for (const file of fs.readdirSync(pageDir).filter(name => name.endsWith('.json'))) {
    const fullPath = path.join(pageDir, file);
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    const team = slugToTeam.get(file.replace(/\.json$/i, '')) || canonical(file.replace(/\.json$/i, '').replace(/-/g, ' '));
    const cleaned = removeBadScores(team, data.schedules || {});
    const newBreakdown = breakdownFor(cleaned.schedules);
    let changed = cleaned.removed > 0 || JSON.stringify(data.breakdown || {}) !== JSON.stringify(newBreakdown);
    pageRemoved += cleaned.removed;
    data.schedules = cleaned.schedules;
    data.breakdown = newBreakdown;
    if (patchSeasonRows(data.seasonHistory, totalsByTeam[team] || {})) changed = true;
    if (changed) {
      fs.writeFileSync(fullPath, JSON.stringify(data) + '\n');
      pageFilesChanged++;
    }
  }
}

if (fs.existsSync('season-history.json')) {
  const seasonHistory = JSON.parse(fs.readFileSync('season-history.json', 'utf8'));
  let changed = false;
  for (const [teamName, rows] of Object.entries(seasonHistory)) {
    if (patchSeasonRows(rows, totalsByTeam[canonical(teamName)] || {})) changed = true;
  }
  if (changed) fs.writeFileSync('season-history.json', JSON.stringify(seasonHistory) + '\n');
}

let teamSummaryChanged = 0;
for (const row of teams) {
  const team = canonical(row.team);
  const years = globalSchedules[team] || Object.entries(globalSchedules).find(([name]) => canonical(name) === team)?.[1];
  if (!years || typeof years !== 'object') continue;
  let wins=0, losses=0, ties=0, games=0, pointsFor=0, pointsAgainst=0, seasons=0;
  for (const seasonGames of Object.values(years)) {
    if (!Array.isArray(seasonGames) || !seasonGames.length) continue;
    seasons++;
    for (const game of seasonGames) {
      const result = resultFor(game);
      if (!result) continue;
      games++;
      if (result === 'W') wins++;
      else if (result === 'L') losses++;
      else ties++;
      const pf = Number(game?.teamScore), pa = Number(game?.opponentScore);
      if (Number.isFinite(pf)) pointsFor += pf;
      if (Number.isFinite(pa)) pointsAgainst += pa;
    }
  }
  const next = {wins, losses, ties, games, winPct:games ? (wins + ties * 0.5) / games : 0, pointsFor, pointsAgainst, avgMargin:games ? (pointsFor - pointsAgainst) / games : 0, seasons};
  let changed = false;
  for (const [key, value] of Object.entries(next)) {
    if (row[key] !== value) { row[key] = value; changed = true; }
  }
  if (changed) teamSummaryChanged++;
}
if (teamSummaryChanged) fs.writeFileSync('teams-data.json', JSON.stringify(teams) + '\n');

const remaining = [];
for (const [teamName, schedules] of Object.entries(globalSchedules)) {
  for (const games of Object.values(schedules || {})) {
    if (!Array.isArray(games)) continue;
    for (const game of games) if (badScores.has(scoreKey(teamName, game))) remaining.push(scoreKey(teamName, game));
  }
}
if (remaining.length) throw new Error(`Verified bad score rows remain: ${remaining.join(', ')}`);

console.log(`Verified conflicting score rows removed from master schedules: ${globalRemoved}`);
console.log(`Verified conflicting score rows removed from team pages: ${pageRemoved}`);
console.log(`Team page files updated: ${pageFilesChanged}`);
console.log(`Team summary records updated: ${teamSummaryChanged}`);
console.log('Verified score conflict cleanup complete.');

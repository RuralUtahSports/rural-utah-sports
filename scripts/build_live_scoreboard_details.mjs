import fs from 'node:fs';

const WEEKLY = 'weekly-simulation.json';
const DETAILS = 'deseret-game-details.json';
const OUTPUT = 'deseret-live-details-2026.json';

const clean = value => String(value ?? '').trim();
const compact = value => clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '');

const aliasGroups = [
  ['UMALEHI', 'UMACAMPWILLIAMS', 'UTAHMILITARYCAMPWILLIAMS', 'UTAHMILITARYACADEMYCAMPWILLIAMS'],
  ['SAINTJOSEPH', 'STJOSEPH']
];
const aliases = new Map();
for (const group of aliasGroups) {
  const canonical = group[0];
  for (const name of group) aliases.set(name, canonical);
}
const canonicalName = value => aliases.get(compact(value)) || compact(value);

function isoDate(value) {
  const s = clean(value);
  let match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return match[3] + '-' + String(match[1]).padStart(2, '0') + '-' + String(match[2]).padStart(2, '0');
  match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) return match[1] + '-' + String(match[2]).padStart(2, '0') + '-' + String(match[3]).padStart(2, '0');
  return '';
}

const dayNumber = value => {
  const normalized = isoDate(value);
  const time = normalized ? Date.parse(normalized + 'T12:00:00Z') : NaN;
  return Number.isFinite(time) ? time / 86400000 : null;
};
const gameKey = game => isoDate(game.date) + '|' + canonicalName(game.awayTeam) + '|' + canonicalName(game.homeTeam);

function inActiveWindow(value, todayNumber) {
  const number = dayNumber(value);
  return number !== null && todayNumber !== null && Math.abs(number - todayNumber) <= 3;
}

function isFinal(detail) {
  return detail?.final === true || /^final$/i.test(clean(detail?.status));
}

function statusRank(detail) {
  if (isFinal(detail)) return 0;
  if (/^(?:live|q[1-4]|halftime|half|ot)$/i.test(clean(detail?.status)) || clean(detail?.clock)) return 1;
  return 2;
}

function findDetailForGame(game, details) {
  const targetDay = dayNumber(game.date);
  if (targetDay === null) return null;
  const targetAway = canonicalName(game.awayTeam);
  const targetHome = canonicalName(game.homeTeam);
  const candidates = Object.entries(details.games || {}).flatMap(([key, detail]) => {
    const parts = String(key).split('|');
    const candidateDay = dayNumber(detail?.date || parts[0]);
    if (candidateDay === null) return [];
    const distance = Math.abs(candidateDay - targetDay);
    if (distance > 3) return [];
    const away = canonicalName(detail?.awayTeam || parts[1]);
    const home = canonicalName(detail?.homeTeam || parts[2]);
    if (away !== targetAway || home !== targetHome) return [];
    return [{ key, detail, distance, rank: statusRank(detail) }];
  });
  if (!candidates.length) return null;

  // Prefer a verified Final over a stale Scheduled/Upcoming entry, then use
  // the closest dated matchup. Never choose between equally good candidates.
  const finals = candidates.filter(candidate => candidate.rank === 0);
  const exact = candidates.filter(candidate => candidate.distance === 0);
  const pool = finals.length ? finals : exact.length ? exact : candidates;
  const bestDistance = Math.min(...pool.map(candidate => candidate.distance));
  const nearest = pool.filter(candidate => candidate.distance === bestDistance);
  if (nearest.length !== 1) return null;
  return nearest[0];
}

function compactDetail(game, detail) {
  return {
    date: game.date,
    awayTeam: game.awayTeam,
    homeTeam: game.homeTeam,
    url: detail.url || detail.deseretUrl || '',
    status: detail.status,
    final: detail.final,
    clock: detail.clock,
    period: detail.period,
    kickoffTime: detail.kickoffTime || '',
    boxScore: detail.boxScore,
    scoringPlays: detail.scoringPlays || [],
    stats: detail.stats || [],
    statsAvailability: detail.statsAvailability,
    finalSource: detail.finalSource,
    scoreSource: detail.scoreSource,
    manualScoreNote: detail.manualScoreNote
  };
}

function isLiveOrFinal(detail) {
  return isFinal(detail) || /^(?:live|q[1-4]|halftime|half|ot)$/i.test(clean(detail?.status)) || clean(detail?.clock) !== '';
}

const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Denver',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date());

if (!fs.existsSync(WEEKLY) || !fs.existsSync(DETAILS)) process.exit(0);
const weekly = JSON.parse(fs.readFileSync(WEEKLY, 'utf8'));
const details = JSON.parse(fs.readFileSync(DETAILS, 'utf8'));
const todayNumber = dayNumber(today);
const games = {};
const usedSourceKeys = new Set();

for (const game of weekly.games || []) {
  if (!inActiveWindow(game.date, todayNumber)) continue;
  const match = findDetailForGame(game, details);
  if (!match) continue;
  usedSourceKeys.add(match.key);
  games[gameKey(game)] = compactDetail(game, match.detail);
}

// Preserve active-window live/final games that do not yet have a matching
// Weekly Simulation row (for example, an out-of-state or newly linked game).
for (const [key, detail] of Object.entries(details.games || {})) {
  if (usedSourceKeys.has(key)) continue;
  if (!inActiveWindow(detail?.date || String(key).split('|')[0], todayNumber)) continue;
  if (!isLiveOrFinal(detail)) continue;
  games[key] = {
    date: detail.date,
    awayTeam: detail.awayTeam,
    homeTeam: detail.homeTeam,
    url: detail.url || detail.deseretUrl || '',
    status: detail.status,
    final: detail.final,
    clock: detail.clock,
    period: detail.period,
    kickoffTime: detail.kickoffTime || '',
    boxScore: detail.boxScore,
    scoringPlays: detail.scoringPlays || [],
    stats: detail.stats || [],
    finalSource: detail.finalSource,
    scoreSource: detail.scoreSource,
    manualScoreNote: detail.manualScoreNote
  };
}

fs.writeFileSync(OUTPUT, JSON.stringify({ updatedAt: new Date().toISOString(), games }, null, 2) + '\n');
console.log('Built ' + OUTPUT + ': ' + Object.keys(games).length + ' active-window game details.');

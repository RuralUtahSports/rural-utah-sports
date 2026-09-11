import fs from 'node:fs';

const WEEKLY = 'weekly-simulation.json';
const DETAILS = 'deseret-game-details.json';
const OUTPUT = 'deseret-live-details-2026.json';
const TIME_ZONE = 'America/Denver';
const STALE_HALFTIME_MINUTES = 90;

const clean = value => String(value ?? '').trim();
const compact = value => clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '');

const aliasGroups = [
  ['UMALEHI', 'UMACAMPWILLIAMS', 'UTAHMILITARYCAMPWILLIAMS', 'UTAHMILITARYACADEMYCAMPWILLIAMS'],
  ['SAINTJOSEPH', 'STJOSEPH'],
  ['ALAQUEENCREEKAZ', 'ALAQUEENSCREEKAZ', 'AMERICANLEADERSHIPACADEMYQUEENCREEKAZ']
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
const literalGameKey = game => isoDate(game.date) + '|' + compact(game.awayTeam) + '|' + compact(game.homeTeam);

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

function periodRank(status) {
  const s = clean(status).toUpperCase();
  if (s === 'Q1') return 1;
  if (s === 'Q2') return 2;
  if (s === 'HALFTIME' || s === 'HALF') return 2.5;
  if (s === 'Q3') return 3;
  if (s === 'Q4') return 4;
  if (s === 'OT') return 5;
  return 0;
}

function kickoffMinutes(value) {
  const match = clean(value).match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour === 12) hour = 0;
  if (match[3].toUpperCase() === 'PM') hour += 12;
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function utahMinutesNow() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date()).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return Number(parts.hour) * 60 + Number(parts.minute);
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

function scoreTotals(detail) {
  const rows = detail?.boxScore?.rows;
  if (!Array.isArray(rows) || rows.length < 2) return null;
  const away = Number(rows[0]?.total);
  const home = Number(rows[1]?.total);
  return Number.isFinite(away) && Number.isFinite(home) ? { away, home } : null;
}

function protectPublishedLiveState(key, detail, previous, today) {
  if (!detail || isFinal(detail)) return detail;

  const prior = previous?.games?.[key];
  const currentScore = scoreTotals(detail);
  const priorScore = scoreTotals(prior);
  if (currentScore && priorScore) {
    const away = Math.max(currentScore.away, priorScore.away);
    const home = Math.max(currentScore.home, priorScore.home);
    if (away !== currentScore.away || home !== currentScore.home) {
      detail.boxScore.rows[0].total = away;
      detail.boxScore.rows[1].total = home;
      console.warn(`Live output guard kept newer score for ${key}: ${away}-${home}.`);
    }
  }

  const currentRank = periodRank(detail.status);
  const priorRank = periodRank(prior?.status);
  if (currentRank > 0 && priorRank > currentRank && !isFinal(prior)) {
    detail.status = prior.status;
    detail.clock = prior.clock || '';
    detail.period = prior.period || '';
    console.warn(`Live output guard blocked period regression for ${key}: ${clean(detail.status)}.`);
  }

  const kickoff = kickoffMinutes(detail.kickoffTime);
  const elapsed = kickoff === null ? null : utahMinutesNow() - kickoff;
  const gameDay = isoDate(detail.date);
  if (
    gameDay === today &&
    /^HALFTIME$/i.test(clean(detail.status)) &&
    elapsed !== null &&
    elapsed >= STALE_HALFTIME_MINUTES
  ) {
    detail.status = 'Live';
    detail.clock = '';
    detail.period = '';
    console.warn(`Live output guard cleared stale Halftime for ${key} after ${elapsed} minutes.`);
  }

  return detail;
}

const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date());

if (!fs.existsSync(WEEKLY) || !fs.existsSync(DETAILS)) process.exit(0);
const weekly = JSON.parse(fs.readFileSync(WEEKLY, 'utf8'));
const details = JSON.parse(fs.readFileSync(DETAILS, 'utf8'));
const previous = fs.existsSync(OUTPUT) ? JSON.parse(fs.readFileSync(OUTPUT, 'utf8')) : { games: {} };
const todayNumber = dayNumber(today);
const games = {};
const usedSourceKeys = new Set();

for (const game of weekly.games || []) {
  if (!inActiveWindow(game.date, todayNumber)) continue;
  const match = findDetailForGame(game, details);
  if (!match) continue;
  usedSourceKeys.add(match.key);
  const canonicalKey = gameKey(game);
  const literalKey = literalGameKey(game);
  const compactGame = compactDetail(game, match.detail);
  protectPublishedLiveState(canonicalKey, compactGame, previous, today);
  games[canonicalKey] = compactGame;
  // Also publish the literal Weekly Simulation key. The browser scoreboard
  // currently keys cards from the raw team text, so aliases such as
  // ALA QUEENS CREEK vs ALA QUEEN CREEK must resolve to the same final.
  games[literalKey] = compactGame;
}

// Preserve active-window live/final games that do not yet have a matching
// Weekly Simulation row (for example, an out-of-state or newly linked game).
for (const [key, detail] of Object.entries(details.games || {})) {
  if (usedSourceKeys.has(key)) continue;
  if (!inActiveWindow(detail?.date || String(key).split('|')[0], todayNumber)) continue;
  if (!isLiveOrFinal(detail)) continue;
  const compactGame = {
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
  games[key] = protectPublishedLiveState(key, compactGame, previous, today);
}

fs.writeFileSync(OUTPUT, JSON.stringify({ updatedAt: new Date().toISOString(), games }, null, 2) + '\n');
console.log('Built ' + OUTPUT + ': ' + Object.keys(games).length + ' active-window game details.');

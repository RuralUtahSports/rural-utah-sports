import fs from 'node:fs';

const DETAILS = 'deseret-game-details.json';
const CORRECTIONS = 'manual-scoreboard-corrections-2026.json';
const clean = value => String(value ?? '').trim();
const compact = value => clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '');

if (!fs.existsSync(DETAILS) || !fs.existsSync(CORRECTIONS)) process.exit(0);

const details = JSON.parse(fs.readFileSync(DETAILS, 'utf8'));
const corrections = JSON.parse(fs.readFileSync(CORRECTIONS, 'utf8'));
details.games ||= {};
let updated = 0;

function ensureRows(detail, awayKey, homeKey) {
  if (!detail.boxScore || !Array.isArray(detail.boxScore.rows) || detail.boxScore.rows.length < 2) {
    detail.boxScore = {
      periods: ['Q1', 'Q2', 'Q3', 'Q4'],
      rows: [
        { team: awayKey, quarters: [null, null, null, null], total: 0 },
        { team: homeKey, quarters: [null, null, null, null], total: 0 }
      ],
      source: 'manual-scoreboard-correction'
    };
    updated++;
  }
  return detail.boxScore.rows;
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function dayNumber(value) {
  const s = clean(value);
  let m = s.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (!m) m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const normalized = m ? (m.length === 2 ? m[1] : m[3] + '-' + String(m[1]).padStart(2, '0') + '-' + String(m[2]).padStart(2, '0')) : '';
  const time = normalized ? Date.parse(normalized + 'T12:00:00Z') : NaN;
  return Number.isFinite(time) ? time / 86400000 : null;
}

function statusRank(detail) {
  if (detail?.final === true || /^final$/i.test(clean(detail?.status))) return 0;
  if (/^(?:live|q[1-4]|halftime|half|ot)$/i.test(clean(detail?.status)) || clean(detail?.clock)) return 1;
  return 2;
}

function findMatch(correction, date, awayKeys, homeKeys) {
  const targetDay = dayNumber(date);
  if (targetDay === null) return null;
  const candidates = Object.entries(details.games).flatMap(([key, detail]) => {
    const parts = String(key).split('|');
    const gameDate = clean(parts[0]);
    const detailDate = clean(detail?.date) || gameDate;
    const candidateDay = dayNumber(detailDate);
    if (candidateDay === null) return [];
    const distance = Math.abs(candidateDay - targetDay);
    if (distance > 3) return [];
    const away = compact(detail?.awayTeam || parts[1]);
    const home = compact(detail?.homeTeam || parts[2]);
    if (!awayKeys.has(away) || !homeKeys.has(home)) return [];
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
  return [nearest[0].key, nearest[0].detail];
}

function createMissingFinal(correction, date, awayKeys, homeKeys) {
  if (!correction.finalScore) return null;
  const awayKey = [...awayKeys][0];
  const homeKey = [...homeKeys][0];
  if (!awayKey || !homeKey) return null;

  const key = date + '|' + awayKey + '|' + homeKey;
  const detail = {
    date,
    awayTeam: awayKey,
    homeTeam: homeKey,
    deseretUrl: '',
    status: 'Scheduled',
    final: false,
    clock: '',
    period: '',
    boxScore: null,
    scoringPlays: [],
    stats: [],
    statsAvailability: {
      status: 'unavailable',
      blocks: 0,
      rows: 0,
      coreCells: 0,
      filledCoreCells: 0,
      emptyCoreBlocks: 0
    }
  };
  details.games[key] = detail;
  updated++;
  console.log('Created missing manual scoreboard entry: ' + key);
  return [key, detail];
}
for (const correction of corrections) {
  const date = clean(correction.date);
  const awayKeys = new Set((correction.awayKeys || []).map(compact));
  const homeKeys = new Set((correction.homeKeys || []).map(compact));

  let match = findMatch(correction, date, awayKeys, homeKeys);

  if (!match) match = createMissingFinal(correction, date, awayKeys, homeKeys);

  if (!match) {
    console.warn(`Manual scoreboard correction did not find ${date} ${[...awayKeys].join('/')} vs ${[...homeKeys].join('/')}`);
    continue;
  }

  const [key, detail] = match;
  const [, awayKey, homeKey] = key.split('|');
  const rows = ensureRows(detail, awayKey, homeKey);

  if (correction.scoreFloor) {
    const nextAway = Math.max(num(rows[0]?.total), num(correction.scoreFloor.away));
    const nextHome = Math.max(num(rows[1]?.total), num(correction.scoreFloor.home));
    if (num(rows[0]?.total) !== nextAway || num(rows[1]?.total) !== nextHome) {
      rows[0].total = nextAway;
      rows[1].total = nextHome;
      updated++;
    }
    detail.scoreSource = 'verified-manual-floor';
    detail.manualScoreNote = correction.note || '';
  }

  // A temporary in-game override must expire once an authoritative final has
  // been established by a later refresh.
  if (correction.status && !correction.finalScore && detail.final !== true) {
    const nextStatus = clean(correction.status);
    const nextClock = clean(correction.clock);
    const nextPeriod = clean(correction.period) || nextStatus;
    if (detail.final || detail.status !== nextStatus || clean(detail.clock) !== nextClock || clean(detail.period) !== nextPeriod) updated++;
    detail.final = false;
    detail.status = nextStatus;
    detail.clock = nextClock;
    detail.period = nextPeriod;
    detail.statusSource = 'verified-manual';
    detail.manualScoreNote = correction.note || '';
  } else if (correction.status && !correction.finalScore && detail.final === true) {
    console.log(`Skipped expired live correction for finalized game: ${key}`);
  }

  if (correction.finalScore) {
    const nextAway = num(correction.finalScore.away);
    const nextHome = num(correction.finalScore.home);
    if (num(rows[0]?.total) !== nextAway || num(rows[1]?.total) !== nextHome) {
      rows[0].total = nextAway;
      rows[1].total = nextHome;
      updated++;
    }
    if (!detail.final || detail.status !== 'Final' || detail.clock || detail.period) updated++;
    detail.final = true;
    detail.status = 'Final';
    detail.clock = '';
    detail.period = '';
    detail.finalSource = 'verified-manual';
    detail.statusSource = 'verified-manual';
    detail.scoreSource = 'verified-manual';
    detail.manualScoreNote = correction.note || '';
  }

  console.log(`Applied manual scoreboard correction: ${key}`);
}

if (updated > 0) {
  details.updatedAt = new Date().toISOString();
  fs.writeFileSync(DETAILS, JSON.stringify(details, null, 2) + '\n');
}
console.log(`Manual scoreboard corrections: ${updated} change(s).`);

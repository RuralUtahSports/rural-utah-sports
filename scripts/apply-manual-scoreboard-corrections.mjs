import fs from 'node:fs';

const DETAILS = 'deseret-game-details.json';
const CORRECTIONS = 'manual-scoreboard-corrections-2026.json';
const clean = value => String(value ?? '').trim();
const compact = value => clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '');

if (!fs.existsSync(DETAILS) || !fs.existsSync(CORRECTIONS)) process.exit(0);

const details = JSON.parse(fs.readFileSync(DETAILS, 'utf8'));
const corrections = JSON.parse(fs.readFileSync(CORRECTIONS, 'utf8'));
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

for (const correction of corrections) {
  const date = clean(correction.date);
  const awayKeys = new Set((correction.awayKeys || []).map(compact));
  const homeKeys = new Set((correction.homeKeys || []).map(compact));

  const match = Object.entries(details.games || {}).find(([key]) => {
    const [gameDate, away, home] = key.split('|');
    return gameDate === date && awayKeys.has(compact(away)) && homeKeys.has(compact(home));
  });

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

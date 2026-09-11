import fs from 'node:fs';

const OVERRIDES = 'scoreboard-schedule-overrides-2026.json';
const WEEKLY = 'weekly-simulation.json';
const FULL_DETAILS = 'deseret-game-details.json';
const LIVE_DETAILS = 'deseret-live-details-2026.json';

const clean = value => String(value ?? '').trim();
const compact = value => clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
const isoDate = value => {
  const s = clean(value);
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  return m ? `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}` : '';
};
const displayDate = iso => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso;
};

if (!fs.existsSync(OVERRIDES)) process.exit(0);
const overrides = JSON.parse(fs.readFileSync(OVERRIDES, 'utf8'));
let changes = 0;

function matchesGame(game, override) {
  if (!game) return false;
  const away = compact(game.awayTeam);
  const home = compact(game.homeTeam);
  if (away !== compact(override.awayTeam) || home !== compact(override.homeTeam)) return false;
  const currentDate = isoDate(game.date);
  const fromDate = isoDate(override.fromDate);
  const targetDate = isoDate(override.date);
  return currentDate === fromDate || currentDate === targetDate;
}

if (fs.existsSync(WEEKLY)) {
  const weekly = JSON.parse(fs.readFileSync(WEEKLY, 'utf8'));
  for (const override of overrides) {
    const targetDate = isoDate(override.date);
    if (!targetDate) continue;
    for (const game of weekly.games || []) {
      if (!matchesGame(game, override)) continue;
      const nextDate = displayDate(targetDate);
      if (game.date !== nextDate) {
        game.date = nextDate;
        game.scheduleOverride = override.note || 'Schedule override';
        changes++;
      }
    }
  }
  fs.writeFileSync(WEEKLY, JSON.stringify(weekly));
}

function applyDetailOverrides(path) {
  if (!fs.existsSync(path)) return;
  const payload = JSON.parse(fs.readFileSync(path, 'utf8'));
  payload.games ||= {};

  for (const override of overrides) {
    const targetDate = isoDate(override.date);
    if (!targetDate) continue;
    const awayKey = compact(override.awayTeam);
    const homeKey = compact(override.homeTeam);
    const candidates = Object.entries(payload.games).filter(([key, detail]) => {
      const parts = key.split('|');
      const game = {
        date: detail?.date || parts[0],
        awayTeam: detail?.awayTeam || parts[1],
        homeTeam: detail?.homeTeam || parts[2]
      };
      return matchesGame(game, override);
    });

    for (const [oldKey, detail] of candidates) {
      const newKey = `${targetDate}|${awayKey}|${homeKey}`;
      detail.date = displayDate(targetDate);
      detail.awayTeam = override.awayTeam;
      detail.homeTeam = override.homeTeam;
      detail.scheduleOverride = override.note || 'Schedule override';
      if (override.status && detail.final !== true) {
        detail.status = override.status;
        detail.statusSource = 'schedule-override';
      }
      if (oldKey !== newKey) {
        delete payload.games[oldKey];
        payload.games[newKey] = detail;
        changes++;
      }
    }
  }

  if (changes) payload.updatedAt = new Date().toISOString();
  fs.writeFileSync(path, JSON.stringify(payload, null, 2) + '\n');
}

applyDetailOverrides(FULL_DETAILS);
applyDetailOverrides(LIVE_DETAILS);

console.log(`Scoreboard schedule overrides: ${changes} change(s).`);

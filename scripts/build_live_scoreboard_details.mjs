import fs from 'node:fs';

const WEEKLY = 'weekly-simulation.json';
const DETAILS = 'deseret-game-details.json';
const OUTPUT = 'deseret-live-details-2026.json';

const clean = value => String(value ?? '').trim();
const compact = value => clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
const isoDate = value => {
  const match = clean(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return match ? `${match[3]}-${String(match[1]).padStart(2, '0')}-${String(match[2]).padStart(2, '0')}` : clean(value);
};
const gameKey = game => `${isoDate(game.date)}|${compact(game.awayTeam)}|${compact(game.homeTeam)}`;
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Denver',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date());

function dayNumber(value) {
  const time = Date.parse(`${value}T12:00:00Z`);
  return Number.isFinite(time) ? time / 86400000 : null;
}

function inActiveWindow(value, todayNumber) {
  const number = dayNumber(isoDate(value));
  return !!number && todayNumber !== null && Math.abs(number - todayNumber) <= 3;
}

if (!fs.existsSync(WEEKLY) || !fs.existsSync(DETAILS)) process.exit(0);
const weekly = JSON.parse(fs.readFileSync(WEEKLY, 'utf8'));
const details = JSON.parse(fs.readFileSync(DETAILS, 'utf8'));
const todayNumber = dayNumber(today);
const activeKeys = new Set();

for (const game of weekly.games || []) {
  if (!inActiveWindow(game.date, todayNumber)) continue;
  activeKeys.add(gameKey(game));
}

const games = {};
for (const [key, detail] of Object.entries(details.games || {})) {
  const keyDate = key.split('|')[0];
  const detailDate = detail.date || keyDate;
  const isInWindow = inActiveWindow(detailDate, todayNumber);
  const isLiveOrFinal = detail.final === true || /^(live|final)/i.test(clean(detail.status));

  // Prefer exact Weekly Simulation matches, but do not drop a verified live/final
  // game just because the school name differs between sources (for example,
  // UMA-Lehi vs Utah Military Academy-Camp Williams).
  if (!activeKeys.has(key) && !(isInWindow && isLiveOrFinal)) continue;

  games[key] = {
    date: detail.date,
    awayTeam: detail.awayTeam,
    homeTeam: detail.homeTeam,
    url: detail.url,
    status: detail.status,
    final: detail.final,
    clock: detail.clock,
    period: detail.period,
    kickoffTime: detail.kickoffTime || '',
    boxScore: detail.boxScore,
    scoringPlays: detail.scoringPlays || [],
    stats: detail.stats || [],
    statsAvailability: detail.statsAvailability
  };
}

fs.writeFileSync(OUTPUT, JSON.stringify({ updatedAt: new Date().toISOString(), games }, null, 2) + '\n');
console.log(`Built ${OUTPUT}: ${Object.keys(games).length} active-window game details.`);

import fs from 'node:fs';

const TEAM_FILE = 'boys-basketball-teams.json';
const CURRENT_SCHEDULE_FILE = 'boys-basketball-games-2026-27.json';
const OUTPUT_FILE = 'boys-basketball-games-2025-26.json';
const REPORT_FILE = 'boys-basketball-results-import-report-2025-26.json';
const SEASON_LABEL = '25-26';
const MAX_CONCURRENCY = 4;
const USER_AGENT = 'Mozilla/5.0 (compatible; RuralUtahSports/1.0; +https://ruralutahsports.com/)';
const UTAH_PREP_SOURCE = 'https://www.maxpreps.com/ut/hurricane/utah-prep-athletes/basketball/schedule/';

const clean = value => String(value ?? '').trim();
const norm = value => clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
const number = value => {
  const text = clean(value).replace(/,/g, '');
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function nextData(html) {
  const match = String(html).match(/<script id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

function participantRows(contest) {
  return Array.isArray(contest?.[0]) ? contest[0].filter(Array.isArray) : [];
}

function contestDate(contest) {
  const scheduled = clean(contest?.[11]);
  if (/^\d{4}-\d{2}-\d{2}T/.test(scheduled)) return scheduled;
  const dates = (contest || []).filter(value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value));
  return dates.length ? dates[dates.length - 1] : '';
}

function historicalScheduleUrl(source) {
  const url = new URL(source);
  url.pathname = url.pathname.replace(/\/basketball\/schedule\/?$/, '/basketball/25-26/schedule/');
  if (!/\/basketball\/25-26\/schedule\/$/.test(url.pathname)) {
    throw new Error('Could not convert current schedule URL to 2025-26: ' + source);
  }
  return url.toString();
}

async function fetchHtml(url, attempt = 0) {
  if (attempt) await sleep(Math.min(8000, 700 * (2 ** (attempt - 1))));
  try {
    const response = await fetch(url, {
      headers: {accept: 'text/html,application/xhtml+xml', 'user-agent': USER_AGENT},
      redirect: 'follow',
      signal: AbortSignal.timeout(30000)
    });
    if (response.ok) return await response.text();
    if ([403, 408, 425, 429, 500, 502, 503, 504].includes(response.status) && attempt < 4) {
      return fetchHtml(url, attempt + 1);
    }
    throw new Error(response.status + ' ' + response.statusText);
  } catch (error) {
    if (attempt < 4 && error?.name !== 'AbortError') return fetchHtml(url, attempt + 1);
    throw error;
  }
}

function stateFromUrl(raw) {
  try {
    const url = new URL(raw, 'https://www.maxpreps.com');
    if (!/\.maxpreps\.com$/i.test(url.hostname)) return '';
    const code = url.pathname.split('/').filter(Boolean)[0]?.toUpperCase() || '';
    return /^[A-Z]{2}$/.test(code) ? code : '';
  } catch {
    return '';
  }
}

function canonicalOpponentUrl(raw) {
  const value = clean(raw);
  if (!value) return '';
  try {
    const url = new URL(value, 'https://www.maxpreps.com');
    if (!/\.maxpreps\.com$/i.test(url.hostname)) return '';
    return 'https://www.maxpreps.com' + url.pathname;
  } catch {
    return '';
  }
}

function locationFromContest(contest, schoolNames) {
  const description = clean(contest?.[29]);
  const locationMatch = description.match(/\b(home|away|neutral)\b/i);
  if (!locationMatch) return '';
  const location = locationMatch[1].toLowerCase();
  if (location === 'neutral') return 'Neutral';

  const subjectMatch = description.match(/,\s*(?:the\s+)?(.+?)\s+varsity basketball team\b/i);
  const subject = norm(subjectMatch?.[1] || '');
  const ownNames = (Array.isArray(schoolNames) ? schoolNames : [schoolNames]).map(norm).filter(Boolean);
  const subjectIsOurSchool = subject && ownNames.some(name =>
    subject === name || subject.includes(name) || name.includes(subject)
  );
  const actualLocation = subjectIsOurSchool ? location : (location === 'home' ? 'away' : 'home');
  return actualLocation.charAt(0).toUpperCase() + actualLocation.slice(1);
}

function parseTeamPage(html, sourceUrl) {
  const page = nextData(html)?.props?.pageProps;
  const context = page?.teamContext?.data;
  if (!context || context.sport !== 'Basketball' || context.year !== SEASON_LABEL) {
    throw new Error('MaxPreps page did not match boys basketball season ' + SEASON_LABEL);
  }

  const teamId = clean(context.teamId);
  const schoolName = clean(context.schoolName);
  const byKey = new Map();
  for (const contest of Array.isArray(page.contests) ? page.contests : []) {
    const rows = participantRows(contest);
    const mine = rows.find(row => (teamId && clean(row[1]) === teamId) || (schoolName && norm(row[14]) === norm(schoolName)));
    const opponent = rows.find(row => row !== mine && clean(row[14]));
    if (!mine || !opponent) continue;
    const reportedResult = clean(mine[5]).toUpperCase();
    if (!['W', 'L', 'T'].includes(reportedResult)) continue;

    const dateTime = contestDate(contest);
    const date = dateTime.slice(0, 10);
    const teamScore = number(mine[6]);
    const opponentScore = number(opponent[6]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || teamScore === null || opponentScore === null) continue;
    if (teamScore === 0 && opponentScore === 0) continue;

    const result = teamScore > opponentScore ? 'W' : teamScore < opponentScore ? 'L' : 'T';
    const opponentUrl = canonicalOpponentUrl(opponent[13]);
    const opponentState = clean(opponent[16]).toUpperCase() || stateFromUrl(opponentUrl);
    const game = {
      date,
      opponent: clean(opponent[14]),
      opponentState,
      opponentUrl,
      result,
      teamScore,
      opponentScore,
      location: locationFromContest(contest, [schoolName, clean(context.schoolNameAcronym)])
    };
    const key = [date, norm(game.opponent), teamScore, opponentScore, game.location].join('|');
    byKey.set(key, game);
  }

  const games = [...byKey.values()].sort((a, b) =>
    a.date.localeCompare(b.date) || a.opponent.localeCompare(b.opponent)
  );
  const record = {wins: 0, losses: 0, ties: 0, games: games.length};
  for (const game of games) {
    if (game.result === 'W') record.wins++;
    else if (game.result === 'L') record.losses++;
    else record.ties++;
  }

  return {
    status: games.length ? 'available' : 'no-results',
    schoolName,
    sourceUrl,
    record,
    games
  };
}

async function main() {
  const teams = readJson(TEAM_FILE).filter(team => team.association === 'UHSAA' || team.team === 'Utah Prep');
  const scheduleData = readJson(CURRENT_SCHEDULE_FILE);
  const sources = {...(scheduleData.sources || {})};
  if (!sources['Utah Prep']) sources['Utah Prep'] = UTAH_PREP_SOURCE;

  const entries = teams.map(team => ({name: team.team, source: sources[team.team] || ''}));
  const results = {};
  const failures = [];
  let next = 0;
  let fetched = 0;

  async function worker() {
    while (true) {
      const index = next++;
      if (index >= entries.length) return;
      const info = entries[index];
      if (!info.source) {
        const message = 'No MaxPreps current-season source URL is available for this team.';
        results[info.name] = {status: 'missing-source', error: message, record: {wins: 0, losses: 0, ties: 0, games: 0}, games: []};
        failures.push({team: info.name, error: message});
        console.error(info.name + ': ' + message);
        continue;
      }

      const sourceUrl = historicalScheduleUrl(info.source);
      try {
        const html = await fetchHtml(sourceUrl);
        results[info.name] = parseTeamPage(html, sourceUrl);
        fetched++;
        console.log(info.name + ': ' + results[info.name].games.length + ' completed results');
      } catch (error) {
        results[info.name] = {
          status: 'error',
          sourceUrl,
          error: error?.message || String(error),
          record: {wins: 0, losses: 0, ties: 0, games: 0},
          games: []
        };
        failures.push({team: info.name, error: error?.message || String(error), sourceUrl});
        console.error(info.name + ': ' + (error?.message || error));
      }
      await sleep(125);
    }
  }

  await Promise.all(Array.from({length: MAX_CONCURRENCY}, () => worker()));

  const orderedTeams = Object.fromEntries(Object.entries(results).sort(([a], [b]) => a.localeCompare(b)));
  const payload = {
    schemaVersion: 1,
    season: '2025-26',
    updatedAt: new Date().toISOString(),
    source: 'MaxPreps public boys basketball schedule pages',
    summary: {
      teams: teams.length,
      withResults: Object.values(orderedTeams).filter(team => team.status === 'available').length,
      completedGames: Object.values(orderedTeams).reduce((sum, team) => sum + (team.games || []).length, 0),
      failures: failures.length
    },
    teams: orderedTeams
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2) + '\n');
  fs.writeFileSync(REPORT_FILE, JSON.stringify({
    season: '2025-26',
    checkedAt: new Date().toISOString(),
    teamCount: teams.length,
    fetched,
    completedGames: payload.summary.completedGames,
    failures,
    teams: Object.fromEntries(Object.entries(orderedTeams).map(([name, team]) => [name, {
      status: team.status,
      games: (team.games || []).length,
      record: team.record || null,
      sourceUrl: team.sourceUrl || '',
      error: team.error || ''
    }]))
  }, null, 2) + '\n');

  console.log('2025-26 basketball import: ' + fetched + '/' + teams.length + ' source pages parsed; ' +
    payload.summary.completedGames + ' team results; ' + failures.length + ' source failures.');
}

main().catch(error => { console.error(error); process.exit(1); });

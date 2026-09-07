import fs from 'node:fs';

const STANDINGS_FILE = process.env.STANDINGS_FILE || 'standings-2026.json';
const TEAMS_FILE = process.env.TEAMS_FILE || 'teams-data.json';
const OUT_FILE = process.env.OUT_FILE || 'rpi-oos-2026.json';
const SEASON_LABEL = process.env.MAXPREPS_SEASON || '26-27';
const MAX_CONCURRENCY = 3;
const USER_AGENT = 'Mozilla/5.0 (compatible; RuralUtahSports/1.0; +https://ruralutahsports.github.io/)';

const BORDER_STATES = new Set(['AZ', 'CO', 'ID', 'NM', 'NV', 'WY']);
const STATE_CODES = new Set([
  'AK','AL','AR','AZ','CA','CO','CT','DC','DE','FL','GA','HI','IA','ID','IL','IN','KS','KY','LA','MA',
  'MD','ME','MI','MN','MO','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR','PA','RI',
  'SC','SD','TN','TX','VA','VT','WA','WI','WV','WY'
]);

const clean = value => String(value ?? '').trim();
const norm = value => clean(value).replace(/\s+/g, ' ').toUpperCase();
const compact = value => norm(value).replace(/[^A-Z0-9]/g, '');
const number = value => {
  const text = clean(value).replace(/,/g, '');
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const SCHOOL_ALIASES = {
  'HUN': ['THE HUN SCHOOL OF PRINCETON', 'HUN SCHOOL'],
  'ST. JAMES PERFORMANCE ACADEMY': ['ST JAMES PERFORMANCE ACADEMY'],
  'UMA-HILLFIELD': ['UTAH MILITARY ACADEMY - HILL FIELD', 'UTAH MILITARY ACADEMY HILL FIELD', 'UMA HILLFIELD'],
  'UMA-CAMP WILLIAMS': ['UTAH MILITARY ACADEMY - CAMP WILLIAMS', 'UTAH MILITARY ACADEMY CAMP WILLIAMS'],
  'SAINT JOSEPH': ['ST. JOSEPH', 'ST JOSEPH'],
  'ST. JOSEPH': ['SAINT JOSEPH', 'ST JOSEPH'],
  'MATER DEI': ['MATER DEI HIGH SCHOOL']
};

function schoolMatch(target, actual) {
  const targetKey = compact(target);
  const actualKey = compact(actual);
  if (!targetKey || !actualKey) return false;
  if (targetKey === actualKey) return true;
  const aliases = (SCHOOL_ALIASES[norm(target)] || []).map(compact);
  if (aliases.includes(actualKey)) return true;
  return targetKey.length >= 7 && (actualKey.includes(targetKey) || targetKey.includes(actualKey));
}

function parseOutOfStateName(value) {
  const raw = clean(value).replace(/\s+/g, ' ');
  const upper = norm(raw);
  const commaCode = upper.match(/,\s*([A-Z]{2})$/);
  const spacedCode = upper.match(/\s+([A-Z]{2})$/);
  const match = commaCode || spacedCode;
  if (!match || !STATE_CODES.has(match[1]) || match[1] === 'UT') return null;
  const name = raw.slice(0, match.index).replace(/[ ,]+$/, '').trim();
  return name ? {key: norm(raw), name, state: match[1], raw} : null;
}

function readJson(file, fallback) {
  try {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
  } catch (error) {
    console.warn(`Could not read ${file}: ${error.message}`);
    return fallback;
  }
}

function actualGame(game) {
  return number(game?.actualAway) !== null && number(game?.actualHome) !== null;
}

function recordFromGames(games, exclude) {
  const target = exclude ? compact(exclude) : '';
  const record = {wins: 0, losses: 0, ties: 0, games: 0};
  for (const game of games || []) {
    if (target && (compact(game.opponentName || game.opponent || '') === target || schoolMatch(exclude, game.opponentName || game.opponent || ''))) continue;
    const result = norm(game.result);
    if (!['W', 'L', 'T'].includes(result)) continue;
    record.games++;
    if (result === 'W') record.wins++;
    else if (result === 'L') record.losses++;
    else record.ties++;
  }
  return {
    ...record,
    wp: record.games ? (record.wins + record.ties * 0.5) / record.games : null
  };
}

function participantRows(contest) {
  return Array.isArray(contest?.[0]) ? contest[0].filter(Array.isArray) : [];
}

function contestDate(contest) {
  return (contest || []).find(value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) || '';
}

function nextData(html) {
  const match = String(html).match(/<script id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

function baseSchoolUrls(html, state) {
  const expanded = String(html).replace(/\\u002F/gi, '/').replace(/\\\//g, '/');
  const urls = new Set();
  for (const match of expanded.matchAll(/https?:\/\/www\.maxpreps\.com\/[a-z]{2}\/[^"'<>?\\\s]+/gi)) {
    try {
      const url = new URL(match[0]);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length !== 3 || parts[0].toUpperCase() !== state) continue;
      urls.add(`https://www.maxpreps.com/${parts.join('/')}/`);
    } catch {}
  }
  return [...urls];
}

async function fetchHtml(url, attempt = 0) {
  if (attempt) await sleep(Math.min(6000, 500 * 2 ** (attempt - 1)));
  try {
    const response = await fetch(url, {
      headers: {accept: 'text/html,application/xhtml+xml', 'user-agent': USER_AGENT},
      redirect: 'follow',
      signal: AbortSignal.timeout(25000)
    });
    if (response.ok) return response.text();
    if ([403, 408, 425, 429, 500, 502, 503, 504].includes(response.status) && attempt < 3) {
      return fetchHtml(url, attempt + 1);
    }
    throw new Error(`${response.status} ${response.statusText}`);
  } catch (error) {
    if (attempt < 3 && error?.name !== 'AbortError') return fetchHtml(url, attempt + 1);
    throw error;
  }
}

function scheduleUrl(base) {
  return `${String(base).replace(/\/+$/, '')}/football/schedule/`;
}

function parseTeamPage(html, sourceUrl, expected) {
  const page = nextData(html)?.props?.pageProps;
  const context = page?.teamContext?.data;
  if (!context || context.sport !== 'Football' || context.year !== SEASON_LABEL) return null;
  if (expected?.state && context.stateCode !== expected.state) return null;
  if (expected?.name && !schoolMatch(expected.name, context.schoolName)) return null;

  const teamId = context.teamId;
  const games = [];
  for (const contest of Array.isArray(page.contests) ? page.contests : []) {
    const rows = participantRows(contest);
    const mine = rows.find(row => String(row[1] || '') === String(teamId || '') || schoolMatch(context.schoolName, row[14]));
    const opponent = rows.find(row => row !== mine && clean(row[14]));
    const result = norm(mine?.[5]);
    if (!mine || !opponent || !['W', 'L', 'T'].includes(result)) continue;
    const date = contestDate(contest);
    if (!date) continue;
    const teamScore = number(mine[6]);
    const opponentScore = number(opponent[6]);
    if (teamScore === null || opponentScore === null) continue;
    games.push({
      date: date.slice(0, 10),
      result,
      teamScore,
      opponentScore,
      opponentName: clean(opponent[14]),
      opponentState: clean(opponent[16]).toUpperCase(),
      opponentUrl: clean(opponent[13])
    });
  }
  const standing = page?.teamContext?.standingsData?.overallStanding || {};
  const computed = recordFromGames(games);
  const standingWp = number(standing.winningPercentage);
  return {
    sourceUrl,
    footballUrl: clean(context.canonicalUrl || sourceUrl).replace(/\/schedule\/?$/, '/'),
    schoolName: clean(context.schoolName),
    state: clean(context.stateCode).toUpperCase(),
    updatedAt: clean(context.teamSettings?.updatedOn || page?.teamContext?.teamSettings?.updatedOn || ''),
    games,
    record: computed.games ? computed : {...computed, wp: standingWp}
  };
}

async function loadTeamPage(url, expected, initialHtml = '') {
  const html = initialHtml || await fetchHtml(scheduleUrl(url));
  return parseTeamPage(html, scheduleUrl(url), expected);
}

async function discoverTeam(info, prior) {
  if (prior?.maxprepsUrl) {
    try {
      const page = await loadTeamPage(prior.maxprepsUrl, info);
      if (page) return page;
    } catch (error) {
      console.warn(`${info.raw}: saved MaxPreps URL failed (${error.message})`);
    }
  }

  const query = encodeURIComponent(`${info.name} ${info.state}`);
  const search = await fetchHtml(`https://www.maxpreps.com/search/?q=${query}`);
  const candidates = baseSchoolUrls(search, info.state);
  for (const candidate of candidates.slice(0, 12)) {
    try {
      const page = await loadTeamPage(candidate, info);
      if (page) return page;
    } catch {}
  }
  return null;
}

function addResult(record, result) {
  const key = norm(result);
  if (!record[key]) record[key] = {wins: 0, losses: 0, ties: 0, games: 0};
  const value = record[key];
  value.games++;
  if (result === 'W') value.wins++;
  else if (result === 'L') value.losses++;
  else value.ties++;
}

function finishRecord(record) {
  return {...record, wp: record.games ? (record.wins + record.ties * 0.5) / record.games : null};
}

function utahKey(value, utahNames) {
  const key = compact(value);
  for (const name of utahNames) {
    if (compact(name) === key) return name;
    if ((SCHOOL_ALIASES[norm(name)] || []).some(alias => compact(alias) === key)) return name;
    if ((SCHOOL_ALIASES[norm(value)] || []).some(alias => compact(alias) === compact(name))) return name;
  }
  return '';
}

function buildUtahGames(standings, utahNames) {
  const byTeam = new Map();
  for (const game of Array.isArray(standings?.games) ? standings.games : []) {
    if (!actualGame(game)) continue;
    const away = utahKey(game.awayTeam, utahNames);
    const home = utahKey(game.homeTeam, utahNames);
    if (!away && !home) continue;
    if (away) {
      if (!byTeam.has(away)) byTeam.set(away, []);
      addResult(byTeam.get(away), number(game.actualAway) > number(game.actualHome) ? 'W' : number(game.actualAway) < number(game.actualHome) ? 'L' : 'T');
    }
    if (home) {
      if (!byTeam.has(home)) byTeam.set(home, []);
      addResult(byTeam.get(home), number(game.actualHome) > number(game.actualAway) ? 'W' : number(game.actualHome) < number(game.actualAway) ? 'L' : 'T');
    }
  }
  return byTeam;
}

function utahWp(utahTeam, excludeOpponent, standings, utahNames) {
  const target = utahKey(utahTeam, utahNames) || utahTeam;
  const exclude = compact(excludeOpponent);
  const record = {wins: 0, losses: 0, ties: 0, games: 0};
  for (const game of Array.isArray(standings?.games) ? standings.games : []) {
    if (!actualGame(game)) continue;
    const away = utahKey(game.awayTeam, utahNames);
    const home = utahKey(game.homeTeam, utahNames);
    let result = '';
    let opponent = '';
    if (away === target) {
      result = number(game.actualAway) > number(game.actualHome) ? 'W' : number(game.actualAway) < number(game.actualHome) ? 'L' : 'T';
      opponent = clean(game.homeTeam);
    } else if (home === target) {
      result = number(game.actualHome) > number(game.actualAway) ? 'W' : number(game.actualHome) < number(game.actualAway) ? 'L' : 'T';
      opponent = clean(game.awayTeam);
    }
    if (!result || (exclude && compact(opponent) === exclude)) continue;
    record.games++;
    if (result === 'W') record.wins++;
    else if (result === 'L') record.losses++;
    else record.ties++;
  }
  return record.games ? (record.wins + record.ties * 0.5) / record.games : null;
}

function sameOpponent(game, target) {
  if (!game || !target) return false;
  const urlA = clean(game.opponentUrl).replace(/\/+$/, '');
  const urlB = clean(target.footballUrl).replace(/\/+$/, '');
  if (urlA && urlB && urlA === urlB) return true;
  return clean(game.opponentState).toUpperCase() === target.state && schoolMatch(target.schoolName, game.opponentName);
}

async function buildBorderOwp(page, info, standings, utahNames, pageCache) {
  const completed = page.games || [];
  if (!completed.length) return {owp: null, wpByUtahTeam: {}, byUtahTeam: {}};
  const values = [];
  const wpByUtahTeam = {};
  const byUtahTeam = {};
  for (const game of completed) {
    const utahOpponent = utahKey(game.opponentName, utahNames);
    if (utahOpponent) wpByUtahTeam[norm(utahOpponent)] = recordFromGames(completed, utahOpponent).wp;
  }
  for (const game of completed) {
    let opponentWp = null;
    const utahOpponent = utahKey(game.opponentName, utahNames);
    if (utahOpponent) {
      opponentWp = utahWp(utahOpponent, page.schoolName, standings, utahNames);
    } else if (game.opponentUrl) {
      const opponentKey = clean(game.opponentUrl).replace(/\/+$/, '');
      let opponentPage = pageCache.get(opponentKey);
      if (!opponentPage) {
        try {
          opponentPage = await loadTeamPage(game.opponentUrl, {name: game.opponentName, state: game.opponentState});
          if (opponentPage) pageCache.set(opponentKey, opponentPage);
        } catch (error) {
          console.warn(`${info.raw} opponent ${game.opponentName}: ${error.message}`);
        }
      }
      if (opponentPage) opponentWp = recordFromGames(opponentPage.games, page.schoolName).wp;
    }
    if (opponentWp !== null) values.push(opponentWp);
  }
  for (const game of completed) {
    const utahOpponent = utahKey(game.opponentName, utahNames);
    if (!utahOpponent) continue;
    const perTeam = [];
    for (const opponentGame of completed) {
      let opponentWp = null;
      const opponentUtah = utahKey(opponentGame.opponentName, utahNames);
      if (opponentUtah) opponentWp = utahWp(opponentUtah, page.schoolName, standings, utahNames);
      else if (opponentGame.opponentUrl) {
        const opponentKey = clean(opponentGame.opponentUrl).replace(/\/+$/, '');
        const opponentPage = pageCache.get(opponentKey);
        if (opponentPage) opponentWp = recordFromGames(opponentPage.games, page.schoolName).wp;
      }
      if (opponentWp !== null) perTeam.push(opponentWp);
    }
    if (perTeam.length) byUtahTeam[norm(utahOpponent)] = perTeam.reduce((sum, value) => sum + value, 0) / perTeam.length;
  }
  return {
    owp: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    wpByUtahTeam,
    byUtahTeam
  };
}

async function main() {
  const standings = readJson(STANDINGS_FILE, {games: []});
  const teams = readJson(TEAMS_FILE, []);
  const priorPayload = readJson(OUT_FILE, {season: 2026, teams: {}});
  const priorTeams = priorPayload.teams || {};
  const utahNames = teams.map(team => clean(team.team)).filter(Boolean);
  const needed = new Map();

  for (const game of Array.isArray(standings.games) ? standings.games : []) {
    for (const field of ['awayTeam', 'homeTeam']) {
      const raw = clean(game[field]);
      if (!raw || utahNames.some(name => compact(name) === compact(raw))) continue;
      const parsed = parseOutOfStateName(raw);
      if (!parsed || parsed.state === 'AS') continue;
      needed.set(parsed.key, parsed);
    }
  }
  for (const [key, prior] of Object.entries(priorTeams)) {
    const parsed = parseOutOfStateName(key);
    if (parsed && parsed.state !== 'AS' && !needed.has(key)) needed.set(key, parsed);
    if (prior?.state && prior.state !== 'AS' && !needed.has(key)) needed.set(key, {...parsed, key, name: parsed?.name || key, state: prior.state, raw: key});
  }

  const utahGames = buildUtahGames(standings, utahNames);
  const pageCache = new Map();
  const results = {};
  const entries = [...needed.values()];
  let next = 0, fetched = 0, failures = 0, borderFetched = 0;

  async function worker() {
    while (true) {
      const index = next++;
      if (index >= entries.length) return;
      const info = entries[index];
      const old = priorTeams[info.key] || {};
      try {
        const page = await discoverTeam(info, old);
        if (!page) throw new Error('no matching 2026-27 MaxPreps football page');
        fetched++;
        pageCache.set(page.footballUrl.replace(/\/+$/, ''), page);
        const direct = page.record.wp;
        let owp = null;
        let wpByUtahTeam = {};
        let byUtahTeam = {};
        if (BORDER_STATES.has(info.state)) {
          const border = await buildBorderOwp(page, info, standings, utahNames, pageCache);
          owp = border.owp;
          wpByUtahTeam = border.wpByUtahTeam;
          byUtahTeam = border.byUtahTeam;
          borderFetched++;
        } else {
          owp = 0.5;
        }
        results[info.key] = {
          ...old,
          state: info.state,
          wp: direct,
          owp,
          wpByUtahTeam,
          owpByUtahTeam: byUtahTeam,
          maxprepsUrl: page.footballUrl,
          source: 'MaxPreps public football schedule',
          lastUpdated: page.updatedAt || new Date().toISOString(),
          checkedAt: new Date().toISOString(),
          record: page.record
        };
        console.log(`${info.raw}: ${direct === null ? '—' : direct.toFixed(4)} WP${BORDER_STATES.has(info.state) ? `, ${owp === null ? '—' : owp.toFixed(4)} OWP` : ', non-border .500 OOWP'}`);
      } catch (error) {
        failures++;
        results[info.key] = {
          ...old,
          state: info.state,
          source: old.source || 'MaxPreps public football schedule',
          checkedAt: new Date().toISOString(),
          error: error.message
        };
        console.warn(`${info.raw}: ${error.message}`);
      }
      await sleep(150);
    }
  }

  await Promise.all(Array.from({length: MAX_CONCURRENCY}, () => worker()));

  const orderedTeams = Object.fromEntries(Object.entries(results).sort(([a], [b]) => a.localeCompare(b)));
  const payload = {
    season: 2026,
    updatedAt: new Date().toISOString(),
    note: 'Out-of-state opponent records refreshed from public MaxPreps football schedule pages. Border states use direct WP and opponent WP; non-bordering states use direct WP with .500 assigned for OOWP. Null values fall back to .500 until an external record is available.',
    source: 'MaxPreps public football schedule pages',
    summary: {teams: entries.length, fetched, failures, borderFetched},
    teams: orderedTeams
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2) + '\n');
  console.log(`MaxPreps OOS refresh: ${fetched}/${entries.length} teams loaded; ${borderFetched} border-state OOWP records; ${failures} failures.`);
  if (!entries.length) throw new Error('No out-of-state football opponents found in standings');
}

main().catch(error => { console.error(error); process.exit(1); });

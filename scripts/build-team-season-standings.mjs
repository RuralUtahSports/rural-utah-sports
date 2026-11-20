// Build the historical display from RUS game histories. Archived alignments identify opponents.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = new URL('../', import.meta.url);
const historyDir = process.argv[2] || fileURLToPath(new URL('team-page-data/',root));
const read = path => JSON.parse(fs.readFileSync(new URL(path, root)));
const key = value => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
const book = read('team-season-alignments.json');
const teams = read('teams-data.json');
const liveYear = String(read('standings-2026.json').season);
const aliases = {SOUTH:'SOUTHSALTLAKECITY', MONUMENTVALLEY:'MONUMENTVAL', CEDAR:'CEDARCITY', GRANDCOUNTY:'GRAND', GUNNISON:'GUNNISONVALLEY', MAPLEMTN:'MAPLEMOUNTAIN', STJOSEPH:'SAINTJOSEPH',BYH:'BRIGHAMYOUNGHIGH',BYHIGH:'BRIGHAMYOUNGHIGH',HINKLEY:'HINCKLEY',WASATCHACAD:'WASATCHACADEMY', AMERICANLEADERSHIP:'ALA'};
const output = {};
const archivedOpponents = new Map();
const historical = read('historical-football-programs.json');
for (const {team} of teams.sort((a,b) => a.team.localeCompare(b.team,'en'))) {
  const id = key(team);
  const slug = id === 'MONUMENTVAL' ? 'monument-valley' : team.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const history = JSON.parse(fs.readFileSync(path.join(historyDir, slug + '.json')));
  if (!Object.values(history.schedules).flat().some(g => typeof g.playoff === 'boolean')) {
    throw new Error('Use RUS schedules enriched with postseason flags for ' + team);
  }
  // Programs without a RUS schedule can still appear in opponents' game histories.
  for (const [year,games] of Object.entries(history.schedules)) {
    if (year === liveYear) continue;
    for (const game of games) {
      const raw = key(game.opponent);
      const opponent = aliases[raw] || raw;
      const alignment = book[opponent]?.[year];
      const result = ['L','W','T'].indexOf(game.result);
      if (!historical[opponent] || !alignment || result < 0) continue;
      const slot = year + ':' + opponent;
      if (!archivedOpponents.has(slot)) archivedOpponents.set(slot,new Map());
      const identity = JSON.stringify([id,game.date,game.result,game.teamScore,game.opponentScore]);
      const regional = game.playoff === false && alignment.standingsUrl && alignment.standingsUrl === book[id]?.[year]?.standingsUrl;
      archivedOpponents.get(slot).set(identity,{result,regional});
    }
  }
  for (const [year, alignment] of Object.entries(book[id])) {
    if (year === liveYear) continue;
    const summary = history.seasonHistory.find(row => String(row.year) === year);
    const overall = [0, 0, 0], group = [0, 0, 0], seen = new Set();
    for (const game of history.schedules[year] || []) {
      const result = ['W','L','T'].indexOf(game.result);
      if (result < 0) continue;
      const raw = key(game.opponent);
      const opponent = aliases[raw] || raw;
      const identity = JSON.stringify([game.date,opponent,game.result,game.teamScore,game.opponentScore]);
      if (seen.has(identity)) continue;
      seen.add(identity);
      overall[result]++;
      if (game.playoff === false && alignment.standingsUrl && book[opponent]?.[year]?.standingsUrl === alignment.standingsUrl) group[result]++;
    }
    const totals = summary ? [summary.wins,summary.losses,summary.ties] : overall;
    if (!totals.some(Boolean)) continue;
    (output[year] ??= {})[id] = [totals.join('-'),group.some(Boolean) ? group.join('-') : null];
  }
}
for (const [slot,games] of archivedOpponents) {
  const [year,id] = slot.split(':');
  const overall = [0,0,0], group = [0,0,0];
  for (const {result,regional} of games.values()) {
    overall[result]++;
    if (regional) group[result]++;
  }
  (output[year] ??= {})[id] = [overall.join('-'),group.some(Boolean) ? group.join('-') : null,'opponents'];
}
const target = new URL('team-season-record-display.json', root);
fs.writeFileSync(target, JSON.stringify(output) + '\n');

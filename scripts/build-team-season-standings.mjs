// Build the historical display from RUS game histories. Archived alignments identify opponents.
import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const read = path => JSON.parse(fs.readFileSync(new URL(path, root)));
const key = value => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
const book = read('team-season-alignments.json');
const teams = read('teams-data.json');
const liveYear = String(read('standings-2026.json').season);
const aliases = {SOUTH:'SOUTHSALTLAKECITY', MONUMENTVALLEY:'MONUMENTVAL', CEDAR:'CEDARCITY', GRANDCOUNTY:'GRAND', GUNNISON:'GUNNISONVALLEY', MAPLEMTN:'MAPLEMOUNTAIN', STJOSEPH:'SAINTJOSEPH', AMERICANLEADERSHIP:'ALA'};
const output = {};
for (const {team} of teams) {
  const id = key(team);
  const slug = id === 'MONUMENTVAL' ? 'monument-valley' : team.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const history = read('team-page-data/' + slug + '.json');
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
const target = new URL('team-season-record-display.json', root);
fs.writeFileSync(target, JSON.stringify(output) + '\n');

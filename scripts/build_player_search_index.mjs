import fs from 'node:fs';

// Search-only fields. Keep season on every row so archive links remain correct.
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const text = value => String(value ?? '').trim();
const players = [];
for (const season of [2026, 2025]) {
  const data = read(`deseret-rosters-stats-${season}.json`);
  const seen = new Set();
  for (const [teamKey, teamData] of Object.entries(data.teams || {})) {
    const team = text(teamData.team || teamKey);
    for (const player of teamData.roster || []) {
      const id = text(player.playerId), name = text(player.name);
      if (!id || !name || seen.has(id)) continue;
      seen.add(id);
      players.push([id, name, team, text(player.number), text(player.position), text(player.class), season]);
    }
  }
  if (!seen.size) throw new Error(`No players for ${season}; refusing to publish an empty index`);
}
players.sort((a, b) => b[6] - a[6] || a[0].localeCompare(b[0]));
const teams = Object.values(read('standings-2026.json').byClassification || {}).flat()
  .map(t => [t.team, t.classification, t.region]);
const games = read('weekly-simulation.json').games.map(g => [g.awayTeam, g.homeTeam, g.date]);
if (!teams.length) throw new Error('Missing search teams');
const output = 'site-search-index.json';
fs.writeFileSync(output, JSON.stringify({v: 1, p: players, t: teams, g: games}));
console.log(`Wrote ${players.length} players, ${teams.length} teams, ${games.length} games (${fs.statSync(output).size} bytes)`);

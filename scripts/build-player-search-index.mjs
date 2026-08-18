import fs from 'node:fs';

const seasons = [2026, 2025];
const seen = new Set();
const players = [];

for (const season of seasons) {
  const file = `deseret-rosters-stats-${season}.json`;
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [teamKey, teamData] of Object.entries(data?.teams || {})) {
    const team = String(teamData?.team || teamKey || '').trim();
    for (const player of teamData?.roster || []) {
      const playerId = String(player?.playerId || '').trim();
      const name = String(player?.name || '').trim();
      if (!playerId || !name) continue;
      const key = `${season}|${playerId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      players.push({
        id: playerId,
        n: name,
        t: team,
        y: season,
        no: String(player?.number || '').trim(),
        p: String(player?.position || '').trim(),
        c: String(player?.class || '').trim()
      });
    }
  }
}

players.sort((a, b) => b.y - a.y || a.n.localeCompare(b.n) || a.t.localeCompare(b.t));
const output = {
  generatedAt: new Date().toISOString(),
  seasons: [...new Set(players.map(p => p.y))],
  count: players.length,
  players
};

fs.writeFileSync('player-search-index.json', JSON.stringify(output));
console.log(`Built player-search-index.json with ${players.length} player-season records.`);

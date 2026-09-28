import fs from 'node:fs';

const SEASONS = ['2005-06', '2006-07', '2007-08', '2008-09', '2009-10', '2010-11', '2011-12', '2012-13', '2013-14', '2014-15', '2015-16', '2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26'];
const OUTPUT = 'boys-basketball-all-time-records-2005-26.json';

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function validGames(team) {
  return (Array.isArray(team?.games) ? team.games : []).filter(game => {
    const teamScore = Number(game.teamScore);
    const opponentScore = Number(game.opponentScore);
    return Number.isFinite(teamScore) && Number.isFinite(opponentScore) &&
      !(teamScore === 0 && opponentScore === 0);
  });
}

const totals = {};
for (const season of SEASONS) {
  const seasonData = readJson('boys-basketball-games-' + season + '.json');
  for (const [name, team] of Object.entries(seasonData.teams || {})) {
    const total = totals[name] || (totals[name] = {
      wins: 0, losses: 0, ties: 0, games: 0, seasonsWithResults: 0
    });
    const games = validGames(team);
    if (games.length) total.seasonsWithResults++;
    total.games += games.length;
    for (const game of games) {
      const teamScore = Number(game.teamScore);
      const opponentScore = Number(game.opponentScore);
      if (teamScore > opponentScore) total.wins++;
      else if (teamScore < opponentScore) total.losses++;
      else total.ties++;
    }
  }
}

const orderedTeams = Object.fromEntries(
  Object.entries(totals).sort(([a], [b]) => a.localeCompare(b))
);
const payload = {
  schemaVersion: 1,
  updatedAt: new Date().toISOString(),
  range: {start: '2005-06', end: '2025-26'},
  source: 'MaxPreps results imported for each season; 0-0 placeholder ties excluded',
  summary: {
    teams: Object.keys(orderedTeams).length,
    completedTeamResults: Object.values(orderedTeams).reduce((sum, row) => sum + row.games, 0)
  },
  teams: orderedTeams
};
fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2) + '\n');
console.log('Built all-time basketball summaries for ' + payload.summary.teams +
  ' teams across ' + payload.summary.completedTeamResults + ' team game results.');

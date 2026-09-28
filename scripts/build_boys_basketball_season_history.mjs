import fs from 'node:fs';

const SEASONS = ['2002-03', '2003-04', '2004-05', '2005-06', '2006-07', '2007-08', '2008-09', '2009-10', '2010-11', '2011-12', '2012-13', '2013-14', '2014-15', '2015-16', '2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26'];
const OUTPUT = 'boys-basketball-season-history-2002-26.json';

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

const teams = {};
for (const season of SEASONS) {
  const seasonData = readJson('boys-basketball-games-' + season + '.json');
  for (const [name, team] of Object.entries(seasonData.teams || {})) {
    const games = validGames(team);
    if (!games.length) continue;
    let wins = 0, losses = 0, ties = 0, pointsFor = 0, pointsAgainst = 0;
    for (const game of games) {
      const teamScore = Number(game.teamScore);
      const opponentScore = Number(game.opponentScore);
      pointsFor += teamScore;
      pointsAgainst += opponentScore;
      if (teamScore > opponentScore) wins++;
      else if (teamScore < opponentScore) losses++;
      else ties++;
    }
    const gameCount = games.length;
    const row = {
      season,
      wins,
      losses,
      ties,
      games: gameCount,
      winPct: gameCount ? (wins + ties * 0.5) / gameCount : 0,
      pointsFor,
      pointsAgainst,
      ppg: gameCount ? pointsFor / gameCount : 0,
      papg: gameCount ? pointsAgainst / gameCount : 0,
      avgMargin: gameCount ? (pointsFor - pointsAgainst) / gameCount : 0
    };
    (teams[name] ||= []).push(row);
  }
}

for (const rows of Object.values(teams)) {
  rows.sort((a, b) => b.season.localeCompare(a.season));
}

const orderedTeams = Object.fromEntries(
  Object.entries(teams).sort(([a], [b]) => a.localeCompare(b))
);

const payload = {
  schemaVersion: 1,
  updatedAt: new Date().toISOString(),
  range: { start: SEASONS[0], end: SEASONS[SEASONS.length - 1] },
  source: 'Completed boys basketball results by season; 0-0 placeholders excluded',
  teams: orderedTeams
};

fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2) + '\n');
console.log('Built basketball season history for ' + Object.keys(orderedTeams).length + ' teams.');

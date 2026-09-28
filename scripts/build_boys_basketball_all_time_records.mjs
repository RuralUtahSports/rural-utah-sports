import fs from 'node:fs';

const SEASONS = ['2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26'];
const OUTPUT = 'boys-basketball-all-time-records-2017-26.json';
const clean = value => String(value ?? '').trim();

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

const totals = {};
for (const season of SEASONS) {
  const report = readJson('boys-basketball-results-import-report-' + season + '.json');
  for (const [name, team] of Object.entries(report.teams || {})) {
    const record = team.record || {};
    const total = totals[name] || (totals[name] = {
      wins: 0, losses: 0, ties: 0, games: 0, seasonsWithResults: 0
    });
    total.wins += Number(record.wins) || 0;
    total.losses += Number(record.losses) || 0;
    total.ties += Number(record.ties) || 0;
    total.games += Number(record.games) || 0;
    if ((Number(record.games) || 0) > 0) total.seasonsWithResults++;
  }
}

const orderedTeams = Object.fromEntries(
  Object.entries(totals).sort(([a], [b]) => a.localeCompare(b))
);
const payload = {
  schemaVersion: 1,
  updatedAt: new Date().toISOString(),
  range: {start: '2017-18', end: '2025-26'},
  source: 'MaxPreps results imported for each season',
  summary: {
    teams: Object.keys(orderedTeams).length,
    completedTeamResults: Object.values(orderedTeams).reduce((sum, row) => sum + row.games, 0)
  },
  teams: orderedTeams
};
fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2) + '\n');
console.log('Built all-time basketball summaries for ' + payload.summary.teams +
  ' teams across ' + payload.summary.completedTeamResults + ' team game results.');

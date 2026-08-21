import fs from 'node:fs';

const TEAMS_PATH = 'teams-data.json';
const OVERRIDES_PATH = 'team-color-overrides.json';
const norm = value => String(value ?? '').trim().toUpperCase().replace(/\s+/g, ' ');

if (!fs.existsSync(TEAMS_PATH) || !fs.existsSync(OVERRIDES_PATH)) {
  throw new Error('Team data or team color override file is missing.');
}

const teams = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
const overrides = JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'));
const overrideMap = new Map(Object.entries(overrides).map(([team, value]) => [norm(team), value]));
let changed = 0;

for (const team of teams) {
  const override = overrideMap.get(norm(team?.team));
  if (!override) continue;
  for (const field of ['schoolColors', 'backgroundColor', 'textColor']) {
    if (override[field] == null || team[field] === override[field]) continue;
    team[field] = override[field];
    changed++;
  }
}

fs.writeFileSync(TEAMS_PATH, JSON.stringify(teams) + '\n');
console.log(`Applied ${changed} team-color field override${changed === 1 ? '' : 's'}.`);

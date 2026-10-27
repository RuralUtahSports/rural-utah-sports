// Regression test for the 2026-27 boys basketball directory cleanup.
// Run from the repository root with: node tests/boys-basketball-directory.test.mjs
// No dependencies. Exits non-zero on the first failed assertion.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const teams = JSON.parse(readFileSync(join(root, 'boys-basketball-teams.json'), 'utf8'));
const gamesFile = JSON.parse(readFileSync(join(root, 'boys-basketball-games-2026-27.json'), 'utf8'));
const teamsHtml = readFileSync(join(root, 'boys-basketball-teams.html'), 'utf8');
const teamHtml = readFileSync(join(root, 'boys-basketball-team.html'), 'utf8');
const games = gamesFile.games || [];

let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`ok - ${message}`);
}
const norm = (v) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const byName = (name) => teams.find((t) => t.team === name);
const countBy = (list, fn) => list.reduce((acc, t) => { const k = fn(t); acc[k] = (acc[k] || 0) + 1; return acc; }, {});

// No deletions: the full historical record stays in teams.json.
check(teams.length === 171, `teams.json still contains all 171 entries (found ${teams.length})`);
const dirCounts = countBy(teams, (t) => t.directory2026);
check(dirCounts['uhsaa-region'] === 145, `145 UHSAA region teams (found ${dirCounts['uhsaa-region']})`);
check(dirCounts['uhsaa-independent'] === 2, `2 UHSAA independent teams (found ${dirCounts['uhsaa-independent']})`);
check(dirCounts['non-uhsaa-active'] === 2, `2 active non-UHSAA programs (found ${dirCounts['non-uhsaa-active']})`);
check(dirCounts['hidden'] === 22, `22 hidden Independent/Other entries preserved (found ${dirCounts['hidden']})`);
const active = teams.filter((t) => t.directory2026 !== 'hidden');
check(active.length === 149, `active 2026-27 directory is 149 programs (found ${active.length})`);

// UHSAA independents and non-UHSAA actives, by exact name.
check(byName('Layton Christian Academy')?.directory2026 === 'uhsaa-independent', 'Layton Christian Academy is a UHSAA independent');
check(byName('Wasatch Academy')?.directory2026 === 'uhsaa-independent', 'Wasatch Academy is a UHSAA independent');
check(byName('Anthem Prep')?.directory2026 === 'non-uhsaa-active', 'Anthem Prep is in the non-UHSAA active section');
check(byName('Utah Prep')?.directory2026 === 'non-uhsaa-active', 'Utah Prep is in the non-UHSAA active section');

// User-confirmed corrections.
check(!byName('Navajo Mountain'), 'Navajo Mountain is NOT added');
const mountainValley = byName('Mountain Valley');
check(mountainValley?.classification === '2A' && mountainValley?.region === 'Region 16' && mountainValley?.association === 'UHSAA', 'Mountain Valley is preserved in 2A Region 16');

// UMA display name, aliases, and separation from UMA-Hillfield.
const umaLehi = byName('UMA-Lehi');
check(umaLehi?.classification === '2A' && umaLehi?.region === 'Region 16', 'UMA-Lehi is the preferred display name in 2A Region 16');
check((umaLehi?.aliases || []).includes('UMA-Camp Williams') && (umaLehi?.aliases || []).includes('UMA-CW'), 'UMA-Lehi retains UMA-Camp Williams and UMA-CW as aliases');
const umaHillfield = byName('UMA-Hillfield');
check(umaHillfield?.classification === '2A' && umaHillfield?.region === 'Region 17', 'UMA-Hillfield stays separate in 2A Region 17');

// No duplicates, and every classification / region is covered.
const names = teams.map((t) => norm(t.team));
check(new Set(names).size === names.length, 'no duplicate team names (normalised)');
const uhsaa = teams.filter((t) => t.association === 'UHSAA');
const classCounts = countBy(uhsaa, (t) => t.classification);
check(classCounts['6A'] === 17 && classCounts['5A'] === 31 && classCounts['4A'] === 29 && classCounts['3A'] === 16 && classCounts['2A'] === 30 && classCounts['1A'] === 24, `UHSAA classification counts are 6A 17, 5A 31, 4A 29, 3A 16, 2A 30 (28 region + 2 independent), 1A 24 (found ${JSON.stringify(classCounts)})`);
check(byName('Layton Christian Academy')?.classification === '2A' && byName('Wasatch Academy')?.classification === '2A', 'UHSAA independents keep their existing 2A classification field; independence is in their region field');
const regionTeams = uhsaa.filter((t) => t.region !== 'Independent');
check(regionTeams.length === 145, '145 UHSAA region teams');
const regions = new Set(regionTeams.map((t) => t.region));
check(regions.size === 22, `all 22 regions present (found ${regions.size})`);
check(byName('Highland')?.classification === '5A' && byName('Highland')?.region === 'Region 6', 'Highland play-up: 5A Region 6');
check(byName('Orem')?.classification === '5A' && byName('Orem')?.region === 'Region 7', 'Orem play-up: 5A Region 7');
check(byName('American Heritage')?.classification === '3A' && byName('American Heritage')?.region === 'Region 12', 'American Heritage play-up: 3A Region 12');

// Schedule rename: games and source keys follow the new display name.
const gameTeamNames = new Set();
games.forEach((g) => { gameTeamNames.add(g.homeTeam); gameTeamNames.add(g.awayTeam); });
check(!gameTeamNames.has('UMA-Camp Williams'), 'no 2026-27 game still uses UMA-Camp Williams as a team name');
check(gameTeamNames.has('UMA-Lehi'), 'UMA-Lehi appears in the 2026-27 games file');
check(gamesFile.sources && gamesFile.sources['UMA-Lehi'] && !gamesFile.sources['UMA-Camp Williams'], 'games source key renamed to UMA-Lehi');
check(!gameTeamNames.has('Navajo Mountain'), 'no 2026-27 game uses Navajo Mountain as a team name');

// Directory page wording and team-page alias resolution.
check(!teamsHtml.includes('only additional independent program'), 'teams page no longer says Utah Prep is the only additional independent program');
check(teamsHtml.includes('Active Non-UHSAA Independent Programs'), 'teams page has a separate non-UHSAA section');
check(teamsHtml.includes('Anthem Prep and Utah Prep'), 'teams page names Anthem Prep and Utah Prep in the non-UHSAA section');
check(teamHtml.includes('aliases') && teamHtml.includes('isActiveDirectoryTeam'), 'team page resolves aliases and active-directory membership');

console.log(`\nAll ${checks} directory checks passed.`);

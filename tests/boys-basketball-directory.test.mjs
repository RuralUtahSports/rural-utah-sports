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

// All-time record regression (PR #184 fix): the historical file still uses the
// pre-rename name, and the directory page must resolve it via team aliases
// without renaming or duplicating the historical record.
const allTimeFile = JSON.parse(readFileSync(join(root, 'boys-basketball-all-time-records-2002-26.json'), 'utf8'));
const allTimeTeams = allTimeFile.teams || {};
check(allTimeTeams['UMA-Camp Williams']?.wins === 64 && allTimeTeams['UMA-Camp Williams']?.losses === 108 && allTimeTeams['UMA-Camp Williams']?.games === 172, 'historical file keeps UMA-Camp Williams at 64 wins, 108 losses, 172 games');
check(!('UMA-Lehi' in allTimeTeams), 'historical file is NOT renamed to UMA-Lehi and has no duplicate UMA-Lehi record');
check(allTimeTeams['UMA-Hillfield']?.wins === 38 && allTimeTeams['UMA-Hillfield']?.losses === 148, 'UMA-Hillfield historical record stays separate at 38-148');
// Run the directory page's own allTimeFor() function, extracted from teams.html,
// against the real historical map — this proves the page code, not a copy of it.
const teamsHtmlForAllTime = teamsHtml;
const allTimeFnStart = teamsHtmlForAllTime.indexOf('function allTimeFor(team){');
const allTimeFnEnd = teamsHtmlForAllTime.indexOf('\nfunction classSort', allTimeFnStart);
const allTimeFnMatch = allTimeFnStart >= 0 && allTimeFnEnd > allTimeFnStart ? [teamsHtmlForAllTime.slice(allTimeFnStart, allTimeFnEnd)] : null;
check(!!allTimeFnMatch, 'teams.html defines an allTimeFor() directory lookup');
check(teamsHtmlForAllTime.includes('allTimeFor(team)'), 'directory card render uses allTimeFor(team) instead of a direct name lookup');
{
  const allTimeRecords = new Map(Object.entries(allTimeTeams).map(([name, record]) => [norm(name), record]));
  // eslint-disable-next-line no-eval
  const allTimeFor = eval(`(${allTimeFnMatch[0].replace(/^function allTimeFor/, 'function ')})`);
  const umaRecord = allTimeFor(byName('UMA-Lehi'));
  check(umaRecord?.wins === 64 && umaRecord?.losses === 108 && umaRecord?.games === 172, 'directory lookup via aliases returns UMA-Lehi historical record 64-108 (172 games)');
  const renderedRecord = umaRecord && Number(umaRecord.games) > 0 ? `${Number(umaRecord.wins || 0)}-${Number(umaRecord.losses || 0)}${Number(umaRecord.ties || 0) ? `-${Number(umaRecord.ties)}` : ''}` : '—';
  check(renderedRecord === '64-108', `directory card would display "64-108" for UMA-Lehi (got "${renderedRecord}")`);
  const hillfieldRecord = allTimeFor(byName('UMA-Hillfield'));
  check(hillfieldRecord?.wins === 38 && hillfieldRecord?.losses === 148, 'alias lookup does not merge UMA-Lehi with UMA-Hillfield');
  check(allTimeFor(byName('Anthem Prep')) === null, 'Anthem Prep correctly has no historical record yet (card shows —, not a wrong record)');
}

// Anthem Prep branding (final PR #184 change): the verified logo is the
// shield-and-wordmark header logo from the official South Jordan, Utah
// school website (anthemprep.com), as loaded in a browser. No eagle logo
// and no school colors were stated on that site, so no eagle branding and
// no invented colors may be used, and the UHSAA logo fallback (which does
// not apply to a non-UHSAA school) must not be attempted for Anthem Prep.
const anthemLogoUrl = 'https://images.squarespace-cdn.com/content/v1/62c727f044f7140b33832b29/493f261e-2df2-407d-8ce5-24dcd46d98cd/Anthem-horizontal1.PNG?format=1500w';
check(teamsHtml.includes(`ANTHEMPREP:'${anthemLogoUrl}'`), 'directory page uses the verified official Anthem Prep shield-and-wordmark logo URL');
check(teamHtml.includes(anthemLogoUrl), 'team page uses the same verified Anthem Prep logo URL');
check(!teamsHtml.includes('Anthem%20Prep.png') && !teamHtml.includes('Anthem%20Prep.png'), 'no UHSAA Anthem Prep logo URL is referenced for Anthem Prep');
check(teamsHtml.includes("if(key==='ANTHEMPREP')return"), 'directory logo lookup returns only the verified logo for Anthem Prep, without the UHSAA fallback');
check(teamHtml.includes('norm(team.team)==="ANTHEMPREP"?[anthemPrepLogo]'), 'team page logo candidates are only the verified logo for Anthem Prep, without the UHSAA fallback');
check(teamsHtml.includes('Anthem Prep uses the shield-and-wordmark logo from its official school website'), 'branding note states Anthem Prep uses the shield-and-wordmark logo from its official school website');
check(teamsHtml.includes('no school colors are stated on that site, so no verified colors are shown for Anthem Prep'), 'branding note states no verified colors are shown for Anthem Prep');
check(!teamsHtml.includes('with Anthem Prep and Utah Prep using their official school branding'), 'branding note no longer claims Anthem Prep and Utah Prep both use official school branding in the same way');
check(!/eagle/i.test(teamsHtml) && !/eagle/i.test(teamHtml), 'no eagle branding is used in the directory or team page for Anthem Prep');
check(!teamsHtml.includes('ANTHEMPREP:{'), 'no invented Anthem Prep colors entry is added to the directory branding map');
check(teamsHtml.includes('UTAHPREP:'), 'Utah Prep branding entry is preserved');

console.log(`\nAll ${checks} directory checks passed.`);

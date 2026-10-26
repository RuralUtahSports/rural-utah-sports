# 2026 statistics repair validation

## Actual results

| Check | Result |
| --- | --- |
| `node --test tests/player-stat-integrity.test.mjs` | **27 passed, 0 failed.** Includes actual import CLI outage simulations that verify saved files remain byte-for-byte unchanged. |
| `node --test tests/*.test.cjs` | **25 passed, 0 failed** after PR #179 follow-up. The obsolete marker assertion was replaced with tests of the fetched template, sequential script execution, dashboard placement, and historical-season exclusion. Navigation and rankings-runtime regressions are also covered. |
| `node scripts/test-shared-runtime.cjs` | Passed. |
| `node scripts/test-search-runtime.cjs` | Passed: 12,874 players, 118 teams, 602 games. |
| `node scripts/merge_maxpreps_game_logs.mjs --self-test` | Passed. |
| `node scripts/merge_maxpreps_stats_fallback.mjs --self-test` | Passed. |
| `node scripts/merge_verified_deseret_kicking.mjs --self-test` | Passed. |
| `node scripts/test_player_single_game_records_parser.mjs` | Passed. |
| `node scripts/dedupe_player_single_game_records.mjs --self-test` | Passed; conflicting record values must fail rather than merge silently. |
| `node scripts/check-region-awards-role-scoring.cjs` | Passed. |
| `node scripts/validate_player_single_game_records.mjs` | Passed after records regeneration and existing duplicate normalization. Also validates current 2026 records, not only historical/team records. |
| `node scripts/audit-football-data.mjs` | **0 errors, 0 warnings.** This coverage audit does not certify the accuracy/completeness of every player stat. |
| `node scripts/audit-all-player-stats-2026.mjs` | Completed: **516 game-sum review flags, 6 conflicting cells**. These are unresolved observations, not passing accuracy checks. |
| JSON parsing / changed JavaScript syntax / workflow YAML / diff whitespace | Passed. |

The record validator initially exposed schedule-page citations and duplicate weather-moved game records. Record imports now prefer actual game citations, skip uncited performances, recognize combined defensive/kicking categories, and retain unknown total-offense components. Regenerated records pass after the repository's existing duplicate-normalization stage.

## Pipeline execution and repeatability

Executed the local data stages in the checkout: apply corrections → rebuild primary game rows → merge MaxPreps game rows → merge verified kicking → reconcile season stats → reapply corrections → compact metrics → regular-season award candidate overlay → current team shards → current player records → dedupe → validate records → both audits.

Also executed those stages, including the weekly-awards builder, in an isolated temporary copy of the data and scripts. Every stage exited successfully. A second reconciliation left the entire team/season payload identical. The locked award snapshot stayed byte-for-byte identical. Weekly award generation was tested in the temporary copy; the repository's existing weekly winners file was deliberately retained. No workflow dispatch, remote award write, merge, or deployment occurred.

The importer scripts use cached input files in this local rebuild. Full live imports were **not** successfully executed: fresh Deseret News and MaxPreps requests failed with proxy CONNECT 403. Existing source snapshots carry their own reporting dates. Processing timestamps are not proof of fresh source verification. Health checks and partial-fetch preservation were exercised using actual importer CLIs with a controlled unavailable-source fixture.

## Visual and functional browser checks

Used headless system Chromium through Playwright against the local HTTP server at **390 × 844/900** and **1440 × 900/1000**. External requests were blocked during these checks; no credentials, editorial PIN, or remote publishing actions were used.

- Loaded `stat-leaders.html`, `players.html`, Ian Mair's player profile, South Summit's team page, `records.html`, `weekly-awards.html`, and `region-awards.html` at both widths. All 14 page loads returned HTTP 200 with no page-level JavaScript exceptions. The initial harness used a nonexistent records URL; it was corrected to the repository's actual `records.html` and rerun.
- Confirmed the profile displays **1,397 passing yards and 101–195 completions/attempts**; clicked the team's **Stats** tab and verified 1,397 passing yards.
- Selected the **2A**, **Yards** season leaderboard and confirmed Ian Mair's corrected row; switched to **Week 10** and checked that reported rows rendered at both widths.
- Inspected mobile screenshots of the profile stats, team stats, and leaderboard. Wide stat tables use horizontal scrolling. No page-level overflow was measured on the seven mobile pages.
- The desktop team page had page-level horizontal overflow; its layout files were not changed by this repair. Other checked desktop pages did not have page-level overflow.
- The public All-Region editor shell was visually checked. **Authenticated candidate dialogs, saved publication views, and graphic exports were not visually tested.** Automated VM tests exercise the real award UI's cutoff application, region alignment, reporting warning, preservation of saved selections, and exclusion of unscoped special-team totals while retaining candidate identities.

Screenshots and browser observations are in [2026-stat-repair-visuals](2026-stat-repair-visuals). These are local checks, not verification of a deployed site.

## Remaining blockers

1. Allow usable HTTPS access to `sports.deseret.com` and `www.maxpreps.com` for fresh source comparisons, reporting dates, player-game coverage, the two teams without stats, and unresolved player identities. Do not replace retained figures merely because another source is higher.
2. Alma Barlow's rushing-TD rules disagree (conditional 9, minimum 27, cached MaxPreps 33). Keep the current 27 with an explicit unresolved status until dated primary evidence resolves the conflict.
3. Dashawn Gordon/Gordan's alias is repaired, but there are no cached source game rows for that identity. The cached cumulative figure is 875 rushing yards versus 762 in the October 23 issue and 26 retained in RUS; fresh game coverage is required before replacing it.
4. The original 280 flags are individually traced in `2026-stat-repair-evidence.json`: 219 fields are no longer below the original game sum; 61 still need review. The broader current audit contains additional discrepancies after game recovery and rebuild. Neither number certifies every season total.
5. GitHub API requests still return **Forbidden**. PR #179 now exists and updates can be delivered through Git push, but hosted check status cannot be confirmed through the API. See [PR #179 follow-up validation](pr-179-review.md) for current local results; the initial delivery failure is no longer an outstanding test failure.

No merge, deployment, change to published award winners, or rewrite of the frozen award snapshot was authorized or performed.

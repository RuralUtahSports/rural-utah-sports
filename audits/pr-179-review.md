# PR #179: CI and review follow-up

The existing `fix/2026-player-statistics-repair` branch was merged with `main` at **58df10126e6bb10219ec4363256c31f4169aa1f4**. All 125 newer upstream data files were preserved byte-for-byte. Speed Cut's Uintah configuration, authentic logo file, contact link, and sponsor runtime are unchanged.

## Corrections

- Replaced the obsolete `ratings-nav1` assertion with checks of the actual fetched `team-page-content.html`, team initialization before navigation enhancements, sequential script execution, late dashboard insertion, ratings placement immediately after the season dashboard grid, single widget creation, and exclusion from historical seasons.
- Standardized 64 stale HTML navigation cache references on **20261023-region-awards1**, including the team wrapper's override. The October 23 navigation change unlisted the unfinished awards editor; reverting to the October 15 key would retain stale navigation in cached clients.
- Marked the audit page and three private awards-editor pages as intentionally standalone navigation. The shell checker validates at least two working local links and rejects mixed standalone/shared navigation. Shared pages still fail on missing scripts, stale versions, or deferred critical navigation. Negative regression tests confirm those failures remain detectable.
- Fixed actual invalid JavaScript in `rankings-mobile-fix.js`: literal escaped newlines/template delimiters had prevented the runtime from parsing. Removed three escaped metadata separators that rendered as visible text at the top of the rankings page. Added a cache bump, syntax check, and runtime test for separate state/class snapshot labels.
- Updated three additional stale checks found during the broader sweep: record themes now verify template loading rather than a superseded wrapper stamp; playoff pending/advancing paths use explicit fixtures rather than expecting unfinished live brackets; Top 25 sponsor checks exercise configured-off and active states instead of requiring a retired sponsor or opening a cache-key URL as a local filename. Current sponsorship settings and game outcomes were not changed.

## Actual automated results

| Check | Result |
| --- | --- |
| `node --test tests/*.test.cjs tests/*.test.mjs` | **52 passed, 0 failed**: 27 statistics-integrity tests and 25 CJS tests. |
| Player statistic integrity workflow commands | **9/9 local steps passed.** |
| App Shell Sanity workflow commands | **15/15 local steps passed**, including syntax, compact stats, shell, quarters, records, performance, Scorigami, growth, My Teams, search, and stalled-network checks. |
| Share previews PR workflow commands | **2/2 local steps passed**, including renderer validation. |
| All 31 existing `check-*`, `test-*`/`test_*`, and `validate_*` scripts | **31 passed, 0 failed.** Some overlap the workflow checks. |
| Diff whitespace | Passed. |

Workflow commands that generate data ran in a temporary checkout copy, without Git pushes or deployment steps. Their generated files did not replace newer website data in this branch. Initial stale-check failures were diagnosed and corrected; the final runs above all exited successfully. Detailed step results are in [results.json](pr-179-review/results.json).

GitHub's API still returns **Forbidden**, so new hosted run conclusions cannot be claimed from local results. A push to the existing branch updates [PR #179](https://github.com/RuralUtahSports/rural-utah-sports/pull/179) and triggers its applicable checks.

## Browser and layout verification

Checked all **70 root HTML pages at 390px and 1440px widths: 140 navigation checks passed**. Every shared navigation request used the canonical October 23 key; standalone navigation and mobile menus worked, and shared menus did not expose the private awards editor. No JavaScript page exceptions remained. Initial parallel-run timeouts were rerun serially; canonical-domain assets referenced through production `<base>` URLs were served from the local checkout, with unrelated external requests blocked. This validates the checkout, not a deployment.

Also exercised mobile and desktop navigation from Rankings through Stat Leaders → Football Stats; confirmed the updated rankings labels, Ian Mair's 1,397 passing yards / 101–195 profile line, South Summit's Stats tab, season leaders, and Week 10 filtering. Verified Uintah's authentic Speed Cut sponsor image/contact and ratings placement below the dashboard at both widths. Screenshots are in [pr-179-review](pr-179-review). External school-logo hosts were blocked during local testing; sponsor artwork was loaded from the preserved local file.

No page-level horizontal overflow appeared on the 70 mobile pages. Six desktop pages showed existing overflow: Game Center, Madden Ratings, Power Ratings, Playoff Pick'em, the Game Center preview, and the team page. Their layout code was not changed in this follow-up. Authenticated awards dialogs and remote publication were not exercised.

## Generated-data and statistics integrity

- Parsed all 262 data JSON files changed by the original repair relative to `main`; no malformed JSON was found.
- Roster contents and all season row identities match the upstream dataset: **118 teams, 6,915 category rows**. No player IDs, names, or jersey numbers changed.
- Game metadata matches **1,127 team games**; no duplicate player IDs occur within a game. Six contradictory game cells remain explicitly flagged.
- Repaired full/compact season datasets, game data, and the regular-season overlay are byte-for-byte unchanged by the CI follow-up. The locked awards snapshot and weekly winners remain byte-for-byte identical to `main`.
- Every candidate correction in the separate award overlay is dated through **October 16**. No playoff figures were added to locked awards.
- No new player statistics were invented or manually replaced. Alma Barlow's TD conflict, Gordon/Gordan's incomplete source evidence, missing Monument Valley/UMA-Hillfield reporting, and the existing discrepancy flags remain unresolved and visible.

The PR is ready for final code/data review, subject to checking the hosted rerun results. This does not certify unresolved source statistics. No merge, deployment, or published award changes were performed.

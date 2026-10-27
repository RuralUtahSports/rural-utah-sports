# Draft: 2026 regular-season statistics and competition scope

This draft is separate from website PR #180 and held statistics PR #179. It was created from main at `1dcad3ab7`. It is **not ready to merge or deploy**: classification and source review remain incomplete. No production dataset has been published.

## What changed

- Added game classification from specific schedule/competition evidence. There is no October 16 cutoff or date-only fallback. Unknown, conflicting, moved and placeholder games do not qualify as regular-season evidence.
- Reviewed South Summit, Water Canyon and Ben Lomond schedules. Thirty explicitly reviewed regular-season matchups and three postseason matchups are recorded with URLs. Stored official bracket evidence classifies additional concrete postseason matchups; those cached classifications are not a fresh independent source certification. Matchups, dates and opponents must match; reschedules need new evidence.
- Audited all 118 stored school datasets, 6,922 season rows and 24,238 numeric cells against cached MaxPreps season/game data and classified game observations. Six selected web source observations are recorded separately. This is comprehensive stored-data coverage, **not independent certification of every current source total**.
- Preserved 180 original cached postseason player box-score rows in a separate export. Original game caches remain unchanged and available; playoff availability does not prove complete player/category reporting.
- Added a source-review publication gate to compact season metrics/leaderboards, team season stats and season record-alert generators. Team score/record aggregation uses classified regular-season finals rather than all-season standings. Unknown finals block regeneration rather than creating partial team records.
- Disabled the legacy automatic season-reconciliation CLI. Team-level box-score presence never established per-player/category/field completeness. It must not overwrite verified retained totals with partial sums. A reviewed cell decision path must replace it before reactivation.
- Award special-teams candidates keep their identities, but cumulative supplements without reviewed regular-season game evidence no longer influence scoring. The frozen award snapshot, scoring core and saved-winner write paths were not changed.
- Restricted five existing data-producer push triggers to main. They otherwise check out/push main even when triggered by changes on a review branch. No producer workflow was dispatched or disabled on main.

## Only applied numerical correction

Alma Barlow (Water Canyon), Receiving `YARDS/RECEP.`: **8.33 → 7.38**. Existing 118 receiving yards and 16 receptions are unchanged; 118 / 16 = 7.375, rounded to 7.38. Deseret reports 7.38, and the reviewed MaxPreps schedule shows no completed playoff game for this team. Source provenance and before/after evidence are recorded in `regular-season-cell-decisions-2026.json`. No yards, touchdowns, attempts, receptions, scores or records were replaced. The locked award snapshot was not rewritten.

## Findings that must not be silently resolved

- **1,413 cached source-season disagreements**, **61 known regular-game-sum review flags**, **14 conflicting regular-game cells**, **two remaining rate inconsistencies**, and two schools without season stats. These flags are not proof that the larger value is correct.
- Game inventory across source/team views: 96 regular, 11 postseason, **2,054 unknown**. These counts are not distinct statewide matchups; multiple source/team views exist. Unknown phase is excluded, not guessed from a date or absence from a bracket.
- Ian Mair: RUS retains 679 passing yards; reviewed Deseret shows 1,542 and MaxPreps 1,397. South Summit has no completed playoff game on the reviewed schedule. The discrepancy therefore needs reporting-date/game-coverage review even after postseason exclusion. Neither source value was substituted.
- Alma Barlow: retain 2,424 rushing yards and 27 rushing TD. Deseret supports those values; historical competing TD evidence remains unresolved. MaxPreps total touchdowns is a different metric and cannot be substituted for rushing touchdowns.
- DaShawn Gordan/Gordon: reviewed Deseret now shows 740 rushing yards, while cached/issue/RUS figures differ. Ben Lomond's October 23 Grantsville game is explicitly a playoff game. Do not subtract a partial playoff line from a cumulative number or overwrite the retained 26 without identity, reporting-date and field-complete coverage review.
- Monticello's reviewed Deseret page has blank passing-yard cells. A blank source is unknown, not zero or permission to replace another verified value.
- UHSAA's current calendar and cached competition data can change. Recheck reschedules and event classifications before approving them. The observations were retrieved through web tools which can return cached pages; successful retrieval is not proof a live import is fresh.

Source links:

- [South Summit Deseret stats](https://sports.deseret.com/high-school/school/south-summit/football/stats/) and [MaxPreps player stats](https://www.maxpreps.com/ut/kamas/south-summit-wildcats/athletes/ian-mair/?careerid=b78d5l6f5nv77).
- [Water Canyon Deseret stats](https://sports.deseret.com/high-school/school/water-canyon/football/stats/) and [MaxPreps schedule](https://www.maxpreps.com/ut/hildale/water-canyon-wildcats/football/schedule/).
- [Ben Lomond Deseret stats](https://sports.deseret.com/high-school/school/ben-lomond/football/stats/) and [MaxPreps schedule](https://www.maxpreps.com/ut/ogden/ben-lomond-scots/football/schedule/).
- [Monticello Deseret stats](https://sports.deseret.com/high-school/school/monticello/football/stats/) and [UHSAA competition calendar](https://www.uhsaa.org/calendar/?sport=Football).

## Release gates and current limitations

`regular-season-stat-review-2026.json` deliberately contains **no approved file hashes**. Current source datasets are not certified merely because their labels say “season” or “regular season.” Compact/team/record rebuild commands intentionally fail with `REGULAR_SEASON_REVIEW_REQUIRED` before writing outputs. This prevents publishing unseparated totals; it also means existing App Shell and Season Record regeneration checks are expected to be blocked in this draft. These are real release blockers, not passing checks.

Existing stored frontend totals are retained pending approval. This draft does not claim that every existing page is already serving certified regular-season figures. Before release, finish classification/field review, prepare coherent approved player/team/compact/shard inputs, bind exact hashes to reviewed source evidence, and verify every consumer (profiles, leaderboards, team stats, records, exports, and awards) against those approved inputs. Do not clear the guard with a blanket approval. Full source fetches, field completeness and authenticated saved-winner/graphic checks remain outstanding.

The frozen All-Region snapshot declares regular-season scope, but its individual cells are not independently certified here. Its hash and saved selections remain untouched. No automatic winner re-selection, remote save or publication was performed. Speed Cut and website fixes are unchanged.

## Validation

The dedicated competition/preservation suite passed 12 tests, including actual generator commands that refuse unapproved inputs without changing retained datasets or locked awards. Shared/search runtime checks passed. The existing CJS suite has 16 passing tests and one pre-existing `ratings-nav1` failure; that website test correction belongs to PR #180 and was intentionally not imported here. The unchanged player-single-game record validator also fails on an existing `273541|HERRIMAN|Filisi Filipe` rushing-TD duplicate; no record was deduplicated or overwritten. Additional final results are recorded in the PR body.

Run the read-only audit with `node scripts/audit_regular_season_2026.mjs`. Optional `--output=/tmp/review --include-cells` writes the complete cell review outside the repository. The dedicated CI workflow has read-only repository permissions and uploads audit artifacts; it performs no data publication.

Final validation: 12 dedicated tests passed on Node 22.23.4 and Node 24.19.0; six awards-shell page loads at 390px/1440px passed without JavaScript exceptions or page overflow. Remote requests were blocked; authenticated candidate dialogs and saved publication were not exercised. Existing source data/assets were checked against the base: 1,989 protected files unchanged; the only source-stat difference is the reviewed receiving-average cell and its provenance.

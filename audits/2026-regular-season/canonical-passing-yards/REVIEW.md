# PR #181 — canonical passing-yard migration; synchronization held

Local proposal only. No commit, push, merge, deployment, workflow dispatch, branch replacement or statewide audit. Existing PR head remains bc77b3ca384b19c7fc9ad1b6b44f27639ac049b4. Latest fetched main is b17df1d4ee00b7ced2bf75fe570fdb60183d0502; merge baseline 492d8848af966c68ad8e5f1cbf243914fedf4886. PR draft status was not changed.

## Individually verified corrections installed locally

| Canonical field | Before | After |
|---|---:|---:|
| Kingston Wright, Manti, October 15 Passing.YARDS | Unknown/absent | 174 |
| Kingston Wright, regular-season Passing.YARDS | 2,858 | 3,032 |
| Owen Williams, Canyon View, October 15 Passing.YARDS | Unknown/absent | 243 |
| Owen Williams, regular-season Passing.YARDS | 1,922 | 2,165 |

Both October 15 games already exist as the same Manti–Canyon View contest in the player-game primary dataset, but previously contained kicker-only player data. Add only each quarterback's Passing.YARDS to the existing contest; do not add games or infer any absent statistic as zero. Stable player IDs, jerseys, classes, heights and weights are checked by the existing correction applier. Ten positively classified regular-season game reports establish each season yardage total. The separate October 23 playoff is excluded by competition evidence, never by a fixed cutoff or an incomplete playoff subtraction.

Authoritative October 15 corroboration:

- [Deseret game](https://sports.deseret.com/high-school/football/game/2026-10-15/manti-football-vs-canyon-view-football/273399)
- [MaxPreps game](https://www.maxpreps.com/ut/football/game/canyon-view-cedar-city-vs-manti/10-15-2026/?c=99c90cd7-961f-4ced-afd5-94cbc74e92b9)
- [Manti Deseret season page](https://sports.deseret.com/high-school/school/manti/football/stats) corroborates Kingston's 3,032. Canyon View's stale Deseret season snapshot is not used to replace newer evidence.

All ten individual source URLs, dates, opponents and yard values for each player are in `regular-season-corrections-batch-3-2026.json`. Individual provider publication dates are unknown and explicitly null; observation at 2026-10-27T17:53:06Z and separately stored provider team-season timestamps are not substituted as game publication dates. No completion, attempt, touchdown, interception or rate field is authorized by this batch.

## Before/after safeguards

Before: the legacy Manti 3,032 downstream override concealed a canonical nine-game 2,858; removing that override exposed a rebuild regression. Owen's ninth-game primary snapshot also lacked the verified tenth-game 243. Those fields were not in the reviewed registry.

After: both regular-season yardage totals and the two game cells are canonical reviewed decisions in the existing registry. Existing import finalization retains published season fields, restores reviewed game cells even after an importer drops a game/player, and rejects unexpected newer retained values for fresh review. No new temporary override or larger-value-wins rule is introduced. Reapplying all 60 reviewed decisions reports zero changes; the original 56 decision files are byte-identical.

The applier now supports a narrow passing-yard sum method that requires a reported numeric yardage field in every evidence game, unique competition-classified regular-season games, matching identity and the exact sum. Unknown publication dates require an explicit evidence note and a matching valid observation timestamp. The original season-total corroboration path remains intact.

Batch 3 is explicitly held out of the published projection pending dependent-field review. The publisher still validates that its canonical corrections are installed, but does not add them to season leaderboards or candidate statistics. The existing publication file is byte-identical and its existing 44 season/12 game fields are unchanged. Team aggregates are not rebuilt or accepted.

## Passing, rushing, receiving, combined offense and rankings

These team quantities are stored values, not newly certified complete totals. All remain unchanged locally.

| Field | Main before/after | Existing draft before/after |
|---|---|---|
| Manti passing yards | 3,401 / 3,401 | 3,401 / 3,401 |
| Manti rushing yards | 807 / 807 | 807 / 807 |
| Manti receiving yards | 2,932 / 2,932 | 2,932 / 2,932 |
| Manti combined offense | **4,208 / 4,208** | **4,208 / 4,208** |
| Canyon View passing yards | 1,944 / 1,944 | 1,944 / 1,944 |
| Canyon View rushing yards | 1,626 / 1,626 | 1,626 / 1,626 |
| Canyon View receiving yards | 1,723 / 1,723 | 1,723 / 1,723 |
| Canyon View combined offense | 3,570 / 3,570 | 3,570 / 3,570 |
| Canyon View published passing rank | **26 / 26** | Existing draft **37 / 37**, held |
| Manti record | 2–7 / 2–7 | 2–8 / 2–8 |
| Canyon View record | 6–3 / 6–3 | 7–3 / 7–3 |

Kingston 3,032 is his individual passing total, not Manti's combined offense. Adding the two canonical yards fields cannot itself certify rates, complete-team sums or a new statewide rank.

Actual local source/view value differences: four primary cells plus five mirrored cells = nine occurrences. Manti's compact metric was already 3,032, so it does not change. No other value field changes. Evidence/source metadata, the metrics source-byte count and two new game-player identity containers also change. Passing/rushing/receiving/defensive/kicking/return values for every other player remain intact. No score, points-for/against, record, region record, standings, RPI, locked award, historical record, logo, sponsorship, navigation or basketball file is edited. All 44 original entries / 31 contests, 16 direction reversals and resumed-game single-count behavior pass existing tests. The two October 15 finals remain in the draft; no score restoration patch is applied to main.

## Six synchronization conflicts

Counts below are semantic leaf differences between current main, PR head and local proposal, including metadata; they are not counts of authorized corrections. Every differing field has merge-baseline/main/PR/proposed values in [six-conflicts-exact-fields.csv](six-conflicts-exact-fields.csv).

| File | Differing leaves | Leaves changed divergently on both branches | Resolution |
|---|---:|---:|---|
| deseret-stat-metrics-2026.json | 77 | 1 | Hold; preserve new source-backed canonical yardage separately from incoming reported season values. |
| team-stats-2026.json | 532 | 38 | Hold; no regenerated or wholesale selection. Includes 107 teams with differences, including metadata. |
| team-current-data/ben-lomond.json | 136 | 0 | Hold; preserve source identity/game repairs and reviewed cells while retaining legitimate newer main content. |
| team-current-data/duchesne.json | 38 | 0 | Same field-level overlay proposal; no whole-shard selection. |
| team-current-data/monticello.json | 442 | 0 | Same; reviewed player corrections and dependencies must remain. |
| team-current-data/south-summit.json | 396 | 0 | Same; preserve all reviewed player cells. |

Zero divergent leaves in a shard does not certify an automatic textual merge or a whole-side selection: the branch contains intentional reviewed source and identity work. All six conflicts remain unresolved and no synchronization is applied. [Main versus draft team-stat, standings and official RPI fields](main-versus-local-protected-fields.csv) enumerate pre-existing protection differences; these are not newly accepted edits. Latest main includes additional schedule, ELO, RPI and historical-record updates after the previous investigation, so the previous 53-team preview cannot authorize today's merge.

## Gates and tests

- **63/63 pipeline tests pass**, including seven new canonical migration regressions: positive ten-game sums, idempotence, null reporting dates, stale/dropped import protection, delayed coach update hold, missing/duplicate/postseason rejection and unchanged public projection.
- **29/29 website tests pass.** Shared and search runtime checks pass.
- **24/24 mobile/desktop Chromium policy checks pass**, 390 and 1440 widths, including both resumed games counting once. Screenshots are in `/tmp/rus-pipeline-browser`.
- Existing correction registry check: **zero reapplied cells**. Existing published projection check: **passes, exact bytes retained**.
- Local protected-file hash gate: **passes**. Exact hashes and nine value occurrences: [before-after-integrity.json](before-after-integrity.json). No unintended player or team-total changes.
- **Aggregate regeneration gate still fails** at `teams.MANTI.passing.yardsPerAttempt`; stored 8.81 versus isolated rebuilt 9.63. Canonical passing yards now correctly preserve the 4,208 combined offense, but the primary completion/attempt inputs do not match the published aggregate. Leave both inputs and published rate untouched pending their own evidence review. A separate source disagreement remains over Kingston's Juab completions (35 versus 33); no broad replay.
- The isolated rebuild would also change Canyon View's team offense to 3,813 and derived ranks/rates. That output is diagnostic only and is **not accepted**. [Held rebuild values](held-isolated-rebuild.json).
- **Live publication snapshot gate correctly refuses** this old/dirty branch: “Publishing snapshot changed; rerun from latest main.” No hosted GitHub checks dispatched and no claim that release checks passed.
- Historical player-record validator still fails on unchanged duplicate `273541|HERRIMAN|Filisi Filipe`. Remains held.
- `git diff --check` passes. Initial fixture-copy failures caused by the new registered batch were corrected by deriving fixture paths from the registry; the final complete pipeline run passes.

## Remaining holds / safe next step

Do not synchronize or publish yet. Preserve main's published values as the before snapshot, identify each authorized non-stat website change from newer main, and reconcile generated shards by source-backed fields rather than old PR snapshots. A future rank comparison must bind distinct before/after roster AND standings snapshots. Do not weaken the gate, allowlist rank 26, or apply the prior 51-field proposal.

The canonical-only patch is reviewable locally; synchronization and publication remain blocked by the aggregate completion/rate discrepancy, current protected-field conflicts and incomplete team/peer certification. Three disputed physical venues, neutral-site schema, Maple Mountain score discrepancy, historical duplicate and the five additional source disagreements remain held. All merged basketball, logo and navigation work on main is untouched. No final push authorization is inferred.

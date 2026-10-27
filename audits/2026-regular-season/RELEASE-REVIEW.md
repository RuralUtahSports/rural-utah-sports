> Current technical follow-up: see [PIPELINE-REVIEW.md](PIPELINE-REVIEW.md). Regular-season rankings now use the reviewed publication boundary; retained source caches below are not a complete regular-season certification. Muse owns the unmatched-game investigation.

# PR #181: verified small-school corrections, batch 1

The current focus is actual player corrections, not another audit sweep. This batch changes **56 cells: 44 season fields and 12 individual-game fields**. The evidence ledgers are registered in `regular-season-correction-batches-2026.json` (batches 1 and 2); every decision includes original value, verified replacement, source, reporting date and included games. Larger audit exports in this directory are the earlier baseline and have not been regenerated as new accuracy claims.

| Player | Verified changes |
| --- | --- |
| Ian Mair, South Summit (2A) | Passing yards 679 → 1,397; 57–117 → 101–195; passing TD 7 → 16; interceptions 4 → 2. Rushing yards 81 → 153, carries 6 → 14, TD 2 → 3. Rates follow verified operands. |
| Brody Larsen, South Summit (2A) | Rushing yards 623 → 1,251, carries 83 → 158, TD 6 → 14. Receiving yards 64 → 203, catches 9 → 17, TD 0 → 3. Rates updated. Defensive tackles 43, sacks 1 and interceptions 3 checked and retained. |
| Cache Young, Monticello (8-Player) | Passing yards 1,461 → 2,230; 80–150 → 122–219; TD 29 → 40. Rushing yards 81 → 119; carries 26 → 37. Seven passing interceptions and two rushing TD retained. Rates updated. |
| Alec Thomas, Duchesne (1A) | PAT and kicking points 19 → 54; zero field goals retained. Both providers report 54; ten explicit game PAT entries sum to 54, including an explicit zero. |
| Cash Rockhill, South Summit (2A) | Receiving catches 5 → 11, yards 51 → 140, TD 1 → 3; average 10.2 → 12.73. Deseret and the current-year MaxPreps profile agree; seven reported player games are regular-season. |
| Cash Mack, Monticello (8-Player) | Rushing carries 6 → 7, yards 49 → 75, TD 0 → 1; receiving catches 22 → 36, yards 407 → 672, TD 9 → 13; rates updated. Nine player games corroborate the source totals. School/full name/#7/class 2028 match; differing provider height and weight are documented and RUS physical metadata retained. |
| Canyon Christensen, Monticello (8-Player) | Receiving catches 2 → 9, yards 48 → 187, TD 3 → 5; average 24 → 20.78. Eight reported player games; current-year totals used, never career totals. |
| Dashawn Gordon / DaShawn Gordan, Ben Lomond (3A) | Recovered carries and yards for six regular games (12 cells) from the identified MaxPreps player's dated updates. Existing RUS ID/name retained. No season total replaced. |

## Evidence and scope

South Summit has nine played stat games plus a documented forfeit; Monticello has nine regular games; Duchesne has ten. Their next games are explicitly marked Playoff on reviewed provider schedules. No date-only cutoff or playoff subtraction is used. Expected matchups and dates are checked against `competition-scope-review-2026.json`.

Selected MaxPreps season snapshots report October 19 for South Summit/Monticello and October 16 for Duchesne. The nine unique game entries reconcile to Mair's 1,397 and Larsen's 1,251; Monticello's nine reconcile to Young's 2,230. Source tables and reporting dates are stored in the batch ledger, not inferred from a processing timestamp. Web responses can be cached; older profiles are not silently treated as current data.

Deseret was compared, not assumed infallible. South Summit's October 16 box repeats opening-game core cells (Mair 250 yards/13–30 and Larsen 85 yards/17 carries), conflicting with the date-specific MaxPreps logs. Deseret's 1,542/1,131 season figures remain documented source disagreements; the chosen replacements are dated provider totals corroborated by distinct regular games. Larsen's separately cached September 29 profile covers only six games, and is not used to replace the later nine-game snapshot. Deseret's Monticello passing-yard cells are blank, not zero.

Gordon's identity matches school, #2, class 2027, height and weight across providers. The regular games corrected are Sep 11, Sep 18, Sep 25, Oct 2, Oct 8 and Oct 14; each source entry has its own reporting date. His source 875 yards is an 11-game cumulative figure including the Oct 23 playoff. Missing complete regular/playoff field coverage means neither 875, a six-game sum, nor a guessed subtraction is a verified replacement for his retained season figure. His 26 season yards remain unresolved rather than overwritten.

## Publishing and preservation

Synchronized with main at `4c74f5177`, including merged PR #180 navigation/runtime/team fixes, PR #182's hidden unverified homepage record sections, and newer automatic score/record updates. Generated-data conflicts retained main's current payloads before replaying only reviewed player changes; all unrelated scores, records, sponsorships and locked awards were compared to this main snapshot.

Publishing now captures the published season/game baseline before imports. The finalizer retains published season cells and their provenance, then validates and applies registered evidence batches before metrics and team shards are built. Raw Deseret/MaxPreps candidates continue to refresh; a 14-day Actions artifact retains the Deseret candidate for review. Roster/game/score publishing can continue. Season imports are proposals until field review; retention does **not** certify existing values as correct or regular-season-only. Unexpected reviewed values or identity changes fail safely instead of silently replacing them.

Reconciliation excludes schedule-classified postseason and unknown games from candidates and never promotes a team-level box-score sum directly to a player's season fields. Missing player fields remain unknown. Reviewed Gordon game cells survive stale/missing imported lines; playoff source boxes are retained separately. The applier is repeatable and uses original-value preconditions, unique source games and verified operands.

Three automatic season writers share a concurrency group. Before publication each fetches main and requires the original checkout SHA; it stops on a changed main, and a push race is rejected normally. Removed the fallback job's reset/copy/retry loop and other writers' automatic rebases. This prevents an older generated payload from overwriting new corrections or scores after a concurrent main update. An additional cause was reproduced after push: RPI automation committed `1f0beeb8f` directly to the review branch because its push trigger had no branch filter. Both RPI writers now restrict pushes and execution to main. The unrelated generated RPI changes were restored to synchronized main data; no source totals were guessed. Other legacy one-off publishers still warrant a broader trigger review. Main will still advance independently through source/score/record workflows: synchronization is a snapshot, not a permanent condition. Long imports can require a rerun when another main writer advances the branch; this favors preserving newer data over publishing a stale snapshot. No live workflow was disabled or dispatched.

Primary season data, compact metrics, the four affected team shards, Gordon's six game lines, and team aggregates/rankings are synchronized. Team aggregate changes are derived with the existing generator on before/after copies; unrelated saved values must match the before result. Scores, team win/loss records, player record datasets, source caches, all existing awards, locked inputs/winners and Speed Cut assets/configuration remain unchanged. The earlier verified Alma Barlow receiving-rate correction remains.

This remains a draft. The initial small-school batch precedes expansion to 4A–6A; it does not certify every field for every school. Source disagreements and incomplete field coverage stay open. No merge or deployment is authorized.

## Current statewide review and unresolved work

`current-review-coverage.json` records the current 118-school comparison by classification and category, with source URLs, provider reporting dates, reviewed-cell counts and unresolved player fields. The audit now includes passing completion/attempt disagreements, additional defensive fields, kicking aliases and return TDs. Reviewed schedule evidence covers 44 smaller-classification schools first, then 74 schools in 4A–6A. Opponent aliases and conflicting/rescheduled dates are not guessed; 44 cached source/team game entries still have unknown competition matching.

The comparison covers 6,922 season rows and 27,516 numeric cells. Remaining findings are **review leads, not verified replacement totals**: 1,306 cached scalar disagreements, 52 completion/attempt disagreements, 547 jersey-mismatch cell observations (not 547 distinct players), 697 conflicting game-field observations and 687 partial known-game sums exceeding retained totals. These sets overlap. Source responses may be cached; file timestamps are never substituted for provider reporting dates. Missing season stats remain for Monument Valley and UMA-Hillfield.

Manual verification is still needed for Gordon's season rushing total; South Summit's duplicated Deseret box and conflicting totals; differing player jersey/physical metadata; individual defensive field completeness; the four date-conflict team views around Sep 19 (Maple Mountain/Timpview and Salem Hills/Timpanogos); and ambiguous out-of-state opponents. Kick/punt return **yardage and attempts are not represented in the current import schema**; return TD coverage alone does not certify return statistics. Do not invent those missing fields.

This draft remains **release-blocked**. Existing retained totals and current season leaderboard inputs are not all certified regular-season-only; preserving them prevents destructive guesses but does not resolve possible postseason contamination. A full source-reviewed regular-season publishing view and return-stat coverage are still necessary before this can meet the entire-database goal. No date-cutoff or subtraction of incomplete postseason logs is an acceptable shortcut. All historical data, scores, record datasets, award inputs/winners and sponsorships remain unchanged relative to synchronized main.

## Validation

- 27 existing website tests pass after merged PR #180/#182.
- 27 scope, correction and import-protection tests pass on Node 22 and Node 24.
- Shared-runtime, search-runtime and locked award role-scoring checks pass. Ten additional app-shell, payload, game-center, record-format, performance and feature checks pass.
- Twenty Chromium checks cover eight corrected profiles and South Summit's Stats tab and the 8-player receiving leaderboard at 390px and 1440px, with no JavaScript exceptions; mobile and desktop screenshots reviewed.
- Reapplying both batches and aggregate synchronization produces zero changes. All team games/W-L-T/points/records match synchronized main.
- The existing player-record validator still fails on duplicate `273541|HERRIMAN|Filisi Filipe` in rushing touchdowns; the protected historical/record dataset is unchanged. Hosted checks must pass on the final commit.

No merge or deployment has been performed. PR #179 stays on hold.

# PR #181: verified small-school corrections, batch 1

The current focus is actual player corrections, not another audit sweep. This batch changes **40 cells: 28 season fields and 12 individual-game fields**. The evidence ledger is `regular-season-corrections-batch-1-2026.json`; every decision includes original value, verified replacement, source, reporting date and included games. Larger audit exports in this directory are the earlier baseline and have not been regenerated as new accuracy claims.

| Player | Verified changes |
| --- | --- |
| Ian Mair, South Summit (2A) | Passing yards 679 → 1,397; 57–117 → 101–195; passing TD 7 → 16; interceptions 4 → 2. Rushing yards 81 → 153, carries 6 → 14, TD 2 → 3. Rates follow verified operands. |
| Brody Larsen, South Summit (2A) | Rushing yards 623 → 1,251, carries 83 → 158, TD 6 → 14. Receiving yards 64 → 203, catches 9 → 17, TD 0 → 3. Rates updated. Defensive tackles 43, sacks 1 and interceptions 3 checked and retained. |
| Cache Young, Monticello (8-Player) | Passing yards 1,461 → 2,230; 80–150 → 122–219; TD 29 → 40. Rushing yards 81 → 119; carries 26 → 37. Seven passing interceptions and two rushing TD retained. Rates updated. |
| Alec Thomas, Duchesne (1A) | PAT and kicking points 19 → 54; zero field goals retained. Both providers report 54; ten explicit game PAT entries sum to 54, including an explicit zero. |
| Dashawn Gordon / DaShawn Gordan, Ben Lomond (3A) | Recovered carries and yards for six regular games (12 cells) from the identified MaxPreps player's dated updates. Existing RUS ID/name retained. No season total replaced. |

## Evidence and scope

South Summit has nine played stat games plus a documented forfeit; Monticello has nine regular games; Duchesne has ten. Their next games are explicitly marked Playoff on reviewed provider schedules. No date-only cutoff or playoff subtraction is used. Expected matchups and dates are checked against `competition-scope-review-2026.json`.

Selected MaxPreps season snapshots report October 19 for South Summit/Monticello and October 16 for Duchesne. The nine unique game entries reconcile to Mair's 1,397 and Larsen's 1,251; Monticello's nine reconcile to Young's 2,230. Source tables and reporting dates are stored in the batch ledger, not inferred from a processing timestamp. Web responses can be cached; older profiles are not silently treated as current data.

Deseret was compared, not assumed infallible. South Summit's October 16 box repeats opening-game core cells (Mair 250 yards/13–30 and Larsen 85 yards/17 carries), conflicting with the date-specific MaxPreps logs. Deseret's 1,542/1,131 season figures remain documented source disagreements; the chosen replacements are dated provider totals corroborated by distinct regular games. Larsen's separately cached September 29 profile covers only six games, and is not used to replace the later nine-game snapshot. Deseret's Monticello passing-yard cells are blank, not zero.

Gordon's identity matches school, #2, class 2027, height and weight across providers. The regular games corrected are Sep 11, Sep 18, Sep 25, Oct 2, Oct 8 and Oct 14; each source entry has its own reporting date. His source 875 yards is an 11-game cumulative figure including the Oct 23 playoff. Missing complete regular/playoff field coverage means neither 875, a six-game sum, nor a guessed subtraction is a verified replacement for his retained season figure. His 26 season yards remain unresolved rather than overwritten.

## Publishing and preservation

Removed the previous draft's blanket rebuild blockers. Existing metric, team-stat, season-record and reconciliation producers are restored to the base implementation; no full-file certificate is required to keep publishing. Producer push filters prevent this review branch from triggering writers on main. No main workflow was disabled, dispatched or otherwise modified remotely.

The explicit batch applier validates stable identities, original-value preconditions, source season values, unique game sums and competition phase before writing. It is repeatable and rejects unexpected/newer retained values. It does not freeze all future source totals or convert missing cells to zero. It is not automatically activated in scheduled workflows: durable import/reconciliation integration and revalidation against the then-current main remain release work before any eventual approval.

Primary season data, compact metrics, the four affected team shards, Gordon's six game lines, and team aggregates/rankings are synchronized. Team aggregate changes are derived with the existing generator on before/after copies; unrelated saved values must match the before result. Scores, team win/loss records, player record datasets, source caches, all existing awards, locked inputs/winners and Speed Cut assets/configuration remain unchanged. The earlier verified Alma Barlow receiving-rate correction remains.

This remains a draft. The initial small-school batch precedes expansion to 4A–6A; it does not certify every field for every school. Source disagreements and incomplete field coverage stay open. No merge or deployment is authorized.

## Validation

The competition-scope and verified-batch suites pass all 20 tests on Node 22 and Node 24. Shared-runtime, search-runtime and locked award role-scoring checks pass. The applier and aggregate synchronizer both report zero changes when reapplied. Twelve Chromium checks cover five player profiles and the South Summit Stats tab at 390px and 1440px with no JavaScript exceptions.

The existing CJS website test still reports the baseline `ratings-nav1` expectation, addressed separately in PR #180. The existing player-record validator has the previously documented duplicate `273541|HERRIMAN|Filisi Filipe` rushing-TD record; this batch does not modify that dataset. These are not reported as passing checks. Hosted checks must be reviewed on this commit before approval.

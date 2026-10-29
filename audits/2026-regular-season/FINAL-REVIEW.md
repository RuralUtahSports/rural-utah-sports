# PR #181 — final technical reconciliation

This review supersedes the synchronization holds in the earlier pipeline, release and game-handoff reviews. Existing PR and branch retained. Nothing merged into main or deployed. Initial main snapshot: **872857cad9efbb8d2dd6ebb533b203bbc920c5b6**; final synchronized main snapshot: **87278ff2aed8898107c5d7d600abe228bb2cf781**; previous shared baseline **492d8848af966c68ad8e5f1cbf243914fedf4886**; previous published PR head **bc77b3ca384b19c7fc9ad1b6b44f27639ac049b4**. The subsequent local canonical migration is preserved as commit b803925a7. Final commit and hosted check status are recorded in PR #181 after the authorized push; they cannot be embedded into their own commit.

## Final automatic-main advancement

While initial hosted checks ran, main advanced through seven automatic commits to 87278ff2a. Its verified-finals sync independently restored both October 15 finals. All 604 normalized contest keys, designated teams and scores, all 118 classification records and region records/order are identical to the proposed restoration. Raw sheet dates use slash formatting where the earlier proposal used ISO; provenance counts are 55 sheet/549 Deseret rather than 53 sheet/551 pinned Deseret. The only new Git conflict is standings serialization/provenance. Retain current main's exact standings payload, its newer weekly/schedule/historical/site data, and the two protective owner-verified pins. No source-player cache changed in that main advancement.

**Against final main: zero final additions, zero record/points/order changes and zero RPI changes.** Both verified finals remain counted once. The four team-page caches retain the corresponding correct final scores/records. The restoration table below documents the initial missing-final snapshot and its authorized result, now already present on main. The refreshed preservation report and three-way tables use final main, not the obsolete 53-team snapshot.

## Reconciliation and exact change boundaries

A true main merge retains newer basketball, owner-supplied transparent Anthem Prep logo, navigation, source reports, scores, historical records, sponsorships and RPI. Generated conflicts are reconciled from main plus evidence-authorized field changes, rather than selecting a whole branch. Every original-value/identity/evidence precondition passes against main. Newer main reports outside those decisions remain unchanged and are not newly certified as correct.

The original six conflicts are resolved: compact metrics, team statistics, Ben Lomond, Duchesne, Monticello and South Summit. The later local canonical migration introduced two further shard conflicts, Manti and Canyon View, resolved the same way. [Every baseline/previous-PR/main/reconciled field](final-review/three-way-conflicts.csv) and [per-file resolution summary](final-review/conflicts-summary.json) are committed. The old approximately 53-team preview was a snapshot, not authorization to reuse those old totals; the new comparison covers all 118 team entries.

- Primary season/game data: reapply the original 56 reviewed decisions and four individually verified October 15 yardage decisions to current main, with exact original-value checks. Preserve Alma Barlow's previously reviewed 118/16 = 7.38 receiving rate. No other primary value or identity changes are accepted.
- Compact metrics and nine affected team shards: update only the corresponding reviewed fields and metadata; preserve main's other sections. The preservation gate constructs the expected overlay independently and checks exact semantic equality.
- Team statistics: **41 existing reviewed reported-aggregate adjustments**, comprising South Summit 21, Monticello 19 and Duchesne 1. For every field, current main equals the actual isolated before-calculation and the isolated after-result equals the previously reviewed PR value. The manifest stores these preconditions and source-batch references. These are reported-field sums/rates, **not complete regular-season team certificates**.
- **Zero ranking changes from current main.** All 118 ranking objects are compared exactly. The prior 51-field ranking proposal is not applied. Canyon View remains **26**. Manti's combined offense remains **4,208**, its reported passing 3,401 and rushing 807.
- Two owner-verified final pins and the focused standings restoration are accepted. No existing final is edited or deleted; only these two contests are preserved, once each (already present on final main). No player statistics are inferred from scores. The four affected team-page shards receive only the matching restored record fields and the missing final-score/status fields on the existing October 15 schedule row. Game IDs, other schedules and all player-stat sections remain intact.

[All 118 team before/after quantities, records and ranks](final-review/all-team-before-after.csv) · [All primary season-cell differences, including newer-main reports retained](final-review/all-season-cell-differences.csv) · [Executable preservation result](final-review/preservation.json).

## Original 56 corrections and game identities

All original **44 season and 12 individual-game decisions** remain installed. Both original evidence files and the reviewed-publication JSON are byte-identical to bc77b3ca3. The applier reports zero pending changes. [All 60 original/new decisions with sources, provider-reporting-date limitations, included games and installed status](final-review/verified-decisions.json). The eight originally requested athletes are checked by stable current-year identity, opponent/date, positive regular-season competition evidence, source values and derived operands. Gordon/Gordan's six verified game rushing lines remain; his incomplete season total is retained rather than inferred by subtracting playoff logs.

All 44 original entries still map to 31 existing contests. All 16 direction reversals, 13 unchanged directions and both September 18–19 resumed contests survive. Friday/Saturday views contribute one set of statistics. Raw contest IDs/dates remain intact. [All entries and canonical contests](final-review/44-entries-31-games.json). Existing handoff remains the authority for home designation versus physical venue.

Neutral-site runtime encoding remains held for Bear River–Thunder Ridge and Farmington–Rigby; confirmed ICCU Dome findings are retained without invalid home-team fields. Riverton–Madison, Box Elder–Highland and Hun–Skyridge physical venues remain held. Confirmed West High School venue metadata remains separate from designated home teams.

## October 15 yardage, with publication dependencies held

| Player / canonical field | Main before | Reconciled |
|---|---:|---:|
| Kingston Wright, October 15 Passing.YARDS | Absent, unknown | 174 |
| Kingston Wright regular-season Passing.YARDS | 2,858 | 3,032 |
| Owen Williams, October 15 Passing.YARDS | Absent, unknown | 243 |
| Owen Williams regular-season Passing.YARDS | 1,922 | 2,165 |

Both October 15 source game pages agree: [Deseret](https://sports.deseret.com/high-school/football/game/2026-10-15/manti-football-vs-canyon-view-football/273399), [MaxPreps](https://www.maxpreps.com/ut/football/game/canyon-view-cedar-city-vs-manti/10-15-2026/?c=99c90cd7-961f-4ced-afd5-94cbc74e92b9). Positive sums of ten individually identified regular-season game reports establish the season values; no incomplete postseason subtraction. The existing canonical contest receives each missing quarterback field, without another game. Individual provider update dates are explicitly unknown; observed timestamps are not substituted for them. Full evidence is batch 3.

These four cells remain **canonical-only** until dependent-field review. The existing publication remains exactly 44 season/12 game fields, and frozen All-Region candidate inputs/winners remain untouched. Kingston's separate Juab completion disagreement (35 versus 33), incomplete completion/attempt migration and dependent rates remain unresolved. Manti's stored yards/attempt stays **8.81**, rather than accepting the diagnostic rebuild's **9.63**. Canyon View's complete-team and statewide-peer coverage is incomplete: no replacement for rank 26 is certified. No stale Deseret season snapshot or playoff-inclusive cumulative total is promoted.

## Missing final restoration

The first removal was d28ebf7a2: the standings builder dropped rows whose weekly/cache scores were blank and had no verified override. A prior offline replay showed this also removed the expected tenth regular game from reconciliation coverage; later kicker-only shells did not restore quarterback yardage. The historical transient upstream response cannot be reconstructed beyond this demonstrated failure path.

Both owner-confirmed finals are pinned with regular-season phase and primary sources; the builder independently excludes positively classified postseason games by competition evidence, not date. The October 23 Manti 35–17 Canyon View playoff remains separate and unmodified in source boxes/brackets.

| Team | Initial missing-final snapshot / PF–PA / region | Restored regular-season record / PF–PA / region |
|---|---|---|
| Mountain Ridge | 9–0 / 434–102 / 5–0 | 10–0 / 455–115 / 6–0 |
| Westlake | 7–2 / 180–138 / 4–1 | 7–3 / 193–159 / 4–2 |
| Canyon View | 6–3 / 288–149 / 2–3 | 7–3 / 316–170 / 3–3 |
| Manti | 2–7 / 292–356 / 1–4 | 2–8 / 313–384 / 1–5 |

Exactly 602 → 604 completed regular finals. All 118 standings records/point totals validate against those 604 unique finals; other team records are unchanged. Classification/region ordering changes only as a consequence of those four records. The separate reported team-stat cache keeps its existing published game denominators/rates and ranking snapshot; its stale Manti/Canyon View record metadata is not silently regenerated. Current regular-season record consumers use the restored standings. Official RPI and stored RPI output remain byte-identical to main; a future authorized scheduled RPI refresh can consume the restored finals. No RPI recalculation is accepted here.

## Import and publication fixes: before → after

1. Missing quarterback fields previously depended on temporary downstream floors. They now reside in the existing canonical registry and primary game/season data. Import guards retain them, including after a source drops the game/player. Unknown statistics remain unknown; duplicate and postseason evidence fails closed.
2. The old aggregate sync reconstructed old roster values under a new standings denominator, then treated unrelated rank/rate changes as one regeneration. It now applies only the **41 explicit already-reviewed aggregate decisions**, with before/after preconditions and zero rank decisions. The Manti rate discrepancy is held, not waived or overwritten.
3. The team-stat scheduled job could regenerate incomplete source aggregates and published ranks. It now captures the published baseline, retains the complete rebuild as a review artifact, and preserves published quantities/ranks except explicit reviewed adjustments. **Unreviewed team aggregates and ranks intentionally do not auto-refresh.** Player source imports, reviewed publication, scoreboard and standings continue operationally; this is a deliberate accuracy boundary, not a claim that retained aggregate snapshots are fresh or complete.
4. Full publication preflight validates both player decisions and reviewed team adjustments. A missing manifest, stale checkout, changed main, protected evidence edit or changed verified value stops publication; ordinary fast-forward push rejects the remaining race. No reset/copy/rebase retry.
5. The scheduled standings writer also rebuilt team shards using a legacy rebase. It now joins the football-statistics concurrency group, runs on main only, captures/fetches the exact source snapshot and rejects changes to primary data, reviewed evidence, historical records, sponsorships or each shard's player-stat sections. Schedule/standings output can refresh without replacing verified player data.
6. A final phase-boundary check found that bare standings records do not carry the source URLs used by the player-cache identity bindings: 568 current final keys classify regular-season, while 36 legacy bare keys remain unclassified in that consumer. This is not a new unmatched-player-game investigation: all 44 source-bound entries still resolve to 31 contests. Do not guess aliases or discard already published results. The builder now permits an unknown final only when one identical published contest/score already exists. **New or changed unclassified finals stop publication**, in August or October alike. Missing published finals also stop publication; changing an existing result requires an explicit source-backed verified-final correction. A complete cached 604-final response reproduces all existing scores and 118 records; partial/changed/unknown response regressions pass. No currently published result is changed by this guard. The 36 bare keys remain a documented certification limitation, not a claim that all standings inputs have been independently verified.
7. Hosted scope review now tests the actual PR head, runs all MJS regressions, runs the explicit main-snapshot preservation gate, and exercises both mobile/desktop browser suites with a pinned browser runtime. The original technical guards for the other twelve relevant publishers remain.

Manual one-off historical/archive repair workflows were not dispatched or represented as scheduled current-stat publishers. Historical repair is not authorized by this review.

## Independent score-disagreement investigation

No Maple Mountain–South Pasadena score changes. Fresh provider review still disagrees:

- [MaxPreps game](https://www.maxpreps.com/inter-state/football/game/maple-mountain-spanish-fork-ut-vs-south-pasadena-ca/8-28-2026/?c=5fcc6956-4b49-4b3d-836a-62b97c555e74): 36–14.
- [Deseret August 28 scoreboard](https://sports.deseret.com/high-school/football/scores-schedule/2026-08-28?region=all) and [Deseret roundup](https://www.deseret.com/sports/2026/08/28/high-school-football-week-3-roundup/): 36–7.
- [Los Angeles Times contemporaneous scores](https://www.latimes.com/sports/highschool/story/2026-08-29/high-school-football-scores-california-city-section-southern-section-friday): 36–14.

Independent corroboration exists for 14, but the primary-provider disagreement remains. Preserve the recorded 36–7 pending an explicit source-resolution decision; do not let game matching or an importer choose either number automatically. Other source disagreements remain review leads.

## Validation and known failures

- **86 MJS tests pass on Node 24 and Node 22.** Includes correction, phase, source importer/reconciliation, identity/deduplication, delayed coach update, real Git concurrency, team-stat finalizer, focused final restoration, basketball directory and navigation regressions.
- **29 CJS website tests pass.** Required shared/search runtime checks pass.
- **60 Chromium checks pass** at 390 and 1440: 24 adversarial publication/awards/resumed-game checks plus 36 checks across ten corrected player profiles and eight team pages, with viewport-overflow assertions. No external or non-GET requests permitted by these suites.
- Eleven existing feature checks pass: payload size, app shell, Game Center, record formats, performance, home Scorigami, growth, record watch, My Teams, current-week/stat corrections and final reconciliation.
- MaxPreps game merge, season reconciliation and Deseret kicking self-tests pass. All 118 standings rows match 604 unique results. Registry, publication, explicit aggregate and full source-snapshot preservation checks pass. Diff whitespace checks pass.
- Fresh read-only source audit: 118 schools, 6,926 season rows, 27,527 numeric scalar cells; 2,166 regular team-game entries, 12 postseason entries, zero unknown entries under current evidence. These counts are **coverage/inventory**, not statewide statistical certification. It reports unresolved source/identity/coverage disagreements; no audit findings are automatically accepted.
- Initial combined test run exposed main's basketball logo test still expecting the WebP URL. The test now checks the actual merged transparent SVG URL; **no logo, asset, branding or page change**. Final suites pass.
- Historical record validator still fails on unchanged `273541|HERRIMAN|Filisi Filipe`. Main's historical files are preserved exactly; no hidden repair or validator suppression. This remains a known data-quality limitation. Read-only inspection found two Herriman rushing-TD entries with the same game ID/player and four TD, dated September 18 and September 19; Brody Crayk has related duplicated date variants. The historical merge uses team/player/date/category as its deduplication key, while validation keys by game ID/team/player. The date disagreement can therefore survive the importer and fail validation. No canonical historical date is selected and neither record nor historical merge code is changed without a separate reviewed repair. See [duplicate evidence](final-review/historical-duplicate-evidence.json).
- Hosted Actions must be read on the final pushed SHA; local success is not a hosted pass. PR description records the resulting runs and final status.

## Review boundary

Technically reviewable scope: protected importing/publishing, explicit verified corrections, evidence-bound game matching and the two approved final restorations. No speculative player values, complete-team certificate, broad 51-rank patch or full statewide audit is introduced. Defensive/kicking/punting/return and other incomplete source coverage remain unfinished; missing fields never become zero. Locked All-Region awards, all historical records and Speed Cut sponsorship remain intact. Keep PR #181 draft, unmerged and undeployed until owner approval.

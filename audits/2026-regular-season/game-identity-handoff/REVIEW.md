# Muse game-identity implementation — PR #181

Baseline: `5769f3ffa10ea908dd17e5d602618a1a5d9f80f7`. The attached finalized handoff is archived byte-for-byte as [MUSE-HANDOFF.md](MUSE-HANDOFF.md); SHA-256 `1759aeae9c738a3ea633c0aab03d075b9adb2563e7ec57b43e44fe4afe62fc70`. All 31 original scope rows and 44 original cache entries matched this branch exactly before editing. The attachment supplies the authoritative table, appendix and checklist. Its references to separate research snapshots are not substituted for repository records: original URLs were recovered from the exact matching current entries and are retained in the machine-readable before/after report.

## Result and preserved data

- 16 approved scope home/away reversals; 13 correct directions left unchanged; two neutral encodings held. Existing designated home/away strings and all existing global aliases are preserved outside those 16 scope reversals.
- All 44 unknown source/team entries resolve to 31 existing regular-season games. Fresh audit: **2,106 regular / 11 postseason / 44 unknown → 2,150 regular / 11 postseason / 0 unknown**. Inventory remains 2,161 source/team entries; scope remains 653 distinct games. No new or deleted contest.
- Both resumed contests use September 18 as the reviewed canonical start key and retain September 19 as completion date. Original cache dates, game IDs, URLs and box scores remain unchanged. Exact source URL/ContestId plus the reviewed team pair binds both dates. No nearby-date guess.
- All 56 reviewed statistical fields remain installed (44 season, 12 game); reapplication produces zero changes. All existing JSON datasets other than scope metadata and the identity/scope portion of the reviewed publication are byte-identical to the baseline. No score, win/loss record, standings, RPI, player identity, player statistic, team total, historical record, locked award, school, sponsor or basketball data changed.
- Confirmed West High School physical venue metadata is recorded separately for G11 Lehi and G12 Orem. No new venue is inferred from a designated-home label.

## Held findings and unexpected differences

**G23 score conflict:** the handoff says Maple Mountain 36–14 South Pasadena; the existing cache says **36–7**. The cache score is preserved exactly. Identity/regular-season matching does not authorize a score replacement. This remains a separate source-verification decision.

G06/G08 neutral findings are confirmed, but the legacy cache/importer/schedule schema assumes non-null home/away and derives `location` from those labels. No `venue_type`, null home team, neutral rating factor or forced designation was introduced. Neutral physical-venue encoding remains held. Recommended compatible future schema: retain `awayTeam`/`homeTeam` as designated schedule teams and add a separately validated `venue: {type: "neutral", name, city, state}`; update every venue/split/ratings/display consumer before enabling it. The confirmed ICCU Dome finding is preserved under `identityReview.venueReview`, explicitly marked `held-schema`, rather than emitted as supported runtime venue data.

G10 Hun–Skyridge, G21 Riverton–Madison and G24 Box Elder–Highland physical venues remain `held-evidence`; no probable facility is published as verified. No team classification, forfeit or postseason change is introduced.

The audit now finds 702 conflicting regular-game cells versus 697 before: newly matched games expose five additional disagreements. These are findings, not accepted corrections. Cached season disagreements remain 1,306 and passing-pair disagreements remain 52. No incomplete playoff subtraction or season-total recalculation is published.

## Schema and consumer review

Reviewed the scope index, raw Deseret/MaxPreps cache shapes and importers, game builder, reconciliation, retention finalizer, reviewed-batch validator, audit/exporter, metrics/team shards, browser regular-season policy, season leaderboards, weekly reads and award projections. The scope index and browser read policy now share source-bound canonical matching. The source importer matches a reviewed resumed contest before creating a shell; duplicate canonical target records fail closed. The finalizer preserves retained contest IDs/dates/URLs and rejects two imported views of one contest. Reconciliation and browser views count identical repeated reports once; conflicting repeated reports are withheld, never summed. No raw cache rewriting or player-stat repair is included.

Standings and RPI read weekly/final-results and team/OOS inputs, not this scope metadata or the reviewed publication. Their home/away branches assign each team its own score and opponent; no physical-venue factor is read. The verified Elo formula similarly has no home-field bonus. Those inputs/outputs are unchanged, so recomputing/publishing standings or RPI would introduce unrelated changes and was not performed. Scoreboard and team pages keep their existing source scores, designated locations and cache dates. Their data shards are unchanged. Nine affected HTML files only receive a shared-policy cache-version bump; layout and award content are unchanged.

## Validation

- **56 pipeline/identity tests pass on Node 24 and Node 22**, including 12 new handoff regressions. The pre-existing unknown-scope test now injects an explicit synthetic unknown opponent instead of depending on the 44 resolved entries remaining unknown.
- **29 website tests**, shared runtime and search runtime pass.
- **24 Chromium checks** pass at 390px and 1440px; both resumed contests are exercised in each viewport with identical Friday/Saturday inputs and unchanged single-game statistics. Reviewed leaderboard, profile ranks, team-stat hold, 2025 archive, original locked awards and tamper rejection pass. Mobile leaderboard and desktop award screenshots reviewed.
- MaxPreps game-log, MaxPreps fallback, season reconciliation and verified kicking self-tests pass. Batch, team-aggregate and reviewed-publication checks report no unapplied changes.
- Isolated cached game-build/import/reconciliation/finalizer/metrics/team-shard replay passes, retains every published season section and all 56 reviewed cells. Candidate data stays separate. No live scrape, scheduled main write or award regeneration was run.
- Existing out-of-scope historical record-validator failure remains the previously reported duplicate `273541|HERRIMAN|Filisi Filipe`; historical record files were not modified.
- `validation.json` stores exact before/after counts, all 44 final classifications, protected-file hashes and the held score conflict. `reviewed-changes.json` stores all 31 scope rows before/after and their source-entry mappings. Hosted results are recorded in PR #181.

## Main synchronization hold and hosted checks

After pushing the tested implementation, a read-only fetch found main at `7a5a896c132614889020bb0fd2a9d3a136247ede`, advanced beyond the preserved baseline. `git merge-tree` (no checkout/index merge) reports conflicts in `deseret-stat-metrics-2026.json`, `team-stats-2026.json`, and the Ben Lomond, Duchesne, Monticello and South Summit team-current shards. The preview would change published season-stat sections for **53 teams**; incoming weekly results, standings and RPI also differ semantically from the prior synchronized main.

**Synchronization stopped under the user's STOP-AND-REPORT boundary.** No merge, conflict resolution, incoming score/statistic/record update, or main checkout was applied. Unrelated basketball/logo/navigation changes on main were not edited or overwritten. They remain on main and must be preserved in a separately reviewed synchronization. GitHub reports PR #181 `mergeable_state: dirty`; no pull-request workflow runs have started on the implementation commit. Hosted checks therefore remain **blocked**, not passing. All listed local tests ran against the preserved PR branch. Once synchronization is explicitly resolved without silently changing protected totals, rerun Regular-season scope review, App Shell Sanity, Trust & Growth Sanity, Game Center research, Season Record Alerts and Share Previews.

## All 31 canonical games

| Game | Canonical key | Exact scope direction before → after | Dates | Venue status |
|---|---|---|---|---|
| G01 | 2026-08-14\|ARBORVIEWNV\|WEST | WEST @ Arbor View → Arbor View @ WEST | 2026-08-14 | No physical venue change |
| G02 | 2026-08-14\|EAST\|TAFUNAAMERICANSAMOA | EAST @  T Tafuna (American Samoa) →  T Tafuna (American Samoa) @ EAST | 2026-08-14 | No physical venue change |
| G03 | 2026-08-21\|CEDARVALLEY\|ELKONV | CEDAR VALLEY @ Elko → Elko @ CEDAR VALLEY | 2026-08-21 | No physical venue change |
| G04 | 2026-08-21\|IMGACADEMYFL\|LONEPEAK | LONE PEAK @ IMG Academy → IMG Academy @ LONE PEAK | 2026-08-21 | No physical venue change |
| G05 | 2026-08-21\|RIGBYID\|ROY | ROY @ Rigby → Rigby @ ROY | 2026-08-21 | No physical venue change |
| G06 | 2026-08-27\|BEARRIVER\|THUNDERRIDGEID | BEAR RIVER @ Thunder Ridge (unchanged) | 2026-08-27 | held-schema |
| G07 | 2026-08-28\|CAMPBELLHI\|PINEVIEW | PINE VIEW @ Campbell → Campbell @ PINE VIEW | 2026-08-28 | No physical venue change |
| G08 | 2026-08-28\|FARMINGTON\|RIGBYID | FARMINGTON @ Rigby (unchanged) | 2026-08-28 | held-schema |
| G09 | 2026-08-28\|ARCHBISHOPRIORDANCA\|WEST | WEST @ Archbishop Riordan → Archbishop Riordan @ WEST | 2026-08-28 | No physical venue change |
| G10 | 2026-08-29\|HUNNJ\|SKYRIDGE | SKYRIDGE @ Hun → Hun @ SKYRIDGE | 2026-08-29 | held-evidence |
| G11 | 2026-08-29\|LEHI\|STJAMESPERFORMANCEACADEMYVA | LEHI @ TSJPA → TSJPA @ LEHI | 2026-08-29 | West High School confirmed, separate from designated home |
| G12 | 2026-08-29\|MATERDEICA\|OREM | OREM @ Mater Dei → Mater Dei @ OREM | 2026-08-29 | West High School confirmed, separate from designated home |
| G13 | 2026-09-04\|BISHOPGORMANNV\|LONEPEAK | LONE PEAK @ Bishop Gorman → Bishop Gorman @ LONE PEAK | 2026-09-04 | No physical venue change |
| G14 | 2026-09-04\|OLYMPUS\|PIEDRAVISTANM | OLYMPUS @ Piedra Vista → Piedra Vista @ OLYMPUS | 2026-09-04 | No physical venue change |
| G15 | 2026-09-04\|ALAQUEENCREEKAZ\|LEHI | LEHI @ ALA - Queen Creek → ALA - Queen Creek @ LEHI | 2026-09-04 | No physical venue change |
| G16 | 2026-09-11\|CORNERCANYON\|EASTWOODTX | CORNER CANYON @ Eastwood → Eastwood @ CORNER CANYON | 2026-09-11 | No physical venue change |
| G17 | 2026-09-18\|BOXELDER\|RIGBYID | BOX ELDER @ Rigby → Rigby @ BOX ELDER | 2026-09-18 | No physical venue change |
| G18 | 2026-09-04\|MOUNTAINVIEWWY\|RICH | RICH @ Mountain View (unchanged) | 2026-09-04 | No physical venue change |
| G19 | 2026-08-14\|HURRICANE\|VIRGINVALLEYNV | HURRICANE @ Virgin Valley (unchanged) | 2026-08-14 | No physical venue change |
| G20 | 2026-08-14\|KAMEHAMEHAHI\|OREM | OREM @ Kamehameha Kapalama (unchanged) | 2026-08-14 | No physical venue change |
| G21 | 2026-08-27\|MADISONID\|RIVERTON | RIVERTON @ Madison (unchanged) | 2026-08-27 | held-evidence |
| G22 | 2026-08-21\|AMERICANFORK\|MATERDEICA | AMERICAN FORK @ Mater Dei (unchanged) | 2026-08-21 | No physical venue change |
| G23 | 2026-08-28\|MAPLEMOUNTAIN\|SOUTHPASADENACA | MAPLE MOUNTAIN @ South Pasadena (unchanged) | 2026-08-28 | No physical venue change |
| G24 | 2026-08-28\|BOXELDER\|HIGHLANDID | BOX ELDER @ Highland (unchanged) | 2026-08-28 | held-evidence |
| G25 | 2026-09-04\|LIBERTYNV\|SKYRIDGE | SKYRIDGE @ Liberty (unchanged) | 2026-09-04 | No physical venue change |
| G26 | 2026-09-04\|CORNERCANYON\|LIBERTYAZ | CORNER CANYON @ Liberty (unchanged) | 2026-09-04 | No physical venue change |
| G27 | 2026-09-04\|RIGBYID\|SYRACUSE | SYRACUSE @ Rigby (unchanged) | 2026-09-04 | No physical venue change |
| G28 | 2026-09-11\|RANCHOBERNARDOCA\|WESTLAKE | WESTLAKE @ Rancho Bernardo (unchanged) | 2026-09-11 | No physical venue change |
| G29 | 2026-09-18\|CHAPARRALCA\|MOUNTAINRIDGE | MOUNTAIN RIDGE @ Chaparral (unchanged) | 2026-09-18 | No physical venue change |
| G30 | 2026-09-18\|MAPLEMOUNTAIN\|TIMPVIEW | MAPLE MOUNTAIN @ Timpview (unchanged) | 2026-09-18; completed 2026-09-19 | No physical venue change |
| G31 | 2026-09-18\|SALEMHILLS\|TIMPANOGOS | SALEM HILLS @ Timpanogos → Timpanogos @ SALEM HILLS | 2026-09-18; completed 2026-09-19 | No physical venue change |

## All 44 original entries

| Entry | Game | Source file | Team / original date / opponent | Before → final |
|---|---|---|---|---|
| 1 | G10 | player-game-stats-2026.json | SKYRIDGE / 2026-08-29 / HUN, NJ | unknown → regular-season; one canonical contest |
| 2 | G25 | player-game-stats-2026.json | SKYRIDGE / 2026-09-04 / LIBERTY, NV | unknown → regular-season; one canonical contest |
| 3 | G29 | player-game-stats-2026.json | MOUNTAIN RIDGE / 2026-09-18 / CHAPARRAL, CA | unknown → regular-season; one canonical contest |
| 4 | G31 | player-game-stats-2026.json | TIMPANOGOS / 2026-09-19 / SALEM HILLS | unknown → regular-season; one canonical contest |
| 5 | G31 | player-game-stats-2026.json | SALEM HILLS / 2026-09-19 / TIMPANOGOS | unknown → regular-season; one canonical contest |
| 6 | G06 | player-game-stats-2026.json | BEAR RIVER / 2026-08-27 / THUNDER RIDGE, ID | unknown → regular-season; one canonical contest |
| 7 | G04 | player-game-stats-2026.json | LONE PEAK / 2026-08-21 / IMG ACADEMY, FL | unknown → regular-season; one canonical contest |
| 8 | G13 | player-game-stats-2026.json | LONE PEAK / 2026-09-04 / BISHOP GORMAN, NV | unknown → regular-season; one canonical contest |
| 9 | G26 | player-game-stats-2026.json | CORNER CANYON / 2026-09-04 / LIBERTY, AZ | unknown → regular-season; one canonical contest |
| 10 | G16 | player-game-stats-2026.json | CORNER CANYON / 2026-09-11 / EASTWOOD, TX | unknown → regular-season; one canonical contest |
| 11 | G22 | player-game-stats-2026.json | AMERICAN FORK / 2026-08-21 / MATER DEI, CA | unknown → regular-season; one canonical contest |
| 12 | G21 | player-game-stats-2026.json | RIVERTON / 2026-08-27 / MADISON, ID | unknown → regular-season; one canonical contest |
| 13 | G30 | player-game-stats-2026.json | TIMPVIEW / 2026-09-19 / MAPLE MOUNTAIN | unknown → regular-season; one canonical contest |
| 14 | G14 | player-game-stats-2026.json | OLYMPUS / 2026-09-04 / PIEDRA VISTA, NM | unknown → regular-season; one canonical contest |
| 15 | G03 | player-game-stats-2026.json | CEDAR VALLEY / 2026-08-21 / ELKO, NV | unknown → regular-season; one canonical contest |
| 16 | G23 | player-game-stats-2026.json | MAPLE MOUNTAIN / 2026-08-28 / SOUTH PASADENA, CA | unknown → regular-season; score conflict held; one canonical contest |
| 17 | G30 | player-game-stats-2026.json | MAPLE MOUNTAIN / 2026-09-19 / TIMPVIEW | unknown → regular-season; one canonical contest |
| 18 | G11 | player-game-stats-2026.json | LEHI / 2026-08-29 / ST. JAMES PERFORMANCE ACADEMY, VA | unknown → regular-season; one canonical contest |
| 19 | G15 | player-game-stats-2026.json | LEHI / 2026-09-04 / ALA QUEEN CREEK, AZ | unknown → regular-season; one canonical contest |
| 20 | G18 | player-game-stats-2026.json | RICH / 2026-09-04 / MOUNTAIN VIEW, WY | unknown → regular-season; one canonical contest |
| 21 | G07 | player-game-stats-2026.json | PINE VIEW / 2026-08-28 / CAMPBELL, HI | unknown → regular-season; one canonical contest |
| 22 | G28 | player-game-stats-2026.json | WESTLAKE / 2026-09-11 / RANCHO BERNARDO, CA | unknown → regular-season; one canonical contest |
| 23 | G27 | player-game-stats-2026.json | SYRACUSE / 2026-09-04 / RIGBY, ID | unknown → regular-season; one canonical contest |
| 24 | G05 | player-game-stats-2026.json | ROY / 2026-08-21 / RIGBY, ID | unknown → regular-season; one canonical contest |
| 25 | G08 | player-game-stats-2026.json | FARMINGTON / 2026-08-28 / RIGBY, ID | unknown → regular-season; one canonical contest |
| 26 | G24 | player-game-stats-2026.json | BOX ELDER / 2026-08-28 / HIGHLAND, ID | unknown → regular-season; one canonical contest |
| 27 | G17 | player-game-stats-2026.json | BOX ELDER / 2026-09-18 / RIGBY, ID | unknown → regular-season; one canonical contest |
| 28 | G19 | player-game-stats-2026.json | HURRICANE / 2026-08-14 / VIRGIN VALLEY, NV | unknown → regular-season; one canonical contest |
| 29 | G19 | player-game-stats-2026.json | VIRGIN VALLEY, NV / 2026-08-14 / HURRICANE | unknown → regular-season; one canonical contest |
| 30 | G01 | player-game-stats-2026.json | ARBOR VIEW, NV / 2026-08-14 / WEST | unknown → regular-season; one canonical contest |
| 31 | G01 | player-game-stats-2026.json | WEST / 2026-08-14 / ARBOR VIEW, NV | unknown → regular-season; one canonical contest |
| 32 | G09 | player-game-stats-2026.json | WEST / 2026-08-28 / ARCHBISHOP RIORDAN, CA | unknown → regular-season; one canonical contest |
| 33 | G02 | player-game-stats-2026.json | TAFUNA, AMERICAN SAMOA / 2026-08-14 / EAST | unknown → regular-season; one canonical contest |
| 34 | G02 | player-game-stats-2026.json | EAST / 2026-08-14 / TAFUNA, AMERICAN SAMOA | unknown → regular-season; one canonical contest |
| 35 | G20 | player-game-stats-2026.json | OREM / 2026-08-14 / KAMEHAMEHA, HI | unknown → regular-season; one canonical contest |
| 36 | G12 | player-game-stats-2026.json | OREM / 2026-08-29 / MATER DEI, CA | unknown → regular-season; one canonical contest |
| 37 | G20 | player-game-stats-2026.json | KAMEHAMEHA, HI / 2026-08-14 / OREM | unknown → regular-season; one canonical contest |
| 38 | G14 | player-game-stats-2026.json | PIEDRA VISTA, NM / 2026-09-04 / OLYMPUS | unknown → regular-season; one canonical contest |
| 39 | G16 | player-game-stats-2026.json | EASTWOOD, TX / 2026-09-11 / CORNER CANYON | unknown → regular-season; one canonical contest |
| 40 | G28 | player-game-stats-2026.json | RANCHO BERNARDO, CA / 2026-09-11 / WESTLAKE | unknown → regular-season; one canonical contest |
| 41 | G29 | player-game-stats-2026.json | CHAPARRAL, CA / 2026-09-18 / MOUNTAIN RIDGE | unknown → regular-season; one canonical contest |
| 42 | G17 | player-game-stats-2026.json | RIGBY, ID / 2026-09-18 / BOX ELDER | unknown → regular-season; one canonical contest |
| 43 | G02 | maxpreps-player-game-stats-2026.json | EAST / 2026-08-14 / Tafuna (American Samoa) | unknown → regular-season; one canonical contest |
| 44 | G11 | maxpreps-player-game-stats-2026.json | LEHI / 2026-08-29 / The St. James Performance Academy | unknown → regular-season; one canonical contest |

PR #181 remains a draft. Nothing merged or deployed. The comprehensive player/team statistical audit is not started in this phase.

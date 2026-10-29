# 2026 player-identity and game-cell conflict review — next audit stage

This work begins after the **scoped, merged PR #181** and is **not a statewide certification**. No raw player statistics, scores, official RPI, team rankings, locked awards, historical records or sponsor data may be automatically changed by the diagnostic reports.

## Why this audit is necessary

A single player-number disagreement is currently reported once **per matching numeric stat field**, not once per person. In the retained `current-review-coverage.json` snapshot used to scope this work, **547 CACHED_SOURCE_IDENTITY_MISMATCH warnings refer to 124 distinct (team, playerId) combinations**. This is **124 review candidates**, not 547 confirmed incorrect identities.

The same snapshot contains **697 conflicting player-stat fields** (the number varies as scheduled caches refresh), affecting **513 distinct players**. A field may disagree in more than one regular-season contest, so the actionable unit is **(team, playerId, category, field, canonical contest)**, not merely the raw audit warning. CI builds the current case count from the live branch snapshot.

Sources:
- `audits/2026-regular-season/current-review-coverage.json` — retained snapshot, may be older than the hosted run
- `scripts/audit_regular_season_2026.mjs` — source-aware evidence extraction
- `scripts/triage_regular_season_audit_2026.mjs` — case-level grouping
- PR #181 final report — `audits/2026-regular-season/FINAL-REVIEW.md`

## Run the review (no data publication)

```sh
node scripts/audit_regular_season_2026.mjs --output=/tmp/rus-stat-audit
node scripts/triage_regular_season_audit_2026.mjs --audit=/tmp/rus-stat-audit/audit.json --output=/tmp/rus-stat-triage
node --test tests/triage-regular-season-audit-2026.test.mjs
```

The `Regular-season scope review` pull-request workflow runs these steps and uploads **regular-season-source-review** containing both the original audit and case-level `triage.json` / `TRIAGE.md`. No correction is inferred or committed by these commands. Every issue retains the audited input hashes. The newest CI-generated artifact, not the stale on-branch snapshot, is the working review queue.

## First source-review batches

1. **Identity cases:** verify roster identity, jersey, source profile link and player name for each distinct player. High-volume queues in the retained snapshot include **Pine View (17)**, **Bingham (13)** and **East (8)** distinct IDs. Roster or same-name conflicts stay held, not forcibly merged.
2. **Game-cell cases:** start with **North Sanpete (23)** and **Kanab (15)** distinct field warnings for rural-first coverage, while also investigating larger statewide queues including **Alta (40)** and **Olympus (36)**. The CI output supplies the exact canonical game, source URL and conflicting numeric values. These snapshot figures are *field-warning counts*, not confirmed incorrect values.
3. **Cross-check against PR #181:** do not rewrite the 60 verified corrected cells. Separate disputed Manti attempts/completions, the Canyon View full-team rank and unresolved venues/scores from game-cell decisions.
4. **Approve exact corrections individually:** source dates, positive regular-season classification, full expected game coverage, original-value preconditions and stable player identity required. Use a new reviewed correction batch and separate data PR; unknown stays unknown.

## First independently checked game-level lead (held)

**South Summit at Juab, August 28, 2026 — Brody Larsen (#8).** MaxPreps' game-specific box score explicitly reports **16 rushes for 98 yards and one rushing TD**, and its contemporaneous game recap also reports 98 yards and one touchdown. The Deseret News August 28 roundup corroborates the 34–13 result and his touchdown run. This is a regular-season matchup. Source links:

- [MaxPreps game box score](https://www.maxpreps.com/ut/football/game/juab-nephi-vs-south-summit-kamas/8-28-2026/?c=3bf0f953-365a-4dd1-a40c-fe2dd49f0785&tab=Stats)
- [MaxPreps game recap](https://www.maxpreps.com/news/T-sUysYbGkO7ywNimhmfGQ/football-recap-clayton-pay-leads-juabs-defense-on-friday.htm)
- [Deseret News game roundup](https://www.deseret.com/sports/2026/08/28/high-school-football-week-3-roundup/)

The repository's **historical, pre-PR-181** audit logged conflicting cached game-cell values: **4 versus 16 carries** and **-7 versus 98 rushing yards** for this exact canonical matchup. PR #181 already approved Larsen's **season total** of 158 carries/1,251 yards. Neither old cached game value is assumed to remain on current `main` without reading the fresh triage artifact. **No game-cell correction is made in this diagnostic PR.** Next decision must inspect the current game cache, identify the wrong source record and verify that changing an individual box-score entry will not alter the already-reviewed season total.

## Holds

- A provider-cache disagreement alone does not establish which value is correct.
- A cached `lastUpdated` is not proof of the coach's or provider's original reporting date.
- Neither a regular-season schedule entry nor a completed game proves a player field has complete coverage.
- Postseason totals may not be subtracted from partial cumulative data.
- The historical duplicate, bare standings keys and broader statewide audit remain separate holds.

**Release boundary:** this first PR only improves the evidence and triage workflow; it should not be described as resolving hundreds of data errors until source-reviewed replacement decisions exist.

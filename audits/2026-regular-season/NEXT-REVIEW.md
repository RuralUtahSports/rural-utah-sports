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

## Holds

- A provider-cache disagreement alone does not establish which value is correct.
- A cached `lastUpdated` is not proof of the coach's or provider's original reporting date.
- Neither a regular-season schedule entry nor a completed game proves a player field has complete coverage.
- Postseason totals may not be subtracted from partial cumulative data.
- The historical duplicate, bare standings keys and broader statewide audit remain separate holds.

**Release boundary:** this first PR only improves the evidence and triage workflow; it should not be described as resolving hundreds of data errors until source-reviewed replacement decisions exist.

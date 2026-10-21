# Game Center 3.0

Integrated into the existing game-center.html and its RUSGameCenter snapshot/events. The current Power engine, corrected statistics pipeline, 2.1 quarter audit, official brackets and historical index remain authoritative. No external dependencies are needed by the new browser modules.

## Implemented

- Common opponents: all finalized meetings, dates, scores, margins, combined record and mean margin; repeat opponents retained.
- Schedule strength: meeting-weighted OWP, OOWP, current opponent power, average adjusted opponent record, record vs winning/losing teams and strength of wins/losses. Centered labels and team-colored bars.
- Player comparison: passing, rushing, receiving, defense and kicking selectors keyed by player ID, source fields preserved, links to profiles. Reads compacted corrected roster statistics, including manual corrections and MaxPreps fallback.
- Completed games: audited quarter-end chart with tappable checkpoints; expandable game statistics from the merged player-game feed, date/opponent/final checks and roster identity checks. Conflicting duplicate fields are withheld. Existing quarters and scoring-play reports remain in the breakdown section.
- Official playoff path: seeds, rounds, venue, dates, bracket positions, byes, recursive future opponent sets and links to the original official bracket. Only verified finals resolve future slots. Published playoff projections are shown where available.
- Rivalry milestones: documented series, ties, first/latest, longest/current streaks, largest/closest/highest-scoring meetings and each team's scoring high.
- Upset meter and prediction dashboard: outright upsets separated from margin surprises, winner accuracy, margin MAE, projected/actual margins, sample counts, week/classification breakdowns, close games, favorite thresholds and playoffs. Format follows the selected 8P/11P filter.
- Local report generation: individually saveable 1080x1350 PNGs and a multipage raster PDF from the same data. Long text wraps, pages paginate, text-only school names avoid synthetic logos. No report is uploaded externally.

## Formulas and scope

Only declared, internally consistent finals count. Empty values are never zeros; duplicate conflicting finals are withheld. Common opponents retain cross-format finals as actual results. RUS SOS uses same-format Utah opponents with known current ratings, including schools ineligible for official playoffs. Out-of-state and cross-format games are explicitly counted as excluded; incomplete outside schedules are never assigned .500.

OWP is the mean of each opponent's (wins + half ties)/games after removing all meetings with the selected team. OOWP averages those opponents' OWP after removing games involving the selected team. Repeated meetings receive one weight per meeting. Missing denominators make the metric unavailable. Opponent records use the same head-to-head exclusions. Opponents at exactly .500 are excluded from both winning/losing groups. Strength of wins/losses is the average current RUS opponent rating in wins/losses. These are descriptive RUS metrics, not official UHSAA RPI.

Prediction margin is away minus home. MAE = mean absolute difference between archived projected and verified actual margins. Outright upset means projected and actual margins have opposite signs. Winner accuracy excludes ties/pick'em; MAE includes them. Favorite thresholds (>=7/14/21) intentionally overlap.

## Prospective archive

The initial archive captures 41 existing published upcoming playoff predictions. It does not recreate older forecasts. The append-only script captures the first published projection per date and pairing, only before 00:00 UTC on game day (a conservative cutoff that avoids guessing kickoff). Each record contains capture time, source file and source Git commit. Git history preserves the added record; later runs never replace it. A postponed date needs a separate pregame snapshot. The scheduled workflow runs every six hours and on relevant source changes. Current matchup Power spreads and the published playoff projection model are distinct existing products and are labeled accordingly.

## Data-limited behavior

- Quarter totals do not prove individual scoring order, exact lead changes, in-game largest leads or comebacks. The live source supplies free text, not reliably structured chronological point events; the interface uses quarter-end charts only. The shared validator supports structured reconciled events for a future feed.
- Partial/conflicting quarter data produces an unavailable chart, not invented points.
- Full box scores depend on category reporting. Unknown players and mismatched date/opponent/finals are withheld. Distinct tackle/kicking definitions are not combined. Missing team turnovers are not inferred.
- Verified season player game counts are not consistently provided; per-game averages remain unavailable rather than dividing by team games.
- Historical road wins and playoff-only series cannot be established from the current normalized archive. No labels are guessed.
- No eligible historical forecast accuracy sample is claimed at launch. Dashboard and upset results populate as archived games obtain verified finals.
- Reports are text-only for school identity. PDF pages are rasterized at 1080x1350; browser printing is supported, but text is not selectable.
- 2026 is the existing Game Center's supported season; older matchup schedules are not introduced by this change.

## Validation

Run `node scripts/check-game-center-v2.cjs` and `node scripts/check-game-center-v3.cjs`. The latter covers ten feature groups, aliases, repeat meetings, missing/conflicting finals, overtime, out-of-order events, snapshot timing, rescheduling, immutable capture, duplicate identities, box-score conflicts, ties and bracket advancement.

Browser checks: 390px mobile and 1440px desktop, selection/format changes including Monument Valley's alias, kicking selection, lazy box scores, PNG/PDF downloads and console errors. PDF structure inspected with pdfinfo and rendered with Poppler. No horizontal page overflow at 390px.

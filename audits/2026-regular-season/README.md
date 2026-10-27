# 2026 regular-season scope audit

Policy: 2026-regular-season-only-v1

Audited 118 schools, 6922 season rows and 24238 numeric cells. No season total, player record, source box score or award winner was changed.

## Findings
- CACHED_SOURCE_SEASON_DISAGREEMENT: 1413
- RETAINED_RATE_INCONSISTENCY: 2
- KNOWN_REGULAR_GAME_SUM_EXCEEDS_RETAINED: 61
- MISSING_SCHOOL_STATS: 2
- CONFLICTING_REGULAR_GAME_CELL: 14
- WEB_SOURCE_OBSERVATION: 6

Game inventory (source/team views, not distinct matchups): 96 regular; 11 postseason; 2054 unknown.

Unknown phase is excluded from verified regular-season sums. A game date, a missing playoff row, or the presence of stats for another player does not prove classification or field completeness. Cumulative season totals are never reduced by subtracting partial playoff statistics.

Retained 180 original postseason box-score rows separately in postseason-box-scores.json. Raw source files remain available and unchanged.

Fresh web review covered three school schedules and selected source statistics; all other classification relies on cached official competition evidence or remains unknown. See source-audit-observations-2026.json for source URLs and limitations.

This draft is not ready to publish regular-season datasets. No file-level certifications have been granted.

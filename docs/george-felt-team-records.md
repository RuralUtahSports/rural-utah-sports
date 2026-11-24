# George Felt team statistical records — RUS import

## Source and scope

- Source: *Utah High School Football All-Time Statistical Records Through 2026*, compiled by **George Felt**; user-provided audited Version 5.
- The JSON import contains **451 unique team entries**, **26 statistical categories**, **92 current RUS teams**: 109 season entries and 342 single-game entries.
- Import scope: the source's **TEAM STATISTICAL RECORDS** section only. Individual player records have deliberately not been used as team records.
- The document's historical leaderboard consists of **best performances on record**, not complete statistical coverage for all teams and seasons. Display these as *documented performances* rather than absolute school all-time records.
- The RUS schedule and Deseret News game-stat datasets remain independent, with separate attribution and coverage notes.

## Data mapping

Each `byTeam` entry has a canonical RUS school key, a statistical category, numeric value, season, optional normalized game date, and the reported source context. The source context is kept as provided, rather than reconstructing historical opponents and scores from guesses.

School mappings use current RUS team keys (for example, Cedar → CEDAR CITY; Grand County → GRAND; American Leadership Academy → ALA; Emery County → EMERY). Historical schools with no current RUS team page are not silently attributed to modern schools. The parser intentionally omitted eight unmatched numeric listings (from historical programs or ambiguous names); George's original document retains them.

Combined-team performance categories, anecdotal records, and individual athlete categories were not imported into this team-only dataset. They require separate modeling and verification.

## Editorial and technical safeguards

- **No statewide rank is inferred** from the document's order, because leaderboard completeness and ordering vary.
- **No school record is declared solely from a statewide top-50 appearance.** RUS scoring and Deseret News rankings state their own coverage limits.
- **Source provenance is visible** in the Team Records tab. The source book is not reproduced on the public site.
- **2026 Corner Canyon's seven interceptions** (November 12 vs. Mountain Ridge) are tagged as *single-game team interceptions*, not interceptions returned for touchdowns.
- The data are stored separately from `uhsaa-records-team.json`, which can disagree in historical totals. Differences must be reviewed, not silently overwritten.
- The previous Team Records page incorrectly considered UHSAA individual-player record categories as if they were team totals. The revised page does not merge those individual categories into Team Records.
- The source should be rechecked before future automatic imports, and additions should have their original provenance and uncertainty notes preserved.

## Sample entries

- East: 7,438 season total yards, 2016.
- Logan: 705 single-game total yards, October 30, 2026 vs. Manti.
- Corner Canyon: seven interceptions in one game, November 12, 2026 vs. Mountain Ridge.

## How to validate

1. Check that `george-felt-team-records.json` parses and every `metric` references `categories`.
2. Confirm there are 451 unique entries across 92 teams and no duplicates within metric/team/date/value/context.
3. Verify that the single-game and season cards render separately, and that teams without Felt entries still show their Deseret News scoring records.
4. Confirm the Player Records tab is unchanged, and no individual UHSAA record is relabeled as a team record.
5. Check small-screen rendering in Team Records before merging.

**Publication status:** Integration prepared for review in a pull request; not independently verified against every historical game or deployed live.

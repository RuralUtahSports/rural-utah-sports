# RUS Football Data Audit

Generated: 2026-11-25T06:30:50.791Z

**0 errors • 5 warnings**

## Warnings (5)

- **RECORD_MISMATCH** — CANYON VIEW standings record does not match completed games in weekly-simulation.json. `{"standings":"7-3-0","calculated":"6-3-1"}`
- **RECORD_MISMATCH** — MANTI standings record does not match completed games in weekly-simulation.json. `{"standings":"2-8-0","calculated":"2-7-1"}`
- **MAXPREPS_HIGH_UNMATCHED** — PANGUITCH rejected 60 of 64 MaxPreps stat rows during player matching. `{"sourceRows":64,"unmatchedRows":60,"rosterPlayers":1,"sourceUrl":"https://www.maxpreps.com/ut/panguitch/panguitch-bobcats/football/stats/"}`
- **MAXPREPS_HIGH_UNMATCHED** — PINE VIEW rejected 54 of 74 MaxPreps stat rows during player matching. `{"sourceRows":74,"unmatchedRows":54,"rosterPlayers":54,"sourceUrl":"https://www.maxpreps.com/ut/st-george/pine-view-panthers/football/stats/"}`
- **MAXPREPS_GAME_STATS_NOT_MERGED** — LAYTON CHRISTIAN has 2 MaxPreps game-stat matchup(s) missing from player-game-stats-2026.json. `{"sourceGamePairs":10,"missing":[{"date":"2026-11-12","opponent":"AZ Compass Prep"},{"date":"2026-10-16","opponent":"Mater Academy East Las Vegas"}]}`

## Infos (2)

- **MAXPREPS_COVERAGE** — MaxPreps fallback coverage. `{"sourceRows":9755,"unmatchedRows":1116,"rosterlessTeams":0,"sourceGamePairs":1216,"missingGamePairs":2}`
- **AUDIT_COUNTS** — Audit input counts. `{"teams":118,"games":606,"standings":118,"rankedTeams":68,"playerIds":6440}`


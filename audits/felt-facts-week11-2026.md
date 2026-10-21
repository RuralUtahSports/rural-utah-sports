# Felt's Facts Week 11 (2026): RUS record audit

**Prepared:** October 20, 2026  
**Status:** Partial reconciliation: safe 2026 region-title fix; historical playoff wins **not overwritten**.  
**Source:** George Felt, `FF - 2026 Week 11 First-round playoff notes .docx`, 7 pages, received October 20, 2026.

## Confirmed update

- **5A Region 5: Box Elder** defeated West Field **28–7** on Friday, October 16 and earned the 2026 region title. Add it to `region-title-overrides-2026.json`; clear the old "pending" field. Source: https://www.deseret.com/sports/2026/10/16/high-school-football-week-10-friday-roundup/
- The update yields **17 regions** and **20 champion school entries** in the 11-player 2026 region title overlay, including shared champions in 4A Regions 8 and 9.
- `team-records.json` currently credits Box Elder with **37** region titles, the same total shown in Felt's report. **Do not increment it again.**
- Felt covers **11-player only**. Keep 8-player records separate and never treat an 8-player class winner as a region champion without an applicable region.

## Historical playoff wins: 25-team comparison

RUS = `team-records.json` on October 20. Felt = George Felt's Week 11 report, "Most Playoff Victories" top 25. Difference = Felt minus RUS. These differences are **not verified missing games**.

| Team | RUS | Felt | Difference |
|---|---:|---:|---:|
| SKYLINE | 89 | 91 | +2 |
| TIMPVIEW | 88 | 89 | +1 |
| BEAVER | 85 | 87 | +2 |
| MILLARD | 86 | 86 | 0 |
| OREM | 73 | 77 | +4 |
| EAST | 74 | 75 | +1 |
| SAN JUAN | 72 | 75 | +3 |
| DELTA | 72 | 72 | 0 |
| BINGHAM | 71 | 71 | 0 |
| DIXIE | 71 | 71 | 0 |
| MORGAN | 70 | 71 | +1 |
| DAVIS | 66 | 67 | +1 |
| KANAB | 64 | 67 | +3 |
| SOUTH SUMMIT | 61 | 63 | +2 |
| BOUNTIFUL | 60 | 62 | +2 |
| JUDGE MEMORIAL | 58 | 59 | +1 |
| ALTA | 57 | 58 | +1 |
| JORDAN | 58 | 58 | 0 |
| HIGHLAND | 56 | 57 | +1 |
| LOGAN | 56 | 56 | 0 |
| NORTH SUMMIT | 54 | 55 | +1 |
| LONE PEAK | 51 | 54 | +3 |
| MOUNTAIN CREST | 52 | 53 | +1 |
| GRANTSVILLE | 49 | 50 | +1 |
| WEST | 48 | 50 | +2 |

**19 of 25 differ; 6 match.** Before any change to live values, trace the win totals game-by-game against the playoff bracket archives, include participation rules (play-in vs opening round, forfeit treatment), and confirm that no year or game is counted twice. Our `history-lab.js` derives bracket-archive statistics independently and explicitly warns older bracket coverage may be incomplete.

## Publication and data-quality flags

1. Under "Playoff Team Numbers", Felt says "**2025** postseason features 79 teams" amid a discussion of the **2026** postseason — likely a year typo. Do not reproduce verbatim.
2. Felt lists "**Long Peak**" with 54 playoff wins; this appears to refer to **Lone Peak**. Confirm before putting the name in graphics.
3. Felt says "all seven" 3A–1A opening-round contests are rematches. The 2026 Oct 23 schedule has **5 in 3A + 3 in 2A + 3 in 1A = 11** scheduled matchups; the seven counted in his document cover 5 in 3A, 1 in 2A and 1 in 1A. **Do not claim all 11 are rematches.** Source schedule: https://highschoolfootballamerica.com/2026-utah-high-school-football-first-round-playoff-matchups/
4. 2026 playoff-history streaks (San Juan 50 straight appearances; Beaver 14 opening-game wins; Hillcrest/Carbon/Ben Lomond droughts) currently stand as **Felt-reported**, not independently verified against full RUS postseason records. Attribute as Felt's Facts until the historical reconciliation is complete.
5. Career and season records require source-of-statistics rules. Felt counts official UHSAA semifinal/final game books over some school submissions. Do not treat all site discrepancies as errors.
6. Dates and matchups in the newspaper series refer to **October 20, 2026 pre-playoff context**; no projected winner is stated as a fact.
7. Keep authentic-original-school-logos-only rule for any images; **text-only is permitted**.

## Suggested backlog

- Reconcile the 19 playoff-wins discrepancies against game-level postseason archives; stage a diff with year/game evidence before altering `team-records.json`.
- Verify longest active postseason-loss streaks and first/last playoff win years for Hillcrest, Ben Lomond and Carbon.
- Use verified individual results for the 2026 first-round rematch graphics; check school-name aliases, e.g. Cedar / Cedar City and ALA / American Leadership Academy.
- Reconcile 2026 player stat record candidates against official semifinal and final game books when those games occur.

## Primary references

- George Felt, *Felt's Facts 2026 Week 11* (source provided directly to RUS)
- Deseret News, *Week 10 Friday roundup*, October 16, 2026: https://www.deseret.com/sports/2026/10/16/high-school-football-week-10-friday-roundup/
- High School Football America, *2026 Utah high school football first-round playoff matchups*, October 19, 2026: https://highschoolfootballamerica.com/2026-utah-high-school-football-first-round-playoff-matchups/

## October 20 final region-title reconciliation

- Compared **all 20** champion school totals in Felt's Week 11 report with the site's `team-records.json` as of October 20. **19 matched before correction; Box Elder was the only discrepancy (RUS 38, Felt 37).**
- Set Box Elder's `regionTitles` to **37**, maintaining its confirmed 2026 Region 5 championship.
- Dropped the older provisional Box Elder `historicalRecordCorrections` item (`add:1`) in the overlay, which conflicted with the current Week 11 source. Kept Logan's existing correction.
- **All 20 counts now match** George's Week 11 list, including co-champions. No changes to playoff wins, state championships, 8-player-only region results, or other teams.
- The team page's Achievements `Region Titles` reads `team-records.json` with a timestamp cache bust, so its Box Elder display will show the corrected figure on reload.

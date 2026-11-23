# Pre-AI football site reconciliation — November 23, 2026

This document records the historical and 2026-season changes proposed in the audit review branch. It preserves disputed material so the original historical notes are not lost when no longer listed as verified state championships.

## Official historical source

- UHSAA Six-Player Football Records Book: https://uhsaa.org/RecordsBook/Records_Book6MF.pdf
- Listed champions: 1939 Dixie; **1940 BY High and Parowan**; 1941 Cedar City; 1942 no tournament; 1943 Dixie; **1944 Roosevelt**; 1945 Dixie; **1946 Dixie**; **1947 Hurricane**; **1948 Hurricane**.
- RUS must continue counting **Parowan's 1940 title**, as previously requested by the site owner. The UHSAA lists both Parowan and BY High. The RUS historical log separately describes a 6–6 game and BY High forfeit. These sources may describe different aspects of title recognition; the co-champion display does not invalidate Parowan's state title.
- **1943 Union 37–32 Dixie:** preserved here from the previous RUS championship log. UHSAA lists only Dixie for the 1943 state six-player title. The match could be regional or an incorrectly assigned year; the title designation is not supported by the official year-by-year list. Do not automatically reinsert it as an official title without corroboration.
- **1944 six-player bracket:** former RUS `brackets-1944.json` showed Union 37–32 Dixie, contradicting the official 1944 champion (Roosevelt). The unsupported championship matchup was removed from that year’s bracket; Roosevelt's opponent and championship-game score remain unverified.
- RUS archive bracket scores still need independent documentary verification: 1945 Dixie 30–8 Cedar; 1946 Dixie 38–18 Cedar; 1947 Hurricane 44–39 Beaver; 1948 Hurricane 45–32 Parowan. These were retained/reconciled from the corresponding RUS bracket files, **not confirmed by the UHSAA champions-only record book**. They should not be used as fully verified scores by an AI assistant until supported by a game-specific source.
- Six team-page data shards were reconciled: Dixie, Hurricane, Parowan, Union, Beaver, Cedar City. Union's state championship total decreases by one because the 1943 Union entry is unsupported as a state title. New title years are applied to affected teams. Historical Roosevelt appears in the title log but currently lacks a modern `team-page-data` shard.

## Regular-season final scores verified October 15, 2026

- Mountain Ridge 21 at Westlake 13.
- Manti 21 at Canyon View 28.
- Sources: https://sports.deseret.com/high-school/scores-schedule/2026-10-15?region=all and https://www.maxpreps.com/ut/football/scores/?date=10%2F15%2F2026
- Previously, both `weekly-simulation.json` rows had null final scores. The `scripts/audit-football-data.mjs` numeric parser treated `null` as zero, making both missing results look like 0–0 ties. The final scores and parser were corrected; recorded standings did not require changing.

## Completed-season visitor-facing messaging

- The homepage and official playoff page now steer visitors toward **completed 2026 brackets and championships**, not future 2026 picks.
- In-season homepage “This Week” and “Week in Review” components are hidden for the completed season. Their older underlying data remains in `home-week-data.json` as an archive; do not treat its `weekKey: 2026-10-12` as the currently active week.
- `all-state-watch.html` says **postseason projection**, not in-season projection. The page remains a projection, **not final awards**, until statistics and selection process are verified.
- The homepage's explicit `data-season-status="completed-2026"` and associated CSS should be reviewed/removed when 2027 pre-season features are ready.

## Follow-ups before an AI assistant launch

1. Run the existing GitHub Actions data audit after merging the approved fix; confirm the four RECORD_MISMATCH warnings disappear and no new errors appear.
2. Compare all seven 2026 championship scores to independent official results (the champion entries are present).
3. Reconcile 148 MaxPreps source game-stat pairs flagged by the November 23 audit across 81 team warnings; start with postseason games. Avoid auto-importing unverified statistics.
4. Verify team-specific historical championship and game records (especially old six-player finals, 1944 Roosevelt, 1943 Union-Dixie 37–32) using archival newspapers.
5. Perform live mobile and desktop functional checks after merge.
6. Track sources and verification status in the proposed Ask RUS data indexing layer; do not let the AI claim that the archival game-score fields are independently verified.

GitHub audit issue: https://github.com/RuralUtahSports/rural-utah-sports/issues/224

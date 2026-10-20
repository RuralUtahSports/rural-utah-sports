# Game Center 2.1 validation audit — October 20, 2026

Scope: mechanical validation of the repository's existing weekly finals and detailed scoring archive. These categories do not claim a fresh independent review of every external source. Partial source cells are retained in the compact dataset; they are not complete verified quarters.

| Category | Games |
|---|---:|
| Awaiting verification | 90 |
| Verified and complete | 373 |
| Final verified, quarters unavailable | 121 |
| Conflicting sources | 15 |

## Confirmed validation defects fixed

- Scoring plays previously accepted an unordered pair of final scores, allowing totals assigned to the wrong school. Each source row now must have a unique school assignment and match that school's final.
- Complete quarter rows whose sums fell below the final were classified as partial. They are now conflicts. This changes Copper Hills–Bingham (October 2) and Clearfield–Roy (September 25).
- The display now independently checks period structure, integer/nonnegative points, row lengths, sums, and school identity. Missing cells remain null.

## Remaining release gates

- Fresh source investigation for all unresolved games, including the 58 reports not marked final; this report does not resolve those discrepancies.
- Complete Grantsville player-by-player Deseret/MaxPreps reconciliation and pipeline correction. No player totals were changed in this PR.
- Browser tests on mobile and desktop, download checks, and the full Node/GitHub regression suite. The local execution environment was unavailable. Focused JavaScript checks ran in the orchestration runtime; these are not browser tests.
- Confirm live deployment only after the release gates pass.

## Every completed game in the current audit

| Date | Away | Home | RUS final (away–home) | Category | Detail |
|---|---|---|---|---|---|
| 2026-10-16 | EMERY | DELTA | 7–44 | Awaiting verification | source_not_final |
| 2026-10-16 | GREEN CANYON | MOUNTAIN CREST | 7–14 | Awaiting verification | source_not_final |
| 2026-10-16 | KANAB | SUMMIT ACADEMY | 7–17 | Awaiting verification | source_not_final |
| 2026-10-16 | MILLARD | GUNNISON VALLEY | 14–10 | Awaiting verification | source_not_final |
| 2026-10-16 | RIDGELINE | BEAR RIVER | 56–30 | Awaiting verification | source_not_final |
| 2026-10-16 | RIVERTON | COPPER HILLS | 17–40 | Awaiting verification | source_not_final |
| 2026-10-16 | SOUTH SUMMIT | PROVIDENCE HALL | 48–21 | Awaiting verification | source_not_final |
| 2026-10-16 | UMA-HILLFIELD | SAINT JOSEPH | 40–54 | Awaiting verification | not_in_source |
| 2026-10-16 | UMA-LEHI | RICH | 20–49 | Awaiting verification | source_not_final |
| 2026-10-16 | WEST FIELD | BOX ELDER | 7–28 | Awaiting verification | source_not_final |
| 2026-10-15 | BEAVER | ENTERPRISE | 15–11 | Awaiting verification | source_not_final |
| 2026-10-15 | BINGHAM | LONE PEAK | 14–32 | Awaiting verification | source_not_final |
| 2026-10-15 | CEDAR CITY | CARBON | 49–3 | Awaiting verification | source_not_final |
| 2026-10-15 | CEDAR VALLEY | HERRIMAN | 19–57 | Awaiting verification | source_not_final |
| 2026-10-15 | JUAN DIEGO | RICHFIELD | 0–49 | Awaiting verification | source_not_final |
| 2026-10-15 | JUDGE MEMORIAL | ALA | 14–21 | Awaiting verification | source_not_final |
| 2026-10-15 | MONTICELLO | GRAND | 61–26 | Awaiting verification | source_not_final |
| 2026-10-15 | MORGAN | LOGAN | 22–32 | Awaiting verification | source_not_final |
| 2026-10-15 | NORTH SUMMIT | DUCHESNE | 21–56 | Awaiting verification | source_not_final |
| 2026-10-15 | PAROWAN | NORTH SEVIER | 35–39 | Awaiting verification | source_not_final |
| 2026-10-15 | SOUTH SEVIER | SAN JUAN | 28–60 | Awaiting verification | source_not_final |
| 2026-10-15 | VIEWMONT | WOODS CROSS | 35–36 | Awaiting verification | source_not_final |
| 2026-10-15 | WHITEHORSE | MONUMENT VAL | 40–8 | Awaiting verification | source_not_final |
| 2026-10-14 | ALTA | BRIGHTON | 48–7 | Awaiting verification | source_not_final |
| 2026-10-14 | AMERICAN FORK | SKYRIDGE | 15–21 | Awaiting verification | source_not_final |
| 2026-10-14 | BEN LOMOND | OGDEN | 0–62 | Awaiting verification | source_not_final |
| 2026-10-14 | BOUNTIFUL | OLYMPUS | 35–0 | Awaiting verification | source_not_final |
| 2026-10-14 | CLEARFIELD | NORTHRIDGE | 7–17 | Awaiting verification | source_not_final |
| 2026-10-14 | CRIMSON CLIFFS | PINE VIEW | 49–36 | Awaiting verification | source_not_final |
| 2026-10-14 | CYPRUS | WEST | 0–75 | Awaiting verification | source_not_final |
| 2026-10-14 | DAVIS | WEBER | 52–6 | Awaiting verification | source_not_final |
| 2026-10-14 | DEER CREEK | PARK CITY | 6–35 | Awaiting verification | source_not_final |
| 2026-10-14 | DESERT HILLS | HURRICANE | 8–42 | Awaiting verification | source_not_final |
| 2026-10-14 | DIXIE | SNOW CANYON | 7–35 | Awaiting verification | source_not_final |
| 2026-10-14 | EAST | COTTONWOOD | 50–0 | Awaiting verification | source_not_final |
| 2026-10-14 | FREMONT | ROY | 55–8 | Awaiting verification | source_not_final |
| 2026-10-14 | GRANTSVILLE | UNION | 28–21 | Awaiting verification | source_not_final |
| 2026-10-14 | HIGHLAND | JORDAN | 43–7 | Awaiting verification | source_not_final |
| 2026-10-14 | HILLCREST | KEARNS | 55–0 | Awaiting verification | source_not_final |
| 2026-10-14 | HUNTER | TAYLORSVILLE | 55–7 | Awaiting verification | source_not_final |
| 2026-10-14 | JUAB | NORTH SANPETE | 13–0 | Awaiting verification | source_not_final |
| 2026-10-14 | LEHI | CORNER CANYON | 7–34 | Awaiting verification | source_not_final |
| 2026-10-14 | MAPLE MOUNTAIN | OREM | 0–47 | Awaiting verification | source_not_final |
| 2026-10-14 | MURRAY | SKYLINE | 7–41 | Awaiting verification | source_not_final |
| 2026-10-14 | PANGUITCH | WATER CANYON | 15–36 | Awaiting verification | source_not_final |
| 2026-10-14 | PAYSON | PLEASANT GROVE | 0–45 | Awaiting verification | source_not_final |
| 2026-10-14 | PROVO | TIMPANOGOS | 47–15 | Awaiting verification | source_not_final |
| 2026-10-14 | STANSBURY | DESERET PEAK | 56–19 | Awaiting verification | source_not_final |
| 2026-10-14 | TIMPVIEW | SPANISH FORK | 27–20 | Awaiting verification | source_not_final |
| 2026-10-14 | TOOELE | SKY VIEW | 14–55 | Awaiting verification | source_not_final |
| 2026-10-14 | UINTAH | SALEM HILLS | 14–49 | Awaiting verification | source_not_final |
| 2026-10-14 | WASATCH | MOUNTAIN VIEW | 26–50 | Awaiting verification | source_not_final |
| 2026-10-14 | WEST JORDAN | GRANGER | 14–21 | Awaiting verification | source_not_final |
| 2026-10-09 | ALA | DELTA | 7–49 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-09/american-leadership-football-vs-delta-football/273383) |
| 2026-10-09 | ALTAMONT | WHITEHORSE | 14–40 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-09/altamont-football-vs-whitehorse-football/274404) |
| 2026-10-09 | CARBON | MANTI | 16–41 | Awaiting verification | not_in_source |
| 2026-10-09 | COPPER HILLS | HERRIMAN | 20–23 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-09/copper-hills-football-vs-herriman-football/273545) |
| 2026-10-09 | DIXIE | COTTONWOOD | 47–0 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-09/dixie-football-vs-cottonwood-football/273631) |
| 2026-10-09 | ENTERPRISE | PAROWAN | 48–0 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-10-09/enterprise-football-vs-parowan-football/273371) |
| 2026-10-09 | FAITH LUTHERAN, NV | DESERT HILLS | 23–20 | Awaiting verification | source_not_final |
| 2026-10-09 | GRAND | PANGUITCH | 15–9 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-09/grand-football-vs-panguitch-football/273637) |
| 2026-10-09 | GRANGER | WEST | 0–52 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-10-09/granger-football-vs-west-football/274378) |
| 2026-10-09 | HUNTER | CYPRUS | 24–8 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-09/hunter-football-vs-cyprus-football/273602) |
| 2026-10-09 | JUAB | CEDAR CITY | 31–24 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-09/juab-football-vs-cedar-city-football/273434) |
| 2026-10-09 | JUDGE MEMORIAL | SOUTH SUMMIT | 12–36 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-09/judge-memorial-football-vs-south-summit-football/273413) |
| 2026-10-09 | KANAB | DUCHESNE | 0–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-09/kanab-football-vs-duchesne-football/273327) |
| 2026-10-09 | MILLARD | NORTH SUMMIT | 14–17 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-09/millard-football-vs-north-summit-football/273356) |
| 2026-10-09 | MOUNTAIN RIDGE | BINGHAM | 52–7 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-10-09/mountain-ridge-football-vs-bingham-football/273725) |
| 2026-10-09 | NORTH SANPETE | BEAVER | 7–27 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-09/north-sanpete-football-vs-beaver-football/273331) |
| 2026-10-09 | NORTH SEVIER | GUNNISON VALLEY | 0–48 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-09/north-sevier-football-vs-gunnison-valley-football/273677) |
| 2026-10-09 | RICH | SOUTH SEVIER | 27–55 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-09/rich-football-vs-south-sevier-football/273703) |
| 2026-10-09 | RICHFIELD | CANYON VIEW | 38–16 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-09/richfield-football-vs-canyon-view-football/273400) |
| 2026-10-09 | SAINT JOSEPH | MONTICELLO | 36–64 | Awaiting verification | source_not_final |
| 2026-10-09 | SAN JUAN | EMERY | 55–7 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-10-09/san-juan-football-vs-emery-football/273441) |
| 2026-10-09 | SUMMIT ACADEMY | PROVIDENCE HALL | 58–6 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-10-09/summit-academy-football-vs-providence-hall-football/274328) |
| 2026-10-09 | UMA-HILLFIELD | MILFORD | 6–51 | Awaiting verification | not_in_source |
| 2026-10-09 | WATER CANYON | UMA-LEHI | 12–7 | Awaiting verification | source_not_final |
| 2026-10-09 | WEST JORDAN | KEARNS | 48–0 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-09/west-jordan-football-vs-kearns-football/274373) |
| 2026-10-09 | WESTLAKE | CEDAR VALLEY | 43–6 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-09/westlake-football-vs-cedar-valley-football/273731) |
| 2026-10-08 | ALTA | VIEWMONT | 37–20 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/alta-football-vs-viewmont-football/273593) |
| 2026-10-08 | BEAR RIVER | DESERET PEAK | 48–20 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/bear-river-football-vs-deseret-peak-football-football/273565) |
| 2026-10-08 | BOX ELDER | CLEARFIELD | 49–0 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/box-elder-football-vs-clearfield-football/273513) |
| 2026-10-08 | BRIGHTON | BOUNTIFUL | 0–38 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/brighton-football-vs-bountiful-football/273585) |
| 2026-10-08 | CORNER CANYON | AMERICAN FORK | 41–17 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/corner-canyon-football-vs-american-fork-football/273480) |
| 2026-10-08 | DEER CREEK | PROVO | 0–55 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/deer-creek-football-football-vs-provo-football/273341) |
| 2026-10-08 | FREMONT | WEST FIELD | 16–35 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/fremont-football-vs-west-field-football-football/273518) |
| 2026-10-08 | JORDAN | EAST | 29–35 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/jordan-football-vs-east-football/273913) |
| 2026-10-08 | JUAN DIEGO | MURRAY | 17–62 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/juan-diego-football-vs-murray-football/273759) |
| 2026-10-08 | LAYTON | DAVIS | 13–49 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/layton-football-vs-davis-football/273580) |
| 2026-10-08 | LAYTON CHRISTIAN | MAPLE MOUNTAIN | 10–7 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/layton-christian-football-vs-maple-mountain-football/273450) |
| 2026-10-08 | LOGAN | GRANTSVILLE | 37–36 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/logan-football-vs-grantsville-football/273419) |
| 2026-10-08 | LONE PEAK | LEHI | 14–7 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/lone-peak-football-vs-lehi-football/273466) |
| 2026-10-08 | MONUMENT VAL | MONTICELLO JV | 60–59 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/monument-valley-football-vs-monticello-jv-football/274424) |
| 2026-10-08 | MOUNTAIN CREST | TOOELE | 42–9 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/mountain-crest-football-vs-tooele-football/274338) |
| 2026-10-08 | MOUNTAIN VIEW | UINTAH | 31–19 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/mountain-view-football-vs-uintah-football/273316) |
| 2026-10-08 | NORTHRIDGE | BONNEVILLE | 28–0 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/northridge-football-vs-bonneville-football/273500) |
| 2026-10-08 | OGDEN | MORGAN | 7–48 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/ogden-football-vs-morgan-football/273296) |
| 2026-10-08 | OREM | PAYSON | 55–28 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/orem-football-vs-payson-football/274361) |
| 2026-10-08 | PARK CITY | TIMPANOGOS | 23–24 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/park-city-football-vs-timpanogos-football/273369) |
| 2026-10-08 | PLEASANT GROVE | TIMPVIEW | 28–21 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/pleasant-grove-football-vs-timpview-football/273770) |
| 2026-10-08 | RIVERTON | WEBER | 27–28 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/riverton-football-vs-weber-football/273574) |
| 2026-10-08 | SALEM HILLS | WASATCH | 42–7 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/salem-hills-football-vs-wasatch-football/273388) |
| 2026-10-08 | SKYLINE | HIGHLAND | 37–23 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/skyline-football-vs-highland-football/274342) |
| 2026-10-08 | SPANISH FORK | SPRINGVILLE | 14–28 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/spanish-fork-football-vs-springville-football/274351) |
| 2026-10-08 | SYRACUSE | FARMINGTON | 23–16 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/syracuse-football-vs-farmington-football/274393) |
| 2026-10-08 | TAYLORSVILLE | HILLCREST | 0–49 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/taylorsville-football-vs-hillcrest-football/274382) |
| 2026-10-08 | UNION | BEN LOMOND | 40–7 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/union-football-vs-ben-lomond-football/273398) |
| 2026-10-08 | WOODS CROSS | OLYMPUS | 6–27 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-08/woods-cross-football-vs-olympus-football/273584) |
| 2026-10-07 | HURRICANE | ROY | 45–0 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-10-07/hurricane-football-vs-roy-football/274367) |
| 2026-10-07 | RIDGELINE | GREEN CANYON | 44–12 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-07/ridgeline-football-vs-green-canyon-football/273621) |
| 2026-10-07 | SKY VIEW | STANSBURY | 25–34 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-07/sky-view-football-vs-stansbury-football/273612) |
| 2026-10-02 | BEAR RIVER | MOUNTAIN CREST | 35–49 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/bear-river-football-vs-mountain-crest-football/273564) |
| 2026-10-02 | BEN LOMOND | LOGAN | 0–49 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/ben-lomond-football-vs-logan-football/273420) |
| 2026-10-02 | BONNEVILLE | CLEARFIELD | 19–15 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/bonneville-football-vs-clearfield-football/273503) |
| 2026-10-02 | BOUNTIFUL | ALTA | 29–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/bountiful-football-vs-alta-football/274364) |
| 2026-10-02 | BOX ELDER | FREMONT | 17–16 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/box-elder-football-vs-fremont-football/273512) |
| 2026-10-02 | CEDAR CITY | CANYON VIEW | 9–19 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/cedar-city-football-vs-canyon-view-football/273401) |
| 2026-10-02 | CEDAR VALLEY | CORNER CANYON | 0–56 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/cedar-valley-football-vs-corner-canyon-football/273481) |
| 2026-10-02 | COPPER HILLS | BINGHAM | 14–13 | Conflicting sources | quarter_sum_conflict · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/copper-hills-football-vs-bingham-football/273554) |
| 2026-10-02 | COTTONWOOD | JORDAN | 6–51 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/cottonwood-football-vs-jordan-football/273630) |
| 2026-10-02 | CRIMSON CLIFFS | DIXIE | 34–0 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/crimson-cliffs-football-vs-dixie-football/273493) |
| 2026-10-02 | DELTA | CARBON | 55–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/delta-football-vs-carbon-football/273384) |
| 2026-10-02 | DESERET PEAK | SKY VIEW | 0–51 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/deseret-peak-football-football-vs-sky-view-football/273610) |
| 2026-10-02 | DUCHESNE | MILLARD | 35–3 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/duchesne-football-vs-millard-football/273665) |
| 2026-10-02 | EAST | SKYLINE | 12–49 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/east-football-vs-skyline-football/274341) |
| 2026-10-02 | EMERY | SOUTH SEVIER | 33–56 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/emery-football-vs-south-sevier-football/273702) |
| 2026-10-02 | FARMINGTON | DAVIS | 3–14 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/farmington-football-vs-davis-football/273742) |
| 2026-10-02 | GRAND | ALTAMONT | 45–20 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/grand-football-vs-altamont-football/273697) |
| 2026-10-02 | GRANGER | HUNTER | 28–24 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/granger-football-vs-hunter-football/273765) |
| 2026-10-02 | GRANTSVILLE | MORGAN | 7–42 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/grantsville-football-vs-morgan-football/273295) |
| 2026-10-02 | HERRIMAN | MOUNTAIN RIDGE | 7–45 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/herriman-football-vs-mountain-ridge-football/273542) |
| 2026-10-02 | HIGHLAND | JUAN DIEGO | 62–0 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/highland-football-vs-juan-diego-football/273761) |
| 2026-10-02 | HILLCREST | CYPRUS | 53–0 | Conflicting sources | final_total_conflict · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/hillcrest-football-vs-cyprus-football/273601) |
| 2026-10-02 | HURRICANE | SNOW CANYON | 27–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/hurricane-football-vs-snow-canyon-football/273715) |
| 2026-10-02 | KANAB | ENTERPRISE | 35–14 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/kanab-football-vs-enterprise-football/273320) |
| 2026-10-02 | KEARNS | TAYLORSVILLE | 14–32 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/kearns-football-vs-taylorsville-football/274381) |
| 2026-10-02 | LEHI | AMERICAN FORK | 20–19 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/lehi-football-vs-american-fork-football/273540) |
| 2026-10-02 | MAPLE MOUNTAIN | SPANISH FORK | 7–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/maple-mountain-football-vs-spanish-fork-football/273645) |
| 2026-10-02 | MILFORD | MONTICELLO | 40–38 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/milford-football-vs-monticello-football/274413) |
| 2026-10-02 | MONUMENT VAL | PANGUITCH | 8–46 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/monument-valley-football-vs-panguitch-football/273636) |
| 2026-10-02 | MURRAY | PROVIDENCE HALL | 62–21 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/murray-football-vs-providence-hall-football/274332) |
| 2026-10-02 | NORTH SUMMIT | NORTH SEVIER | 41–7 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/north-summit-football-vs-north-sevier-football/273357) |
| 2026-10-02 | OLYMPUS | VIEWMONT | 34–21 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/olympus-football-vs-viewmont-football/273587) |
| 2026-10-02 | PARK CITY | WASATCH | 28–27 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/park-city-football-vs-wasatch-football/273387) |
| 2026-10-02 | PAROWAN | BEAVER | 0–49 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/parowan-football-vs-beaver-football/273349) |
| 2026-10-02 | PAYSON | LAYTON CHRISTIAN | 21–53 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/payson-football-vs-layton-christian-football/273445) |
| 2026-10-02 | PINE VIEW | DESERT HILLS | 45–40 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/pine-view-football-vs-desert-hills-football/273487) |
| 2026-10-02 | PLEASANT GROVE | OREM | 10–35 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/pleasant-grove-football-vs-orem-football/274359) |
| 2026-10-02 | PROVO | UINTAH | 66–21 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/provo-football-vs-uintah-football/273315) |
| 2026-10-02 | RICH | GRACE, ID | 54–19 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/rich-football-vs-grace-idaho-football/274409) |
| 2026-10-02 | RICHFIELD | JUAB | 21–37 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/richfield-football-vs-juab-football/273305) |
| 2026-10-02 | ROCKLAND, ID | SAINT JOSEPH | 67–13 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/rockland-idaho-football-football-vs-st-joseph-football-football/274432) |
| 2026-10-02 | ROY | NORTHRIDGE | 20–16 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/roy-football-vs-northridge-football/273527) |
| 2026-10-02 | SALEM HILLS | DEER CREEK | 40–10 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/salem-hills-football-vs-deer-creek-football-football/273345) |
| 2026-10-02 | SKYRIDGE | LONE PEAK | 27–24 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/skyridge-football-vs-lone-peak-football/273468) |
| 2026-10-02 | SOUTH SUMMIT | ALA | 49–7 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/south-summit-football-vs-american-leadership-football/273411) |
| 2026-10-02 | SUMMIT ACADEMY | JUDGE MEMORIAL | 44–21 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/summit-academy-football-vs-judge-memorial-football/273907) |
| 2026-10-02 | TIMPANOGOS | MOUNTAIN VIEW | 28–31 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/timpanogos-football-vs-mountain-view-football/273367) |
| 2026-10-02 | TIMPVIEW | SPRINGVILLE | 7–9 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/timpview-football-vs-springville-football/273772) |
| 2026-10-02 | UNION | OGDEN | 6–48 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/union-football-vs-ogden-football/273397) |
| 2026-10-02 | WEBER | SYRACUSE | 37–50 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/weber-football-vs-syracuse-football/274392) |
| 2026-10-02 | WEST FIELD | LAYTON | 21–20 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/west-field-football-football-vs-layton-football/273523) |
| 2026-10-02 | WESTLAKE | RIVERTON | 14–7 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/westlake-football-vs-riverton-football/273571) |
| 2026-10-02 | WHITEHORSE | UMA-LEHI | 30–41 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/whitehorse-football-vs-utah-military-camp-williams-football-football/274433) |
| 2026-10-02 | WOODS CROSS | BRIGHTON | 60–52 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-02/woods-cross-football-vs-brighton-football/273745) |
| 2026-10-01 | NORTH SANPETE | MANTI | 36–21 | Awaiting verification | source_not_final |
| 2026-10-01 | STANSBURY | RIDGELINE | 39–42 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-10-01/stansbury-football-vs-ridgeline-football/273617) |
| 2026-10-01 | WEST | WEST JORDAN | 63–0 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-10-01/west-football-vs-west-jordan-football/274372) |
| 2026-09-25 | ALTA | WOODS CROSS | 27–21 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/alta-football-vs-woods-cross-football/273749) |
| 2026-09-25 | BEAVER | NORTH SUMMIT | 30–6 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/beaver-football-vs-north-summit-football/273348) |
| 2026-09-25 | BONNEVILLE | BOX ELDER | 7–43 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/bonneville-football-vs-box-elder-football/273502) |
| 2026-09-25 | BRIGHTON | OLYMPUS | 27–42 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/brighton-football-vs-olympus-football/273744) |
| 2026-09-25 | CANYON VIEW | JUAB | 14–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/canyon-view-football-vs-juab-football/273402) |
| 2026-09-25 | CARBON | NORTH SANPETE | 14–42 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/carbon-football-vs-north-sanpete-football/273335) |
| 2026-09-25 | CEDAR CITY | RICHFIELD | 7–38 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/cedar-city-football-vs-richfield-football/273304) |
| 2026-09-25 | CEDAR VALLEY | BINGHAM | 7–49 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/cedar-valley-football-vs-bingham-football/273736) |
| 2026-09-25 | CLEARFIELD | ROY | 20–27 | Conflicting sources | quarter_sum_conflict · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/clearfield-football-vs-roy-football/273739) |
| 2026-09-25 | CORNER CANYON | SKYRIDGE | 27–37 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/corner-canyon-football-vs-skyridge-football/273479) |
| 2026-09-25 | CYPRUS | GRANGER | 17–36 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/cyprus-football-vs-granger-football/273604) |
| 2026-09-25 | DAVIS | SYRACUSE | 49–35 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/davis-football-vs-syracuse-football/273741) |
| 2026-09-25 | DEER CREEK | TIMPANOGOS | 0–37 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/deer-creek-football-football-vs-timpanogos-football/273340) |
| 2026-09-25 | DELTA | SOUTH SEVIER | 58–20 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/delta-football-vs-south-sevier-football/273379) |
| 2026-09-25 | DESERET PEAK | MOUNTAIN CREST | 7–43 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/deseret-peak-football-football-vs-mountain-crest-football/273667) |
| 2026-09-25 | DESERT HILLS | DIXIE | 47–25 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/desert-hills-football-vs-dixie-football/273485) |
| 2026-09-25 | FREMONT | FARMINGTON | 14–11 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/fremont-football-vs-farmington-football/273520) |
| 2026-09-25 | GREEN CANYON | BEAR RIVER | 21–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/green-canyon-football-vs-bear-river-football/273567) |
| 2026-09-25 | GUNNISON VALLEY | DUCHESNE | 14–63 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/gunnison-valley-football-vs-duchesne-football/273676) |
| 2026-09-25 | JORDAN | JUDGE MEMORIAL | 24–16 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/jordan-football-vs-judge-memorial-football/273906) |
| 2026-09-25 | JUAN DIEGO | EAST | 6–54 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/juan-diego-football-vs-east-football/273758) |
| 2026-09-25 | KEARNS | HUNTER | 0–45 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/kearns-football-vs-hunter-football/273764) |
| 2026-09-25 | LAYTON CHRISTIAN | PLEASANT GROVE | 15–23 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/layton-christian-football-vs-pleasant-grove-football/273449) |
| 2026-09-25 | LEHI | HERRIMAN | 22–20 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/lehi-football-vs-herriman-football/273548) |
| 2026-09-25 | MANTI | SAN JUAN | 38–61 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/manti-football-vs-san-juan-football/273444) |
| 2026-09-25 | MILLARD | NORTH SEVIER | 51–13 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/millard-football-vs-north-sevier-football/273664) |
| 2026-09-25 | MONTICELLO | ALTAMONT | 39–19 | Conflicting sources | final_total_conflict · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/monticello-football-vs-altamont-football/274402) |
| 2026-09-25 | MORGAN | BEN LOMOND | 56–0 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/morgan-football-vs-ben-lomond-football/273293) |
| 2026-09-25 | MURRAY | HIGHLAND | 29–34 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/murray-football-vs-highland-football/274346) |
| 2026-09-25 | NORTHRIDGE | WEST FIELD | 7–43 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/northridge-football-vs-west-field-football-football/273521) |
| 2026-09-25 | OGDEN | GRANTSVILLE | 24–21 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/ogden-football-vs-grantsville-football/273456) |
| 2026-09-25 | OREM | TIMPVIEW | 17–14 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/orem-football-vs-timpview-football/273769) |
| 2026-09-25 | PANGUITCH | UMA-HILLFIELD | 22–24 | Awaiting verification | not_in_source |
| 2026-09-25 | PAROWAN | KANAB | 0–49 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/parowan-football-vs-kanab-football/273321) |
| 2026-09-25 | PINE VIEW | HURRICANE | 21–38 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/pine-view-football-vs-hurricane-football/273711) |
| 2026-09-25 | PROVIDENCE HALL | ALA | 28–34 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/providence-hall-football-vs-american-leadership-football/274331) |
| 2026-09-25 | RICH | BEAR LAKE, ID | 33–12 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/rich-football-vs-bear-lake-idaho-football/274408) |
| 2026-09-25 | RIVERTON | MOUNTAIN RIDGE | 7–56 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/riverton-football-vs-mountain-ridge-football/273570) |
| 2026-09-25 | SALEM HILLS | MOUNTAIN VIEW | 40–31 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/salem-hills-football-vs-mountain-view-football/273426) |
| 2026-09-25 | SKY VIEW | RIDGELINE | 3–41 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/sky-view-football-vs-ridgeline-football/273613) |
| 2026-09-25 | SKYLINE | COTTONWOOD | 56–0 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/skyline-football-vs-cottonwood-football/273627) |
| 2026-09-25 | SNOW CANYON | CRIMSON CLIFFS | 16–38 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/snow-canyon-football-vs-crimson-cliffs-football/273496) |
| 2026-09-25 | SPRINGVILLE | MAPLE MOUNTAIN | 32–6 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/springville-football-vs-maple-mountain-football/273642) |
| 2026-09-25 | SUMMIT ACADEMY | SOUTH SUMMIT | 31–26 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/summit-academy-football-vs-south-summit-football/273414) |
| 2026-09-25 | TOOELE | STANSBURY | 19–51 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/tooele-football-vs-stansbury-football/275598) |
| 2026-09-25 | UINTAH | PARK CITY | 21–42 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/uintah-football-vs-park-city-football/273311) |
| 2026-09-25 | UMA-LEHI | MILFORD | 18–53 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/utah-military-camp-williams-football-football-vs-milford-football/274426) |
| 2026-09-25 | UNION | LOGAN | 24–55 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/union-football-vs-logan-football/273396) |
| 2026-09-25 | VIEWMONT | BOUNTIFUL | 19–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/viewmont-football-vs-bountiful-football/273595) |
| 2026-09-25 | WASATCH | PROVO | 0–48 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/wasatch-football-vs-provo-football/273385) |
| 2026-09-25 | WATER CANYON | SAINT JOSEPH | 94–61 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/water-canyon-football-football-vs-st-joseph-football-football/273690) |
| 2026-09-25 | WEBER | LAYTON | 30–23 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/weber-football-vs-layton-football/273579) |
| 2026-09-25 | WEST JORDAN | HILLCREST | 8–48 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/west-jordan-football-vs-hillcrest-football/274371) |
| 2026-09-25 | WESTLAKE | COPPER HILLS | 15–9 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/westlake-football-vs-copper-hills-football/273560) |
| 2026-09-25 | WHITEHORSE | GRAND | 0–45 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-25/whitehorse-football-vs-grand-football/273698) |
| 2026-09-24 | AMERICAN FORK | LONE PEAK | 28–24 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-24/american-fork-football-vs-lone-peak-football/273467) |
| 2026-09-24 | MONUMENT VAL | GRAND | 6–54 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-09-24/monument-valley-football-vs-grand-football/274423) |
| 2026-09-24 | SPANISH FORK | PAYSON | 49–21 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-24/spanish-fork-football-vs-payson-football/274357) |
| 2026-09-24 | WEST | TAYLORSVILLE | 71–7 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-24/west-football-vs-taylorsville-football/274376) |
| 2026-09-21 | MONTICELLO | WHITEHORSE | 48–12 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/monticello-football-vs-whitehorse-football/274419) |
| 2026-09-21 | PARK CITY | PROVO | 22–21 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/park-city-football-vs-provo-football/273675) |
| 2026-09-19 | COPPER HILLS | CEDAR VALLEY | 47–0 | Awaiting verification | source_not_final |
| 2026-09-19 | HERRIMAN | WESTLAKE | 48–7 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/herriman-football-vs-westlake-football/273541) |
| 2026-09-19 | JUAB | CARBON | 55–7 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/juab-football-vs-carbon-football/273403) |
| 2026-09-19 | MAPLE MOUNTAIN | TIMPVIEW | 13–56 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/maple-mountain-football-vs-timpview-football/273646) |
| 2026-09-19 | MONUMENT VAL | WATER CANYON | 12–60 | Awaiting verification | source_not_final |
| 2026-09-19 | MORGAN | UNION | 48–0 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/morgan-football-vs-union-football/273292) |
| 2026-09-19 | PLEASANT GROVE | SPANISH FORK | 24–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/pleasant-grove-football-vs-spanish-fork-football/274356) |
| 2026-09-19 | TIMPANOGOS | SALEM HILLS | 13–20 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/timpanogos-football-vs-salem-hills-football/273366) |
| 2026-09-18 | ALA | SUMMIT ACADEMY | 0–34 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/american-leadership-football-vs-summit-academy-football/274335) |
| 2026-09-18 | ALTAMONT | RICH | 18–47 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/altamont-football-vs-rich-football/274405) |
| 2026-09-18 | AMERICAN FORK | DAVIS | 29–21 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/american-fork-football-vs-davis-football/273537) |
| 2026-09-18 | BEAR RIVER | TOOELE | 47–33 | Conflicting sources | final_total_conflict · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/bear-river-football-vs-tooele-football/273563) |
| 2026-09-18 | BINGHAM | RIVERTON | 31–21 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/bingham-football-vs-riverton-football/273572) |
| 2026-09-18 | CRIMSON CLIFFS | DESERT HILLS | 38–0 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/crimson-cliffs-football-vs-desert-hills-football/273488) |
| 2026-09-18 | DELTA | SAN JUAN | 27–44 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/delta-football-vs-san-juan-football/273378) |
| 2026-09-18 | DIXIE | HURRICANE | 10–49 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/dixie-football-vs-hurricane-football/273708) |
| 2026-09-18 | DUCHESNE | NORTH SEVIER | 55–7 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/duchesne-football-vs-north-sevier-football/275603) |
| 2026-09-18 | EAST | MURRAY | 21–38 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/east-football-vs-murray-football/274345) |
| 2026-09-18 | EMERY | CANYON VIEW | 0–50 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/emery-football-vs-canyon-view-football/273408) |
| 2026-09-18 | ENTERPRISE | MILLARD | 7–21 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/enterprise-football-vs-millard-football/273375) |
| 2026-09-18 | FARMINGTON | WEBER | 30–13 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/farmington-football-vs-weber-football/274397) |
| 2026-09-18 | GRANTSVILLE | BEN LOMOND | 36–6 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/grantsville-football-vs-ben-lomond-football/273754) |
| 2026-09-18 | GUNNISON VALLEY | NORTH SUMMIT | 0–47 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/gunnison-valley-football-vs-north-summit-football/273355) |
| 2026-09-18 | HILLCREST | WEST | 6–55 | Conflicting sources | final_total_conflict · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/hillcrest-football-vs-west-football/274375) |
| 2026-09-18 | HUNTER | WEST JORDAN | 37–27 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/hunter-football-vs-west-jordan-football/273767) |
| 2026-09-18 | JORDAN | SKYLINE | 12–55 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-17/jordan-football-vs-skyline-football/273912) |
| 2026-09-18 | JUDGE MEMORIAL | PROVIDENCE HALL | 17–20 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/judge-memorial-football-vs-providence-hall-football/273908) |
| 2026-09-18 | LOGAN | OGDEN | 18–17 | Conflicting sources | final_total_conflict · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/logan-football-vs-ogden-football/273418) |
| 2026-09-18 | LONE PEAK | CORNER CANYON | 14–37 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/lone-peak-football-vs-corner-canyon-football/273465) |
| 2026-09-18 | MANTI | RICHFIELD | 7–49 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/manti-football-vs-richfield-football/273303) |
| 2026-09-18 | MOUNTAIN CREST | STANSBURY | 27–34 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/mountain-crest-football-vs-stansbury-football/273707) |
| 2026-09-18 | MOUNTAIN RIDGE | CHAPARRAL, CA | 54–41 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/mountain-ridge-football-vs-chaparral-ca-football-football/273729) |
| 2026-09-18 | MOUNTAIN VIEW | DEER CREEK | 49–10 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/mountain-view-football-vs-deer-creek-football-football/273344) |
| 2026-09-18 | NORTH SANPETE | CEDAR CITY | 24–48 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/north-sanpete-football-vs-cedar-city-football/273332) |
| 2026-09-18 | NORTHRIDGE | FREMONT | 17–31 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/northridge-football-vs-fremont-football/273516) |
| 2026-09-18 | OLYMPUS | ALTA | 10–23 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/olympus-football-vs-alta-football/273586) |
| 2026-09-18 | PAROWAN | MILFORD | 14–15 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/parowan-football-vs-milford-football/274327) |
| 2026-09-18 | PAYSON | SPRINGVILLE | 0–48 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/payson-football-vs-springville-football/274352) |
| 2026-09-18 | RIDGELINE | DESERET PEAK | 55–7 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/ridgeline-football-vs-deseret-peak-football-football/273620) |
| 2026-09-18 | RIGBY, ID | BOX ELDER | 34–32 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/rigby-idaho-football-vs-box-elder-football/273511) |
| 2026-09-18 | ROY | BONNEVILLE | 35–0 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/roy-football-vs-bonneville-football/273499) |
| 2026-09-18 | SAINT JOSEPH | WATERSPRING, ID | 43–72 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/st-joseph-football-football-vs-waterspring-idaho-football-football/274431) |
| 2026-09-18 | SKY VIEW | GREEN CANYON | 19–13 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/sky-view-football-vs-green-canyon-football/273614) |
| 2026-09-18 | SNOW CANYON | PINE VIEW | 28–25 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/snow-canyon-football-vs-pine-view-football/273712) |
| 2026-09-18 | SOUTH SUMMIT | LAYTON CHRISTIAN | 0–2 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/south-summit-football-vs-layton-christian-football/273416) |
| 2026-09-18 | SYRACUSE | LAYTON | 30–0 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/syracuse-football-vs-layton-football/273578) |
| 2026-09-18 | UINTAH | WASATCH | 17–16 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/uintah-football-vs-wasatch-football/273310) |
| 2026-09-18 | UMA-LEHI | UMA-HILLFIELD | 26–34 | Final verified, quarters unavailable | no_quarter_values |
| 2026-09-18 | VIEWMONT | BRIGHTON | 19–14 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/viewmont-football-vs-brighton-football/273596) |
| 2026-09-18 | WEST FIELD | CLEARFIELD | 42–14 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/west-field-football-football-vs-clearfield-football/273522) |
| 2026-09-18 | WOODS CROSS | BOUNTIFUL | 7–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-18/woods-cross-football-vs-bountiful-football/273750) |
| 2026-09-17 | COTTONWOOD | JUAN DIEGO | 3–48 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-17/cottonwood-football-vs-juan-diego-football/273629) |
| 2026-09-17 | CYPRUS | TAYLORSVILLE | 27–9 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-17/cyprus-football-vs-taylorsville-football/273605) |
| 2026-09-17 | GRANGER | KEARNS | 34–0 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-17/granger-football-vs-kearns-football/274383) |
| 2026-09-17 | KANAB | BEAVER | 14–7 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-17/kanab-football-vs-beaver-football/273319) |
| 2026-09-17 | SKYRIDGE | LEHI | 28–20 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-17/skyridge-football-vs-lehi-football/273893) |
| 2026-09-11 | ALA | SOUTH SEVIER | 7–40 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/american-leadership-football-vs-south-sevier-football/273701) |
| 2026-09-11 | ALTA | SYRACUSE | 7–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/alta-football-vs-syracuse-football/274394) |
| 2026-09-11 | BEAVER | MILLARD | 32–20 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/beaver-football-vs-millard-football/273353) |
| 2026-09-11 | BINGHAM | HERRIMAN | 0–44 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/bingham-football-vs-herriman-football/273544) |
| 2026-09-11 | BONNEVILLE | WEST FIELD | 30–36 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/bonneville-football-vs-west-field-football-football/273501) |
| 2026-09-11 | CANYON VIEW | NORTH SANPETE | 13–21 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/canyon-view-football-vs-north-sanpete-football/273336) |
| 2026-09-11 | CEDAR CITY | MANTI | 38–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/cedar-city-football-vs-manti-football/273433) |
| 2026-09-11 | CLEARFIELD | FREMONT | 6–50 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/clearfield-football-vs-fremont-football/273517) |
| 2026-09-11 | DEER CREEK | UINTAH | 14–36 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/deer-creek-football-football-vs-uintah-football/273314) |
| 2026-09-11 | DESERT HILLS | SNOW CANYON | 14–26 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/desert-hills-football-vs-snow-canyon-football/273484) |
| 2026-09-11 | EASTWOOD, TX | CORNER CANYON | 7–52 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/eastwood-texas-football-football-vs-corner-canyon-football/273474) |
| 2026-09-11 | ENTERPRISE | DUCHESNE | 6–20 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/enterprise-football-vs-duchesne-football/273374) |
| 2026-09-11 | GRAND | UMA-HILLFIELD | 12–6 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/grand-football-vs-utah-military-hillfield-football-football/273696) |
| 2026-09-11 | GREEN CANYON | DESERET PEAK | 33–7 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/green-canyon-football-vs-deseret-peak-football-football/273668) |
| 2026-09-11 | GUNNISON VALLEY | PAROWAN | 7–15 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/gunnison-valley-football-vs-parowan-football/273682) |
| 2026-09-11 | HIGHLAND | EAST | 35–0 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/highland-football-vs-east-football/274347) |
| 2026-09-11 | HILLCREST | HUNTER | 33–30 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/hillcrest-football-vs-hunter-football/273763) |
| 2026-09-11 | HURRICANE | CRIMSON CLIFFS | 11–10 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/hurricane-football-vs-crimson-cliffs-football/273495) |
| 2026-09-11 | JUAN DIEGO | JORDAN | 7–34 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/juan-diego-football-vs-jordan-football/273757) |
| 2026-09-11 | KEARNS | UNION | 20–48 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/kearns-football-vs-union-football/273394) |
| 2026-09-11 | LAYTON | AMERICAN FORK | 0–45 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/layton-football-vs-american-fork-football/273536) |
| 2026-09-11 | LAYTON CHRISTIAN | VIEWMONT | 55–14 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/layton-christian-football-vs-viewmont-football/273448) |
| 2026-09-11 | LEHI | WEBER | 28–14 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/lehi-football-vs-weber-football/274389) |
| 2026-09-11 | LOGAN | PROVIDENCE HALL | 70–7 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/logan-football-vs-providence-hall-football/273425) |
| 2026-09-11 | MILFORD | LINCOLN COUNTY, NV | 35–42 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/milford-football-vs-lincoln-county-nev-football/274428) |
| 2026-09-11 | MOFFAT, CO | BEN LOMOND | 0–17 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/moffat-colo-football-vs-ben-lomond-football/275601) |
| 2026-09-11 | MONTICELLO | NORWOOD, CO | 28–44 | Conflicting sources | quarter_sum_conflict · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/monticello-football-vs-norwood-colo-football/274420) |
| 2026-09-11 | MONUMENT VAL | UMA-LEHI | 0–47 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/monument-valley-football-vs-utah-military-camp-williams-football-football/274422) |
| 2026-09-11 | MORGAN | FAITH LUTHERAN, NV | 54–36 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/morgan-football-vs-faith-lutheran-nev-football-football/273291) |
| 2026-09-11 | MOUNTAIN CREST | SKY VIEW | 14–20 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/mountain-crest-football-vs-sky-view-football/273611) |
| 2026-09-11 | MOUNTAIN RIDGE | COPPER HILLS | 43–7 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/mountain-ridge-football-vs-copper-hills-football/273551) |
| 2026-09-11 | MOUNTAIN VIEW | PROVO | 14–37 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/mountain-view-football-vs-provo-football/273674) |
| 2026-09-11 | MURRAY | COTTONWOOD | 55–0 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/murray-football-vs-cottonwood-football/273628) |
| 2026-09-11 | NORTH SEVIER | RICH | 14–48 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/north-sevier-football-vs-rich-football/274411) |
| 2026-09-11 | NORTH SUMMIT | KANAB | 24–29 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/north-summit-football-vs-kanab-football/273324) |
| 2026-09-11 | OGDEN | EMERY | 43–7 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/ogden-football-vs-emery-football/273462) |
| 2026-09-11 | OLYMPUS | DAVIS | 14–47 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/olympus-football-vs-davis-football/273592) |
| 2026-09-11 | PANGUITCH | WHITEHORSE | 6–46 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/panguitch-football-vs-whitehorse-football/273639) |
| 2026-09-11 | PAYSON | MAPLE MOUNTAIN | 27–22 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/payson-football-vs-maple-mountain-football/273643) |
| 2026-09-11 | PINE VIEW | DIXIE | 69–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/pine-view-football-vs-dixie-football/273709) |
| 2026-09-11 | PRESTON, ID | NORTHRIDGE | 20–38 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/preston-idaho-football-vs-northridge-football/273532) |
| 2026-09-11 | RICHFIELD | CARBON | 48–0 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/richfield-football-vs-carbon-football/273683) |
| 2026-09-11 | RIVERTON | CEDAR VALLEY | 14–7 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/riverton-football-vs-cedar-valley-football/273569) |
| 2026-09-11 | SALEM HILLS | PARK CITY | 14–7 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/salem-hills-football-vs-park-city-football/273427) |
| 2026-09-11 | SKYLINE | SKYRIDGE | 7–42 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/skyline-football-vs-skyridge-football/273892) |
| 2026-09-11 | SOUTH SUMMIT | SAN JUAN | 28–58 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/south-summit-football-vs-san-juan-football/273417) |
| 2026-09-11 | SPANISH FORK | OREM | 0–48 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/spanish-fork-football-vs-orem-football/274358) |
| 2026-09-11 | SPRINGVILLE | PLEASANT GROVE | 34–8 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/springville-football-vs-pleasant-grove-football/274353) |
| 2026-09-11 | STANSBURY | BEAR RIVER | 52–7 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/stansbury-football-vs-bear-river-football/273566) |
| 2026-09-11 | SUMMIT ACADEMY | DELTA | 14–24 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/summit-academy-football-vs-delta-football/273382) |
| 2026-09-11 | TAYLORSVILLE | GRANGER | 10–49 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/taylorsville-football-vs-granger-football/274380) |
| 2026-09-11 | TIMPVIEW | LONE PEAK | 0–41 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/timpview-football-vs-lone-peak-football/273472) |
| 2026-09-11 | TOOELE | RIDGELINE | 0–62 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/tooele-football-vs-ridgeline-football/273618) |
| 2026-09-11 | WASATCH | TIMPANOGOS | 21–41 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/wasatch-football-vs-timpanogos-football/273368) |
| 2026-09-11 | WATER CANYON | ALTAMONT | 54–8 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/water-canyon-football-football-vs-altamont-football/273688) |
| 2026-09-11 | WEST JORDAN | CYPRUS | 21–17 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/west-jordan-football-vs-cyprus-football/273608) |
| 2026-09-11 | WESTLAKE | RANCHO BERNARDO, CA | 28–14 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/westlake-football-vs-rancho-bernardo-calif-football-football/273732) |
| 2026-09-11 | WOODS CROSS | FARMINGTON | 17–41 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/woods-cross-football-vs-farmington-football/273752) |
| 2026-09-10 | JUAB | GRANTSVILLE | 7–42 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-11/juab-football-vs-grantsville-football/273755) |
| 2026-09-10 | ROY | BOX ELDER | 19–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-10/roy-football-vs-box-elder-football/273505) |
| 2026-09-10 | WEST | BRIGHTON | 56–13 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-10/west-football-vs-brighton-football/273748) |
| 2026-09-04 | ALA QUEEN CREEK, AZ | LEHI | 12–27 | Final verified, quarters unavailable | no_quarter_values |
| 2026-09-04 | ALTAMONT | UMA-LEHI | 46–54 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/altamont-football-vs-utah-military-camp-williams-football-football/274401) |
| 2026-09-04 | BEAR RIVER | SKY VIEW | 35–32 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/bear-river-football-vs-sky-view-football/273562) |
| 2026-09-04 | BEN LOMOND | ALA | 13–17 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/ben-lomond-football-vs-american-leadership-football/274334) |
| 2026-09-04 | BINGHAM | WESTLAKE | 6–17 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/bingham-football-vs-westlake-football/273730) |
| 2026-09-04 | BISHOP GORMAN, NV | LONE PEAK | 38–14 | Final verified, quarters unavailable | no_quarter_values |
| 2026-09-04 | BOX ELDER | NORTHRIDGE | 34–0 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/box-elder-football-vs-northridge-football/273509) |
| 2026-09-04 | CARBON | CANYON VIEW | 7–58 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/carbon-football-vs-canyon-view-football/273404) |
| 2026-09-04 | CEDAR VALLEY | MOUNTAIN RIDGE | 0–59 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/cedar-valley-football-vs-mountain-ridge-football/273723) |
| 2026-09-04 | CORNER CANYON | LIBERTY, AZ | 24–38 | Final verified, quarters unavailable | no_quarter_values |
| 2026-09-04 | COTTONWOOD | HIGHLAND | 0–55 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/cottonwood-football-vs-highland-football/273632) |
| 2026-09-04 | CRIMSON CLIFFS | BRIGHTON | 36–13 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/crimson-cliffs-football-vs-brighton-football/273492) |
| 2026-09-04 | DAVIS | ALTA | 27–6 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/davis-football-vs-alta-football/273743) |
| 2026-09-04 | DELTA | PROVIDENCE HALL | 32–9 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/delta-football-vs-providence-hall-football/273377) |
| 2026-09-04 | DESERET PEAK | TOOELE | 13–43 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/deseret-peak-football-football-vs-tooele-football/273671) |
| 2026-09-04 | DESERT HILLS | SPANISH FORK | 7–32 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/desert-hills-football-vs-spanish-fork-football/273483) |
| 2026-09-04 | DIXIE | CEDAR CITY | 35–34 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/dixie-football-vs-cedar-city-football/273438) |
| 2026-09-04 | DUCHESNE | BEAVER | 24–15 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/duchesne-football-vs-beaver-football/273352) |
| 2026-09-04 | EMERY | JUDGE MEMORIAL | 48–16 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/emery-football-vs-judge-memorial-football/273905) |
| 2026-09-04 | FARMINGTON | AMERICAN FORK | 13–41 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/farmington-football-vs-american-fork-football/274398) |
| 2026-09-04 | FREMONT | BONNEVILLE | 48–6 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/fremont-football-vs-bonneville-football/273498) |
| 2026-09-04 | GRANGER | HILLCREST | 0–45 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/granger-football-vs-hillcrest-football/274386) |
| 2026-09-04 | GRANTSVILLE | HURRICANE | 10–43 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/grantsville-football-vs-hurricane-football/273719) |
| 2026-09-04 | GREEN CANYON | STANSBURY | 14–34 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/green-canyon-football-vs-stansbury-football/273706) |
| 2026-09-04 | HAYDEN, CO | GRAND | 66–13 | Final verified, quarters unavailable | no_quarter_values |
| 2026-09-04 | HERRIMAN | RIVERTON | 47–3 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/herriman-football-vs-riverton-football/273543) |
| 2026-09-04 | KANAB | MILLARD | 42–6 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/kanab-football-vs-millard-football/273318) |
| 2026-09-04 | KEARNS | CYPRUS | 14–35 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/kearns-football-vs-cyprus-football/273600) |
| 2026-09-04 | LAYTON | COPPER HILLS | 29–33 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/layton-football-vs-copper-hills-football/273557) |
| 2026-09-04 | LAYTON CHRISTIAN | EAST | 50–0 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/layton-christian-football-vs-east-football/273447) |
| 2026-09-04 | MANTI | JUAB | 29–58 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/manti-football-vs-juab-football/273896) |
| 2026-09-04 | MILFORD | GUNNISON VALLEY | 13–42 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/milford-football-vs-gunnison-valley-football/273680) |
| 2026-09-04 | MONTICELLO | DOLORES, CO | 26–21 | Final verified, quarters unavailable | no_quarter_values |
| 2026-09-04 | NORTH SANPETE | RICHFIELD | 7–36 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/north-sanpete-football-vs-richfield-football/273301) |
| 2026-09-04 | NORTH SEVIER | ENTERPRISE | 14–59 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/north-sevier-football-vs-enterprise-football/273376) |
| 2026-09-04 | OGDEN | CLEARFIELD | 48–13 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/ogden-football-vs-clearfield-football/273461) |
| 2026-09-04 | OREM | SPRINGVILLE | 42–14 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/orem-football-vs-springville-football/274355) |
| 2026-09-04 | PARK CITY | MOUNTAIN VIEW | 33–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/park-city-football-vs-mountain-view-football/273916) |
| 2026-09-04 | PAROWAN | NORTH SUMMIT | 0–45 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/parowan-football-vs-north-summit-football/273362) |
| 2026-09-04 | PIEDRA VISTA, NM | OLYMPUS | 14–29 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/piedra-vista-nm-football-vs-olympus-football/273591) |
| 2026-09-04 | PINE VIEW | LOGAN | 59–29 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/pine-view-football-vs-logan-football/273422) |
| 2026-09-04 | PLEASANT GROVE | MAPLE MOUNTAIN | 38–14 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/pleasant-grove-football-vs-maple-mountain-football/273644) |
| 2026-09-04 | RICH | MOUNTAIN VIEW, WY | 13–14 | Final verified, quarters unavailable | no_quarter_values |
| 2026-09-04 | RIDGELINE | MOUNTAIN CREST | 42–14 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/ridgeline-football-vs-mountain-crest-football/273619) |
| 2026-09-04 | SAINT JOSEPH | PANGUITCH | 35–6 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/st-joseph-football-football-vs-panguitch-football/273635) |
| 2026-09-04 | SKYLINE | JUAN DIEGO | 69–7 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/skyline-football-vs-juan-diego-football/273760) |
| 2026-09-04 | SKYRIDGE | LIBERTY, NV | 24–20 | Final verified, quarters unavailable | no_quarter_values |
| 2026-09-04 | SOUTH SEVIER | SOUTH SUMMIT | 7–43 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/south-sevier-football-vs-south-summit-football/273415) |
| 2026-09-04 | SUMMIT ACADEMY | SAN JUAN | 14–38 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/summit-academy-football-vs-san-juan-football/273443) |
| 2026-09-04 | SYRACUSE | RIGBY, ID | 14–28 | Final verified, quarters unavailable | no_quarter_values |
| 2026-09-04 | TAYLORSVILLE | WEST JORDAN | 9–47 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/taylorsville-football-vs-west-jordan-football/275596) |
| 2026-09-04 | TIMPANOGOS | UINTAH | 35–14 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/timpanogos-football-vs-uintah-football/273313) |
| 2026-09-04 | TIMPVIEW | PAYSON | 48–3 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/timpview-football-vs-payson-football/273773) |
| 2026-09-04 | UMA-HILLFIELD | MONUMENT VAL | 34–14 | Final verified, quarters unavailable | no_quarter_values |
| 2026-09-04 | WASATCH | DEER CREEK | 40–9 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/wasatch-football-vs-deer-creek-football-football/273343) |
| 2026-09-04 | WEBER | VIEWMONT | 28–21 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/weber-football-vs-viewmont-football/273599) |
| 2026-09-04 | WEST | HUNTER | 54–6 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/west-football-vs-hunter-football/273762) |
| 2026-09-04 | WEST FIELD | ROY | 30–25 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/west-field-football-football-vs-roy-football/273525) |
| 2026-09-04 | WHITEHORSE | WATER CANYON | 62–32 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/whitehorse-football-vs-water-canyon-football-football/273693) |
| 2026-09-04 | WOODS CROSS | SNOW CANYON | 28–35 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-04/woods-cross-football-vs-snow-canyon-football/273722) |
| 2026-09-03 | BOUNTIFUL | MORGAN | 14–37 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-03/bountiful-football-vs-morgan-football/273290) |
| 2026-09-03 | JORDAN | MURRAY | 17–40 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-03/jordan-football-vs-murray-football/273915) |
| 2026-09-03 | PROVO | SALEM HILLS | 34–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-09-03/provo-football-vs-salem-hills-football/273428) |
| 2026-08-31 | UMA-LEHI | SAINT JOSEPH | 28–47 | Awaiting verification | not_in_source |
| 2026-08-29 | HUN, NJ | SKYRIDGE | 24–31 | Final verified, quarters unavailable | no_quarter_values |
| 2026-08-29 | MATER DEI, CA | OREM | 32–26 | Final verified, quarters unavailable | no_quarter_values |
| 2026-08-29 | PROVIDENCE HALL | LAKE MEAD CHRISTIAN ACADEMY, NV | 20–18 | Final verified, quarters unavailable | no_quarter_values |
| 2026-08-29 | ST. JAMES PERFORMANCE ACADEMY, VA | LEHI | 66–0 | Final verified, quarters unavailable | no_quarter_values |
| 2026-08-28 | ALA | WHITE PINE, NV | 31–0 | Final verified, quarters unavailable | no_quarter_values |
| 2026-08-28 | ALTA | GRANGER | 49–0 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/alta-football-vs-granger-football/274388) |
| 2026-08-28 | ALTAMONT | RANGELY, CO | 14–60 | Final verified, quarters unavailable | no_quarter_values |
| 2026-08-28 | AMERICAN FORK | TIMPVIEW | 28–26 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/american-fork-football-vs-timpview-football/273534) |
| 2026-08-28 | ARCHBISHOP RIORDAN, CA | WEST | 13–21 | Final verified, quarters unavailable | no_quarter_values |
| 2026-08-28 | BEAVER | EMERY | 50–40 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/beaver-football-vs-emery-football/273347) |
| 2026-08-28 | BOUNTIFUL | SYRACUSE | 36–33 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/bountiful-football-vs-syracuse-football/274365) |
| 2026-08-28 | BOX ELDER | HIGHLAND, ID | 31–19 | Final verified, quarters unavailable | no_quarter_values |
| 2026-08-28 | BRIGHTON | RIDGELINE | 24–52 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/brighton-football-vs-ridgeline-football/273623) |
| 2026-08-28 | BUCKEYE, AZ | SUMMIT ACADEMY | 19–35 | Final verified, quarters unavailable | no_quarter_values |
| 2026-08-28 | CAMPBELL, HI | PINE VIEW | 48–27 | Final verified, quarters unavailable | no_quarter_values |
| 2026-08-28 | CANYON VIEW | SOUTH SEVIER | 42–20 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/canyon-view-football-vs-south-sevier-football/273407) |
| 2026-08-28 | CEDAR VALLEY | CRIMSON CLIFFS | 7–42 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/cedar-valley-football-vs-crimson-cliffs-football/273491) |
| 2026-08-28 | CLEARFIELD | LAYTON | 0–47 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/clearfield-football-vs-layton-football/273582) |
| 2026-08-28 | CYPRUS | TOOELE | 28–30 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/cyprus-football-vs-tooele-football/273606) |
| 2026-08-28 | DEER CREEK | JORDAN | 10–13 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/deer-creek-football-football-vs-jordan-football/273339) |
| 2026-08-28 | DELTA | NORTH SANPETE | 14–21 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/delta-football-vs-north-sanpete-football/273330) |
| 2026-08-28 | DESERET PEAK | RICHFIELD | 0–48 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/deseret-peak-football-football-vs-richfield-football/273299) |
| 2026-08-28 | DESERT HILLS | SALEM HILLS | 12–14 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/desert-hills-football-vs-salem-hills-football/273430) |
| 2026-08-28 | DIXIE | NORTHRIDGE | 16–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/dixie-football-vs-northridge-football/273531) |
| 2026-08-28 | ENTERPRISE | MILFORD | 35–0 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/enterprise-football-vs-milford-football/273373) |
| 2026-08-28 | EVANSTON, WY | BEN LOMOND | 46–12 | Final verified, quarters unavailable | no_quarter_values |
| 2026-08-28 | FREMONT | CORNER CANYON | 0–49 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/fremont-football-vs-corner-canyon-football/273477) |
| 2026-08-28 | GRAND | GUNNISON VALLEY | 6–43 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/grand-football-vs-gunnison-valley-football/273679) |
| 2026-08-28 | GRANTSVILLE | MANTI | 47–46 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/grantsville-football-vs-manti-football/273753) |
| 2026-08-28 | HERRIMAN | WEST JORDAN | 55–7 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/herriman-football-vs-west-jordan-football/273550) |
| 2026-08-28 | HILLCREST | COTTONWOOD | 51–0 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/hillcrest-football-vs-cottonwood-football/273625) |
| 2026-08-28 | IGNACIO, CO | DUCHESNE | 0–73 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/ignacio-colo-football-vs-duchesne-football/275602) |
| 2026-08-28 | JUAN DIEGO | CARBON | 37–42 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/juan-diego-football-vs-carbon-football/273686) |
| 2026-08-28 | JUDGE MEMORIAL | NORTH SEVIER | 15–48 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/judge-memorial-football-vs-north-sevier-football/273910) |
| 2026-08-28 | KEARNS | PAYSON | 0–46 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/kearns-football-vs-payson-football/274385) |
| 2026-08-28 | LAYTON CHRISTIAN | KIMBERLY, ID | 48–7 | Final verified, quarters unavailable | no_quarter_values |
| 2026-08-28 | LONE PEAK | SKYLINE | 45–3 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/lone-peak-football-vs-skyline-football/273471) |
| 2026-08-28 | MAPLE MOUNTAIN | SOUTH PASADENA, CA | 36–7 | Final verified, quarters unavailable | no_quarter_values |
| 2026-08-28 | MILLARD | PAROWAN | 44–21 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/millard-football-vs-parowan-football/273663) |
| 2026-08-28 | MONTICELLO | WATER CANYON | 57–20 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/monticello-football-vs-water-canyon-football-football/274416) |
| 2026-08-28 | MORGAN | PARK CITY | 35–0 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/morgan-football-vs-park-city-football/273289) |
| 2026-08-28 | MOUNTAIN CREST | LOGAN | 28–26 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/mountain-crest-football-vs-logan-football/273421) |
| 2026-08-28 | MOUNTAIN VIEW | UNION | 22–19 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/mountain-view-football-vs-union-football/273393) |
| 2026-08-28 | MURRAY | HURRICANE | 21–49 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/murray-football-vs-hurricane-football/273718) |
| 2026-08-28 | NORTH SUMMIT | RICH | 28–20 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/north-summit-football-vs-rich-football/273361) |
| 2026-08-28 | OGDEN | WEST FIELD | 0–7 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/ogden-football-vs-west-field-football-football/273460) |
| 2026-08-28 | OLYMPUS | WESTLAKE | 13–14 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/olympus-football-vs-westlake-football/273589) |
| 2026-08-28 | PANGUITCH | MONUMENT VAL | 52–14 | Final verified, quarters unavailable | no_quarter_values · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/panguitch-football-vs-monument-valley-football/273638) |
| 2026-08-28 | PLEASANT GROVE | GREEN CANYON | 27–23 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/pleasant-grove-football-vs-green-canyon-football/274340) |
| 2026-08-28 | PROVO | SPRINGVILLE | 14–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/provo-football-vs-springville-football/273673) |
| 2026-08-28 | RIGBY, ID | FARMINGTON | 27–16 | Final verified, quarters unavailable | no_quarter_values |
| 2026-08-28 | SAN JUAN | KANAB | 54–7 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/san-juan-football-vs-kanab-football/273323) |
| 2026-08-28 | SKY VIEW | SPANISH FORK | 28–31 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/sky-view-football-vs-spanish-fork-football/273615) |
| 2026-08-28 | SNOW CANYON | CEDAR CITY | 6–10 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/snow-canyon-football-vs-cedar-city-football/273436) |
| 2026-08-28 | SOUTH SUMMIT | JUAB | 13–34 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/south-summit-football-vs-juab-football/273410) |
| 2026-08-28 | STANSBURY | WOODS CROSS | 45–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/stansbury-football-vs-woods-cross-football/273705) |
| 2026-08-28 | TIMPANOGOS | BINGHAM | 0–42 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/timpanogos-football-vs-bingham-football/273365) |
| 2026-08-28 | UINTAH | TAYLORSVILLE | 54–7 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/uintah-football-vs-taylorsville-football/273309) |
| 2026-08-28 | VIEWMONT | HIGHLAND | 30–45 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/viewmont-football-vs-highland-football/273597) |
| 2026-08-28 | WASATCH | BONNEVILLE | 16–21 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-28/wasatch-football-vs-bonneville-football/273391) |
| 2026-08-27 | DAVIS | MOUNTAIN RIDGE | 7–42 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-27/davis-football-vs-mountain-ridge-football/273727) |
| 2026-08-27 | HUNTER | COPPER HILLS | 3–48 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-08-27/hunter-football-vs-copper-hills-football/273556) |
| 2026-08-27 | MADISON, ID | RIVERTON | 27–0 | Final verified, quarters unavailable | no_quarter_values |
| 2026-08-27 | THUNDER RIDGE, ID | BEAR RIVER | 35–49 | Final verified, quarters unavailable | no_quarter_values |
| 2026-08-27 | WEBER | ROY | 53–35 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-27/weber-football-vs-roy-football/274368) |
| 2026-08-27 | WHITEHORSE | UMA-HILLFIELD | 56–12 | Final verified, quarters unavailable | no_quarter_values |
| 2026-08-22 | OREM | SKYRIDGE | 14–21 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-22/orem-football-vs-skyridge-football/273890) |
| 2026-08-21 | ALA | PAROWAN | 30–27 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/american-leadership-football-vs-parowan-football/274326) |
| 2026-08-21 | ALTAMONT | PANGUITCH | 0–44 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/altamont-football-vs-panguitch-football/273634) |
| 2026-08-21 | AMERICAN FORK | MATER DEI, CA | 11–31 | Conflicting sources | final_total_conflict |
| 2026-08-21 | BEAVER DAM, AZ | WATER CANYON | 34–50 | Final verified, quarters unavailable | no_quarter_box |
| 2026-08-21 | BEN LOMOND | JUDGE MEMORIAL | 7–13 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/ben-lomond-football-vs-judge-memorial-football/273904) |
| 2026-08-21 | BONNEVILLE | OGDEN | 6–7 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/bonneville-football-vs-ogden-football/273459) |
| 2026-08-21 | BOX ELDER | BEAR RIVER | 50–34 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/box-elder-football-vs-bear-river-football/273508) |
| 2026-08-21 | BRIGHTON | WEBER | 31–38 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/brighton-football-vs-weber-football/273747) |
| 2026-08-21 | CARBON | EMERY | 14–41 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/carbon-football-vs-emery-football/273685) |
| 2026-08-21 | CEDAR CITY | PINE VIEW | 30–34 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/cedar-city-football-vs-pine-view-football/273435) |
| 2026-08-21 | CLEARFIELD | KEARNS | 46–0 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/clearfield-football-vs-kearns-football/273738) |
| 2026-08-21 | COPPER HILLS | WEST JORDAN | 55–7 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/copper-hills-football-vs-west-jordan-football/273555) |
| 2026-08-21 | CORNER CANYON | TIMPVIEW | 40–7 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/corner-canyon-football-vs-timpview-football/273476) |
| 2026-08-21 | COTTONWOOD | DUCHESNE | 0–69 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/cottonwood-football-vs-duchesne-football/273624) |
| 2026-08-21 | CRIMSON CLIFFS | PROVO | 31–13 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/crimson-cliffs-football-vs-provo-football/273490) |
| 2026-08-21 | DAVIS | FREMONT | 56–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/davis-football-vs-fremont-football/273515) |
| 2026-08-21 | DEER CREEK | HILLCREST | 7–53 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/deer-creek-football-football-vs-hillcrest-football/273338) |
| 2026-08-21 | DIXIE | CANYON VIEW | 26–41 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/dixie-football-vs-canyon-view-football/273406) |
| 2026-08-21 | EAST | WEST | 0–60 | Conflicting sources | quarter_sum_conflict · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/east-football-vs-west-football/274348) |
| 2026-08-21 | ELKO, NV | CEDAR VALLEY | 19–26 | Conflicting sources | final_total_conflict |
| 2026-08-21 | FARMINGTON | BOUNTIFUL | 10–35 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/farmington-football-vs-bountiful-football/274366) |
| 2026-08-21 | GRAND | DOLORES, CO | 12–6 | Final verified, quarters unavailable | no_quarter_box |
| 2026-08-21 | GUNNISON VALLEY | PROVIDENCE HALL | 22–18 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/gunnison-valley-football-vs-providence-hall-football/273681) |
| 2026-08-21 | HERRIMAN | STANSBURY | 40–36 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/herriman-football-vs-stansbury-football/273549) |
| 2026-08-21 | HIGHLAND | HUNTER | 36–14 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/highland-football-vs-hunter-football/273768) |
| 2026-08-21 | HURRICANE | MOAPA VALLEY, NV | 49–20 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/hurricane-football-vs-moapa-valley-nev-football/273717) |
| 2026-08-21 | IMG ACADEMY, FL | LONE PEAK | 59–3 | Conflicting sources | final_total_conflict |
| 2026-08-21 | JORDAN | SUMMIT ACADEMY | 0–45 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/jordan-football-vs-summit-academy-football/273914) |
| 2026-08-21 | LAYTON CHRISTIAN | SNOW CANYON | 21–7 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/layton-christian-football-vs-snow-canyon-football/273446) |
| 2026-08-21 | LOGAN | PRESTON, ID | 49–20 | Conflicting sources | final_total_conflict |
| 2026-08-21 | MANTI | JUAN DIEGO | 54–7 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/manti-football-vs-juan-diego-football/273756) |
| 2026-08-21 | MILLARD | DELTA | 0–34 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/millard-football-vs-delta-football/273381) |
| 2026-08-21 | MONTICELLO | UMA-LEHI | 68–35 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/monticello-football-vs-utah-military-camp-williams-football-football/274415) |
| 2026-08-21 | MOUNTAIN RIDGE | LEHI | 42–0 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/mountain-ridge-football-vs-lehi-football/273728) |
| 2026-08-21 | NORTH GEM, ID | UMA-HILLFIELD | 28–24 | Awaiting verification | not_in_source |
| 2026-08-21 | NORTH SANPETE | DESERET PEAK | 22–21 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/north-sanpete-football-vs-deseret-peak-football-football/273329) |
| 2026-08-21 | NORTH SEVIER | KANAB | 0–52 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/north-sevier-football-vs-kanab-football/273322) |
| 2026-08-21 | NORTHRIDGE | LAYTON | 0–30 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/northridge-football-vs-layton-football/273530) |
| 2026-08-21 | PARK CITY | RIDGELINE | 9–31 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/park-city-football-vs-ridgeline-football/273622) |
| 2026-08-21 | PAYSON | JUAB | 20–31 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/payson-football-vs-juab-football/273895) |
| 2026-08-21 | RICH | MILFORD | 65–19 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/rich-football-vs-milford-football/274425) |
| 2026-08-21 | RICHFIELD | GRANTSVILLE | 24–31 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/richfield-football-vs-grantsville-football/273298) |
| 2026-08-21 | RIGBY, ID | ROY | 35–0 | Conflicting sources | final_total_conflict |
| 2026-08-21 | RIVERTON | MAPLE MOUNTAIN | 17–27 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/riverton-football-vs-maple-mountain-football/273576) |
| 2026-08-21 | SAINT JOSEPH | WHITEHORSE | 12–36 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/st-joseph-football-football-vs-whitehorse-football/274430) |
| 2026-08-21 | SALEM HILLS | SPANISH FORK | 28–33 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/salem-hills-football-vs-spanish-fork-football/273431) |
| 2026-08-21 | SAN JUAN | BEAVER | 52–22 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/san-juan-football-vs-beaver-football/273351) |
| 2026-08-21 | SKYLINE | OLYMPUS | 21–16 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/skyline-football-vs-olympus-football/273590) |
| 2026-08-21 | SOUTH SEVIER | ENTERPRISE | 12–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/south-sevier-football-vs-enterprise-football/273372) |
| 2026-08-21 | SOUTH SUMMIT | NORTH SUMMIT | 45–14 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/south-summit-football-vs-north-summit-football/273360) |
| 2026-08-21 | SPRINGVILLE | GREEN CANYON | 27–0 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/springville-football-vs-green-canyon-football/274339) |
| 2026-08-21 | TAYLORSVILLE | MURRAY | 0–48 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/taylorsville-football-vs-murray-football/274344) |
| 2026-08-21 | TIMPANOGOS | DESERT HILLS | 13–29 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/timpanogos-football-vs-desert-hills-football/273364) |
| 2026-08-21 | TOOELE | MOUNTAIN VIEW | 13–34 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/tooele-football-vs-mountain-view-football/274350) |
| 2026-08-21 | UNION | UINTAH | 22–21 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/union-football-vs-uintah-football/273308) |
| 2026-08-21 | VIEWMONT | CYPRUS | 50–0 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/viewmont-football-vs-cyprus-football/273598) |
| 2026-08-21 | WASATCH | MOUNTAIN CREST | 15–46 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/wasatch-football-vs-mountain-crest-football/273390) |
| 2026-08-21 | WEST FIELD | WOODS CROSS | 21–26 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/west-field-football-football-vs-woods-cross-football/273524) |
| 2026-08-21 | WESTLAKE | PLEASANT GROVE | 0–14 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-21/westlake-football-vs-pleasant-grove-football/273735) |
| 2026-08-20 | BINGHAM | ALTA | 12–13 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-20/bingham-football-vs-alta-football/274391) |
| 2026-08-20 | GRANGER | SYRACUSE | 6–52 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-08-20/granger-football-vs-syracuse-football/274387) |
| 2026-08-20 | SKY VIEW | MORGAN | 0–47 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-08-20/sky-view-football-vs-morgan-football/273288) |
| 2026-08-15 | DUCHESNE | SOUTH SUMMIT | 13–18 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-15/duchesne-football-vs-south-summit-football/273409) |
| 2026-08-15 | MILLARD | SOUTH SEVIER | 22–8 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-15/millard-football-vs-south-sevier-football/273662) |
| 2026-08-14 | AMERICAN FORK | PLEASANT GROVE | 36–16 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/american-fork-football-vs-pleasant-grove-football/273533) |
| 2026-08-14 | ARBOR VIEW, NV | WEST | 14–20 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/arbor-view-nev-football-vs-west-football/274379) |
| 2026-08-14 | BEAR RIVER | OGDEN | 36–13 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/bear-river-football-vs-ogden-football/273458) |
| 2026-08-14 | BEAVER | MOAPA VALLEY, NV | 21–27 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/beaver-football-vs-moapa-valley-nev-football/273346) |
| 2026-08-14 | BINGHAM | FARMINGTON | 11–14 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/bingham-football-vs-farmington-football/274390) |
| 2026-08-14 | BONNEVILLE | VIEWMONT | 0–24 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/bonneville-football-vs-viewmont-football/273497) |
| 2026-08-14 | BOUNTIFUL | HERRIMAN | 14–25 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/bountiful-football-vs-herriman-football/273547) |
| 2026-08-14 | BRIGHTON | WEST FIELD | 34–0 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/brighton-football-vs-west-field-football-football/273526) |
| 2026-08-14 | CANYON VIEW | JORDAN | 35–0 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/canyon-view-football-vs-jordan-football/273405) |
| 2026-08-14 | CARBON | ALA | 21–23 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/carbon-football-vs-american-leadership-football/273684) |
| 2026-08-14 | COPPER HILLS | NORTHRIDGE | 29–0 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/copper-hills-football-vs-northridge-football/273529) |
| 2026-08-14 | CORNER CANYON | DAVIS | 51–14 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/corner-canyon-football-vs-davis-football/273475) |
| 2026-08-14 | COTTONWOOD | NORTH SANPETE | 0–57 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/cottonwood-football-vs-north-sanpete-football/273328) |
| 2026-08-14 | CYPRUS | CLEARFIELD | 7–24 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/cyprus-football-vs-clearfield-football/273607) |
| 2026-08-14 | DESERET PEAK | BOX ELDER | 0–49 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/deseret-peak-football-football-vs-box-elder-football/273507) |
| 2026-08-14 | DESERT HILLS | HILLCREST | 40–0 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/desert-hills-football-vs-hillcrest-football/273482) |
| 2026-08-14 | GRANGER | SALEM HILLS | 7–41 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/granger-football-vs-salem-hills-football/273429) |
| 2026-08-14 | GRANTSVILLE | SAN JUAN | 30–20 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/grantsville-football-vs-san-juan-football/273442) |
| 2026-08-14 | HIGHLAND | WESTLAKE | 21–42 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/highland-football-vs-westlake-football/273733) |
| 2026-08-14 | HUNTER | LAYTON CHRISTIAN | 0–48 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/hunter-football-vs-layton-christian-football/273455) |
| 2026-08-14 | HURRICANE | VIRGIN VALLEY, NV | 47–12 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/hurricane-football-vs-virgin-valley-nev-football/273716) |
| 2026-08-14 | JUAB | DELTA | 26–29 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/juab-football-vs-delta-football/273894) |
| 2026-08-14 | JUAN DIEGO | TIMPANOGOS | 0–44 | Conflicting sources | quarter_sum_conflict · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/juan-diego-football-vs-timpanogos-football/273363) |
| 2026-08-14 | KANAB | EMERY | 47–13 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/kanab-football-vs-emery-football/273317) |
| 2026-08-14 | LOGAN | SUMMIT ACADEMY | 25–21 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/logan-football-vs-summit-academy-football/273423) |
| 2026-08-14 | LONE PEAK | CRIMSON CLIFFS | 33–21 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/lone-peak-football-vs-crimson-cliffs-football/273470) |
| 2026-08-14 | MAPLE MOUNTAIN | LEHI | 13–35 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/maple-mountain-football-vs-lehi-football/273647) |
| 2026-08-14 | MILFORD | WHITEHORSE | 52–7 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/milford-football-vs-whitehorse-football/274427) |
| 2026-08-14 | MOUNTAIN CREST | DEER CREEK | 49–0 | Final verified, quarters unavailable | missing_quarter_cells · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/mountain-crest-football-vs-deer-creek-football-football/273337) |
| 2026-08-14 | MOUNTAIN VIEW | PAYSON | 19–20 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/mountain-view-football-vs-payson-football/273699) |
| 2026-08-14 | NORTH SEVIER | BEN LOMOND | 41–33 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/north-sevier-football-vs-ben-lomond-football/275599) |
| 2026-08-14 | NORTH SUMMIT | ENTERPRISE | 14–13 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/north-summit-football-vs-enterprise-football/273359) |
| 2026-08-14 | OLYMPUS | CEDAR VALLEY | 49–14 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/olympus-football-vs-cedar-valley-football/273588) |
| 2026-08-14 | OREM | KAMEHAMEHA, HI | 16–7 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/orem-football-vs-kamehameha-hawaii-football/274363) |
| 2026-08-14 | PARK CITY | SKY VIEW | 10–13 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/park-city-football-vs-sky-view-football/273616) |
| 2026-08-14 | PAROWAN | LINCOLN COUNTY, NV | 28–35 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/parowan-football-vs-lincoln-county-nev-football/274325) |
| 2026-08-14 | PINE VIEW | MANTI | 44–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/pine-view-football-vs-manti-football/273713) |
| 2026-08-14 | PROVIDENCE HALL | PAHRUMP, NV | 6–29 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/providence-hall-football-vs-pahrump-nev-football/276480) |
| 2026-08-14 | PROVO | GREEN CANYON | 6–10 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/provo-football-vs-green-canyon-football/273672) |
| 2026-08-14 | RICH | GUNNISON VALLEY | 21–14 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/rich-football-vs-gunnison-valley-football/273678) |
| 2026-08-14 | RICHFIELD | DIXIE | 62–20 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/richfield-football-vs-dixie-football/273297) |
| 2026-08-14 | RIDGELINE | MORGAN | 42–28 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/ridgeline-football-vs-morgan-football/273287) |
| 2026-08-14 | ROY | TAYLORSVILLE | 54–7 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/roy-football-vs-taylorsville-football/274369) |
| 2026-08-14 | SAINT JOSEPH | ALTAMONT | 59–62 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/st-joseph-football-football-vs-altamont-football/274400) |
| 2026-08-14 | SPANISH FORK | SNOW CANYON | 62–64 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/spanish-fork-football-vs-snow-canyon-football/273721) |
| 2026-08-14 | SPRINGVILLE | ALTA | 35–38 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/springville-football-vs-alta-football/274354) |
| 2026-08-14 | SYRACUSE | WOODS CROSS | 26–27 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/syracuse-football-vs-woods-cross-football/273751) |
| 2026-08-14 | TAFUNA, AMERICAN SAMOA | EAST | 46–0 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/tafuna-american-samoa-football-football-vs-east-football/275597) |
| 2026-08-14 | TIMPVIEW | LAYTON | 40–21 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/timpview-football-vs-layton-football/273577) |
| 2026-08-14 | UINTAH | MURRAY | 39–49 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/uintah-football-vs-murray-football/273307) |
| 2026-08-14 | UMA-LEHI | PANGUITCH | 27–22 | Awaiting verification | team_label_unmatched · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/utah-military-camp-williams-football-football-vs-panguitch-football/273633) |
| 2026-08-14 | UNION | TOOELE | 10–14 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/union-football-vs-tooele-football/273392) |
| 2026-08-14 | WATER CANYON | GRAND | 38–53 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/water-canyon-football-football-vs-grand-football/273687) |
| 2026-08-14 | WEBER | FREMONT | 3–34 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/weber-football-vs-fremont-football/273514) |
| 2026-08-14 | WEST JORDAN | RIVERTON | 17–35 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-14/west-jordan-football-vs-riverton-football/273573) |
| 2026-08-13 | CEDAR CITY | WASATCH | 29–19 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-13/cedar-city-football-vs-wasatch-football/273389) |
| 2026-08-13 | SKYRIDGE | MOUNTAIN RIDGE | 26–41 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-13/skyridge-football-vs-mountain-ridge-football/273726) |
| 2026-08-13 | STANSBURY | SKYLINE | 14–10 | Verified and complete | complete · [source](https://sports.deseret.com/high-school/football/game/2026-08-13/stansbury-football-vs-skyline-football/273704) |

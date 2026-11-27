# 2026 Football Player Statistics Audit

Generated: 2026-11-27T23:00:06.068Z

**118 schools · 6440 roster IDs · 4065 athletes with reported stats · 6926 category rows.**

## Coverage
- 2495 rostered athletes lack an individual season stat row (not necessarily a reporting error)
- 2 teams have no season stats: MONUMENT VAL, UMA-HILLFIELD
- 1247 finalized team-game logs include player stats
- 1 failed school stats fetches
- 168 stat rows have IDs missing from their own roster (may be MaxPreps-only entries)

## Review flags
- GAME_SUM_EXCEEDS_SEASON: 3499
- SEASON_GT_AVAILABLE_GAME_LOG: 282
- RECEIVING_RATE_MISMATCH: 2

## Highest-priority examples
- **GAME_SUM_EXCEEDS_SEASON** WHITEHORSE — Hunter Tsinigine; {"category":"Rushing","field":"YARDS","season":379,"gameLogSum":2606,"difference":2227}
- **GAME_SUM_EXCEEDS_SEASON** WHITEHORSE — Tyrell Black; {"category":"Passing","field":"YARDS","season":281,"gameLogSum":2095,"difference":1814}
- **GAME_SUM_EXCEEDS_SEASON** SKYRIDGE — Jagger Fountaine; {"category":"Passing","field":"YARDS","season":2305,"gameLogSum":3526,"difference":1221}
- **GAME_SUM_EXCEEDS_SEASON** WHITEHORSE — Dillion Leo; {"category":"Receiving","field":"YARDS","season":108,"gameLogSum":1250,"difference":1142}
- **GAME_SUM_EXCEEDS_SEASON** MOUNTAIN RIDGE — Jaxon Hunt; {"category":"Passing","field":"YARDS","season":3164,"gameLogSum":4278,"difference":1114}
- **GAME_SUM_EXCEEDS_SEASON** LOGAN — Easton Favero; {"category":"Passing","field":"YARDS","season":3114,"gameLogSum":4194,"difference":1080}
- **GAME_SUM_EXCEEDS_SEASON** WHITEHORSE — Adam Joe; {"category":"Receiving","field":"YARDS","season":166,"gameLogSum":1157,"difference":991}
- **GAME_SUM_EXCEEDS_SEASON** OREM — Tanner Lewis; {"category":"Passing","field":"YARDS","season":1070,"gameLogSum":2023,"difference":953}
- **GAME_SUM_EXCEEDS_SEASON** CORNER CANYON — Jaxon Pehrson; {"category":"Passing","field":"YARDS","season":1595,"gameLogSum":2444,"difference":849}
- **GAME_SUM_EXCEEDS_SEASON** SAN JUAN — Beau Yeomans; {"category":"Passing","field":"YARDS","season":2515,"gameLogSum":3349,"difference":834}
- **GAME_SUM_EXCEEDS_SEASON** SKYLINE — Tate Johnson; {"category":"Passing","field":"YARDS","season":1882,"gameLogSum":2645,"difference":763}
- **GAME_SUM_EXCEEDS_SEASON** WEST — Kamden Lopati; {"category":"Passing","field":"YARDS","season":2666,"gameLogSum":3384,"difference":718}
- **GAME_SUM_EXCEEDS_SEASON** MILFORD — Braxton Hansen; {"category":"Passing","field":"YARDS","season":1411,"gameLogSum":2118,"difference":707}
- **GAME_SUM_EXCEEDS_SEASON** SKYLINE — Jonah Mailei; {"category":"Rushing","field":"YARDS","season":709,"gameLogSum":1400,"difference":691}
- **GAME_SUM_EXCEEDS_SEASON** MORGAN — Owen Gilson; {"category":"Passing","field":"YARDS","season":2409,"gameLogSum":3051,"difference":642}
- **GAME_SUM_EXCEEDS_SEASON** SAN JUAN — Brigg Palmer; {"category":"Rushing","field":"YARDS","season":1619,"gameLogSum":2202,"difference":583}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Colton Johns; {"category":"Passing","field":"YARDS","season":1171,"gameLogSum":1751,"difference":580}
- **GAME_SUM_EXCEEDS_SEASON** SALEM HILLS — Cash Hollingshead; {"category":"Passing","field":"YARDS","season":2645,"gameLogSum":3225,"difference":580}
- **GAME_SUM_EXCEEDS_SEASON** HERRIMAN — Filisi Filipe; {"category":"Rushing","field":"YARDS","season":1376,"gameLogSum":1954,"difference":578}
- **GAME_SUM_EXCEEDS_SEASON** CRIMSON CLIFFS — Tanoai Andresen; {"category":"Passing","field":"YARDS","season":1901,"gameLogSum":2476,"difference":575}
- **GAME_SUM_EXCEEDS_SEASON** GRANTSVILLE — Crew Allred; {"category":"Passing","field":"YARDS","season":557,"gameLogSum":1130,"difference":573}
- **GAME_SUM_EXCEEDS_SEASON** RIDGELINE — Noah Fiefia; {"category":"Rushing","field":"YARDS","season":2151,"gameLogSum":2701,"difference":550}
- **GAME_SUM_EXCEEDS_SEASON** SPRINGVILLE — Beckett Burton; {"category":"Passing","field":"YARDS","season":1570,"gameLogSum":2065,"difference":495}
- **GAME_SUM_EXCEEDS_SEASON** WHITEHORSE — Jacoby Long; {"category":"Rushing","field":"YARDS","season":2,"gameLogSum":495,"difference":493}
- **GAME_SUM_EXCEEDS_SEASON** RICH — Wilkes Weston; {"category":"Passing","field":"YARDS","season":1539,"gameLogSum":2009,"difference":470}
- **GAME_SUM_EXCEEDS_SEASON** BOUNTIFUL — Hudson Malmrose; {"category":"Passing","field":"YARDS","season":1821,"gameLogSum":2287,"difference":466}
- **GAME_SUM_EXCEEDS_SEASON** OREM — Beckham Curtis; {"category":"Rushing","field":"YARDS","season":1109,"gameLogSum":1549,"difference":440}
- **GAME_SUM_EXCEEDS_SEASON** JUAB — Price Armstrong; {"category":"Passing","field":"YARDS","season":2784,"gameLogSum":3223,"difference":439}
- **GAME_SUM_EXCEEDS_SEASON** HURRICANE — Titan Borchardt; {"category":"Rushing","field":"YARDS","season":1046,"gameLogSum":1478,"difference":432}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Chris Munroe; {"category":"Rushing","field":"YARDS","season":886,"gameLogSum":1315,"difference":429}
- **GAME_SUM_EXCEEDS_SEASON** DELTA — Bodey Shurtz; {"category":"Passing","field":"YARDS","season":623,"gameLogSum":1043,"difference":420}
- **GAME_SUM_EXCEEDS_SEASON** HIGHLAND — Will Bauman; {"category":"Passing","field":"YARDS","season":1706,"gameLogSum":2126,"difference":420}
- **GAME_SUM_EXCEEDS_SEASON** MOUNTAIN RIDGE — Tyson Dunn; {"category":"Rushing","field":"YARDS","season":496,"gameLogSum":915,"difference":419}
- **GAME_SUM_EXCEEDS_SEASON** CORNER CANYON — Jackson Carruth; {"category":"Rushing","field":"YARDS","season":977,"gameLogSum":1390,"difference":413}
- **GAME_SUM_EXCEEDS_SEASON** HERRIMAN — Bryson Sweeney; {"category":"Passing","field":"YARDS","season":1731,"gameLogSum":2141,"difference":410}
- **GAME_SUM_EXCEEDS_SEASON** SOUTH SUMMIT — Jesse Clegg; {"category":"Receiving","field":"YARDS","season":297,"gameLogSum":706,"difference":409}
- **GAME_SUM_EXCEEDS_SEASON** ALTA — Xavier Cocci; {"category":"Passing","field":"YARDS","season":1560,"gameLogSum":1965,"difference":405}
- **GAME_SUM_EXCEEDS_SEASON** RICH — Wilkes Weston; {"category":"Rushing","field":"YARDS","season":967,"gameLogSum":1369,"difference":402}
- **GAME_SUM_EXCEEDS_SEASON** OREM — Brooks Ross; {"category":"Receiving","field":"YARDS","season":575,"gameLogSum":976,"difference":401}
- **GAME_SUM_EXCEEDS_SEASON** BEN LOMOND — DaShawn Gordan; {"category":"Rushing","field":"YARDS","season":26,"gameLogSum":420,"difference":394}
- **GAME_SUM_EXCEEDS_SEASON** RIDGELINE — Crew Cox; {"category":"Passing","field":"YARDS","season":1783,"gameLogSum":2175,"difference":392}
- **GAME_SUM_EXCEEDS_SEASON** SYRACUSE — Ledger Wight; {"category":"Passing","field":"YARDS","season":1821,"gameLogSum":2208,"difference":387}
- **GAME_SUM_EXCEEDS_SEASON** WATER CANYON — Deagan Williams; {"category":"Passing","field":"YARDS","season":1073,"gameLogSum":1456,"difference":383}
- **GAME_SUM_EXCEEDS_SEASON** MONTICELLO — Brandtson Mack; {"category":"Receiving","field":"YARDS","season":559,"gameLogSum":940,"difference":381}
- **GAME_SUM_EXCEEDS_SEASON** MOUNTAIN RIDGE — Tytan DeJong; {"category":"Receiving","field":"YARDS","season":692,"gameLogSum":1070,"difference":378}
- **GAME_SUM_EXCEEDS_SEASON** KEARNS — Mason Rodarte; {"category":"Passing","field":"YARDS","season":134,"gameLogSum":506,"difference":372}
- **GAME_SUM_EXCEEDS_SEASON** FARMINGTON — Alton Dahl; {"category":"Passing","field":"YARDS","season":2157,"gameLogSum":2527,"difference":370}
- **GAME_SUM_EXCEEDS_SEASON** FREMONT — Calvin Cooper; {"category":"Passing","field":"YARDS","season":1656,"gameLogSum":2024,"difference":368}
- **GAME_SUM_EXCEEDS_SEASON** CORNER CANYON — Beckham Coon; {"category":"Receiving","field":"YARDS","season":556,"gameLogSum":922,"difference":366}
- **GAME_SUM_EXCEEDS_SEASON** BEAR RIVER — Preston Wilkinson; {"category":"Passing","field":"YARDS","season":2793,"gameLogSum":3157,"difference":364}
- **GAME_SUM_EXCEEDS_SEASON** WHITEHORSE — Cayden Leo; {"category":"Passing","field":"YARDS","season":20,"gameLogSum":383,"difference":363}
- **GAME_SUM_EXCEEDS_SEASON** GUNNISON VALLEY — Axton Sorensen; {"category":"Passing","field":"YARDS","season":0,"gameLogSum":356,"difference":356}
- **GAME_SUM_EXCEEDS_SEASON** DAVIS — Paden Toula; {"category":"Passing","field":"YARDS","season":1825,"gameLogSum":2178,"difference":353}
- **GAME_SUM_EXCEEDS_SEASON** SKYRIDGE — Dax Rehrer; {"category":"Receiving","field":"YARDS","season":393,"gameLogSum":745,"difference":352}
- **GAME_SUM_EXCEEDS_SEASON** SOUTH SUMMIT — Ian Mair; {"category":"Passing","field":"YARDS","season":1397,"gameLogSum":1746,"difference":349}
- **GAME_SUM_EXCEEDS_SEASON** MANTI — Kingston Wright; {"category":"Passing","field":"YARDS","season":3032,"gameLogSum":3376,"difference":344}
- **GAME_SUM_EXCEEDS_SEASON** WEST — Kamden Lopati; {"category":"Rushing","field":"YARDS","season":591,"gameLogSum":933,"difference":342}
- **GAME_SUM_EXCEEDS_SEASON** CRIMSON CLIFFS — Noah Whitmore; {"category":"Receiving","field":"YARDS","season":657,"gameLogSum":998,"difference":341}
- **GAME_SUM_EXCEEDS_SEASON** WESTLAKE — Ashton Taylor; {"category":"Rushing","field":"YARDS","season":424,"gameLogSum":764,"difference":340}
- **GAME_SUM_EXCEEDS_SEASON** WEST — Naeata Hamilton; {"category":"Rushing","field":"YARDS","season":787,"gameLogSum":1126,"difference":339}
- **GAME_SUM_EXCEEDS_SEASON** CEDAR CITY — Colt Kelling; {"category":"Passing","field":"YARDS","season":295,"gameLogSum":628,"difference":333}
- **GAME_SUM_EXCEEDS_SEASON** NORTH SUMMIT — Tayton Pace; {"category":"Passing","field":"YARDS","season":640,"gameLogSum":969,"difference":329}
- **GAME_SUM_EXCEEDS_SEASON** SAN JUAN — Randall Black; {"category":"Receiving","field":"YARDS","season":872,"gameLogSum":1201,"difference":329}
- **GAME_SUM_EXCEEDS_SEASON** RICHFIELD — Colton White; {"category":"Rushing","field":"YARDS","season":1055,"gameLogSum":1380,"difference":325}
- **GAME_SUM_EXCEEDS_SEASON** RIDGELINE — Owen Leishman; {"category":"Receiving","field":"YARDS","season":797,"gameLogSum":1119,"difference":322}
- **GAME_SUM_EXCEEDS_SEASON** BEAVER — Davis Carter; {"category":"Rushing","field":"YARDS","season":657,"gameLogSum":976,"difference":319}
- **GAME_SUM_EXCEEDS_SEASON** LOGAN — Easton Favero; {"category":"Rushing","field":"YARDS","season":576,"gameLogSum":891,"difference":315}
- **GAME_SUM_EXCEEDS_SEASON** CANYON VIEW — Owen Williams; {"category":"Passing","field":"YARDS","season":2165,"gameLogSum":2478,"difference":313}
- **GAME_SUM_EXCEEDS_SEASON** SUMMIT ACADEMY — Rigby Young; {"category":"Passing","field":"YARDS","season":2205,"gameLogSum":2514,"difference":309}
- **GAME_SUM_EXCEEDS_SEASON** LOGAN — Jase Pingree; {"category":"Receiving","field":"YARDS","season":936,"gameLogSum":1242,"difference":306}
- **GAME_SUM_EXCEEDS_SEASON** MILFORD — Tayon Blackburn; {"category":"Rushing","field":"YARDS","season":837,"gameLogSum":1140,"difference":303}
- **GAME_SUM_EXCEEDS_SEASON** GRANTSVILLE — Dawson Dunlavy; {"category":"Receiving","field":"YARDS","season":333,"gameLogSum":635,"difference":302}
- **GAME_SUM_EXCEEDS_SEASON** SKYLINE — David Campbell; {"category":"Receiving","field":"YARDS","season":148,"gameLogSum":449,"difference":301}
- **GAME_SUM_EXCEEDS_SEASON** DUCHESNE — Kyson Despain; {"category":"Rushing","field":"YARDS","season":1391,"gameLogSum":1687,"difference":296}
- **GAME_SUM_EXCEEDS_SEASON** SNOW CANYON — Parker Olson; {"category":"Passing","field":"YARDS","season":2129,"gameLogSum":2424,"difference":295}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Synic Harvey; {"category":"Receiving","field":"YARDS","season":288,"gameLogSum":577,"difference":289}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Corbin Black; {"category":"Passing","field":"YARDS","season":1270,"gameLogSum":1556,"difference":286}
- **GAME_SUM_EXCEEDS_SEASON** WATER CANYON — Deagan Williams; {"category":"Rushing","field":"YARDS","season":323,"gameLogSum":609,"difference":286}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Cooper Swasey; {"category":"Rushing","field":"YARDS","season":63,"gameLogSum":348,"difference":285}
- **GAME_SUM_EXCEEDS_SEASON** AMERICAN FORK — Nate Childs; {"category":"Passing","field":"YARDS","season":554,"gameLogSum":835,"difference":281}

## Method / limitations
This is a comprehensive machine audit of the stored roster, season stat sections, and linked game logs. A flag is **not proof of error**. School-reported gaps, incomplete per-game player stats, and source snapshot timing require review. No automated changes to player scores, awards, or draft selections were made.

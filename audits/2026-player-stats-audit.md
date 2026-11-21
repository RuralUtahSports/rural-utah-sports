# 2026 Football Player Statistics Audit

Generated: 2026-11-21T02:50:48.256Z

**118 schools · 6440 roster IDs · 4065 athletes with reported stats · 6926 category rows.**

## Coverage
- 2495 rostered athletes lack an individual season stat row (not necessarily a reporting error)
- 2 teams have no season stats: MONUMENT VAL, UMA-HILLFIELD
- 1095 finalized team-game logs include player stats
- 1 failed school stats fetches
- 168 stat rows have IDs missing from their own roster (may be MaxPreps-only entries)

## Review flags
- SEASON_GT_AVAILABLE_GAME_LOG: 581
- GAME_SUM_EXCEEDS_SEASON: 560
- RECEIVING_RATE_MISMATCH: 2

## Highest-priority examples
- **GAME_SUM_EXCEEDS_SEASON** WHITEHORSE — Hunter Tsinigine; {"category":"Rushing","field":"YARDS","season":379,"gameLogSum":2372,"difference":1993}
- **GAME_SUM_EXCEEDS_SEASON** WHITEHORSE — Tyrell Black; {"category":"Passing","field":"YARDS","season":281,"gameLogSum":1997,"difference":1716}
- **GAME_SUM_EXCEEDS_SEASON** WHITEHORSE — Dillion Leo; {"category":"Receiving","field":"YARDS","season":108,"gameLogSum":1170,"difference":1062}
- **GAME_SUM_EXCEEDS_SEASON** WHITEHORSE — Adam Joe; {"category":"Receiving","field":"YARDS","season":166,"gameLogSum":1062,"difference":896}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Colton Johns; {"category":"Passing","field":"YARDS","season":1171,"gameLogSum":1751,"difference":580}
- **GAME_SUM_EXCEEDS_SEASON** WHITEHORSE — Jacoby Long; {"category":"Rushing","field":"YARDS","season":2,"gameLogSum":450,"difference":448}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Chris Munroe; {"category":"Rushing","field":"YARDS","season":886,"gameLogSum":1315,"difference":429}
- **GAME_SUM_EXCEEDS_SEASON** BEN LOMOND — DaShawn Gordan; {"category":"Rushing","field":"YARDS","season":26,"gameLogSum":420,"difference":394}
- **GAME_SUM_EXCEEDS_SEASON** KEARNS — Mason Rodarte; {"category":"Passing","field":"YARDS","season":134,"gameLogSum":506,"difference":372}
- **GAME_SUM_EXCEEDS_SEASON** WHITEHORSE — Cayden Leo; {"category":"Passing","field":"YARDS","season":20,"gameLogSum":330,"difference":310}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Synic Harvey; {"category":"Receiving","field":"YARDS","season":288,"gameLogSum":577,"difference":289}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Corbin Black; {"category":"Passing","field":"YARDS","season":1270,"gameLogSum":1556,"difference":286}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Cooper Swasey; {"category":"Rushing","field":"YARDS","season":63,"gameLogSum":348,"difference":285}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON — Tillman Thomas; {"category":"Passing","field":"YARDS","season":1896,"gameLogSum":2175,"difference":279}
- **GAME_SUM_EXCEEDS_SEASON** SOUTH SUMMIT — Jesse Clegg; {"category":"Receiving","field":"YARDS","season":297,"gameLogSum":549,"difference":252}
- **GAME_SUM_EXCEEDS_SEASON** WHITEHORSE — Tyrell Black; {"category":"Rushing","field":"YARDS","season":109,"gameLogSum":356,"difference":247}
- **GAME_SUM_EXCEEDS_SEASON** GUNNISON VALLEY — Axton Sorensen; {"category":"Passing","field":"YARDS","season":0,"gameLogSum":227,"difference":227}
- **GAME_SUM_EXCEEDS_SEASON** MOUNTAIN RIDGE — Jaxon Hunt; {"category":"Passing","field":"YARDS","season":3164,"gameLogSum":3389,"difference":225}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Kalvin Hopkins; {"category":"Receiving","field":"YARDS","season":59,"gameLogSum":275,"difference":216}
- **GAME_SUM_EXCEEDS_SEASON** DESERT HILLS — Deacon Virgin; {"category":"Passing","field":"YARDS","season":1584,"gameLogSum":1799,"difference":215}
- **GAME_SUM_EXCEEDS_SEASON** WESTLAKE — Ashton Taylor; {"category":"Rushing","field":"YARDS","season":424,"gameLogSum":627,"difference":203}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Beto Carroll; {"category":"Receiving","field":"YARDS","season":861,"gameLogSum":1060,"difference":199}
- **GAME_SUM_EXCEEDS_SEASON** GRANTSVILLE — Crew Allred; {"category":"Passing","field":"YARDS","season":557,"gameLogSum":748,"difference":191}
- **GAME_SUM_EXCEEDS_SEASON** FARMINGTON — Alton Dahl; {"category":"Passing","field":"YARDS","season":2157,"gameLogSum":2347,"difference":190}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Corbin Black; {"category":"Rushing","field":"YARDS","season":31,"gameLogSum":221,"difference":190}
- **GAME_SUM_EXCEEDS_SEASON** WATER CANYON — Deagan Williams; {"category":"Passing","field":"YARDS","season":1073,"gameLogSum":1241,"difference":168}
- **GAME_SUM_EXCEEDS_SEASON** MONTICELLO — Brandtson Mack; {"category":"Receiving","field":"YARDS","season":559,"gameLogSum":726,"difference":167}
- **GAME_SUM_EXCEEDS_SEASON** WATER CANYON — Deagan Williams; {"category":"Rushing","field":"YARDS","season":323,"gameLogSum":489,"difference":166}
- **GAME_SUM_EXCEEDS_SEASON** LONE PEAK — Ayden Laws; {"category":"Rushing","field":"YARDS","season":360,"gameLogSum":525,"difference":165}
- **GAME_SUM_EXCEEDS_SEASON** GRANTSVILLE — Carter Bell; {"category":"Rushing","field":"YARDS","season":530,"gameLogSum":690,"difference":160}
- **GAME_SUM_EXCEEDS_SEASON** KEARNS — Abdifatah Osman; {"category":"Receiving","field":"YARDS","season":64,"gameLogSum":216,"difference":152}
- **GAME_SUM_EXCEEDS_SEASON** WHITEHORSE — Hunter Tsinigine; {"category":"Rushing","field":"CARRIES","season":52,"gameLogSum":204,"difference":152}
- **GAME_SUM_EXCEEDS_SEASON** GRANTSVILLE — Dawson Dunlavy; {"category":"Receiving","field":"YARDS","season":333,"gameLogSum":480,"difference":147}
- **GAME_SUM_EXCEEDS_SEASON** ALTAMONT — Dallan Ledbetter; {"category":"Rushing","field":"YARDS","season":1240,"gameLogSum":1383,"difference":143}
- **GAME_SUM_EXCEEDS_SEASON** MONTICELLO — Miles Coleman; {"category":"Receiving","field":"YARDS","season":13,"gameLogSum":156,"difference":143}
- **GAME_SUM_EXCEEDS_SEASON** MOUNTAIN RIDGE — Xander Thayer; {"category":"Receiving","field":"YARDS","season":751,"gameLogSum":892,"difference":141}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Everett Hill; {"category":"Receiving","field":"YARDS","season":34,"gameLogSum":170,"difference":136}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Jahmi Harrison-Bismillah; {"category":"Receiving","field":"YARDS","season":366,"gameLogSum":502,"difference":136}
- **GAME_SUM_EXCEEDS_SEASON** KEARNS — Ismail Muse; {"category":"Receiving","field":"YARDS","season":6,"gameLogSum":136,"difference":130}
- **GAME_SUM_EXCEEDS_SEASON** MOUNTAIN RIDGE — Tyson Dunn; {"category":"Rushing","field":"YARDS","season":496,"gameLogSum":610,"difference":114}
- **GAME_SUM_EXCEEDS_SEASON** WHITEHORSE — Jacoby Long; {"category":"Receiving","field":"YARDS","season":4,"gameLogSum":117,"difference":113}
- **GAME_SUM_EXCEEDS_SEASON** VIEWMONT — Miles Frey; {"category":"Rushing","field":"YARDS","season":405,"gameLogSum":516,"difference":111}
- **GAME_SUM_EXCEEDS_SEASON** CANYON VIEW — Preston Higgins; {"category":"Receiving","field":"YARDS","season":523,"gameLogSum":629,"difference":106}
- **GAME_SUM_EXCEEDS_SEASON** WHITEHORSE — Hunter Tsinigine; {"category":"Defense/Special Teams","field":"TACKLES","season":23,"gameLogSum":128,"difference":105}
- **GAME_SUM_EXCEEDS_SEASON** WHITEHORSE — Adam Joe; {"category":"Defense/Special Teams","field":"TACKLES","season":22,"gameLogSum":125,"difference":103}
- **GAME_SUM_EXCEEDS_SEASON** LONE PEAK — Pili Mounga; {"category":"Rushing","field":"YARDS","season":255,"gameLogSum":357,"difference":102}
- **GAME_SUM_EXCEEDS_SEASON** BEN LOMOND — DaShawn Gordan; {"category":"Rushing","field":"CARRIES","season":10,"gameLogSum":108,"difference":98}
- **GAME_SUM_EXCEEDS_SEASON** GUNNISON VALLEY — Mccoy Coates; {"category":"Rushing","field":"YARDS","season":19,"gameLogSum":117,"difference":98}
- **GAME_SUM_EXCEEDS_SEASON** FARMINGTON — Brogan Jeppesen; {"category":"Rushing","field":"YARDS","season":316,"gameLogSum":410,"difference":94}
- **GAME_SUM_EXCEEDS_SEASON** LONE PEAK — Marshall Durfey; {"category":"Passing","field":"YARDS","season":306,"gameLogSum":400,"difference":94}
- **GAME_SUM_EXCEEDS_SEASON** SOUTH SUMMIT — Kash Atkinson; {"category":"Receiving","field":"YARDS","season":14,"gameLogSum":103,"difference":89}
- **GAME_SUM_EXCEEDS_SEASON** CLEARFIELD — Jayce Ellis; {"category":"Passing","field":"YARDS","season":3,"gameLogSum":88,"difference":85}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Everett Hill; {"category":"Rushing","field":"YARDS","season":10,"gameLogSum":94,"difference":84}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Cooper Swasey; {"category":"Receiving","field":"YARDS","season":29,"gameLogSum":113,"difference":84}
- **GAME_SUM_EXCEEDS_SEASON** MANTI — Ben Taulapapa; {"category":"Rushing","field":"YARDS","season":251,"gameLogSum":335,"difference":84}
- **GAME_SUM_EXCEEDS_SEASON** WHITEHORSE — Cayden Leo; {"category":"Rushing","field":"YARDS","season":5,"gameLogSum":89,"difference":84}
- **GAME_SUM_EXCEEDS_SEASON** ALTAMONT — Payson Evans; {"category":"Rushing","field":"YARDS","season":291,"gameLogSum":367,"difference":76}
- **GAME_SUM_EXCEEDS_SEASON** SOUTH SUMMIT — Tuff Thornton; {"category":"Receiving","field":"YARDS","season":99,"gameLogSum":175,"difference":76}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Jonathan Gonzalez; {"category":"Rushing","field":"YARDS","season":43,"gameLogSum":117,"difference":74}
- **GAME_SUM_EXCEEDS_SEASON** CANYON VIEW — Karson Greenland; {"category":"Receiving","field":"YARDS","season":437,"gameLogSum":510,"difference":73}
- **GAME_SUM_EXCEEDS_SEASON** GRANTSVILLE — Ty Holm; {"category":"Receiving","field":"YARDS","season":332,"gameLogSum":404,"difference":72}
- **GAME_SUM_EXCEEDS_SEASON** TAYLORSVILLE — Skyler Bills; {"category":"Receiving","field":"YARDS","season":-2,"gameLogSum":70,"difference":72}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Chris Munroe; {"category":"Rushing","field":"CARRIES","season":62,"gameLogSum":132,"difference":70}
- **GAME_SUM_EXCEEDS_SEASON** MANTI — Hudson Crane; {"category":"Receiving","field":"YARDS","season":785,"gameLogSum":855,"difference":70}
- **GAME_SUM_EXCEEDS_SEASON** MONTICELLO — Brandtson Mack; {"category":"Rushing","field":"YARDS","season":48,"gameLogSum":118,"difference":70}
- **GAME_SUM_EXCEEDS_SEASON** WHITEHORSE — Hunter Tsinigine; {"category":"Receiving","field":"YARDS","season":21,"gameLogSum":91,"difference":70}
- **GAME_SUM_EXCEEDS_SEASON** VIEWMONT — Josh Lewis; {"category":"Receiving","field":"YARDS","season":301,"gameLogSum":369,"difference":68}
- **GAME_SUM_EXCEEDS_SEASON** LONE PEAK — Dillon Sykes; {"category":"Receiving","field":"YARDS","season":141,"gameLogSum":205,"difference":64}
- **GAME_SUM_EXCEEDS_SEASON** DESERT HILLS — Seth Brown; {"category":"Rushing","field":"YARDS","season":886,"gameLogSum":949,"difference":63}
- **GAME_SUM_EXCEEDS_SEASON** WESTLAKE — Silas Taumoepeau; {"category":"Passing","field":"YARDS","season":968,"gameLogSum":1031,"difference":63}
- **GAME_SUM_EXCEEDS_SEASON** DESERT HILLS — Isaac Andresen; {"category":"Receiving","field":"YARDS","season":363,"gameLogSum":425,"difference":62}
- **GAME_SUM_EXCEEDS_SEASON** WHITEHORSE — Dillion Leo; {"category":"Receiving","field":"RECEPTIONS","season":5,"gameLogSum":66,"difference":61}
- **GAME_SUM_EXCEEDS_SEASON** MONTICELLO — Miles Coleman; {"category":"Rushing","field":"YARDS","season":343,"gameLogSum":403,"difference":60}
- **GAME_SUM_EXCEEDS_SEASON** JUAN DIEGO — Jacoby Ahlstrom; {"category":"Passing","field":"YARDS","season":1219,"gameLogSum":1278,"difference":59}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Djaylan Gomes; {"category":"Receiving","field":"YARDS","season":240,"gameLogSum":299,"difference":59}
- **GAME_SUM_EXCEEDS_SEASON** WHITEHORSE — Jacoby Long; {"category":"Rushing","field":"CARRIES","season":2,"gameLogSum":61,"difference":59}
- **GAME_SUM_EXCEEDS_SEASON** DESERT HILLS — Brett Heiner; {"category":"Receiving","field":"YARDS","season":196,"gameLogSum":254,"difference":58}
- **GAME_SUM_EXCEEDS_SEASON** LONE PEAK — Caleb Brady; {"category":"Passing","field":"YARDS","season":8,"gameLogSum":66,"difference":58}
- **GAME_SUM_EXCEEDS_SEASON** WHITEHORSE — Adam Joe; {"category":"Receiving","field":"RECEPTIONS","season":12,"gameLogSum":70,"difference":58}
- **GAME_SUM_EXCEEDS_SEASON** LONE PEAK — Jakob Cloward; {"category":"Receiving","field":"YARDS","season":37,"gameLogSum":94,"difference":57}

## Method / limitations
This is a comprehensive machine audit of the stored roster, season stat sections, and linked game logs. A flag is **not proof of error**. School-reported gaps, incomplete per-game player stats, and source snapshot timing require review. No automated changes to player scores, awards, or draft selections were made.

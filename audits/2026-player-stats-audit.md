# 2026 Football Player Statistics Audit

Generated: 2026-10-31T18:31:20.534Z

**118 schools · 6440 roster IDs · 4065 athletes with reported stats · 6926 category rows.**

## Coverage
- 2495 rostered athletes lack an individual season stat row (not necessarily a reporting error)
- 2 teams have no season stats: MONUMENT VAL, UMA-HILLFIELD
- 1085 finalized team-game logs include player stats
- 1 failed school stats fetches
- 168 stat rows have IDs missing from their own roster (may be MaxPreps-only entries)

## Review flags
- SEASON_GT_AVAILABLE_GAME_LOG: 579
- GAME_SUM_EXCEEDS_SEASON: 430
- RECEIVING_RATE_MISMATCH: 2

## Highest-priority examples
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Colton Johns; {"category":"Passing","field":"YARDS","season":1171,"gameLogSum":1751,"difference":580}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Chris Munroe; {"category":"Rushing","field":"YARDS","season":886,"gameLogSum":1315,"difference":429}
- **GAME_SUM_EXCEEDS_SEASON** BEN LOMOND — DaShawn Gordan; {"category":"Rushing","field":"YARDS","season":26,"gameLogSum":420,"difference":394}
- **GAME_SUM_EXCEEDS_SEASON** KEARNS — Mason Rodarte; {"category":"Passing","field":"YARDS","season":134,"gameLogSum":506,"difference":372}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Synic Harvey; {"category":"Receiving","field":"YARDS","season":288,"gameLogSum":577,"difference":289}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Corbin Black; {"category":"Passing","field":"YARDS","season":1270,"gameLogSum":1556,"difference":286}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Cooper Swasey; {"category":"Rushing","field":"YARDS","season":63,"gameLogSum":348,"difference":285}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON — Tillman Thomas; {"category":"Passing","field":"YARDS","season":1896,"gameLogSum":2175,"difference":279}
- **GAME_SUM_EXCEEDS_SEASON** SOUTH SUMMIT — Jesse Clegg; {"category":"Receiving","field":"YARDS","season":297,"gameLogSum":549,"difference":252}
- **GAME_SUM_EXCEEDS_SEASON** GUNNISON VALLEY — Axton Sorensen; {"category":"Passing","field":"YARDS","season":0,"gameLogSum":227,"difference":227}
- **GAME_SUM_EXCEEDS_SEASON** MOUNTAIN RIDGE — Jaxon Hunt; {"category":"Passing","field":"YARDS","season":3164,"gameLogSum":3389,"difference":225}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Kalvin Hopkins; {"category":"Receiving","field":"YARDS","season":59,"gameLogSum":275,"difference":216}
- **GAME_SUM_EXCEEDS_SEASON** DESERT HILLS — Deacon Virgin; {"category":"Passing","field":"YARDS","season":1584,"gameLogSum":1799,"difference":215}
- **GAME_SUM_EXCEEDS_SEASON** WESTLAKE — Ashton Taylor; {"category":"Rushing","field":"YARDS","season":424,"gameLogSum":627,"difference":203}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Beto Carroll; {"category":"Receiving","field":"YARDS","season":861,"gameLogSum":1060,"difference":199}
- **GAME_SUM_EXCEEDS_SEASON** FARMINGTON — Alton Dahl; {"category":"Passing","field":"YARDS","season":2157,"gameLogSum":2347,"difference":190}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Corbin Black; {"category":"Rushing","field":"YARDS","season":31,"gameLogSum":221,"difference":190}
- **GAME_SUM_EXCEEDS_SEASON** WATER CANYON — Deagan Williams; {"category":"Passing","field":"YARDS","season":1073,"gameLogSum":1241,"difference":168}
- **GAME_SUM_EXCEEDS_SEASON** MONTICELLO — Brandtson Mack; {"category":"Receiving","field":"YARDS","season":559,"gameLogSum":726,"difference":167}
- **GAME_SUM_EXCEEDS_SEASON** WATER CANYON — Deagan Williams; {"category":"Rushing","field":"YARDS","season":323,"gameLogSum":489,"difference":166}
- **GAME_SUM_EXCEEDS_SEASON** LONE PEAK — Ayden Laws; {"category":"Rushing","field":"YARDS","season":360,"gameLogSum":525,"difference":165}
- **GAME_SUM_EXCEEDS_SEASON** KEARNS — Abdifatah Osman; {"category":"Receiving","field":"YARDS","season":64,"gameLogSum":216,"difference":152}
- **GAME_SUM_EXCEEDS_SEASON** ALTAMONT — Dallan Ledbetter; {"category":"Rushing","field":"YARDS","season":1240,"gameLogSum":1383,"difference":143}
- **GAME_SUM_EXCEEDS_SEASON** MONTICELLO — Miles Coleman; {"category":"Receiving","field":"YARDS","season":13,"gameLogSum":156,"difference":143}
- **GAME_SUM_EXCEEDS_SEASON** MOUNTAIN RIDGE — Xander Thayer; {"category":"Receiving","field":"YARDS","season":751,"gameLogSum":892,"difference":141}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Everett Hill; {"category":"Receiving","field":"YARDS","season":34,"gameLogSum":170,"difference":136}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Jahmi Harrison-Bismillah; {"category":"Receiving","field":"YARDS","season":366,"gameLogSum":502,"difference":136}
- **GAME_SUM_EXCEEDS_SEASON** KEARNS — Ismail Muse; {"category":"Receiving","field":"YARDS","season":6,"gameLogSum":136,"difference":130}
- **GAME_SUM_EXCEEDS_SEASON** MOUNTAIN RIDGE — Tyson Dunn; {"category":"Rushing","field":"YARDS","season":496,"gameLogSum":610,"difference":114}
- **GAME_SUM_EXCEEDS_SEASON** VIEWMONT — Miles Frey; {"category":"Rushing","field":"YARDS","season":405,"gameLogSum":516,"difference":111}
- **GAME_SUM_EXCEEDS_SEASON** CANYON VIEW — Preston Higgins; {"category":"Receiving","field":"YARDS","season":523,"gameLogSum":629,"difference":106}
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
- **GAME_SUM_EXCEEDS_SEASON** ALTAMONT — Payson Evans; {"category":"Rushing","field":"YARDS","season":291,"gameLogSum":367,"difference":76}
- **GAME_SUM_EXCEEDS_SEASON** SOUTH SUMMIT — Tuff Thornton; {"category":"Receiving","field":"YARDS","season":99,"gameLogSum":175,"difference":76}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Jonathan Gonzalez; {"category":"Rushing","field":"YARDS","season":43,"gameLogSum":117,"difference":74}
- **GAME_SUM_EXCEEDS_SEASON** CANYON VIEW — Karson Greenland; {"category":"Receiving","field":"YARDS","season":437,"gameLogSum":510,"difference":73}
- **GAME_SUM_EXCEEDS_SEASON** TAYLORSVILLE — Skyler Bills; {"category":"Receiving","field":"YARDS","season":-2,"gameLogSum":70,"difference":72}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Chris Munroe; {"category":"Rushing","field":"CARRIES","season":62,"gameLogSum":132,"difference":70}
- **GAME_SUM_EXCEEDS_SEASON** MANTI — Hudson Crane; {"category":"Receiving","field":"YARDS","season":785,"gameLogSum":855,"difference":70}
- **GAME_SUM_EXCEEDS_SEASON** MONTICELLO — Brandtson Mack; {"category":"Rushing","field":"YARDS","season":48,"gameLogSum":118,"difference":70}
- **GAME_SUM_EXCEEDS_SEASON** VIEWMONT — Josh Lewis; {"category":"Receiving","field":"YARDS","season":301,"gameLogSum":369,"difference":68}
- **GAME_SUM_EXCEEDS_SEASON** LONE PEAK — Dillon Sykes; {"category":"Receiving","field":"YARDS","season":141,"gameLogSum":205,"difference":64}
- **GAME_SUM_EXCEEDS_SEASON** DESERT HILLS — Seth Brown; {"category":"Rushing","field":"YARDS","season":886,"gameLogSum":949,"difference":63}
- **GAME_SUM_EXCEEDS_SEASON** WESTLAKE — Silas Taumoepeau; {"category":"Passing","field":"YARDS","season":968,"gameLogSum":1031,"difference":63}
- **GAME_SUM_EXCEEDS_SEASON** DESERT HILLS — Isaac Andresen; {"category":"Receiving","field":"YARDS","season":363,"gameLogSum":425,"difference":62}
- **GAME_SUM_EXCEEDS_SEASON** MONTICELLO — Miles Coleman; {"category":"Rushing","field":"YARDS","season":343,"gameLogSum":403,"difference":60}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Djaylan Gomes; {"category":"Receiving","field":"YARDS","season":240,"gameLogSum":299,"difference":59}
- **GAME_SUM_EXCEEDS_SEASON** DESERT HILLS — Brett Heiner; {"category":"Receiving","field":"YARDS","season":196,"gameLogSum":254,"difference":58}
- **GAME_SUM_EXCEEDS_SEASON** LONE PEAK — Caleb Brady; {"category":"Passing","field":"YARDS","season":8,"gameLogSum":66,"difference":58}
- **GAME_SUM_EXCEEDS_SEASON** LONE PEAK — Jakob Cloward; {"category":"Receiving","field":"YARDS","season":37,"gameLogSum":94,"difference":57}
- **GAME_SUM_EXCEEDS_SEASON** VIEWMONT — Cash Hawkins; {"category":"Passing","field":"YARDS","season":86,"gameLogSum":143,"difference":57}
- **GAME_SUM_EXCEEDS_SEASON** MANTI — Austin Perry; {"category":"Rushing","field":"YARDS","season":28,"gameLogSum":84,"difference":56}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Aiden Malan; {"category":"Rushing","field":"YARDS","season":31,"gameLogSum":86,"difference":55}
- **GAME_SUM_EXCEEDS_SEASON** FARMINGTON — Thayne Boyle; {"category":"Receiving","field":"YARDS","season":326,"gameLogSum":380,"difference":54}
- **GAME_SUM_EXCEEDS_SEASON** LONE PEAK — Krew Robinson; {"category":"Receiving","field":"YARDS","season":132,"gameLogSum":186,"difference":54}
- **GAME_SUM_EXCEEDS_SEASON** CANYON VIEW — Jace Floyd; {"category":"Receiving","field":"YARDS","season":39,"gameLogSum":91,"difference":52}
- **GAME_SUM_EXCEEDS_SEASON** WESTLAKE — Kylan Xoumphonphackdy; {"category":"Receiving","field":"YARDS","season":373,"gameLogSum":425,"difference":52}
- **GAME_SUM_EXCEEDS_SEASON** WATER CANYON — Justin Cooke; {"category":"Receiving","field":"YARDS","season":450,"gameLogSum":501,"difference":51}
- **GAME_SUM_EXCEEDS_SEASON** ALTAMONT — Dallan Ledbetter; {"category":"Passing","field":"YARDS","season":331,"gameLogSum":379,"difference":48}
- **GAME_SUM_EXCEEDS_SEASON** ALTAMONT — Porter Lazenby; {"category":"Receiving","field":"YARDS","season":84,"gameLogSum":132,"difference":48}
- **GAME_SUM_EXCEEDS_SEASON** CLEARFIELD — Bryson Ridge; {"category":"Receiving","field":"YARDS","season":278,"gameLogSum":325,"difference":47}
- **GAME_SUM_EXCEEDS_SEASON** MANTI — Ben Taulapapa; {"category":"Receiving","field":"YARDS","season":123,"gameLogSum":170,"difference":47}
- **GAME_SUM_EXCEEDS_SEASON** SOUTH SUMMIT — Steele Woodward; {"category":"Rushing","field":"YARDS","season":67,"gameLogSum":114,"difference":47}
- **GAME_SUM_EXCEEDS_SEASON** TAYLORSVILLE — Gary Lomu; {"category":"Rushing","field":"YARDS","season":52,"gameLogSum":99,"difference":47}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Jamari Connelly; {"category":"Receiving","field":"YARDS","season":110,"gameLogSum":154,"difference":44}
- **GAME_SUM_EXCEEDS_SEASON** CANYON VIEW — Camden Sheridan; {"category":"Rushing","field":"YARDS","season":804,"gameLogSum":847,"difference":43}
- **GAME_SUM_EXCEEDS_SEASON** DESERT HILLS — Krew Berezay; {"category":"Receiving","field":"YARDS","season":42,"gameLogSum":85,"difference":43}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Memphis Hunkin; {"category":"Receiving","field":"YARDS","season":130,"gameLogSum":173,"difference":43}
- **GAME_SUM_EXCEEDS_SEASON** MOUNTAIN RIDGE — Tytan DeJong; {"category":"Receiving","field":"YARDS","season":692,"gameLogSum":732,"difference":40}
- **GAME_SUM_EXCEEDS_SEASON** TAYLORSVILLE — Gary Lomu; {"category":"Receiving","field":"YARDS","season":4,"gameLogSum":44,"difference":40}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Cooper Swasey; {"category":"Rushing","field":"CARRIES","season":20,"gameLogSum":58,"difference":38}

## Method / limitations
This is a comprehensive machine audit of the stored roster, season stat sections, and linked game logs. A flag is **not proof of error**. School-reported gaps, incomplete per-game player stats, and source snapshot timing require review. No automated changes to player scores, awards, or draft selections were made.

# 2026 Football Player Statistics Audit

Generated: 2026-10-27T00:50:50.965Z

**118 schools · 6440 roster IDs · 4064 athletes with reported stats · 6922 category rows.**

## Coverage
- 2496 rostered athletes lack an individual season stat row (not necessarily a reporting error)
- 2 teams have no season stats: MONUMENT VAL, UMA-HILLFIELD
- 1070 finalized team-game logs include player stats
- 1 failed school stats fetches
- 168 stat rows have IDs missing from their own roster (may be MaxPreps-only entries)

## Review flags
- SEASON_GT_AVAILABLE_GAME_LOG: 591
- GAME_SUM_EXCEEDS_SEASON: 280
- RECEIVING_RATE_MISMATCH: 3
- COMPACT_FEED_MISMATCH: 2

## Highest-priority examples
- **GAME_SUM_EXCEEDS_SEASON** SOUTH SUMMIT — Ian Mair; {"category":"Passing","field":"YARDS","season":679,"gameLogSum":1397,"difference":718}
- **GAME_SUM_EXCEEDS_SEASON** MONTICELLO — Cache Young; {"category":"Passing","field":"YARDS","season":1461,"gameLogSum":2083,"difference":622}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Colton Johns; {"category":"Passing","field":"YARDS","season":1171,"gameLogSum":1751,"difference":580}
- **GAME_SUM_EXCEEDS_SEASON** SOUTH SUMMIT — Brody Larsen; {"category":"Rushing","field":"YARDS","season":623,"gameLogSum":1146,"difference":523}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Chris Munroe; {"category":"Rushing","field":"YARDS","season":886,"gameLogSum":1315,"difference":429}
- **GAME_SUM_EXCEEDS_SEASON** KEARNS — Mason Rodarte; {"category":"Passing","field":"YARDS","season":134,"gameLogSum":506,"difference":372}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Synic Harvey; {"category":"Receiving","field":"YARDS","season":288,"gameLogSum":577,"difference":289}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Corbin Black; {"category":"Passing","field":"YARDS","season":1270,"gameLogSum":1556,"difference":286}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Cooper Swasey; {"category":"Rushing","field":"YARDS","season":63,"gameLogSum":348,"difference":285}
- **GAME_SUM_EXCEEDS_SEASON** SOUTH SUMMIT — Jesse Clegg; {"category":"Receiving","field":"YARDS","season":297,"gameLogSum":549,"difference":252}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Kalvin Hopkins; {"category":"Receiving","field":"YARDS","season":59,"gameLogSum":275,"difference":216}
- **GAME_SUM_EXCEEDS_SEASON** DESERT HILLS — Deacon Virgin; {"category":"Passing","field":"YARDS","season":1584,"gameLogSum":1799,"difference":215}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Beto Carroll; {"category":"Receiving","field":"YARDS","season":861,"gameLogSum":1060,"difference":199}
- **GAME_SUM_EXCEEDS_SEASON** MONTICELLO — Cash Mack; {"category":"Receiving","field":"YARDS","season":407,"gameLogSum":602,"difference":195}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Corbin Black; {"category":"Rushing","field":"YARDS","season":31,"gameLogSum":221,"difference":190}
- **GAME_SUM_EXCEEDS_SEASON** WATER CANYON — Deagan Williams; {"category":"Passing","field":"YARDS","season":1073,"gameLogSum":1241,"difference":168}
- **GAME_SUM_EXCEEDS_SEASON** MONTICELLO — Brandtson Mack; {"category":"Receiving","field":"YARDS","season":559,"gameLogSum":726,"difference":167}
- **GAME_SUM_EXCEEDS_SEASON** WATER CANYON — Deagan Williams; {"category":"Rushing","field":"YARDS","season":323,"gameLogSum":489,"difference":166}
- **GAME_SUM_EXCEEDS_SEASON** LONE PEAK — Ayden Laws; {"category":"Rushing","field":"YARDS","season":360,"gameLogSum":525,"difference":165}
- **GAME_SUM_EXCEEDS_SEASON** KEARNS — Abdifatah Osman; {"category":"Receiving","field":"YARDS","season":64,"gameLogSum":216,"difference":152}
- **GAME_SUM_EXCEEDS_SEASON** MONTICELLO — Miles Coleman; {"category":"Receiving","field":"YARDS","season":13,"gameLogSum":156,"difference":143}
- **GAME_SUM_EXCEEDS_SEASON** SOUTH SUMMIT — Brody Larsen; {"category":"Receiving","field":"YARDS","season":64,"gameLogSum":203,"difference":139}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Everett Hill; {"category":"Receiving","field":"YARDS","season":34,"gameLogSum":170,"difference":136}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Jahmi Harrison-Bismillah; {"category":"Receiving","field":"YARDS","season":366,"gameLogSum":502,"difference":136}
- **GAME_SUM_EXCEEDS_SEASON** KEARNS — Ismail Muse; {"category":"Receiving","field":"YARDS","season":6,"gameLogSum":136,"difference":130}
- **GAME_SUM_EXCEEDS_SEASON** LONE PEAK — Pili Mounga; {"category":"Rushing","field":"YARDS","season":255,"gameLogSum":357,"difference":102}
- **GAME_SUM_EXCEEDS_SEASON** MONTICELLO — Canyon Christensen; {"category":"Receiving","field":"YARDS","season":48,"gameLogSum":150,"difference":102}
- **GAME_SUM_EXCEEDS_SEASON** LONE PEAK — Marshall Durfey; {"category":"Passing","field":"YARDS","season":306,"gameLogSum":400,"difference":94}
- **GAME_SUM_EXCEEDS_SEASON** SOUTH SUMMIT — Cash Rockhill; {"category":"Receiving","field":"YARDS","season":51,"gameLogSum":140,"difference":89}
- **GAME_SUM_EXCEEDS_SEASON** SOUTH SUMMIT — Kash Atkinson; {"category":"Receiving","field":"YARDS","season":14,"gameLogSum":103,"difference":89}
- **GAME_SUM_EXCEEDS_SEASON** CLEARFIELD — Jayce Ellis; {"category":"Passing","field":"YARDS","season":3,"gameLogSum":88,"difference":85}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Everett Hill; {"category":"Rushing","field":"YARDS","season":10,"gameLogSum":94,"difference":84}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Cooper Swasey; {"category":"Receiving","field":"YARDS","season":29,"gameLogSum":113,"difference":84}
- **GAME_SUM_EXCEEDS_SEASON** SOUTH SUMMIT — Tuff Thornton; {"category":"Receiving","field":"YARDS","season":99,"gameLogSum":175,"difference":76}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Jonathan Gonzalez; {"category":"Rushing","field":"YARDS","season":43,"gameLogSum":117,"difference":74}
- **GAME_SUM_EXCEEDS_SEASON** SOUTH SUMMIT — Ian Mair; {"category":"Rushing","field":"YARDS","season":81,"gameLogSum":153,"difference":72}
- **GAME_SUM_EXCEEDS_SEASON** TAYLORSVILLE — Skyler Bills; {"category":"Receiving","field":"YARDS","season":-2,"gameLogSum":70,"difference":72}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Chris Munroe; {"category":"Rushing","field":"CARRIES","season":62,"gameLogSum":132,"difference":70}
- **GAME_SUM_EXCEEDS_SEASON** MONTICELLO — Brandtson Mack; {"category":"Rushing","field":"YARDS","season":48,"gameLogSum":118,"difference":70}
- **GAME_SUM_EXCEEDS_SEASON** LONE PEAK — Dillon Sykes; {"category":"Receiving","field":"YARDS","season":141,"gameLogSum":205,"difference":64}
- **GAME_SUM_EXCEEDS_SEASON** DESERT HILLS — Seth Brown; {"category":"Rushing","field":"YARDS","season":886,"gameLogSum":949,"difference":63}
- **GAME_SUM_EXCEEDS_SEASON** SOUTH SUMMIT — Brody Larsen; {"category":"Rushing","field":"CARRIES","season":83,"gameLogSum":146,"difference":63}
- **GAME_SUM_EXCEEDS_SEASON** DESERT HILLS — Isaac Andresen; {"category":"Receiving","field":"YARDS","season":363,"gameLogSum":425,"difference":62}
- **GAME_SUM_EXCEEDS_SEASON** MONTICELLO — Miles Coleman; {"category":"Rushing","field":"YARDS","season":343,"gameLogSum":403,"difference":60}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Djaylan Gomes; {"category":"Receiving","field":"YARDS","season":240,"gameLogSum":299,"difference":59}
- **GAME_SUM_EXCEEDS_SEASON** DESERT HILLS — Brett Heiner; {"category":"Receiving","field":"YARDS","season":196,"gameLogSum":254,"difference":58}
- **GAME_SUM_EXCEEDS_SEASON** LONE PEAK — Caleb Brady; {"category":"Passing","field":"YARDS","season":8,"gameLogSum":66,"difference":58}
- **GAME_SUM_EXCEEDS_SEASON** LONE PEAK — Jakob Cloward; {"category":"Receiving","field":"YARDS","season":37,"gameLogSum":94,"difference":57}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Aiden Malan; {"category":"Rushing","field":"YARDS","season":31,"gameLogSum":86,"difference":55}
- **GAME_SUM_EXCEEDS_SEASON** LONE PEAK — Krew Robinson; {"category":"Receiving","field":"YARDS","season":132,"gameLogSum":186,"difference":54}
- **GAME_SUM_EXCEEDS_SEASON** WATER CANYON — Justin Cooke; {"category":"Receiving","field":"YARDS","season":450,"gameLogSum":501,"difference":51}
- **GAME_SUM_EXCEEDS_SEASON** CLEARFIELD — Bryson Ridge; {"category":"Receiving","field":"YARDS","season":278,"gameLogSum":325,"difference":47}
- **GAME_SUM_EXCEEDS_SEASON** SOUTH SUMMIT — Steele Woodward; {"category":"Rushing","field":"YARDS","season":67,"gameLogSum":114,"difference":47}
- **GAME_SUM_EXCEEDS_SEASON** TAYLORSVILLE — Gary Lomu; {"category":"Rushing","field":"YARDS","season":52,"gameLogSum":99,"difference":47}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Jamari Connelly; {"category":"Receiving","field":"YARDS","season":110,"gameLogSum":154,"difference":44}
- **GAME_SUM_EXCEEDS_SEASON** DESERT HILLS — Krew Berezay; {"category":"Receiving","field":"YARDS","season":42,"gameLogSum":85,"difference":43}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Memphis Hunkin; {"category":"Receiving","field":"YARDS","season":130,"gameLogSum":173,"difference":43}
- **GAME_SUM_EXCEEDS_SEASON** TAYLORSVILLE — Gary Lomu; {"category":"Receiving","field":"YARDS","season":4,"gameLogSum":44,"difference":40}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Cooper Swasey; {"category":"Rushing","field":"CARRIES","season":20,"gameLogSum":58,"difference":38}
- **GAME_SUM_EXCEEDS_SEASON** WATER CANYON — Justin Cooke; {"category":"Rushing","field":"YARDS","season":62,"gameLogSum":100,"difference":38}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — George Wright; {"category":"Rushing","field":"YARDS","season":4,"gameLogSum":41,"difference":37}
- **GAME_SUM_EXCEEDS_SEASON** CLEARFIELD — Brik Barlow; {"category":"Rushing","field":"YARDS","season":133,"gameLogSum":168,"difference":35}
- **GAME_SUM_EXCEEDS_SEASON** WATER CANYON — Gabe Cooke; {"category":"Receiving","field":"YARDS","season":421,"gameLogSum":455,"difference":34}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Jahmi Harrison-Bismillah; {"category":"Rushing","field":"YARDS","season":72,"gameLogSum":103,"difference":31}
- **GAME_SUM_EXCEEDS_SEASON** KEARNS — Jamal Muridi; {"category":"Rushing","field":"YARDS","season":-7,"gameLogSum":21,"difference":28}
- **GAME_SUM_EXCEEDS_SEASON** LONE PEAK — Ayden Laws; {"category":"Rushing","field":"CARRIES","season":83,"gameLogSum":111,"difference":28}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Jamari Connelly; {"category":"Rushing","field":"YARDS","season":15,"gameLogSum":42,"difference":27}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Henry Zinnecker; {"category":"Rushing","field":"YARDS","season":55,"gameLogSum":82,"difference":27}
- **GAME_SUM_EXCEEDS_SEASON** DESERT HILLS — Tagg Brinton; {"category":"Receiving","field":"YARDS","season":391,"gameLogSum":417,"difference":26}
- **GAME_SUM_EXCEEDS_SEASON** KEARNS — Elijah Castillo; {"category":"Receiving","field":"YARDS","season":4,"gameLogSum":30,"difference":26}
- **GAME_SUM_EXCEEDS_SEASON** MONTICELLO — Cash Mack; {"category":"Rushing","field":"YARDS","season":49,"gameLogSum":75,"difference":26}
- **GAME_SUM_EXCEEDS_SEASON** TAYLORSVILLE — Skyler Bills; {"category":"Rushing","field":"YARDS","season":0,"gameLogSum":26,"difference":26}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Everett Hill; {"category":"Rushing","field":"CARRIES","season":7,"gameLogSum":32,"difference":25}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Reupeni Salaba; {"category":"Rushing","field":"YARDS","season":13,"gameLogSum":38,"difference":25}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Kotoni Kitekeiaho; {"category":"Receiving","field":"YARDS","season":24,"gameLogSum":49,"difference":25}
- **GAME_SUM_EXCEEDS_SEASON** TAYLORSVILLE — Gary Lomu; {"category":"Rushing","field":"CARRIES","season":12,"gameLogSum":36,"difference":24}
- **GAME_SUM_EXCEEDS_SEASON** CLEARFIELD — Jayce Ellis; {"category":"Rushing","field":"YARDS","season":13,"gameLogSum":35,"difference":22}
- **GAME_SUM_EXCEEDS_SEASON** WATER CANYON — Sawyer Horsley; {"category":"Receiving","field":"YARDS","season":129,"gameLogSum":151,"difference":22}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Griffin Oldroyd; {"category":"Rushing","field":"YARDS","season":9,"gameLogSum":30,"difference":21}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Beto Carroll; {"category":"Receiving","field":"RECEPTIONS","season":11,"gameLogSum":32,"difference":21}

## Method / limitations
This is a comprehensive machine audit of the stored roster, season stat sections, and linked game logs. A flag is **not proof of error**. School-reported gaps, incomplete per-game player stats, and source snapshot timing require review. No automated changes to player scores, awards, or draft selections were made.

# 2026 Football Player Statistics Audit

Generated: 2026-10-26T20:46:54.507Z

**118 schools · 6440 roster IDs · 4059 athletes with reported stats · 6915 category rows.**

## Coverage
- 2501 rostered athletes lack an individual season stat row (not necessarily a reporting error)
- 2 teams have no season stats: MONUMENT VAL, UMA-HILLFIELD
- 1085 finalized team-game logs include player stats
- 1 failed school stats fetches
- 168 stat rows have IDs missing from their own roster (may be MaxPreps-only entries)

## Review flags
- SEASON_GT_AVAILABLE_GAME_LOG: 626
- GAME_SUM_EXCEEDS_SEASON: 516
- CONFLICTING_GAME_CELL: 6

## Highest-priority examples
- **GAME_SUM_EXCEEDS_SEASON** DESERT HILLS — Deacon Virgin; {"category":"Passing","field":"YARDS","season":1584,"gameLogSum":1799,"difference":215}
- **GAME_SUM_EXCEEDS_SEASON** PROVO — Drevin Christensen; {"category":"Passing","field":"YARDS","season":1141,"gameLogSum":1301,"difference":160}
- **GAME_SUM_EXCEEDS_SEASON** BEAVER — Cutler Bradshaw; {"category":"Rushing","field":"YARDS","season":36,"gameLogSum":195,"difference":159}
- **GAME_SUM_EXCEEDS_SEASON** WEST JORDAN — Kenyon Shockey; {"category":"Passing","field":"YARDS","season":1110,"gameLogSum":1257,"difference":147}
- **GAME_SUM_EXCEEDS_SEASON** WESTLAKE — Silas Taumoepeau; {"category":"Passing","field":"YARDS","season":940,"gameLogSum":1067,"difference":127}
- **GAME_SUM_EXCEEDS_SEASON** WEST JORDAN — Lexen Rivera; {"category":"Receiving","field":"YARDS","season":238,"gameLogSum":362,"difference":124}
- **GAME_SUM_EXCEEDS_SEASON** BEN LOMOND — Kale Ha'o; {"category":"Rushing","field":"YARDS","season":762,"gameLogSum":875,"difference":113}
- **GAME_SUM_EXCEEDS_SEASON** RICHFIELD — Cordon White; {"category":"Rushing","field":"YARDS","season":318,"gameLogSum":413,"difference":95}
- **GAME_SUM_EXCEEDS_SEASON** RICHFIELD — Cordon White; {"category":"Passing","field":"YARDS","season":1042,"gameLogSum":1135,"difference":93}
- **GAME_SUM_EXCEEDS_SEASON** CEDAR CITY — Gavin DeMille; {"category":"Rushing","field":"YARDS","season":21,"gameLogSum":113,"difference":92}
- **GAME_SUM_EXCEEDS_SEASON** CLEARFIELD — Jayce Ellis; {"category":"Passing","field":"YARDS","season":3,"gameLogSum":88,"difference":85}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Jonathan Gonzalez; {"category":"Rushing","field":"YARDS","season":43,"gameLogSum":117,"difference":74}
- **GAME_SUM_EXCEEDS_SEASON** SALEM HILLS — Ty McBride; {"category":"Receiving","field":"YARDS","season":14,"gameLogSum":85,"difference":71}
- **GAME_SUM_EXCEEDS_SEASON** WEBER — Draycen Munoz; {"category":"Receiving","field":"YARDS","season":199,"gameLogSum":267,"difference":68}
- **GAME_SUM_EXCEEDS_SEASON** STANSBURY — Lincoln Reutzel; {"category":"Rushing","field":"YARDS","season":19,"gameLogSum":84,"difference":65}
- **GAME_SUM_EXCEEDS_SEASON** DESERT HILLS — Seth Brown; {"category":"Rushing","field":"YARDS","season":886,"gameLogSum":949,"difference":63}
- **GAME_SUM_EXCEEDS_SEASON** DESERT HILLS — Isaac Andresen; {"category":"Receiving","field":"YARDS","season":363,"gameLogSum":425,"difference":62}
- **GAME_SUM_EXCEEDS_SEASON** MAPLE MOUNTAIN — Joey Imperial; {"category":"Passing","field":"Int","season":6,"gameLogSum":68,"difference":62}
- **GAME_SUM_EXCEEDS_SEASON** LONE PEAK — Jakob Cloward; {"category":"Receiving","field":"YARDS","season":37,"gameLogSum":94,"difference":57}
- **GAME_SUM_EXCEEDS_SEASON** OGDEN — Emmett Rector; {"category":"Passing","field":"YARDS","season":1495,"gameLogSum":1552,"difference":57}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Aiden Malan; {"category":"Rushing","field":"YARDS","season":31,"gameLogSum":86,"difference":55}
- **GAME_SUM_EXCEEDS_SEASON** WESTLAKE — Malik Sika; {"category":"Receiving","field":"YARDS","season":225,"gameLogSum":280,"difference":55}
- **GAME_SUM_EXCEEDS_SEASON** CLEARFIELD — Bryson Ridge; {"category":"Receiving","field":"YARDS","season":278,"gameLogSum":325,"difference":47}
- **GAME_SUM_EXCEEDS_SEASON** WESTLAKE — Kylan Xoumphonphackdy; {"category":"Receiving","field":"YARDS","season":319,"gameLogSum":366,"difference":47}
- **GAME_SUM_EXCEEDS_SEASON** HIGHLAND — Will Bauman; {"category":"Rushing","field":"YARDS","season":224,"gameLogSum":270,"difference":46}
- **GAME_SUM_EXCEEDS_SEASON** GRANGER — Tomasi Vehikite; {"category":"Receiving","field":"YARDS","season":63,"gameLogSum":103,"difference":40}
- **GAME_SUM_EXCEEDS_SEASON** MOUNTAIN RIDGE — Kyler Christiansen; {"category":"Receiving","field":"YARDS","season":1,"gameLogSum":41,"difference":40}
- **GAME_SUM_EXCEEDS_SEASON** WEST JORDAN — Kenyon Shockey; {"category":"Rushing","field":"YARDS","season":134,"gameLogSum":171,"difference":37}
- **GAME_SUM_EXCEEDS_SEASON** OLYMPUS — Haloti Ngata; {"category":"Receiving","field":"YARDS","season":35,"gameLogSum":71,"difference":36}
- **GAME_SUM_EXCEEDS_SEASON** CLEARFIELD — Brik Barlow; {"category":"Rushing","field":"YARDS","season":133,"gameLogSum":168,"difference":35}
- **GAME_SUM_EXCEEDS_SEASON** WEST JORDAN — Linkon Hall; {"category":"Receiving","field":"YARDS","season":50,"gameLogSum":85,"difference":35}
- **GAME_SUM_EXCEEDS_SEASON** OLYMPUS — Gavin Fullmer; {"category":"Rushing","field":"YARDS","season":1,"gameLogSum":30,"difference":29}
- **GAME_SUM_EXCEEDS_SEASON** WASATCH — Grady Coombs; {"category":"Rushing","field":"YARDS","season":88,"gameLogSum":116,"difference":28}
- **GAME_SUM_EXCEEDS_SEASON** WESTLAKE — Slone Sua; {"category":"Receiving","field":"YARDS","season":102,"gameLogSum":130,"difference":28}
- **GAME_SUM_EXCEEDS_SEASON** ALTA — Kayden Smith; {"category":"Rushing","field":"YARDS","season":88,"gameLogSum":114,"difference":26}
- **GAME_SUM_EXCEEDS_SEASON** BEAVER — Cutler Bradshaw; {"category":"Rushing","field":"CARRIES","season":3,"gameLogSum":29,"difference":26}
- **GAME_SUM_EXCEEDS_SEASON** DESERT HILLS — Tagg Brinton; {"category":"Receiving","field":"YARDS","season":391,"gameLogSum":417,"difference":26}
- **GAME_SUM_EXCEEDS_SEASON** LAYTON CHRISTIAN — Reupeni Salaba; {"category":"Rushing","field":"YARDS","season":13,"gameLogSum":38,"difference":25}
- **GAME_SUM_EXCEEDS_SEASON** MILFORD — Tayon Blackburn; {"category":"Rushing","field":"YARDS","season":812,"gameLogSum":837,"difference":25}
- **GAME_SUM_EXCEEDS_SEASON** WEST JORDAN — Sateki Tuifua; {"category":"Receiving","field":"YARDS","season":75,"gameLogSum":98,"difference":23}
- **GAME_SUM_EXCEEDS_SEASON** CLEARFIELD — Jayce Ellis; {"category":"Rushing","field":"YARDS","season":13,"gameLogSum":35,"difference":22}
- **GAME_SUM_EXCEEDS_SEASON** MILFORD — Haze Marshall; {"category":"Rushing","field":"YARDS","season":51,"gameLogSum":73,"difference":22}
- **GAME_SUM_EXCEEDS_SEASON** WASATCH — Bryce Harr; {"category":"Passing","field":"YARDS","season":960,"gameLogSum":982,"difference":22}
- **GAME_SUM_EXCEEDS_SEASON** WEBER — Reese Cantwell; {"category":"Receiving","field":"YARDS","season":443,"gameLogSum":465,"difference":22}
- **GAME_SUM_EXCEEDS_SEASON** WEBER — Bridger Rasmussen; {"category":"Receiving","field":"YARDS","season":170,"gameLogSum":192,"difference":22}
- **GAME_SUM_EXCEEDS_SEASON** MANTI — Isaiah Wright; {"category":"Rushing","field":"YARDS","season":13,"gameLogSum":34,"difference":21}
- **GAME_SUM_EXCEEDS_SEASON** DESERT HILLS — Seth Brown; {"category":"Receiving","field":"YARDS","season":180,"gameLogSum":200,"difference":20}
- **GAME_SUM_EXCEEDS_SEASON** LONE PEAK — Ayden Laws; {"category":"Rushing","field":"YARDS","season":505,"gameLogSum":525,"difference":20}
- **GAME_SUM_EXCEEDS_SEASON** NORTH SANPETE — Trevor Mann; {"category":"Rushing","field":"CARRIES","season":210,"gameLogSum":230,"difference":20}
- **GAME_SUM_EXCEEDS_SEASON** WASATCH — Aksel Wheeler; {"category":"Receiving","field":"YARDS","season":25,"gameLogSum":45,"difference":20}
- **GAME_SUM_EXCEEDS_SEASON** HIGHLAND — Adriean King Boyd; {"category":"Receiving","field":"YARDS","season":469,"gameLogSum":488,"difference":19}
- **GAME_SUM_EXCEEDS_SEASON** WASATCH — Parker Cottle; {"category":"Rushing","field":"YARDS","season":155,"gameLogSum":174,"difference":19}
- **GAME_SUM_EXCEEDS_SEASON** BRIGHTON — Ryan Nazari; {"category":"Receiving","field":"YARDS","season":151,"gameLogSum":169,"difference":18}
- **GAME_SUM_EXCEEDS_SEASON** CLEARFIELD — JR Heslop; {"category":"Receiving","field":"YARDS","season":57,"gameLogSum":75,"difference":18}
- **GAME_SUM_EXCEEDS_SEASON** DESERT HILLS — Tagg Brinton; {"category":"Rushing","field":"YARDS","season":103,"gameLogSum":121,"difference":18}
- **GAME_SUM_EXCEEDS_SEASON** MANTI — Isaiah Wright; {"category":"Rushing","field":"CARRIES","season":4,"gameLogSum":22,"difference":18}
- **GAME_SUM_EXCEEDS_SEASON** CLEARFIELD — Micah Salazar; {"category":"Rushing","field":"YARDS","season":224,"gameLogSum":241,"difference":17}
- **GAME_SUM_EXCEEDS_SEASON** UNION — Brett Meeks; {"category":"Rushing","field":"YARDS","season":373,"gameLogSum":390,"difference":17}
- **GAME_SUM_EXCEEDS_SEASON** WASATCH — Austin Wilde; {"category":"Rushing","field":"YARDS","season":109,"gameLogSum":126,"difference":17}
- **GAME_SUM_EXCEEDS_SEASON** WEBER — Carson Hill; {"category":"Rushing","field":"YARDS","season":84,"gameLogSum":101,"difference":17}
- **GAME_SUM_EXCEEDS_SEASON** BOUNTIFUL — Madden Parks; {"category":"Rushing","field":"YARDS","season":18,"gameLogSum":34,"difference":16}
- **GAME_SUM_EXCEEDS_SEASON** CEDAR CITY — Gavin DeMille; {"category":"Rushing","field":"CARRIES","season":1,"gameLogSum":17,"difference":16}
- **GAME_SUM_EXCEEDS_SEASON** WASATCH — Braxton Sandoval; {"category":"Rushing","field":"YARDS","season":114,"gameLogSum":130,"difference":16}
- **GAME_SUM_EXCEEDS_SEASON** BEN LOMOND — Kale Ha'o; {"category":"Rushing","field":"CARRIES","season":168,"gameLogSum":183,"difference":15}
- **GAME_SUM_EXCEEDS_SEASON** OGDEN — Ryker Rice; {"category":"Rushing","field":"YARDS","season":637,"gameLogSum":652,"difference":15}
- **GAME_SUM_EXCEEDS_SEASON** SNOW CANYON — Brody Lounsbury; {"category":"Rushing","field":"YARDS","season":417,"gameLogSum":432,"difference":15}
- **GAME_SUM_EXCEEDS_SEASON** VIEWMONT — Miles Frey; {"category":"Rushing","field":"YARDS","season":390,"gameLogSum":405,"difference":15}
- **GAME_SUM_EXCEEDS_SEASON** VIEWMONT — Miles Frey; {"category":"Receiving","field":"YARDS","season":146,"gameLogSum":161,"difference":15}
- **GAME_SUM_EXCEEDS_SEASON** CLEARFIELD — Easton Harmon; {"category":"Receiving","field":"YARDS","season":7,"gameLogSum":21,"difference":14}
- **GAME_SUM_EXCEEDS_SEASON** DESERT HILLS — Seth Brown; {"category":"Rushing","field":"CARRIES","season":121,"gameLogSum":135,"difference":14}
- **GAME_SUM_EXCEEDS_SEASON** GRAND — Jonathan Gonzalez; {"category":"Receiving","field":"YARDS","season":19,"gameLogSum":33,"difference":14}
- **GAME_SUM_EXCEEDS_SEASON** SPRINGVILLE — Wesley Yearsley; {"category":"Receiving","field":"YARDS","season":91,"gameLogSum":105,"difference":14}
- **GAME_SUM_EXCEEDS_SEASON** WASATCH — Seth Kelson; {"category":"Receiving","field":"YARDS","season":107,"gameLogSum":121,"difference":14}
- **GAME_SUM_EXCEEDS_SEASON** CLEARFIELD — Bryson Ridge; {"category":"Rushing","field":"YARDS","season":0,"gameLogSum":13,"difference":13}
- **GAME_SUM_EXCEEDS_SEASON** DIXIE — Porter Greer; {"category":"Receiving","field":"RECEPTIONS","season":13,"gameLogSum":25,"difference":12}
- **GAME_SUM_EXCEEDS_SEASON** MANTI — Tevon Vakautakakala; {"category":"Rushing","field":"YARDS","season":6,"gameLogSum":18,"difference":12}
- **GAME_SUM_EXCEEDS_SEASON** PAYSON — Carson Wall; {"category":"Rushing","field":"CARRIES","season":23,"gameLogSum":35,"difference":12}
- **GAME_SUM_EXCEEDS_SEASON** RICHFIELD — Cordon White; {"category":"Rushing","field":"CARRIES","season":68,"gameLogSum":80,"difference":12}
- **GAME_SUM_EXCEEDS_SEASON** WASATCH — Everest Moyer; {"category":"Receiving","field":"YARDS","season":152,"gameLogSum":164,"difference":12}
- **GAME_SUM_EXCEEDS_SEASON** WEST JORDAN — Bryan Yang; {"category":"Rushing","field":"CARRIES","season":100,"gameLogSum":112,"difference":12}

## Method / limitations
This is a comprehensive machine audit of the stored roster, season stat sections, and linked game logs. A flag is **not proof of error**. School-reported gaps, incomplete per-game player stats, and source snapshot timing require review. No automated changes to player scores, awards, or draft selections were made.

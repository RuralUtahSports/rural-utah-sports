#!/usr/bin/env node
// Rural Utah Sports: conservative, source-backed single-season record alerts.
// Historical team season data: Greatest Seasons and Scorigami.
// Player comparisons: reported 2025/2026 Deseret seasons ONLY; not all-time school claims.
import fs from 'node:fs';

const read = p => JSON.parse(fs.readFileSync(p,'utf8'));
const canonical = name => {
  const n=String(name||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  return ({CEDAR:'CEDARCITY',MONUMENTVAL:'MONUMENTVALLEY',GRANDCOUNTY:'GRAND',
    GUNNISON:'GUNNISONVALLEY',STJOSEPH:'SAINTJOSEPH',STJOSEPHS:'SAINTJOSEPH',
    MAPLEMTN:'MAPLEMOUNTAIN',AMERICANLEADERSHIPACADEMY:'ALA'})[n]||n;
};
const number = x => { if(x===null||x===undefined||String(x).trim()==='')return null;
  const v=Number(String(x).replace(/,/g,''));return Number.isFinite(v)?v:null; };
const dateKey=d=>{const m=String(d||'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m?m[3]+'-'+m[1].padStart(2,'0')+'-'+m[2].padStart(2,'0'):String(d||'');};
const teamNames=new Map();
const standings=read('standings-2026.json'),seasons=read('greatest-seasons-data-v2.json'),
  scorigami=read('scorigami.json'),rosters2025=read('deseret-rosters-stats-2025.json'),
  rosters2026=read('deseret-rosters-stats-2026.json'),meta=read('teams-data.json');
for(const t of meta)teamNames.set(canonical(t.team),t.team);
const official11=[...read('uhsaa-football-records.json').categories,
  ...read('uhsaa-records-defense.json').categories];
const official8=read('uhsaa-football-records-8-player.json').categories;
const classify=new Map(meta.map(t=>[canonical(t.team),String(t.classification||'').toUpperCase()]));
const historical=new Map();
for(const s of seasons){
  if(Number(s.Year)>=2026)continue;
  const key=canonical(s.Team);if(!historical.has(key))historical.set(key,[]);
  historical.get(key).push(s);
}
const games=new Map();
function addGame(map,team,year,date,opponent,forScore,againstScore){
  const key=canonical(team),p=Number(forScore),a=Number(againstScore);
  if(!key||!Number.isFinite(p)||!Number.isFinite(a)||p<0||a<0||!year||!date)return;
  if(!map.has(key))map.set(key,[]);
  map.get(key).push({year,date:dateKey(date),opponent,pointsFor:p,pointsAgainst:a,
    win:p>a,tie:p===a,shutout:p>a&&a===0});
}
for(const g of standings.games||[]){
  if(number(g.actualAway)===null||number(g.actualHome)===null)continue;
  if(number(g.actualAway)===0&&number(g.actualHome)===0)continue; // reject placeholder ties
  addGame(games,g.awayTeam,2026,g.date,g.homeTeam,g.actualAway,g.actualHome);
  addGame(games,g.homeTeam,2026,g.date,g.awayTeam,g.actualHome,g.actualAway);
}
for(const rows of games.values())rows.sort((a,b)=>a.date.localeCompare(b.date)||a.opponent.localeCompare(b.opponent));
const historicalGames=new Map();
const historicalDuplicates=new Set();
for(const score of scorigami.scores||[])for(const game of score.games||[]){
  const yr=Number(game.year);if(yr<1893||yr>=2026)continue;
  const a=game.team1,b=game.team2,s1=number(game.score1),s2=number(game.score2);
  if(!a||!b||s1===null||s2===null)continue;
  const dedup=[yr,dateKey(game.date),...[canonical(a),canonical(b)].sort(),...[s1,s2].sort((x,y)=>x-y)].join('|');
  if(historicalDuplicates.has(dedup))continue;historicalDuplicates.add(dedup);
  addGame(historicalGames,a,yr,game.date,b,s1,s2);
  addGame(historicalGames,b,yr,game.date,a,s2,s1);
}
function yearSummaries(rows){
  const byYear=new Map();
  for(const g of rows){if(!byYear.has(g.year))byYear.set(g.year,[]);
    byYear.get(g.year).push(g);}
  return [...byYear].map(([year,gs])=>{
    gs.sort((a,b)=>a.date.localeCompare(b.date)||a.opponent.localeCompare(b.opponent));
    let shutouts=0,streak=0,longestStreak=0;
    for(const g of gs){if(g.shutout)shutouts++;streak=g.win?streak+1:0;
      longestStreak=Math.max(longestStreak,streak);}
    return {year,shutouts,longestStreak,games:gs.length};
  });
}
const historicScoring=new Map();
for(const [key,rows] of historicalGames)historicScoring.set(key,yearSummaries(rows));
const teamDefs=[
 {key:'wins',label:'Most Wins in a Season',field:'Wins',unit:'wins',metric:g=>Number(g.win),minimum:1},
 {key:'pointsFor',label:'Most Points Scored in a Season',field:'Points For',unit:'points',metric:g=>g.pointsFor,minimum:1},
 {key:'shutouts',label:'Most Shutouts in a Season',field:'shutouts',unit:'shutouts',metric:g=>Number(g.shutout),minimum:1},
 {key:'winningStreak',label:'Longest Single-Season Winning Streak',field:'longestStreak',unit:'games',minimum:2}
];
const teamAlerts=[],teamWatches=[];
for(const [key,gs] of games){
  if(!historical.has(key)||gs.length===0)continue;
  const history=historical.get(key),histGames=historicScoring.get(key)||[];
  const name=teamNames.get(key)||key,latest=gs.at(-1).date;
  for(const def of teamDefs){
    const baselines=def.field==='shutouts'||def.field==='longestStreak'
      ?histGames.filter(x=>x.games>=4).map(x=>({year:x.year,value:x[def.field]}))
      :history.filter(x=>Number(x.Games)>=4).map(x=>({year:Number(x.Year),value:number(x[def.field])}));
    const valid=baselines.filter(x=>x.value!==null&&Number.isFinite(x.value));
    if(!valid.length)continue;
    valid.sort((a,b)=>b.value-a.value||b.year-a.year);
    const previous=valid[0];
    let tally=0,streak=0,value=0,firstBreak=null;
    for(const g of gs){
      if(def.key==='winningStreak'){streak=g.win?streak+1:0;tally=Math.max(tally,streak);}
      else tally+=def.metric(g);
      if(tally>previous.value&&!firstBreak)firstBreak=g;
    }
    value=tally;
    if(value<=previous.value)continue;
    teamAlerts.push({recordType:'seasonTeam',scope:'school-history',status:'broken',
      team:name,season:2026,categoryKey:def.key,category:def.label,
      unit:def.unit,value,previousValue:previous.value,previousSeason:previous.year,
      date:firstBreak?.date||latest,asOf:latest,source:'RUS historical seasons / recorded final scores',
      note:'Record within Rural Utah Sports recorded school history; incomplete historical games may affect coverage.'});
  }
  // Rate/defensive marks can reverse as games are played. Treat as provisional watches.
  const totals={points:gs.reduce((s,g)=>s+g.pointsFor,0),allowed:gs.reduce((s,g)=>s+g.pointsAgainst,0)};
  if(gs.length>=8){
    const watchSpecs=[
      {key:'pointsPerGame',category:'Highest Points Per Game',field:'PPG',value:totals.points/gs.length,low:false,unit:'PPG'},
      {key:'pointsAllowedPerGame',category:'Lowest Points Allowed Per Game',field:'PAPG',value:totals.allowed/gs.length,low:true,unit:'PAPG'},
      {key:'averageMargin',category:'Best Average Scoring Margin',field:'Avg Margin',value:(totals.points-totals.allowed)/gs.length,low:false,unit:'points/game'},
      {key:'fewestPointsAllowed',category:'Fewest Points Allowed in a Season',field:'Points Against',value:totals.allowed,low:true,unit:'points'}];
    for(const d of watchSpecs){
      const candidates=history.filter(s=>Number(s.Games)>=8).map(s=>({year:Number(s.Year),value:number(s[d.field])}))
        .filter(v=>v.value!==null&&Number.isFinite(v.value));
      if(!candidates.length)continue;
      candidates.sort((a,b)=>d.low?a.value-b.value||b.year-a.year:b.value-a.value||b.year-a.year);
      const previous=candidates[0];
      if(d.low?d.value>=previous.value:d.value<=previous.value)continue;
      teamWatches.push({recordType:'seasonTeam',scope:'school-history',status:'on-pace',
        team:name,season:2026,categoryKey:d.key,category:d.category,unit:d.unit,
        value:Math.round(d.value*100)/100,previousValue:previous.value,previousSeason:previous.year,
        asOf:latest,note:'Provisional only: this mark can change before the season ends.'});
    }
  }
}
// A player record is NOT an all-time school record unless a comprehensive historical
// individual-season archive exists. This feed covers the two reported Deseret seasons.
const playerDefs=[
 ['Rushing','YARDS','rushYards','Rushing Yards','yards',150,'rush-yards-season'],
 ['Rushing','TD','rushTd','Rushing Touchdowns','TD',3,'rush-td-season'],
 ['Rushing','CARRIES','carries','Rushing Carries','carries',30,null],
 ['Passing','YARDS','passYards','Passing Yards','yards',150,'pass-yards-season'],
 ['Passing','TD','passTd','Passing Touchdowns','TD',3,'pass-td-season'],
 ['Receiving','YARDS','receivingYards','Receiving Yards','yards',100,'receiving-yards-season'],
 ['Receiving','TD','receivingTd','Receiving Touchdowns','TD',2,null],
 ['Receiving','RECEPTIONS','receptions','Receptions','catches',15,null],
 ['Defense/Special Teams','TACKLES','tackles','Tackles','tackles',20,'tackles-season'],
 ['Defense/Special Teams','SACKS','sacks','Sacks','sacks',2,'sacks-season'],
 ['Defense/Special Teams','PASS INT.','interceptions','Defensive Interceptions','INT',1,'interceptions-season'],
 ['Kicking','FG','fieldGoals','Field Goals','FG',1,null],
 ['Kicking','PAT','extraPoints','Extra Points','PAT',5,null]
];
function collectPlayers(archive){
  const out=new Map();
  for(const [team,record] of Object.entries(archive.teams||{})){
    const key=canonical(team),m=new Map();
    for(const [section,field,id,label,unit,baseline,officialId] of playerDefs){
      const group=(record.stats||[]).find(s=>s.category===section);
      if(!group)continue;
      const players=[];
      for(const row of group.rows||[]){
        const amount=number(row.values?.[field]);
        if(amount===null||amount<=0||!row.name)continue;
        players.push({name:row.name,playerId:row.playerId||'',value:amount});
      }
      if(players.length){players.sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name));
        m.set(id,{players,leader:players[0],label,unit,baseline,officialId});}
    }
    out.set(key,m);
  }
  return out;
}
const player2025=collectPlayers(rosters2025),player2026=collectPlayers(rosters2026),playerAlerts=[];
const asOf=String(rosters2026.updatedAt||'').slice(0,10);
for(const [key,current] of player2026){
  const before=player2025.get(key);if(!before)continue;
  for(const [metric,c] of current){
    const prior=before.get(metric);
    if(!prior||prior.leader.value<c.baseline)continue;
    for(const player of c.players){
      if(player.value<=prior.leader.value)continue;
      const format=/^8P|^8.PLAYER/.test(classify.get(key)||'')?'8-player':'11-player';
      const officialCategories=format==='8-player'?official8:official11;
      const official=officialCategories.find(x=>x.id===c.officialId)?.entries?.[0];
      const officialValue=number(official?.value);
      const exceedsOfficial=officialValue!==null&&player.value>officialValue;
      playerAlerts.push({recordType:'seasonPlayer',status:exceedsOfficial?'exceeds-listed-uhsaa':'reported-archive-high',
        scope:exceedsOfficial?'listed-uhsaa':'reported-2025-present',team:teamNames.get(key)||key,
        season:2026,player:player.name,playerId:player.playerId,categoryKey:metric,category:c.label,
        unit:c.unit,value:player.value,previousValue:prior.leader.value,
        previousPlayer:prior.leader.name,previousSeason:2025,asOf,
        officialValue:exceedsOfficial?officialValue:null,
        officialHolder:exceedsOfficial?official.name:null,
        footballFormat:format,
        note:exceedsOfficial?'Exceeds the listed UHSAA mark; official recognition requires review.':
          'Exceeds the top reported 2025 school season mark. Earlier player season records are not fully archived; NOT a verified all-time school record.'});
    }
  }
}
// For each category only the top current player per school triggers a new team archive benchmark.
const uniquePlayer=new Map();
for(const a of playerAlerts){const key=canonical(a.team)+'|'+a.categoryKey;
  if(!uniquePlayer.has(key)||a.value>uniquePlayer.get(key).value)uniquePlayer.set(key,a);}
const playerResults=[...uniquePlayer.values()];
teamAlerts.sort((a,b)=>b.date.localeCompare(a.date)||a.team.localeCompare(b.team));
teamWatches.sort((a,b)=>b.asOf.localeCompare(a.asOf)||a.team.localeCompare(b.team));
playerResults.sort((a,b)=>Number(b.status==='exceeds-listed-uhsaa')-Number(a.status==='exceeds-listed-uhsaa')||
  (b.value/Math.max(1,b.previousValue))-(a.value/Math.max(1,a.previousValue))||a.team.localeCompare(b.team));
const output={
  season:2026,generatedAt:String(rosters2026.updatedAt||standings.updatedAt||''),
  updatedFrom:{results:standings.updatedAt,playerStats:rosters2026.updatedAt},
  coverageNote:'Team historical records compare RUS recorded school seasons and finals. Player comparisons cover reported 2025–2026 seasons only; they are NOT verified school all-time records. UHSAA listed marks are separately identified and require official review.',
  counts:{teamBroken:teamAlerts.length,teamProvisional:teamWatches.length,playerReportedArchive:playerResults.length,
    playerExceedingUhsaa:playerResults.filter(x=>x.status==='exceeds-listed-uhsaa').length},
  teamBroken:teamAlerts,teamWatches,playerReportedArchive:playerResults
};
if(teamAlerts.some(a=>a.value<=a.previousValue)||playerResults.some(a=>a.value<=a.previousValue))throw Error('Alert threshold regression');
fs.writeFileSync('season-record-alerts.json',JSON.stringify(output,null,2)+'\n');
console.log('Season record alerts:',JSON.stringify(output.counts));

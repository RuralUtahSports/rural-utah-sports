import fs from 'node:fs';

const SEASONS = ['2002-03','2003-04','2004-05','2005-06','2006-07','2007-08','2008-09','2009-10','2010-11','2011-12','2012-13','2013-14','2014-15','2015-16','2016-17','2017-18','2018-19','2019-20','2020-21','2021-22','2022-23','2023-24','2024-25','2025-26'];
const OUT_DIR = 'boys-basketball-playoffs';
const FINALS_FILE = 'boys-basketball-finals-2003-2026.json';
const INDEX_FILE = OUT_DIR + '/index.json';

const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const ALIASES={
  UTAHMILITARYACADEMYCAMPWILLIAMS:'UMALEHI',
  UMACAMPWILLIAMS:'UMALEHI',
  UTAHMILITARYACADEMYHILLFIELD:'UMAHILLFIELD',
  STJOSEPH:'SAINTJOSEPH',
  GRAND:'GRANDCOUNTY',
  MERITPREPARATORYACADEMY:'MERITPREP',
  AMERICANLEADERSHIPACADEMY:'ALA',
  AMERICANPREPARATORYACADEMYWESTVALLEY:'AMERICANPREPWV',
  MAESERPREPARATORYACADEMY:'MAESERPREPACADEMY',
  JUANDIEGOCATHOLIC:'JUANDIEGO',
  JUDGEMEMORIALCATHOLIC:'JUDGEMEMORIAL',
  UTAHSCHOOLFORTHEDEAFBLIND:'USDB',
  CEDARCITY:'CEDAR',
  GUNNISON:'GUNNISONVALLEY',
  LAYTONCHRISTIAN:'LAYTONCHRISTIANACADEMY',
  WASATCHACAD:'WASATCHACADEMY'
};
const key=v=>ALIASES[norm(v)]||norm(v);
const safeFile=v=>key(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

function read(path){return JSON.parse(fs.readFileSync(path,'utf8'))}
function dateMs(v){const t=Date.parse(clean(v).includes('T')?clean(v):clean(v)+'T12:00:00');return Number.isFinite(t)?t:0}
function dayDiff(a,b){return Math.abs(dateMs(a)-dateMs(b))/86400000}
function validGame(g){
  const a=Number(g?.teamScore),b=Number(g?.opponentScore);
  return clean(g?.opponent)&&Number.isFinite(a)&&Number.isFinite(b)&&!(a===0&&b===0);
}
function resultFor(g){
  const a=Number(g.teamScore),b=Number(g.opponentScore);
  return a>b?'W':a<b?'L':'T';
}
function roundName(depth){
  return depth===0?'Final':depth===1?'Semifinal':depth===2?'Quarterfinal':depth===3?'Round of 16':depth===4?'Round of 32':'Round of 64';
}
const finishRank={'Champion':7,'Runner-Up':6,'Semifinal':5,'Quarterfinal':4,'Round of 16':3,'Round of 32':2,'Round of 64':1,'State Tournament':1};
function betterFinish(a,b){return (finishRank[a]||0)>=(finishRank[b]||0)?a:b}

const directory=read('boys-basketball-teams.json');
const displayByKey=new Map(directory.map(row=>[key(row.team),row.team]));
const display=v=>displayByKey.get(key(v))||clean(v);
const champData=read('boys-basketball-championships.json');

const titlesByYear=new Map();
for(const [school,item] of Object.entries(champData.teams||{})){
  for(const ch of item.championships||[]){
    const year=Number(ch.year);
    if(year<2003||year>2026||!ch.classification)continue;
    const arr=titlesByYear.get(year)||[];
    arr.push({year,classification:clean(ch.classification),champion:display(school)});
    titlesByYear.set(year,arr);
  }
}

function seasonWindow(season){
  const startYear=Number(season.slice(0,4));
  const endYear=Number('20'+season.slice(-2));
  return {start:Date.parse(startYear+'-11-01T00:00:00'),end:Date.parse(endYear+'-03-15T23:59:59')};
}
function buildSeasonIndex(payload,season){
  const byTeam=new Map();
  const window=seasonWindow(season);
  for(const [teamName,entry] of Object.entries(payload.teams||{})){
    const arr=[];
    for(const g of Array.isArray(entry?.games)?entry.games:[]){
      if(!validGame(g))continue;
      const when=dateMs(g.date);
      if(!when||when<window.start||when>window.end)continue;
      arr.push({
        team:display(teamName),
        teamKey:key(teamName),
        opponent:display(g.opponent),
        opponentKey:key(g.opponent),
        opponentState:clean(g.opponentState).toUpperCase(),
        date:clean(g.date),
        teamScore:Number(g.teamScore),
        opponentScore:Number(g.opponentScore),
        result:resultFor(g),
        location:clean(g.location),
        tournament:clean(g.tournament),
        sourceUrl:clean(g.sourceUrl||entry.sourceUrl)
      });
    }
    arr.sort((a,b)=>dateMs(a.date)-dateMs(b.date));
    byTeam.set(key(teamName),arr);
  }
  return byTeam;
}

function latestWinBefore(byTeam,teamKey,beforeDate){
  const arr=byTeam.get(teamKey)||[];
  const before=dateMs(beforeDate);
  let found=null;
  for(const g of arr){
    if(dateMs(g.date)>=before)break;
    if(g.result==='W')found=g;
  }
  return found;
}
function hasLaterGame(byTeam,teamKey,afterDate){
  const arr=byTeam.get(teamKey)||[];
  const after=dateMs(afterDate);
  return arr.some(g=>dateMs(g.date)>after);
}
function playoffTagged(g){return /state\s+tournament/i.test(clean(g?.tournament))}

function chooseRoundCandidates(byTeam,current,cutoff,depth){
  const currentSet=new Set(current);
  const candidates=[];
  for(const teamKey of current){
    const g=latestWinBefore(byTeam,teamKey,cutoff);
    if(!g)continue;
    if(g.opponentState&&g.opponentState!=='UT'&&g.opponentState!=='UTAH')continue;
    if(currentSet.has(g.opponentKey))continue;
    const gap=(dateMs(cutoff)-dateMs(g.date))/86400000;
    if(gap<0||gap>11)continue;
    candidates.push(g);
  }
  if(!candidates.length)return[];

  const dates=[...new Set(candidates.map(g=>g.date))].sort((a,b)=>dateMs(b)-dateMs(a));
  let best=[];
  for(const anchor of dates){
    const cluster=candidates.filter(g=>dayDiff(g.date,anchor)<=1);
    if(cluster.length>best.length||(cluster.length===best.length&&dateMs(anchor)>dateMs(best[0]?.date||'')))best=cluster;
  }
  const required=depth===1?2:Math.max(2,Math.ceil(current.length*.40));
  if(best.length<required)return[];

  const seen=new Set(),out=[];
  for(const g of best){
    const id=[g.date,[g.teamKey,g.opponentKey].sort().join('|')].join('|');
    if(seen.has(id))continue;
    seen.add(id);out.push(g);
  }
  return out;
}

function inferTournament(byTeam,title){
  const champKey=key(title.champion);
  const champGames=byTeam.get(champKey)||[];
  let final=null;
  const tagged=champGames.filter(g=>g.result==='W'&&playoffTagged(g));
  if(tagged.length)final=tagged[tagged.length-1];
  else final=champGames.filter(g=>g.result==='W').slice(-1)[0]||null;

  if(!final){
    const reverse=[];
    for(const arr of byTeam.values()){
      for(const g of arr){
        if(g.opponentKey===champKey&&g.result==='L')reverse.push(g);
      }
    }
    reverse.sort((a,b)=>dateMs(a.date)-dateMs(b.date));
    const g=reverse.slice(-1)[0]||null;
    if(g){
      final={
        team:display(title.champion),teamKey:champKey,
        opponent:display(g.team),opponentKey:g.teamKey,
        opponentState:'UT',date:g.date,
        teamScore:g.opponentScore,opponentScore:g.teamScore,
        result:'W',
        location:g.location==='Home'?'Away':g.location==='Away'?'Home':g.location,
        tournament:g.tournament,sourceUrl:g.sourceUrl
      };
    }
  }
  if(!final)return{...title,resolved:false,reason:'champion final game missing',rounds:[],games:[]};

  const finalGame={
    round:'Final',depth:0,date:final.date,
    winner:display(title.champion),winnerKey:champKey,
    loser:display(final.opponent),loserKey:final.opponentKey,
    winnerScore:final.teamScore,loserScore:final.opponentScore,
    location:final.location,sourceUrl:final.sourceUrl
  };
  const rounds=[{round:'Final',depth:0,dates:[final.date],games:[finalGame]}];
  const allGames=[finalGame];
  let current=[champKey,final.opponentKey];
  let cutoff=final.date;

  for(let depth=1;depth<=5;depth++){
    const selected=chooseRoundCandidates(byTeam,current,cutoff,depth);
    if(!selected.length)break;
    const round=roundName(depth);
    const roundGames=selected.map(g=>({
      round,depth,date:g.date,
      winner:display(g.team),winnerKey:g.teamKey,
      loser:display(g.opponent),loserKey:g.opponentKey,
      winnerScore:g.teamScore,loserScore:g.opponentScore,
      location:g.location,sourceUrl:g.sourceUrl
    }));
    rounds.push({round,depth,dates:[...new Set(roundGames.map(g=>g.date))].sort(),games:roundGames});
    allGames.push(...roundGames);
    const next=new Set();
    for(const g of roundGames){next.add(g.winnerKey);next.add(g.loserKey);}
    current=[...next];
    cutoff=roundGames.map(g=>g.date).sort()[0];
  }

  return{
    ...title,resolved:true,
    runnerUp:finalGame.loser,
    championshipScore:finalGame.winnerScore+'-'+finalGame.loserScore,
    finalDate:finalGame.date,
    rounds,
    games:allGames
  };
}

const tournaments=[];
const teamSeasonRows=new Map();
const finals=[];
const report={resolved:0,unresolved:[],roundCounts:{}};

function getTeamSeason(teamKey,teamName,season,year,classification){
  const id=teamKey+'|'+season;
  let row=teamSeasonRows.get(id);
  if(!row){
    row={team:display(teamName),teamKey,season,year,classification,wins:0,losses:0,games:[],finish:'State Tournament',finalFour:false,titleGame:false,champion:false,runnerUp:false};
    teamSeasonRows.set(id,row);
  }
  return row;
}

for(const season of SEASONS){
  const year=Number('20'+season.slice(-2));
  const titles=titlesByYear.get(year)||[];
  const payload=read('boys-basketball-games-'+season+'.json');
  const byTeam=buildSeasonIndex(payload,season);
  for(const title of titles){
    const tournament=inferTournament(byTeam,title);
    tournaments.push({...tournament,season});
    if(!tournament.resolved){
      report.unresolved.push({season,...title,reason:tournament.reason});
      continue;
    }
    report.resolved++;
    report.roundCounts[title.classification]=(report.roundCounts[title.classification]||0)+tournament.rounds.length;
    finals.push({
      season,year,classification:title.classification,
      champion:tournament.champion,runnerUp:tournament.runnerUp,
      championScore:Number(tournament.games[0].winnerScore),
      runnerUpScore:Number(tournament.games[0].loserScore),
      date:tournament.finalDate,
      sourceUrl:tournament.games[0].sourceUrl
    });

    for(const game of tournament.games){
      const winner=getTeamSeason(game.winnerKey,game.winner,season,year,title.classification);
      winner.wins++;
      winner.games.push({...game,result:'W',teamScore:game.winnerScore,opponentScore:game.loserScore,opponent:game.loser});
      const loser=getTeamSeason(game.loserKey,game.loser,season,year,title.classification);
      loser.losses++;
      loser.games.push({...game,result:'L',teamScore:game.loserScore,opponentScore:game.winnerScore,opponent:game.winner});
      const loserFinish=game.round==='Final'?'Runner-Up':game.round;
      loser.finish=betterFinish(loser.finish,loserFinish);
      if(['Final','Semifinal'].includes(game.round)){winner.finalFour=true;loser.finalFour=true;}
      if(game.round==='Final'){winner.titleGame=true;loser.titleGame=true;winner.champion=true;loser.runnerUp=true;winner.finish='Champion';loser.finish='Runner-Up';}
      else winner.finish=betterFinish(winner.finish,game.round);
    }
  }
}

for(const row of teamSeasonRows.values()){
  row.games.sort((a,b)=>dateMs(a.date)-dateMs(b.date)||b.depth-a.depth);
}

const rowsByTeam=new Map();
for(const row of teamSeasonRows.values()){
  const arr=rowsByTeam.get(row.teamKey)||[];
  arr.push(row);rowsByTeam.set(row.teamKey,arr);
}

fs.mkdirSync(OUT_DIR,{recursive:true});
const updatedAt=new Date().toISOString();
const index={schemaVersion:1,updatedAt,coverage:{start:'2002-03',end:'2025-26',championshipYears:'2003-2026'},source:'RUS completed game history plus UHSAA championship records; state brackets reconstructed from elimination paths',teams:{}};

for(const team of directory){
  const teamKey=key(team.team);
  const rows=(rowsByTeam.get(teamKey)||[]).sort((a,b)=>b.season.localeCompare(a.season));
  const wins=rows.reduce((s,r)=>s+r.wins,0),losses=rows.reduce((s,r)=>s+r.losses,0);
  const appearances=rows.length;
  const finalFours=rows.filter(r=>r.finalFour).length;
  const titleGameAppearances=rows.filter(r=>r.titleGame).length;
  const championships=rows.filter(r=>r.champion).length;
  const runnerUps=rows.filter(r=>r.runnerUp).length;
  let deepest='—';
  for(const row of rows)deepest=deepest==='—'?row.finish:betterFinish(deepest,row.finish);
  const payload={
    schemaVersion:1,updatedAt,coverage:index.coverage,
    team:team.team,teamKey,
    summary:{appearances,wins,losses,record:wins+'-'+losses,finalFours,titleGameAppearances,championships,runnerUps,deepestFinish:deepest},
    seasons:rows
  };
  const file=OUT_DIR+'/'+safeFile(team.team)+'.json';
  fs.writeFileSync(file,JSON.stringify(payload,null,2)+'\n');
  index.teams[teamKey]={team:team.team,file,appearances,record:payload.summary.record,deepestFinish:deepest};
}
fs.writeFileSync(INDEX_FILE,JSON.stringify(index,null,2)+'\n');

const finalsTeams={};
for(const f of finals){
  for(const role of ['champion','runnerUp']){
    const team=f[role],teamKey=key(team);
    const p=finalsTeams[teamKey]||(finalsTeams[teamKey]={team:display(team),appearances:0,championships:0,runnerUps:0,finals:[]});
    p.appearances++;
    if(role==='champion')p.championships++;else p.runnerUps++;
    p.finals.push({
      season:f.season,year:f.year,classification:f.classification,
      result:role==='champion'?'Champion':'Runner-Up',
      opponent:role==='champion'?f.runnerUp:f.champion,
      teamScore:role==='champion'?f.championScore:f.runnerUpScore,
      opponentScore:role==='champion'?f.runnerUpScore:f.championScore,
      date:f.date,sourceUrl:f.sourceUrl
    });
  }
}
for(const p of Object.values(finalsTeams))p.finals.sort((a,b)=>b.year-a.year);
const finalsPayload={schemaVersion:1,updatedAt,coverage:index.coverage,source:'Verified championship games from RUS season results matched to UHSAA champions',summary:{finals:finals.length,programs:Object.keys(finalsTeams).length,resolvedTournaments:report.resolved,unresolvedTournaments:report.unresolved.length},finals:finals.sort((a,b)=>b.year-a.year||a.classification.localeCompare(b.classification)),teams:finalsTeams};
fs.writeFileSync(FINALS_FILE,JSON.stringify(finalsPayload,null,2)+'\n');
fs.writeFileSync(OUT_DIR+'/build-report.json',JSON.stringify(report,null,2)+'\n');

console.log(JSON.stringify({teams:Object.keys(index.teams).length,finals:finals.length,resolved:report.resolved,unresolved:report.unresolved.length},null,2));
if(report.unresolved.length)console.log('Unresolved:',JSON.stringify(report.unresolved,null,2));

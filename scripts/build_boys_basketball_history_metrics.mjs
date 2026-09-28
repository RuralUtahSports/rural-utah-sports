import fs from 'node:fs';

const SEASONS=['2002-03','2003-04','2004-05','2005-06','2006-07','2007-08','2008-09','2009-10','2010-11','2011-12','2012-13','2013-14','2014-15','2015-16','2016-17','2017-18','2018-19','2019-20','2020-21','2021-22','2022-23','2023-24','2024-25','2025-26'];
const OUT='boys-basketball-history-metrics';
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const ALIASES={
  UTAHMILITARYACADEMYCAMPWILLIAMS:'UMALEHI',UMACAMPWILLIAMS:'UMALEHI',
  UTAHMILITARYACADEMYHILLFIELD:'UMAHILLFIELD',STJOSEPH:'SAINTJOSEPH',
  GRAND:'GRANDCOUNTY',MERITPREPARATORYACADEMY:'MERITPREP',
  AMERICANLEADERSHIPACADEMY:'ALA',AMERICANPREPARATORYACADEMYWESTVALLEY:'AMERICANPREPWV',
  MAESERPREPARATORYACADEMY:'MAESERPREPACADEMY',JUANDIEGOCATHOLIC:'JUANDIEGO',
  JUDGEMEMORIALCATHOLIC:'JUDGEMEMORIAL',UTAHSCHOOLFORTHEDEAFBLIND:'USDB',
  CEDARCITY:'CEDAR',GUNNISON:'GUNNISONVALLEY',LAYTONCHRISTIAN:'LAYTONCHRISTIANACADEMY',
  WASATCHACAD:'WASATCHACADEMY'
};
const key=v=>ALIASES[norm(v)]||norm(v);
const safe=v=>key(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const dateMs=v=>{const t=Date.parse(clean(v).includes('T')?clean(v):clean(v)+'T12:00:00');return Number.isFinite(t)?t:0};
const valid=g=>clean(g?.opponent)&&Number.isFinite(Number(g?.teamScore))&&Number.isFinite(Number(g?.opponentScore))&&!(Number(g.teamScore)===0&&Number(g.opponentScore)===0);

const teams=JSON.parse(fs.readFileSync('boys-basketball-teams.json','utf8'));
const seasonHistory=JSON.parse(fs.readFileSync('boys-basketball-season-history-2002-26.json','utf8'));
const champ=JSON.parse(fs.readFileSync('boys-basketball-championships.json','utf8'));
const finals=JSON.parse(fs.readFileSync('boys-basketball-finals-2003-2026.json','utf8'));

const display=new Map(teams.map(t=>[key(t.team),t.team]));
const allGames=new Map();
for(const season of SEASONS){
  const data=JSON.parse(fs.readFileSync('boys-basketball-games-'+season+'.json','utf8'));
  for(const [name,row] of Object.entries(data.teams||{})){
    const k=key(name);
    const arr=allGames.get(k)||[];
    for(const g of row.games||[]){
      if(!valid(g))continue;
      const ts=Number(g.teamScore),os=Number(g.opponentScore);
      arr.push({
        season,date:clean(g.date),opponent:display.get(key(g.opponent))||clean(g.opponent),
        opponentState:clean(g.opponentState).toUpperCase(),
        result:ts>os?'W':ts<os?'L':'T',teamScore:ts,opponentScore:os,
        margin:ts-os,location:clean(g.location),sourceUrl:clean(g.sourceUrl||row.sourceUrl)
      });
    }
    allGames.set(k,arr);
  }
}
for(const arr of allGames.values())arr.sort((a,b)=>dateMs(a.date)-dateMs(b.date)||a.season.localeCompare(b.season));

const playoffs=new Map();
for(const t of teams){
  const p='boys-basketball-playoffs/'+safe(t.team)+'.json';
  if(fs.existsSync(p))playoffs.set(key(t.team),JSON.parse(fs.readFileSync(p,'utf8')));
}
const champByKey=new Map(Object.entries(champ.teams||{}).map(([name,v])=>[key(name),v]));
const finalsByKey=new Map(Object.values(finals.teams||{}).map(v=>[key(v.team),v]));

function gameLabel(g){return g?{season:g.season,date:g.date,opponent:g.opponent,teamScore:g.teamScore,opponentScore:g.opponentScore,margin:g.margin,location:g.location}:null}
function best(arr,fn,cmp){let out=null;for(const x of arr){if(!out||cmp(fn(x),fn(out))>0)out=x;}return out}
function longestStreak(games,type){
  let bestCount=0,bestStart=null,bestEnd=null,count=0,start=null;
  for(const g of games){
    if(g.result===type){if(!count)start=g;count++;if(count>bestCount){bestCount=count;bestStart=start;bestEnd=g;}}
    else{count=0;start=null;}
  }
  return {count:bestCount,start:gameLabel(bestStart),end:gameLabel(bestEnd)};
}
function historyRows(teamName){
  const direct=seasonHistory.teams?.[teamName];
  if(Array.isArray(direct))return direct;
  if(Array.isArray(direct?.seasons))return direct.seasons;
  const match=Object.entries(seasonHistory.teams||{}).find(([name])=>key(name)===key(teamName));
  const v=match?.[1];
  return Array.isArray(v)?v:Array.isArray(v?.seasons)?v.seasons:[];
}
function playoffBySeason(teamKey){
  const p=playoffs.get(teamKey);
  return new Map((p?.seasons||[]).map(r=>[r.season,r]));
}
const finishRank={'Champion':8,'Runner-Up':7,'Semifinal':6,'Quarterfinal':5,'Round of 16':4,'Round of 32':3,'Round of 64':2,'State Tournament':1,'—':0};
function seasonCmp(a,b){
  return (finishRank[a.postseasonFinish]||0)-(finishRank[b.postseasonFinish]||0)
    ||a.winPct-b.winPct||a.wins-b.wins||a.avgMargin-b.avgMargin||a.ppg-b.ppg;
}

fs.mkdirSync(OUT,{recursive:true});
const updatedAt=new Date().toISOString();
const index={schemaVersion:1,updatedAt,coverage:{start:'2002-03',end:'2025-26'},teams:{}};

for(const team of teams){
  const k=key(team.team),games=allGames.get(k)||[];
  const wins=games.filter(g=>g.result==='W'),losses=games.filter(g=>g.result==='L');
  const highest=best(games,g=>g.teamScore,(a,b)=>a-b);
  const lowestAllowed=best(games,g=>-g.opponentScore,(a,b)=>a-b);
  const biggestWin=best(wins,g=>g.margin,(a,b)=>a-b);
  const biggestLoss=best(losses,g=>-g.margin,(a,b)=>a-b);
  const combined=best(games,g=>g.teamScore+g.opponentScore,(a,b)=>a-b);
  const winStreak=longestStreak(games,'W');
  const lossStreak=longestStreak(games,'L');
  const ph=playoffBySeason(k);
  const seasons=historyRows(team.team).map(r=>{
    const season=clean(r.season||r.label||r.year);
    const p=ph.get(season);
    const winPct=Number(r.winPct??(Number(r.games)?(Number(r.wins)+.5*Number(r.ties||0))/Number(r.games):0));
    return {
      season,wins:Number(r.wins||0),losses:Number(r.losses||0),ties:Number(r.ties||0),
      games:Number(r.games||0),winPct,pointsFor:Number(r.pointsFor||0),pointsAgainst:Number(r.pointsAgainst||0),
      ppg:Number(r.ppg||0),papg:Number(r.papg||0),avgMargin:Number(r.avgMargin||0),
      postseasonFinish:p?.finish||'—',postseasonRecord:p?Number(p.wins||0)+'-'+Number(p.losses||0):'—',
      finalFour:!!p?.finalFour,titleGame:!!p?.titleGame,champion:!!p?.champion
    };
  });
  const greatest=[...seasons].sort((a,b)=>seasonCmp(b,a)||b.season.localeCompare(a.season)).map((r,i)=>({...r,rank:i+1}));
  const mostWins=best(seasons,r=>r.wins,(a,b)=>a-b);
  const highestPpg=best(seasons,r=>r.ppg,(a,b)=>a-b);
  const lowestPapg=best(seasons,r=>-r.papg,(a,b)=>a-b);
  const bestWinPct=best(seasons,r=>r.winPct,(a,b)=>a-b);
  const bestMargin=best(seasons,r=>r.avgMargin,(a,b)=>a-b);
  const titles=champByKey.get(k);
  const verifiedFinals=finalsByKey.get(k);
  const payload={
    schemaVersion:1,updatedAt,coverage:index.coverage,team:team.team,teamKey:k,
    records:{
      highestPoints:gameLabel(highest),lowestPointsAllowed:gameLabel(lowestAllowed),
      biggestWin:gameLabel(biggestWin),biggestLoss:gameLabel(biggestLoss),highestCombinedScore:gameLabel(combined),
      longestWinStreak:winStreak,longestLossStreak:lossStreak,
      mostWinsSeason:mostWins?{season:mostWins.season,value:mostWins.wins}:null,
      bestWinPctSeason:bestWinPct?{season:bestWinPct.season,value:bestWinPct.winPct}:null,
      highestPpgSeason:highestPpg?{season:highestPpg.season,value:highestPpg.ppg}:null,
      lowestPapgSeason:lowestPapg?{season:lowestPapg.season,value:lowestPapg.papg}:null,
      bestAvgMarginSeason:bestMargin?{season:bestMargin.season,value:bestMargin.avgMargin}:null
    },
    greatestSeasons:greatest,
    championships:{
      allTimeTitles:Number(titles?.titles||0),
      allTimeTitleYears:titles?.years||[],
      verifiedTitleGames:Number(verifiedFinals?.appearances||0),
      verifiedRunnerUps:Number(verifiedFinals?.runnerUps||0)
    }
  };
  const file=OUT+'/'+safe(team.team)+'.json';
  fs.writeFileSync(file,JSON.stringify(payload,null,2)+'\n');
  index.teams[k]={team:team.team,file,recordedGames:games.length,seasons:seasons.length};
}
fs.writeFileSync(OUT+'/index.json',JSON.stringify(index,null,2)+'\n');
console.log('Built records/greatest seasons for',Object.keys(index.teams).length,'teams');

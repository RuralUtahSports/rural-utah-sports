import fs from 'node:fs';

const INPUT='deseret-kicking-game-stats-2026.json';
const GAMES='player-game-stats-2026.json';
const ROSTERS='deseret-rosters-stats-2026.json';
const WEEKLY='weekly-simulation.json';
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const slug=v=>clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const aliases={CEDAR:'CEDARCITY',CEDARCITY:'CEDARCITY',GRANDCOUNTY:'GRAND',GRAND:'GRAND',
  AMERICANLEADERSHIPACADEMY:'ALA',AMERICANLEADERSHIP:'ALA',
  JUANDIEGOCATHOLIC:'JUANDIEGO',JUDGEMEMORIALCATHOLIC:'JUDGEMEMORIAL',
  GUNNISONVALLEY:'GUNNISON',MONUMENTVAL:'MONUMENTVALLEY'};
const canon=v=>aliases[norm(v)]||norm(v);
const last=v=>norm(clean(v).split(/\s+/).at(-1));
const nameMatches=(a,b)=>last(a)&&last(a)===last(b)&&
  clean(a).charAt(0).toUpperCase()===clean(b).charAt(0).toUpperCase();
const date=v=>clean(v).slice(0,10);
const haveScore=v=>v!==undefined&&v!==null&&v!==''&&Number.isFinite(Number(v));
const kickingCategory=v=>['KICKING','PATSANDFIELDGOALS','FIELDGOALS'].includes(norm(v));
const fieldKey=v=>norm(v)==='POINTS'?'PTS':norm(v);
const validSource=v=>/^https:\/\/sports\.deseret\.com\/high-school\/football\/game\/2026-10-1[45]\//.test(v);

function playerMatch(team,game,entry,rosters){
  const roster=Object.entries(rosters?.teams||{}).find(([n])=>canon(n)===canon(team))?.[1];
  const candidates=[...(roster?.roster||[]),...(roster?.stats||[]).flatMap(s=>s.rows||[])];
  const eligible=p=>clean(p.number)===clean(entry.number)&&nameMatches(p.name,entry.name);
  const matched=candidates.find(eligible)||game.players?.find(eligible);
  return matched?{playerId:matched.playerId,number:matched.number,name:matched.name}:{
    playerId:`${slug(team)}-${slug(entry.number)}-${slug(entry.name)}`,
    number:entry.number,name:entry.name
  };
}
function scheduleFor(weekly,entry){
  return (weekly?.games||[]).find(g=>date(g.date)===date(entry.date)&&(
    (canon(g.awayTeam)===canon(entry.team)&&canon(g.homeTeam)===canon(entry.opponent))||
    (canon(g.homeTeam)===canon(entry.team)&&canon(g.awayTeam)===canon(entry.opponent))));
}
export function mergeVerifiedDeseretKicking(games,entries,rosters={},weekly={}){
  let entriesApplied=0,gamesCreated=0,playersCreated=0,fieldsApplied=0,fieldsReplaced=0,skipped=0;
  for(const entry of entries){
    if(!entry?.date||!entry.team||!entry.opponent||!entry.name||!entry.number||
      !validSource(entry.sourceUrl)||!['FG','PAT'].some(f=>Number.isInteger(entry[f])&&entry[f]>=0)){
      skipped++;continue;
    }
    const found=Object.keys(games.teams||{}).find(x=>canon(x)===canon(entry.team));
    const key=found||entry.team;
    games.teams||(games.teams={});
    games.teams[key]||(games.teams[key]={team:key,games:[]});
    const team=games.teams[key];
    let game=(team.games||[]).find(g=>date(g.date)===date(entry.date)&&canon(g.opponent)===canon(entry.opponent));
    if(!game){
      const scheduled=scheduleFor(weekly,entry),isAway=scheduled&&canon(scheduled.awayTeam)===canon(entry.team);
      const pair=[canon(entry.team),canon(entry.opponent)].sort().join('|');
      game={gameKey:scheduled?`${date(entry.date)}|${norm(scheduled.awayTeam)}|${norm(scheduled.homeTeam)}`:`${date(entry.date)}|${pair}`,
        date:date(entry.date),opponent:entry.opponent,location:scheduled?(isAway?'Away':'Home'):'',
        status:'Final',final:true,players:[],scoringPlays:[],manualPartialStats:true,url:entry.sourceUrl};
      if(scheduled&&haveScore(scheduled.actualHome)&&haveScore(scheduled.actualAway)){
        game.teamScore=Number(isAway?scheduled.actualAway:scheduled.actualHome);
        game.opponentScore=Number(isAway?scheduled.actualHome:scheduled.actualAway);
      }
      team.games.push(game);gamesCreated++;
    }
    game.players||(game.players=[]);
    const person=playerMatch(key,game,entry,rosters);
    let player=game.players.find(p=>person.playerId&&p.playerId===person.playerId)||
      game.players.find(p=>clean(p.number)===clean(entry.number)&&nameMatches(p.name,entry.name));
    if(!player){
      player={...person,position:'',rosterMatched:true,statLines:[],scoringPlays:[]};
      game.players.push(player);playersCreated++;
    }
    player.statLines||(player.statLines=[]);
    let line=player.statLines.find(l=>kickingCategory(l.category));
    if(!line){line={category:'Kicking',values:{},statSources:{}};player.statLines.push(line)}
    line.category='Kicking';line.values||(line.values={});line.statSources||(line.statSources={});
    let applied=false;
    for(const field of ['FG','PAT']){
      if(!Number.isInteger(entry[field])||entry[field]<0)continue;
      const target=Object.keys(line.values).find(x=>fieldKey(x)===field)||field;
      const existing=line.values[target],value=String(entry[field]);
      if(haveScore(existing)&&String(existing)!==value)fieldsReplaced++;
      if(String(existing)!==value){line.values[target]=value;fieldsApplied++}
      line.statSources[target]='Deseret game box score: '+entry.sourceUrl;
      applied=true;
    }
    if(applied){entriesApplied++;game.deseretKickingVerified=true}
  }
  for(const t of Object.values(games.teams||{}))t.games?.sort((a,b)=>date(a.date).localeCompare(date(b.date)));
  return{entriesApplied,gamesCreated,playersCreated,fieldsApplied,fieldsReplaced,skipped};
}
function selfTest(){
  const game={date:'2026-10-15',opponent:'LOGAN',players:[{playerId:'p1',name:'Seth Turner',number:'47',statLines:[{category:'PATs and Field Goals',values:{}}]}]};
  const games={teams:{MORGAN:{team:'MORGAN',games:[game]}}};
  const rows=[{date:'2026-10-15',team:'MORGAN',opponent:'LOGAN',number:'47',name:'Seth Turner',PAT:2,sourceUrl:'https://sports.deseret.com/high-school/football/game/2026-10-15/morgan-football-vs-logan-football/273294'}];
  const first=mergeVerifiedDeseretKicking(games,rows),second=mergeVerifiedDeseretKicking(games,rows);
  if(first.entriesApplied!==1||first.fieldsApplied!==1||second.fieldsApplied!==0||
     game.players.length!==1||game.players[0].statLines.length!==1||
     game.players[0].statLines[0].category!=='Kicking'||game.players[0].statLines[0].values.PAT!=='2')throw Error('Verified Deseret kicking merge self-test failed');
  console.log('Verified Deseret kicking merge self-test passed.');
}
if(process.argv.includes('--self-test')){selfTest();process.exit(0)}
if(!fs.existsSync(INPUT)||!fs.existsSync(GAMES)){console.log('Verified kicking source or game logs missing; skipping');process.exit(0)}
const input=JSON.parse(fs.readFileSync(INPUT,'utf8'));
const games=JSON.parse(fs.readFileSync(GAMES,'utf8'));
const rosters=fs.existsSync(ROSTERS)?JSON.parse(fs.readFileSync(ROSTERS,'utf8')):{};
const weekly=fs.existsSync(WEEKLY)?JSON.parse(fs.readFileSync(WEEKLY,'utf8')):{};
if(input.season!==2026)throw Error('Unexpected verified kicking season');
const summary=mergeVerifiedDeseretKicking(games,input.entries||[],rosters,weekly);
games.summary={...(games.summary||{}),deseretKickingSupplement:summary};
games.updatedAt=new Date().toISOString();
fs.writeFileSync(GAMES,JSON.stringify(games,null,2)+'\n');
console.log('Verified Deseret week-10 kicking: '+JSON.stringify(summary));

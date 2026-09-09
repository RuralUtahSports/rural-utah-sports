import fs from 'node:fs';

const FILE='deseret-rosters-stats-2026.json';
const CACHE='maxpreps-stats-fallback-2026.json';
const GAME_CACHE='maxpreps-player-game-stats-2026.json';
const SEASON_LABEL='26-27';
const clean=v=>String(v??'').trim();
const compact=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const slug=v=>clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const decode=s=>String(s||'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
const text=html=>decode(String(html||'')).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const nonEmpty=v=>v!==null&&v!==undefined&&clean(v)!=='';
const number=v=>{const s=clean(v).replace(/,/g,'');return /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(s)?s:''};

const NAME_ALIASES={
  ALA:['American Leadership Academy','American Leadership'],
  CEDAR:['Cedar City','Cedar'],
  GRAND:['Grand County','Grand'],
  GUNNISON:['Gunnison Valley','Gunnison'],
  'JUAN DIEGO':['Juan Diego Catholic','Juan Diego'],
  'LAYTON CHRISTIAN':['Layton Christian Academy','Layton Christian'],
  'MAPLE MOUNTAIN':['Maple Mountain'],
  'MONUMENT VALLEY':['Monument Valley'],
  'ST. JOSEPH':['Saint Joseph','St. Joseph','St Joseph'],
  'SAINT JOSEPH':['Saint Joseph','St. Joseph','St Joseph'],
  'UMA - CAMP WILLIAMS':['Utah Military Academy - Camp Williams','Utah Military Camp Williams'],
  'UMA LEHI':['Utah Military Academy - Camp Williams','Utah Military Camp Williams']
};
const aliases=team=>[team,...(NAME_ALIASES[clean(team).toUpperCase()]||[])].map(compact);
const sameSchool=(team,maxprepsName)=>aliases(team).includes(compact(maxprepsName));

async function fetchHtml(url){
  const response=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; RuralUtahSports/1.0; +https://ruralutahsports.github.io/)'},redirect:'follow',signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}
function jsonValueEnd(source,start){
  let depth=0,quoted=false,escaped=false;
  for(let i=start;i<source.length;i++){
    const ch=source[i];
    if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;continue}
    if(ch==='"'){quoted=true;continue}
    if(ch==='{'||ch==='[')depth++;
    else if(ch==='}'||ch===']'){depth--;if(depth===0)return i+1}
  }
  return -1;
}
function nextFlightChunks(html){
  const source=String(html||''),marker='self.__next_f.push([1,',chunks=[];let cursor=0;
  while(true){
    const at=source.indexOf(marker,cursor);if(at<0)break;
    let start=at+marker.length;if(source[start]!=='"'){cursor=start;continue}
    let escaped=false,end=-1;
    for(let i=start+1;i<source.length;i++){
      const ch=source[i];
      if(escaped){escaped=false;continue}
      if(ch==='\\'){escaped=true;continue}
      if(ch==='"'){end=i;break}
    }
    if(end<0)break;
    try{chunks.push(JSON.parse(source.slice(start,end+1)))}catch{}
    cursor=end+1;
  }
  return chunks;
}
function nextData(html){
  const match=String(html).match(/<script id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if(match){try{return JSON.parse(match[1])}catch{}}
  const streamed=nextFlightChunks(html).join('\n'),marker='"pageProps":',at=streamed.indexOf(marker);
  if(at<0)return null;
  const start=streamed.indexOf('{',at+marker.length),end=start>=0?jsonValueEnd(streamed,start):-1;
  if(start<0||end<0)return null;
  try{return{props:{pageProps:JSON.parse(streamed.slice(start,end))}}}catch{return null}
}
function candidateSchoolUrls(html){
  const found=new Set();
  for(const match of String(html).matchAll(/https:\/\/www\.maxpreps\.com\/ut\/[^"'<>?]+\//gi)){
    const url=match[0].replace(/\\u002F/gi,'/').replace(/\\\//g,'/');
    const parts=new URL(url).pathname.split('/').filter(Boolean);
    if(parts.length===3)found.add(`https://www.maxpreps.com/${parts.join('/')}/`);
  }
  return [...found];
}
async function discover(team){
  const query=encodeURIComponent(`${team} Utah`),search=await fetchHtml(`https://www.maxpreps.com/search/?q=${query}`);
  for(const schoolUrl of candidateSchoolUrls(search)){
    const statsUrl=`${schoolUrl}football/stats/`;
    try{
      const html=await fetchHtml(statsUrl),page=nextData(html)?.props?.pageProps,context=page?.teamContext?.data;
      if(context?.stateCode==='UT'&&context?.sport==='Football'&&context?.year===SEASON_LABEL&&sameSchool(team,context?.schoolName)){
        const printUrl=(page.sharedStatsLinks||[]).find(x=>x.displayText==='Print')?.canonicalUrl;
        if(printUrl)return{statsUrl,printUrl,html,lastUpdated:page.playerStatLeadersData?.lastUpdated?.timeStamp||''};
      }
    }catch{}
  }
  return null;
}
async function loadTeamPage(team){
  const statsUrl=clean(team.maxprepsStatsUrl),printUrl=clean(team.maxprepsPrintUrl);
  if(statsUrl&&printUrl){
    try{
      const html=await fetchHtml(statsUrl),page=nextData(html)?.props?.pageProps,context=page?.teamContext?.data;
      if(context?.stateCode==='UT'&&context?.sport==='Football'&&context?.year===SEASON_LABEL&&sameSchool(team.team,context?.schoolName))return{statsUrl,printUrl,html,lastUpdated:page.playerStatLeadersData?.lastUpdated?.timeStamp||''};
    }catch{}
  }
  return discover(team.team);
}

function cells(row){
  const out=[];
  for(const match of String(row).matchAll(/<(th|td)\b([^>]*)>([\s\S]*?)<\/\1>/gi)){
    const title=match[3].match(/<a\b[^>]*\btitle=["']([^"']+)["']/i)?.[1];
    const href=match[3].match(/<a\b[^>]*\bhref=["']([^"']+)["']/i)?.[1];
    out.push({value:text(match[3]),title:title?decode(title):'',href:href?decode(href):''});
  }
  return out;
}
function sectionBefore(html,index){
  const before=String(html).slice(Math.max(0,index-600),index),matches=[...before.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)];
  return text(matches.at(-1)?.[1]||'');
}
const MAP={
  Passing:{category:'Passing',fields:{C:'__COMP',Att:'__ATT',Yds:'YARDS',TD:'TD',Int:'Int'}},
  Rushing:{category:'Rushing',fields:{Car:'CARRIES',Yds:'YARDS',TD:'TD'}},
  Receiving:{category:'Receiving',fields:{Rec:'RECEPTIONS',Yds:'YARDS',TD:'TD'}},
  Tackles:{category:'Defense/Special Teams',fields:{'Tot Tckls':'TACKLES'}},
  Sacks:{category:'Defense/Special Teams',fields:{Sacks:'SACKS'}},
  'Defensive Statistics':{category:'Defense/Special Teams',fields:{Int:'PASS INT.','Int Yds':'PASS INT YDS',Avg:'PASS INT AVG',PD:'PD','Fmb Rec':'FUM REC','FR Yds':'FR YDS',Caus:'CAUSED FUM'}},
  Touchdowns:{category:'Defense/Special Teams',fields:{'FR TD':'DEFENSE TD','IR TD':'DEFENSE TD','PR TD':'RETURN TD','KOR TD':'RETURN TD'}},
  'PATs and Field Goals':{category:'Kicking',fields:{PAT:'PAT',FG:'FG','Tot Pts':'Pts'}}
};
function parsePrintStats(html){
  const parsed=[];
  for(const match of String(html).matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)){
    const title=sectionBefore(html,match.index||0),config=MAP[title];
    if(!config)continue;
    const headerHtml=match[1].match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i)?.[1]||match[1],headerRow=[...headerHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].at(-1)?.[1]||'',headers=cells(headerRow).map(x=>x.value);
    const body=match[1].match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1]||'';
    for(const rowMatch of body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
      const row=cells(rowMatch[1]);if(row.length<3)continue;
      const no=clean(row[0]?.value),name=clean(row[1]?.title||row[1]?.value.replace(/\s*\([^)]*\)\s*$/,''));if(!name)continue;
      const values={};let comp='',att='';
      for(let i=2;i<Math.min(headers.length,row.length);i++){
        const target=config.fields[headers[i]],value=number(row[i]?.value);if(!target||!value)continue;
        if(target==='__COMP')comp=value;else if(target==='__ATT')att=value;else if(nonEmpty(values[target])&&target.endsWith('TD'))values[target]=String(Number(values[target])+Number(value));else values[target]=value;
      }
      if(comp&&att)values['COMP-ATT']=`${comp}-${att}`;
      if(Object.keys(values).length)parsed.push({category:config.category,number:no,name,athleteUrl:row[1]?.href||'',values});
    }
  }
  return parsed;
}
const GAME_FIELD_MAP={
  Passing:{PassingComp:'__COMP',PassingAtt:'__ATT',PassingYards:'YARDS',CompletionPercentage:'COMP%',YdsPerCompletion:'YARDS/COMP.',PassingTD:'TD',PassingInt:'Int'},
  Rushing:{RushingNum:'CARRIES',RushingYards:'YARDS',YardsPerCarry:'YARDS/CARRY',RushingTDNum:'TD'},
  Receiving:{ReceivingNum:'RECEPTIONS',ReceivingYards:'YARDS',YardsPerReception:'YARDS/RECEP.',ReceivingTDNum:'TD'},
  Tackles:{TotalTackles:'TACKLES'},
  Sacks:{Sacks:'SACKS'},
  'Defensive Statistics':{Interceptions:'PASS INT.',INTs:'PASS INT.',INT:'PASS INT.',INTYards:'PASS INT YDS',InterceptionYards:'PASS INT YDS',YardsPerINT:'PASS INT AVG',PassesDefensed:'PD',FumbleRecoveries:'FUM REC',FumbleRecoveryYards:'FR YDS',CausedFumbles:'CAUSED FUM'},
  Touchdowns:{FumbleRecoveryTDNum:'DEFENSE TD',InterceptionTDNum:'DEFENSE TD',IntReturnedTDNum:'DEFENSE TD',PuntReturnTDNum:'RETURN TD',PuntReturnedTDNum:'RETURN TD',KickoffReturnTDNum:'RETURN TD',KickoffsReturnedTDNum:'RETURN TD'},
  'PATs and Field Goals':{PATMade:'PAT',FieldGoalsMade:'FG',KickingPoints:'Pts'}
};
const GAME_GROUP_ALIASES={DEFENSIVE:'Defensive Statistics',DEFENSE:'Defensive Statistics',DEFENSIVESTATISTICS:'Defensive Statistics',DEFENSESPECIALTEAMS:'Defensive Statistics'};
const gameGroupName=value=>GAME_GROUP_ALIASES[compact(value)]||clean(value);
function gameField(fieldMap,name){
  const direct=fieldMap[name];if(direct)return direct;
  const key=Object.keys(fieldMap).find(candidate=>compact(candidate)===compact(name));
  return key?fieldMap[key]:'';
}
function parsePlayerGameLogs(html,player){
  const logs=nextData(html)?.props?.pageProps?.statsCardProps?.careerGameLogs?.groups||[],games=new Map();
  for(const group of logs)for(const subgroup of group.subgroups||[]){
    const category=gameGroupName(subgroup.name),fieldMap=GAME_FIELD_MAP[category];if(!fieldMap)continue;
    for(const entry of subgroup.stats||[]){
      const date=clean(entry.stamp).slice(0,10);if(!/^2026-\d{2}-\d{2}$/.test(date))continue;
      const key=date+'|'+compact(entry.opponentSchoolName),game=games.get(key)||{date,opponent:clean(entry.opponentSchoolName),score:clean(entry.score),result:clean(entry.result),url:clean(entry.contestUrl),playerId:player.playerId,number:player.number,name:player.name,statLines:[]};
      let line=game.statLines.find(x=>x.category===category);if(!line){line={category,values:{},statSources:{}};game.statLines.push(line)}
      let comp='',att='';
      for(const stat of entry.stats||[]){const target=gameField(fieldMap,stat.name),value=number(stat.value);if(!target||!value)continue;if(target==='__COMP')comp=value;else if(target==='__ATT')att=value;else line.values[target]=value,line.statSources[target]='MaxPreps'}
      if(comp&&att){line.values['COMP-ATT']=comp+'-'+att;line.statSources['COMP-ATT']='MaxPreps'}
      games.set(key,game);
    }
  }
  return [...games.values()].filter(g=>g.statLines.some(line=>Object.keys(line.values).length));
}
function rosterMatch(team,row){
  const roster=team.roster||[],byName=roster.filter(p=>compact(p.name)===compact(row.name));
  const exact=byName.find(p=>clean(p.number)===clean(row.number));
  if(exact)return exact;
  return byName.length===1?byName[0]:null;
}
function mergeTeam(team,rows,sourceUrl){
  let addedRows=0,filledFields=0,unmatched=0;
  for(const incoming of rows){
    const player=rosterMatch(team,incoming);if(!player){unmatched++;continue}
    let section=(team.stats||[]).find(s=>s.category===incoming.category);
    if(!section){section={category:incoming.category,headers:[],rows:[]};(team.stats||(team.stats=[])).push(section)}
    let row=(section.rows||[]).find(r=>r.playerId===player.playerId)||(section.rows||[]).find(r=>compact(r.name)===compact(player.name)&&clean(r.number)===clean(player.number));
    if(!row){row={playerId:player.playerId,number:player.number,name:player.name,rosterMatched:true,values:{},statSources:{}};(section.rows||(section.rows=[])).push(row);addedRows++}
    for(const [header,value] of Object.entries(incoming.values)){
      if(nonEmpty(row.values?.[header]))continue;
      row.values||(row.values={});row.values[header]=value;row.statSources||(row.statSources={});row.statSources[header]='MaxPreps';
      if(!section.headers.includes(header))section.headers.push(header);filledFields++;
    }
    if(row.statSources&&Object.keys(row.statSources).length===0)delete row.statSources;
  }
  team.maxprepsFallback={sourceUrl,checkedAt:new Date().toISOString(),addedRows,filledFields,unmatchedRows:unmatched};
  return{addedRows,filledFields,unmatched};
}

function selfTest(){
  const fixture='<h3>Passing</h3><table><thead><tr><th>#</th><th>Athlete Name</th><th>GP</th><th>C</th><th>Att</th><th>Yds</th><th>TD</th><th>Int</th></tr></thead><tbody><tr><td>11</td><th><a title="Jaxon Hunt">J. Hunt</a> (Sr)</th><td>3</td><td>78</td><td>128</td><td>1049</td><td>10</td><td>4</td></tr></tbody></table>';
  const rows=parsePrintStats(fixture);if(rows[0]?.values?.['COMP-ATT']!=='78-128'||rows[0]?.values?.YARDS!=='1049')throw new Error('MaxPreps parser self-test failed');
  const team={team:'MOUNTAIN RIDGE',roster:[{playerId:'hunt',number:'11',name:'Jaxon Hunt'}],stats:[{category:'Passing',headers:['TD'],rows:[{playerId:'hunt',number:'11',name:'Jaxon Hunt',values:{TD:'10'}}]}]};
  const result=mergeTeam(team,rows,'fixture');if(result.filledFields!==3||team.stats[0].rows[0].values.TD!=='10'||team.stats[0].rows[0].values.YARDS!=='1049')throw new Error('MaxPreps merge self-test failed');
  const flightLogs={groups:[{name:'Defense',subgroups:[{name:'Defensive Statistics',stats:[{stamp:'2026-08-28T19:00:00',opponentSchoolName:'Kimberly',score:'48-7',result:'W',contestUrl:'fixture',stats:[{name:'INTs',value:'2'},{name:'INTYards',value:'64'},{name:'YardsPerINT',value:'32.0'},{name:'PassesDefensed',value:'1'}]}]},{name:'Touchdowns',stats:[{stamp:'2026-08-28T19:00:00',opponentSchoolName:'Kimberly',score:'48-7',result:'W',contestUrl:'fixture',stats:[{name:'IntReturnedTDNum',value:'1'}]}]}]}]};
  const flightPayload='6:'+JSON.stringify([String.fromCharCode(36),String.fromCharCode(36)+'L1',null,{pageProps:{statsCardProps:{careerGameLogs:flightLogs}}}]);
  const flightHtml='<script>self.__next_f.push([1,'+JSON.stringify(flightPayload)+'])</script>',game=parsePlayerGameLogs(flightHtml,{playerId:'harvey',number:'5',name:'Synic Harvey'}).find(x=>x.opponent==='Kimberly'),defense=game?.statLines.find(x=>x.category==='Defensive Statistics'),touchdowns=game?.statLines.find(x=>x.category==='Touchdowns');
  if(defense?.values?.['PASS INT.']!=='2'||defense?.values?.['PASS INT YDS']!=='64'||defense?.values?.PD!=='1'||touchdowns?.values?.['DEFENSE TD']!=='1')throw new Error('MaxPreps streamed defensive-stat self-test failed');
  console.log('MaxPreps fallback self-test passed.');
}
if(process.argv.includes('--self-test')){selfTest();process.exit(0)}

if(!fs.existsSync(FILE))throw new Error(`${FILE} missing`);
const data=JSON.parse(fs.readFileSync(FILE,'utf8'));
let cache={season:data.season||2026,updatedAt:'',teams:{}};
if(fs.existsSync(CACHE)){try{cache=JSON.parse(fs.readFileSync(CACHE,'utf8'))}catch(error){console.warn(`${CACHE}: ${error.message}`)}}
if(process.argv.includes('--apply-cache')){
  let addedRows=0,filledFields=0,unmatchedRows=0,available=0;
  for(const team of Object.values(data.teams||{})){
    const saved=cache.teams?.[team.team];if(!saved?.rows?.length)continue;
    available++;const merged=mergeTeam(team,saved.rows,saved.sourceUrl||'');addedRows+=merged.addedRows;filledFields+=merged.filledFields;unmatchedRows+=merged.unmatched;
    team.maxprepsStatsUrl=saved.sourceUrl||'';team.maxprepsPrintUrl=saved.printUrl||'';team.maxprepsLastUpdated=saved.lastUpdated||'';
  }
  data.updatedAt=new Date().toISOString();data.summary={...(data.summary||{}),maxprepsFallback:{checked:Object.keys(data.teams||{}).length,available,addedRows,filledFields,unmatchedRows,failures:0,cacheUpdatedAt:cache.updatedAt||'',policy:'fill blank fields and missing roster-matched rows only'}};
  fs.writeFileSync(FILE,JSON.stringify(data,null,2)+'\n');
  console.log(`MaxPreps cache: ${available} teams available; ${addedRows} missing rows added; ${filledFields} blank fields filled; ${unmatchedRows} unverified rows skipped.`);
  process.exit(0);
}
const entries=Object.values(data.teams||{});let next=0,checked=0,available=0,addedRows=0,filledFields=0,unmatchedRows=0,failures=0;
async function one(team){
  try{
    const page=await loadTeamPage(team);checked++;if(!page){team.maxprepsFallback={checkedAt:new Date().toISOString(),available:false};return}
    available++;const print=await fetchHtml(page.printUrl),rows=parsePrintStats(print),merged=mergeTeam(team,rows,page.statsUrl);
    cache.teams[team.team]={sourceUrl:page.statsUrl,printUrl:page.printUrl,lastUpdated:page.lastUpdated||'',rows};
    team.maxprepsStatsUrl=page.statsUrl;team.maxprepsPrintUrl=page.printUrl;team.maxprepsLastUpdated=page.lastUpdated||'';
    addedRows+=merged.addedRows;filledFields+=merged.filledFields;unmatchedRows+=merged.unmatched;
  }catch(error){failures++;console.warn(`${team.team} MaxPreps fallback: ${error.message}`)}
}
async function worker(){while(true){const i=next++;if(i>=entries.length)return;await one(entries[i]);await new Promise(resolve=>setTimeout(resolve,120))}}
await Promise.all(Array.from({length:Math.min(5,entries.length)},()=>worker()));
const gameCache={season:data.season||2026,updatedAt:'',teams:{}},playerTasks=[];
for(const team of entries){
  const saved=cache.teams?.[team.team],seen=new Set();
  for(const row of saved?.rows||[]){
    const player=rosterMatch(team,row),athleteUrl=clean(row.athleteUrl);if(!player||!athleteUrl||seen.has(player.playerId))continue;
    seen.add(player.playerId);playerTasks.push({team,player,url:new URL(athleteUrl,'https://www.maxpreps.com').href});
  }
}
let gameNext=0,gamePlayersFetched=0,gamePlayersFailed=0,gameRows=0;
async function gameWorker(){while(true){const i=gameNext++;if(i>=playerTasks.length)return;const task=playerTasks[i];try{const html=await fetchHtml(task.url),games=parsePlayerGameLogs(html,task.player);if(games.length){const bucket=gameCache.teams[task.team.team]||(gameCache.teams[task.team.team]={team:task.team.team,games:[]});bucket.games.push(...games);gameRows+=games.length}gamePlayersFetched++}catch(error){gamePlayersFailed++;console.warn(`${task.team.team} ${task.player.name} game logs: ${error.message}`)}await new Promise(resolve=>setTimeout(resolve,80))}}
await Promise.all(Array.from({length:Math.min(8,playerTasks.length)},()=>gameWorker()));
data.updatedAt=new Date().toISOString();data.summary={...(data.summary||{}),maxprepsFallback:{checked,available,addedRows,filledFields,unmatchedRows,failures,policy:'fill blank fields and missing roster-matched rows only'}};
fs.writeFileSync(FILE,JSON.stringify(data,null,2)+'\n');
cache.updatedAt=new Date().toISOString();fs.writeFileSync(CACHE,JSON.stringify(cache,null,2)+'\n');
gameCache.updatedAt=new Date().toISOString();gameCache.summary={playersQueued:playerTasks.length,playersFetched:gamePlayersFetched,playersFailed:gamePlayersFailed,playerGames:gameRows};fs.writeFileSync(GAME_CACHE,JSON.stringify(gameCache,null,2)+'\n');
console.log(`MaxPreps fallback: checked ${checked} teams; ${available} pages available; ${addedRows} missing rows added; ${filledFields} blank fields filled; ${unmatchedRows} unverified rows skipped; ${failures} failures. Game logs: ${gamePlayersFetched}/${playerTasks.length} players fetched, ${gameRows} player-games, ${gamePlayersFailed} failures.`);
if(checked<Math.max(20,Math.floor(entries.length*.5)))throw new Error(`Too few MaxPreps teams checked: ${checked}/${entries.length}`);

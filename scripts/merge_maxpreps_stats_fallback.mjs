import fs from 'node:fs';

const FILE='deseret-rosters-stats-2026.json';
const CACHE='maxpreps-stats-fallback-2026.json';
const SEASON_LABEL='26-27';
const clean=v=>String(v??'').trim();
const compact=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const slug=v=>clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const decode=s=>String(s||'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
const text=html=>decode(String(html||'')).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const nonEmpty=v=>v!==null&&v!==undefined&&clean(v)!=='';
const number=v=>{const s=clean(v).replace(/,/g,'');return /^-?\d+(?:\.\d+)?$/.test(s)?s:''};

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
function nextData(html){
  const match=String(html).match(/<script id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if(!match)return null;
  try{return JSON.parse(match[1])}catch{return null}
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
  const query=encodeURIComponent(`${team} Utah high school football`),search=await fetchHtml(`https://www.maxpreps.com/search/?q=${query}`);
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
    out.push({value:text(match[3]),title:title?decode(title):''});
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
  'Defensive Statistics':{category:'Defense/Special Teams',fields:{Int:'PASS INT.'}},
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
      if(Object.keys(values).length)parsed.push({category:config.category,number:no,name,values});
    }
  }
  return parsed;
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
data.updatedAt=new Date().toISOString();data.summary={...(data.summary||{}),maxprepsFallback:{checked,available,addedRows,filledFields,unmatchedRows,failures,policy:'fill blank fields and missing roster-matched rows only'}};
fs.writeFileSync(FILE,JSON.stringify(data,null,2)+'\n');
cache.updatedAt=new Date().toISOString();fs.writeFileSync(CACHE,JSON.stringify(cache,null,2)+'\n');
console.log(`MaxPreps fallback: checked ${checked} teams; ${available} pages available; ${addedRows} missing rows added; ${filledFields} blank fields filled; ${unmatchedRows} unverified rows skipped; ${failures} failures.`);
if(checked<Math.max(20,Math.floor(entries.length*.5)))throw new Error(`Too few MaxPreps teams checked: ${checked}/${entries.length}`);

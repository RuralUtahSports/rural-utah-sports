import fs from 'node:fs';

const dataFile = 'boys-basketball-games-2026-27.json';
const reportFile = 'boys-basketball-schedule-import-report-2026-27.json';
const season = '2026-27';
const isoDay = () => new Date().toISOString().slice(0,10);
const trim = s => String(s ?? '').trim();
const decode = s => trim(s).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
const canon = s => decode(s).toLowerCase().replace(/[^a-z0-9]/g,'');
const alias = {
  umacw:'umacampwilliams', umalehi:'umacampwilliams', utahmilitaryacademycampwilliams:'umacampwilliams',
  utahmilitaryacademyhillfield:'umahillfield', utahmilitaryacademyhillfieldthunderbirds:'umahillfield',
  juandiegocatholic:'juandiego', judgememorialcatholic:'judgememorial',
  americanleadershipacademy:'ala', americanleadership:'ala',
  stjoseph:'saintjoseph', saintjosephcatholic:'saintjoseph',
  davinci:'davinciacademy', grand:'grandcounty'
};
const key = s => alias[canon(s)] || canon(s);
const normUrl = s => {try{return new URL(s,'https://www.maxpreps.com').pathname.toLowerCase().replace(/\/schedule\/?$/,'/').replace(/\/$/,'/')}catch{return ''}};
const data = JSON.parse(fs.readFileSync(dataFile,'utf8'));
const previousReport = JSON.parse(fs.readFileSync(reportFile,'utf8'));
const oldGames = (data.games || []).filter(g=>!(g.sourceCheckedAt && g.date<'2026-11-17'));
const roster = previousReport.schools || [];
if(roster.length < 150 || oldGames.length < 1200) throw new Error('Unexpectedly small baseline; refusing to replace data');
const map = new Map(Object.entries(data.sources || {}).map(([name,url])=>[normUrl(url),name]));
const canonicalNames = new Map(Object.keys(data.sources || {}).map(name=>[key(name),name]));
const resolveName = (name,href) => {
  const exact = map.get(normUrl(href));
  if(exact) return exact;
  return canonicalNames.get(key(name)) || decode(name);
};
const gameId = u => {try {return new URL(u,'https://www.maxpreps.com').searchParams.get('c') || ''}catch{return ''}};
const gameUrl = u => {try{return new URL(u,'https://www.maxpreps.com').href.replaceAll('&amp;','&')}catch{return ''}};
const stateCode = href => {
  const parts = normUrl(href).split('/').filter(Boolean);
  return parts.length > 0 && /^[a-z]{2}$/.test(parts[0]) ? parts[0].toUpperCase() : '';
};
const safeDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && s>='2026-11-17' && s<='2027-03-31';
const formatTime = value => {const s=trim(value);const m=s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);return m?m[1]+':'+m[2]+' '+m[3].toUpperCase():(s||'TBA')};
const minutes = value => {const m=formatTime(value).match(/^(\d{1,2}):(\d{2})\s+(AM|PM)$/);return m?(Number(m[1])%12)*60+Number(m[2])+(m[3]==='PM'?720:0):null};
const dayDistance = (a,b) => Math.abs(Date.parse(a)-Date.parse(b))/86400000;
const gameSignature = g => [g.date, key(g.homeTeam), key(g.awayTeam)].join('|');
const pairSignature = g => [key(g.homeTeam),key(g.awayTeam)].sort().join('|');
function parse(html,team,url) {
  if(!html.includes('2026-27') || !html.includes('Basketball Schedule'))throw new Error('Wrong season or not a basketball schedule');
  const table = [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(x=>x[1]).find(x=>/<th[^>]*>Date\/Time<\/th>/.test(x) && /<th[^>]*>Opponent<\/th>/.test(x));
  if(!table)throw new Error('No basketball schedule table in page');
  const body = table.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] || '';
  const rows = [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(x=>x[1]);
  const out = [], invalid = [];
  for(const row of rows) {
    const cols = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>x[1]);
    if(cols.length<2)continue;
    const anchor = cols[0].match(/<a\b[^>]*href="([^"]+)"[^>]*>/i);
    const dateSpans = [...cols[0].matchAll(/<span\b[^>]*>([^<]*)<\/span>/gi)].map(x=>decode(x[1]));
    const targetUrl = gameUrl(decode(anchor?.[1] || ''));
    const dateFromUrl = targetUrl.match(/\/(\d{1,2})-(\d{1,2})-(2026|2027)\//);
    if(!dateFromUrl) {invalid.push('Missing game date for '+team); continue}
    const date = dateFromUrl[3]+'-'+dateFromUrl[1].padStart(2,'0')+'-'+dateFromUrl[2].padStart(2,'0');
    if(!safeDate(date)) {invalid.push('Outside season: '+date); continue}
    const schoolHref = decode(cols[1].match(/<a\b[^>]*href="([^"]+)"[^>]*>/i)?.[1] || '');
    const opponent = decode(cols[1].match(/<span\b[^>]*class="name"[^>]*>([\s\S]*?)<\/span>/i)?.[1] || '');
    const hat = decode(cols[1].match(/<span\b[^>]*class="hat"[^>]*>([\s\S]*?)<\/span>/i)?.[1] || '').toLowerCase();
    const away = /^(?:@|at)$/.test(hat);
    const opp = resolveName(opponent,schoolHref);
    if(!opponent || !opp || key(opp)===key(team)) {invalid.push('Missing/bad opponent: '+date+' '+team); continue}
    const id = gameId(targetUrl);
    if(!id){invalid.push('Missing MaxPreps game ID: '+date+' '+team);continue}
    const time = formatTime(dateSpans[1] || 'TBA');
    const label = decode(anchor?.[0]?.match(/aria-label="([^"]+)"/i)?.[1] || '');
    const observedAway = label ? /\s(?:at|@)\s/i.test(label) : away;
    const homeTeam = observedAway ? opp : team;
    const awayTeam = observedAway ? team : opp;
    const game = {date,time,homeTeam,awayTeam,status:'Scheduled',regionGame:/\*/.test(decode(cols[1])),source:'MaxPreps',sourceGameId:id,sourceUrl:targetUrl,sourceCheckedAt:new Date().toISOString()};
    const oppState = stateCode(schoolHref);
    if(oppState && oppState !== 'UT')game[observedAway?'homeTeamState':'awayTeamState']=oppState;
    out.push(game);
  }
  return {games:out,invalid,rowCount:rows.length};
}
function test() {
  const html = '<h1>Valley Basketball Schedule</h1> 2026-27 <table><thead><tr><th>Date/Time</th><th>Opponent</th><th>Game Info</th></tr></thead><tbody><tr><td><a aria-label="11/20 7:00pm vs Enterprise" href="/ut/basketball/game/enterprise-vs-valley/11-20-2026/?c=abc"><span>11/20</span><span>7:00pm</span></a></td><td><a href="/ut/enterprise/enterprise-wolves/basketball/"><span class="hat">vs</span><span class="name">Enterprise</span></a></td><td></td></tr></tbody></table>';
  const p=parse(html,'Valley','https://example.test');
  if(p.games.length!==1||p.games[0].homeTeam!=='Valley'||p.games[0].awayTeam!=='Enterprise'||p.games[0].date!=='2026-11-20')throw new Error('Schedule parser test failed '+JSON.stringify(p));
  console.log('Parser test passed.');
}
test();
async function fetchSchedule(team) {
  let lastError='';
  for(let attempt=1; attempt<=2; attempt++){
    try {
      const r=await fetch(team.url,{headers:{'user-agent':'Mozilla/5.0 (compatible; RuralUtahSports/1.0; +https://ruralutahsports.com/)','accept':'text/html'},redirect:'follow',signal:AbortSignal.timeout(24000)});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const html=await r.text();
      const parsed=parse(html,team.team,team.url);
      if(parsed.invalid.length)console.log('PARTIAL ROWS',team.team,parsed.invalid.length,'of',parsed.rowCount,'held from import');
      if(parsed.rowCount>=4 && parsed.games.length<parsed.rowCount*0.5)throw new Error('Unsafe game extraction: '+parsed.games.length+'/'+parsed.rowCount);
      return {team:team.team,url:team.url,status:parsed.games.length?'available':'no-games-posted',listedGames:parsed.games.length,checkedAt:isoDay(),games:parsed.games,invalid:parsed.invalid};
    }catch(e){lastError=e.message; if(attempt<2)await new Promise(resolve=>setTimeout(resolve,400));}
  }
  return {team:team.team,url:team.url,status:'failed',listedGames:null,checkedAt:isoDay(),games:[],error:lastError};
}
async function fetchAll(teams,limit=6) {
  const output = new Array(teams.length);let cursor=0;
  await Promise.all(Array.from({length:Math.min(limit,teams.length)},async()=>{
    while(cursor<teams.length) {const index=cursor++;output[index]=await fetchSchedule(teams[index]);if((index+1)%25===0)console.log('Checked',index+1,'of',teams.length)}
  }));
  return output;
}
const probe = process.argv.includes('--probe');
const scans=await fetchAll(probe?roster.filter(x=>['Valley','Wasatch Academy','Westlake'].includes(x.team)):roster);
console.log('SCAN',JSON.stringify(scans.map(({team,status,listedGames,error,invalid,games})=>({team,status,listedGames,error,invalid,newSample:games.slice(-2).map(g=>g.date+' '+g.awayTeam+' @ '+g.homeTeam)}))).slice(0,13000));
if(probe)process.exit(0);
const successes = scans.filter(x=>x.status!=='failed');
const totalFetched=successes.reduce((n,x)=>n+x.games.length,0);
if(successes.length<120||totalFetched<1000)throw new Error('Coverage safety gate: '+successes.length+' valid schools, '+totalFetched+' rows');
const all = new Map();
const conflicts = [];
for(const scan of successes)for(const game of scan.games){
  const old=all.get(game.sourceGameId);
  if(!old){all.set(game.sourceGameId,game);continue}
  if(old.date!==game.date || pairSignature(old)!==pairSignature(game) || old.homeTeam!==game.homeTeam || old.awayTeam!==game.awayTeam) {
    conflicts.push({reason:'Source pages disagree',sourceGameId:game.sourceGameId,first:old,second:game});
    all.delete(game.sourceGameId);
  }else if(old.time==='TBA' && game.time!=='TBA')all.set(game.sourceGameId,game);
}
const quarantined = new Set(conflicts.map(x=>x.sourceGameId));
const next = [...oldGames];
for(const g of next)g.time=formatTime(g.time);
const historicChanges = previousReport.changes || [];
for(const change of historicChanges.filter(x=>x.type==='date'&&dayDistance(x.from,x.to)>7)){
  const [away,home]=change.teams.split(' @ ');
  const game=next.find(g=>key(g.awayTeam)===key(away)&&key(g.homeTeam)===key(home)&&g.date===change.to);
  if(game){game.date=change.from;console.log('RESTORED UNVERIFIED RESCHEDULE',change.teams,change.from)}
}
const byId=new Map(),bySignature=new Map();
next.forEach((g,i)=>{
  if(g.sourceGameId)byId.set(g.sourceGameId,i);
  const sig=gameSignature(g);
  if(!bySignature.has(sig))bySignature.set(sig,i);
});
const additions=[],changes=[],skips=[];
for(const inc of all.values()){
  if(quarantined.has(inc.sourceGameId))continue;
  let idx=byId.get(inc.sourceGameId);
  if(idx===undefined)idx=bySignature.get(gameSignature(inc));
  if(idx!==undefined){
    const old=next[idx];
    if(pairSignature(old)!==pairSignature(inc)){
      conflicts.push({reason:'Existing game ID with different opponents',sourceGameId:inc.sourceGameId,existing:old,incoming:inc});continue
    }
    if(old.sourceGameId && old.sourceGameId!==inc.sourceGameId) {
      skips.push({reason:'Same game/date with different source ID',existing:old.sourceGameId,incoming:inc.sourceGameId});continue
    }
    if(old.date!==inc.date && inc.sourceGameId===old.sourceGameId) {
      if(dayDistance(old.date,inc.date)>7)conflicts.push({reason:'Large date change held for review',sourceGameId:inc.sourceGameId,from:old.date,to:inc.date,teams:inc.awayTeam+' @ '+inc.homeTeam});
      else {changes.push({type:'date',teams:inc.awayTeam+' @ '+inc.homeTeam,from:old.date,to:inc.date});old.date=inc.date;}
    }
    if(old.time!==inc.time && inc.time && inc.time!=='TBA' && inc.sourceGameId===old.sourceGameId) {
      changes.push({type:'time',teams:inc.awayTeam+' @ '+inc.homeTeam,from:old.time,to:inc.time});
      old.time=inc.time;
    }
    if(old.homeTeam!==inc.homeTeam || old.awayTeam!==inc.awayTeam) {
      // Do not automatically move a game on conflicting home/away information.
      conflicts.push({reason:'Home-away conflict',sourceGameId:inc.sourceGameId,existing:old,incoming:inc});
    }
    continue;
  }
  const potential=next.filter(g=>pairSignature(g)===pairSignature(inc) && Math.abs(Date.parse(g.date)-Date.parse(inc.date))<=7*86400000);
  if(potential.length) {
    skips.push({reason:'Potential reschedule with new game ID',incoming:inc,existing:potential.slice(0,3)});continue
  }
  const sameDay = next.filter(g=>g.date===inc.date && [inc.homeTeam,inc.awayTeam].some(t=>key(t)!=='tbaopponent' && (key(g.homeTeam)===key(t)||key(g.awayTeam)===key(t))));
  const collides=sameDay.some(g=>{
    const x=minutes(g.time),y=minutes(inc.time);
    return (x===null||y===null||Math.abs(x-y)<300);
  });
  if(collides){skips.push({reason:'Existing different matchup on same team date',incoming:inc,existing:sameDay.slice(0,3)});continue}
  const index=next.length;
  next.push(inc);byId.set(inc.sourceGameId,index);bySignature.set(gameSignature(inc),index);
  additions.push({date:inc.date,time:inc.time,awayTeam:inc.awayTeam,homeTeam:inc.homeTeam,sourceUrl:inc.sourceUrl});
}
const uniq = new Set(), deduped=[];
for(const game of next){
  const identity=game.sourceGameId||gameSignature(game);
  if(uniq.has(identity))continue;
  uniq.add(identity);deduped.push(game);
}
deduped.sort((a,b)=>a.date.localeCompare(b.date) || trim(a.homeTeam).localeCompare(trim(b.homeTeam)) || trim(a.awayTeam).localeCompare(trim(b.awayTeam)));
// Recheck previously imported games for date collisions; keep the original schedule when uncertain.
const dates=new Map();
for(const g of deduped)for(const t of [g.homeTeam,g.awayTeam]) {
  if(['tbaopponent','nonvarsityopponent'].includes(key(t)))continue;
  const k=key(t)+'|'+g.date;
  dates.set(k,[...(dates.get(k)||[]),g]);
}
const collisionRemovals=new Set(),collisionReview=[];
for(const [teamDate,games] of dates){
  if(games.length<2)continue;
  for(const g of games.filter(x=>x.sourceCheckedAt)){
    const other=games.filter(x=>x!==g);
    if(other.some(x=>{
      const a=minutes(x.time),b=minutes(g.time);
      return a===null||b===null||Math.abs(a-b)<300;
    })) {
      collisionRemovals.add(g.sourceGameId);
      collisionReview.push({reason:'Multiple different matchups same team/date',teamDate,heldGame:g.awayTeam+' @ '+g.homeTeam});
    }
  }
}
const cleaned=deduped.filter(g=>!collisionRemovals.has(g.sourceGameId));
const originalIdCount=oldGames.filter(x=>x.sourceGameId && !collisionRemovals.has(x.sourceGameId)).length;
if(cleaned.length<oldGames.length-collisionRemovals.size || cleaned.filter(x=>x.sourceGameId).length<originalIdCount)throw new Error('Unsafe removal of existing source games');
const previousByTeam=new Map(roster.map(s=>[s.team,s]));
const report={
 season,checkedAt:isoDay(),teamCount:roster.length,checkedTeams:scans.length,games:cleaned.length,
 availableSchedules:scans.filter(s=>s.status==='available').length,duplicatesRemoved:next.length-deduped.length,
 previousGames:previousReport.previousGames??oldGames.length,addedGames:additions.length,changedFields:changes.length,failedChecks:scans.filter(s=>s.status==='failed').length,
 newGames:additions,changes,conflicts:conflicts.slice(0,150),heldForReview:skips.slice(0,200),
 schools:scans.map(s=>({team:s.team,url:s.url,status:s.status,listedGames:s.listedGames,checkedAt:s.checkedAt,...(s.error?{error:s.error}:{})}))
};
const previousAdditions=previousReport.newGames || [];
const availableLinks=new Set(cleaned.map(g=>g.sourceUrl));
report.newGames=[...previousAdditions,...additions].filter((a,i,all)=>availableLinks.has(a.sourceUrl)&&all.findIndex(b=>b.sourceUrl===a.sourceUrl)===i);
report.addedGames=report.newGames.length;
const significant=[...(previousReport.changes||[]),...changes].filter(x=>x.type!=='time'||formatTime(x.from)!==formatTime(x.to));
report.changes=significant.filter((x,i,all)=>all.findIndex(y=>JSON.stringify(y)===JSON.stringify(x))===i);
report.changedFields=report.changes.length;
report.heldForReview=[...(previousReport.heldForReview||[]),...report.heldForReview,...collisionReview].slice(0,500);
report.removedUnsafeImports=(previousReport.removedUnsafeImports||0)+(previousReport.newGames||[]).filter(g=>!availableLinks.has(g.sourceUrl)).length;
for(const s of report.schools) {
  const prev=previousByTeam.get(s.team);
  if(prev && prev.listedGames>0 && s.listedGames!==null && s.listedGames<prev.listedGames*0.5)
    report.heldForReview.push({reason:'Significant schedule shrink',team:s.team,before:prev.listedGames,now:s.listedGames});
}

data.games=cleaned;
data.updatedAt=isoDay();
fs.writeFileSync(dataFile,JSON.stringify(data,null,2)+'\n');
fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
console.log('RESULT',JSON.stringify({previousGames:report.previousGames,games:report.games,added:report.addedGames,changed:report.changedFields,schoolsChecked:report.checkedTeams,available:report.availableSchedules,failed:report.failedChecks,conflicts:conflicts.length,held:skips.length,removedUnsafe:report.removedUnsafeImports}));
console.log('NEW GAMES',JSON.stringify(additions.slice(0,40)));

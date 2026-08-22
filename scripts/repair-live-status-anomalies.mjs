import fs from 'node:fs';

const FILE='deseret-game-details.json';
const WEEKLY='weekly-simulation.json';
if(!fs.existsSync(FILE)) process.exit(0);

const data=JSON.parse(fs.readFileSync(FILE,'utf8'));
const weekly=fs.existsSync(WEEKLY)?JSON.parse(fs.readFileSync(WEEKLY,'utf8')):{games:[]};
const utahDate=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const confirmedFinalGameIds=new Set(['273455']);
// Some Deseret game pages initially expose only a generic Live badge before
// a clock/score arrives. Keep only specifically verified exceptions here.
const confirmedBareLiveGameIds=new Set(['273364']); // Timpanogos at Desert Hills, 2026-08-21
const clean=v=>String(v??'').trim();
const compact=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const isoDate=v=>{
  const s=clean(v);
  let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m)return`${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
  m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  return m?`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`:'';
};
const expectedKey=g=>`${isoDate(g?.date)}|${compact(g?.awayTeam)}|${compact(g?.homeTeam)}`;
const gameIdFromUrl=url=>{const m=clean(url).match(/\/(\d+)\/?$/);return m?m[1]:''};
const gameId=g=>gameIdFromUrl(g?.url||g?.deseretUrl||'');
const mercyBox=g=>{
  const rows=g?.boxScore?.rows;
  if(!Array.isArray(rows)||rows.length!==2)return false;
  const a=rows[0],b=rows[1];
  const aq=Array.isArray(a?.quarters)?a.quarters:[],bq=Array.isArray(b?.quarters)?b.quarters:[];
  const q4Unplayed=(aq[3]===null||aq[3]===undefined)&&(bq[3]===null||bq[3]===undefined);
  const firstThreePlayed=[...aq.slice(0,3),...bq.slice(0,3)].every(Number.isFinite);
  const at=Number(a?.total),bt=Number(b?.total);
  return q4Unplayed&&firstThreePlayed&&Number.isFinite(at)&&Number.isFinite(bt)&&Math.abs(at-bt)>=44;
};
const q4Played=g=>{
  const rows=g?.boxScore?.rows;
  if(!Array.isArray(rows)||rows.length!==2)return false;
  const aq=Array.isArray(rows[0]?.quarters)?rows[0].quarters:[];
  const bq=Array.isArray(rows[1]?.quarters)?rows[1].quarters:[];
  return Number.isFinite(aq[3])&&Number.isFinite(bq[3]);
};
let fixed=0;

// Deseret occasionally changes a game's date while keeping the same numeric
// game ID. Move any stale detail record to the date/team key from the current
// weekly schedule so an old date cannot leak status into the rescheduled game.
const weeklyByGameId=new Map();
for(const g of weekly.games||[]){
  const id=gameIdFromUrl(g?.deseretUrl);
  const key=expectedKey(g);
  if(id&&key)weeklyByGameId.set(id,{key,url:clean(g.deseretUrl)});
}
for(const [key,g] of Object.entries({...data.games||{}})){
  if(!g)continue;
  const id=gameId(g),expected=weeklyByGameId.get(id);
  if(!expected||expected.key===key)continue;
  if(!data.games[expected.key])data.games[expected.key]=g;
  if(data.games[expected.key]&&expected.url)data.games[expected.key].url=expected.url;
  delete data.games[key];
  fixed++;
  console.log(`Moved rescheduled game detail: ${key} -> ${expected.key}`);
}

// A game dated after today in Utah cannot legitimately be in Q1-Q4, halftime,
// OT, live or final. Clear any leaked game-page/day-board evidence until its
// scheduled local date arrives. This also prevents stale scores from a prior
// matchup from appearing on tomorrow's card.
for(const [key,g] of Object.entries(data.games||{})){
  if(!g)continue;
  const day=String(key).split('|')[0]||'';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||day<=utahDate)continue;
  const dirty=g.final===true||!/^(?:Scheduled|Upcoming)?$/i.test(String(g.status||''))||!!clean(g.clock)||!!clean(g.period)||!!g.boxScore||(Array.isArray(g.scoringPlays)&&g.scoringPlays.length)||(Array.isArray(g.stats)&&g.stats.length);
  if(!dirty)continue;
  g.status='Scheduled';
  g.final=false;
  g.clock='';
  g.period='';
  g.boxScore=null;
  g.scoringPlays=[];
  g.stats=[];
  delete g.finalSource;
  delete g.statusSource;
  delete g.scoreSource;
  delete g.kickoffFallbackAt;
  fixed++;
  console.log(`Reset future game: ${key} -> Scheduled`);
}

for(const [key,g] of Object.entries(data.games||{})){
  if(!key.startsWith(utahDate+'|')||!g) continue;
  const plays=Array.isArray(g.scoringPlays)?g.scoringPlays:[];
  const hasQ4Play=plays.some(p=>/\b4Q\b|\b4th\b/i.test(String(p)));
  const hasQ4Evidence=q4Played(g)||hasQ4Play;
  const hasClock=!!String(g.clock||'').trim();
  const isConfirmedFinal=confirmedFinalGameIds.has(gameId(g));
  const isConfirmedBareLive=confirmedBareLiveGameIds.has(gameId(g));
  const isMercyFinal=mercyBox(g);
  const hasAuthoritativeFinal=g.final===true&&['deseret-game-page','deseret-day-scoreboard','confirmed'].includes(g.finalSource);

  // Finals from a specific Deseret game page or a tightly matched Deseret day
  // scoreboard entry are authoritative. Only ambiguous untagged Finals are
  // eligible for automatic demotion.
  if(g.final===true && !hasAuthoritativeFinal && !isConfirmedFinal && !isMercyFinal && !hasQ4Evidence){
    g.final=false;
    g.status=plays.length?'Live':'Scheduled';
    g.clock='';
    g.period='';
    delete g.finalSource;
    fixed++;
    console.log(`Reset suspicious Final: ${key} -> ${g.status}`);
    continue;
  }

  // A quarter/clock with no game-specific score, box score or scoring play can
  // leak in from a neighboring matchup on Deseret's day page. Do not treat it
  // as live until this game has its own evidence.
  if(/^Q[1-4]$/i.test(String(g.status||'')) && !plays.length && !g.boxScore){
    g.status='Scheduled';
    g.clock='';
    g.period='';
    fixed++;
    console.log(`Reset unsupported quarter status: ${key} -> Scheduled`);
    continue;
  }

  // Likewise, a generic Live badge with no clock/score/game evidence is too
  // weak to trust because neighboring badges can leak into the match segment.
  // Timpanogos-Desert Hills is explicitly verified live while Deseret has only
  // a bare Live badge, so preserve that one exception.
  if(/^Live$/i.test(String(g.status||'')) && !plays.length && !hasClock && !g.boxScore && !isConfirmedBareLive){
    g.status='Scheduled';
    g.period='';
    delete g.statusSource;
    delete g.kickoffFallbackAt;
    fixed++;
    console.log(`Reset unsupported Live status: ${key} -> Scheduled`);
    continue;
  }

  if(/^halftime$/i.test(String(g.status||'')) && !plays.length && !hasClock){
    g.status='Scheduled';
    g.period='';
    fixed++;
    console.log(`Reset suspicious Halftime: ${key} -> Scheduled`);
  }
}

data.updatedAt=new Date().toISOString();
fs.writeFileSync(FILE,JSON.stringify(data,null,2)+'\n');
console.log(`Live status anomaly repair fixed ${fixed} game(s).`);

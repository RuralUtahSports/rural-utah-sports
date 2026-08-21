import fs from 'node:fs';

const FILE='deseret-game-details.json';
if(!fs.existsSync(FILE)) process.exit(0);

const data=JSON.parse(fs.readFileSync(FILE,'utf8'));
const utahDate=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const confirmedFinalGameIds=new Set(['273455']);
const gameId=g=>{const m=String(g?.url||'').match(/\/(\d+)\/?$/);return m?m[1]:''};
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

for(const [key,g] of Object.entries(data.games||{})){
  if(!key.startsWith(utahDate+'|')||!g) continue;
  const plays=Array.isArray(g.scoringPlays)?g.scoringPlays:[];
  const hasQ4Play=plays.some(p=>/\b4Q\b|\b4th\b/i.test(String(p)));
  const hasQ4Evidence=q4Played(g)||hasQ4Play;
  const hasClock=!!String(g.clock||'').trim();
  const isConfirmedFinal=confirmedFinalGameIds.has(gameId(g));
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

  // A bare quarter label with no clock, no scoring plays and no box score is
  // not enough to call a game live. Deseret's pregame page can contain Q1-Q4
  // table/header text, which previously caused scheduled games to appear live.
  if(/^Q[1-4]$/i.test(String(g.status||'')) && !plays.length && !hasClock && !g.boxScore){
    g.status='Scheduled';
    g.period='';
    fixed++;
    console.log(`Reset unsupported quarter status: ${key} -> Scheduled`);
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

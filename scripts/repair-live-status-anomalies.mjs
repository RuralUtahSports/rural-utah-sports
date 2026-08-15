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
let fixed=0;

for(const [key,g] of Object.entries(data.games||{})){
  if(!key.startsWith(utahDate+'|')||!g) continue;
  const plays=Array.isArray(g.scoringPlays)?g.scoringPlays:[];
  const hasBox=!!(g.boxScore?.rows?.length===2);
  const hasQ4=plays.some(p=>/\b4Q\b|\b4th\b/i.test(String(p)));
  const hasClock=!!String(g.clock||'').trim();
  const isConfirmedFinal=confirmedFinalGameIds.has(gameId(g));
  const isMercyFinal=mercyBox(g);

  if(g.final===true && !isConfirmedFinal && !isMercyFinal && !hasBox && !hasQ4){
    g.final=false;
    g.status=plays.length?'Live':'Scheduled';
    g.period=hasClock?String(g.period||''):'';
    fixed++;
    console.log(`Reset suspicious Final: ${key} -> ${g.status}`);
    continue;
  }

  if(/^halftime$/i.test(String(g.status||'')) && !hasBox && !plays.length && !hasClock){
    g.status='Scheduled';
    g.period='';
    fixed++;
    console.log(`Reset suspicious Halftime: ${key} -> Scheduled`);
  }
}

data.updatedAt=new Date().toISOString();
fs.writeFileSync(FILE,JSON.stringify(data,null,2)+'\n');
console.log(`Live status anomaly repair fixed ${fixed} game(s).`);

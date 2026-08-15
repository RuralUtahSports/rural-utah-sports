import fs from 'node:fs';

const FILE='deseret-game-details.json';
if(!fs.existsSync(FILE)) process.exit(0);

const data=JSON.parse(fs.readFileSync(FILE,'utf8'));
const utahDate=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let fixed=0;

for(const [key,g] of Object.entries(data.games||{})){
  if(!key.startsWith(utahDate+'|')||!g) continue;
  const plays=Array.isArray(g.scoringPlays)?g.scoringPlays:[];
  const hasBox=!!(g.boxScore?.rows?.length===2);
  const hasQ4=plays.some(p=>/\b4Q\b|\b4th\b/i.test(String(p)));
  const hasClock=!!String(g.clock||'').trim();

  if(g.final===true && !hasBox && !hasQ4){
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

import fs from 'node:fs';

const FILE='deseret-game-details.json';
if(!fs.existsSync(FILE)) process.exit(0);

const data=JSON.parse(fs.readFileSync(FILE,'utf8'));
const today=new Date().toISOString().slice(0,10);
let fixed=0;

for(const [key,g] of Object.entries(data.games||{})){
  if(!key.startsWith(today+'|')||!g) continue;
  const plays=Array.isArray(g.scoringPlays)?g.scoringPlays:[];
  const hasBox=!!(g.boxScore?.rows?.length===2);
  const hasQ4=plays.some(p=>/\b4Q\b|\b4th\b/i.test(String(p)));
  const hasClock=!!String(g.clock||'').trim();

  // Deseret pages/day scoreboard can leak a nearby game's "Final" into the
  // text we parse. A same-day final with no box score and no fourth-quarter
  // scoring evidence is too weak to trust as Final.
  if(g.final===true && !hasBox && !hasQ4){
    g.final=false;
    g.status=plays.length?'Live':'Scheduled';
    g.period=hasClock?String(g.period||''):'';
    fixed++;
    console.log(`Reset suspicious Final: ${key} -> ${g.status}`);
    continue;
  }

  // Likewise, Halftime with no score/scoring/clock evidence is usually a
  // neighboring game's status captured from the daily scoreboard.
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

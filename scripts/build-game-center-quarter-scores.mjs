import fs from 'node:fs';
const read=n=>JSON.parse(fs.readFileSync(new URL('../'+n,import.meta.url),'utf8'));

const compact=n=>String(n||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const score=n=>n==null||n===''?null:Number.isFinite(Number(n))&&Number(n)>=0?Number(n):null;
const dateKey=s=>{const m=String(s||'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?m[3]+'-'+m[1].padStart(2,'0')+'-'+m[2].padStart(2,'0'):'';};
const quarters=(xs,n)=>Array.isArray(xs)&&xs.length>=n?xs.slice(0,n).map(v=>v===null||v===undefined||v===''?null:Number.isInteger(Number(v))&&Number(v)>=0?Number(v):null):null;
const quality=(sa,sb,a,b)=>{if(!a||!b||(a.every(x=>x==null)&&b.every(x=>x==null)))return'unavailable';const sum=xs=>xs.reduce((s,v)=>s+(v??0),0);if(sum(a)>sa||sum(b)>sb)return'conflict';return [...a,...b].every(v=>v!==null)?(sum(a)===sa&&sum(b)===sb?'complete':'conflict'):'partial';};
function build(weekly,details,manual){
 const games={},summary={verified:0,complete:0,partial:0,unavailable:0,conflict:0,sourceVerified:0,missingDetails:0};
 for(const g of weekly.games||[]){
  const ds=dateKey(g.date),sa=score(g.actualAway),sb=score(g.actualHome);
  if(!ds||sa==null||sb==null||!g.awayTeam||!g.homeTeam)continue;
  const expected=sa>sb?g.awayTeam:sb>sa?g.homeTeam:'TIE';
  if(!g.actualWinner||compact(expected)!==compact(g.actualWinner))continue;
  const id=ds+'|'+compact(g.awayTeam)+'|'+compact(g.homeTeam);
  if(games[id])continue;
  summary.verified++;
  const d=details.games?.[id]||details.games?.[ds+'|'+compact(g.homeTeam)+'|'+compact(g.awayTeam)];
  if(!d)summary.missingDetails++;
  const rows=d?.boxScore?.rows,meta=d?.boxScore?.periods;
  let periods=Array.isArray(meta)?meta.slice(0,8):['Q1','Q2','Q3','Q4'];
  if(periods.length<4)periods=['Q1','Q2','Q3','Q4'];
  const aligned=Array.isArray(rows)&&rows.length>=2&&score(rows[0]?.total)===sa&&score(rows[1]?.total)===sb;
  let a=aligned?quarters(rows[0].quarters,periods.length):null,b=aligned?quarters(rows[1].quarters,periods.length):null;
  let status=quality(sa,sb,a,b);
  const override=manual.games?.[id];
  let source=d?.url&&d.url.startsWith('https://sports.deseret.com/')?d.url:g.deseretUrl||null;
  if(override){
   const aa=quarters(override.away,4),bb=quarters(override.home,4);
   if(quality(sa,sb,aa,bb)==='complete'&&String(override.sourceUrl||'').startsWith('https://sports.deseret.com/')){
    a=aa;b=bb;periods=['Q1','Q2','Q3','Q4'];status='complete';source=override.sourceUrl;summary.sourceVerified++;
   }
  }
  const data={date:g.date,away:g.awayTeam,home:g.homeTeam,final:[sa,sb],status};
  if(status==='complete'||status==='partial'){data.periods=periods;data.quarters=[a,b];}
  if(source&&source.startsWith('https://sports.deseret.com/'))data.source=source;
  games[id]=data;summary[status]++;
 }
 return{season:2026,updatedAt:details.updatedAt||'',summary,games};
}

if(process.argv[1]&&/build-game-center-quarter-scores\.mjs$/.test(process.argv[1])){
const result=JSON.stringify(build(read('weekly-simulation.json'),read('deseret-game-details.json'),read('game-center-verified-quarters-2026.json')));
const target=new URL('../game-center-quarter-scores-2026.json',import.meta.url);
if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8').trim()!==result){console.error('Regenerate game-center-quarter-scores-2026.json');process.exitCode=1;}else console.log('Quarter scores verified against RUS feeds.');}
else{fs.writeFileSync(target,result+'\n');console.log('Quarter-score coverage',JSON.parse(result).summary);}
}

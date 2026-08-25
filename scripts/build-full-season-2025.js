const fs=require('fs');
const YEAR=2025;
const clean=v=>String(v??'').replace(/^#\d+\s+/,'').trim().toUpperCase();
const aliases={
  'AMERICAN LEADERSHIP':'ALA','AMERICAN LEADERSHIP ACADEMY':'ALA','AMERICAN LEADERSHIP ACADEMY (UT)':'ALA',
  'CEDAR':'CEDAR CITY','GRAND COUNTY':'GRAND','ST. JOSEPH':'SAINT JOSEPH','ST JOSEPH':'SAINT JOSEPH',
  'UMA CAMP WILLIAMS':'UMA-LEHI','UTAH MILITARY ACADEMY - CAMP WILLIAMS':'UMA-LEHI','UMA HILL FIELD':'UMA-HILLFIELD',
  'UTAH MILITARY ACADEMY - HILL FIELD':'UMA-HILLFIELD','GUNNISON':'GUNNISON VALLEY','MAPLE MTN':'MAPLE MOUNTAIN',
  'MONUMENT VAL':'MONUMENT VALLEY','UTAH SCH DEAF':'USDB','DESERET HILLS':'DESERT HILLS','WASATCH ACAD':'WASATCH ACADEMY'
};
const canon=v=>aliases[clean(v)]||clean(v);
const pairKey=(a,b)=>[canon(a),canon(b)].sort().join('|');
const exactKey=(a,b,sa,sb)=>{a=canon(a);b=canon(b);return a<b?`${a}|${b}|${sa}|${sb}`:`${b}|${a}|${sb}|${sa}`};
const yearOf=d=>{const s=String(d||'');let m=s.match(/(\d{4})$/);if(m)return +m[1];m=s.match(/^(\d{4})-/);return m?+m[1]:0};
const timeOf=d=>{const t=Date.parse(String(d||''));return Number.isFinite(t)?t:0};

const alignment=JSON.parse(fs.readFileSync('full-season-alignment-2025.json','utf8'));
const meta=new Map();
for(const r of alignment.regions)for(const team of r.teams)meta.set(canon(team),{classification:r.classification,region:r.region});
const aligned=new Set(meta.keys());

const raw=JSON.parse(fs.readFileSync('scorigami.json','utf8'));
const buckets=Array.isArray(raw)?raw:(raw.scores||raw.scorePairs||[]);
const source=buckets.flatMap(x=>Array.isArray(x?.games)?x.games:[]);
const dedupe=new Map();
for(const g of source){
  if(yearOf(g.date)!==YEAR)continue;
  let a,b,sa,sb;
  if(g.tie){a=g.team1;b=g.team2;sa=g.score1;sb=g.score2}
  else{a=g.winner;b=g.loser;sa=g.winnerScore;sb=g.loserScore}
  a=canon(a);b=canon(b);
  if(!a||!b||a===b||(!aligned.has(a)&&!aligned.has(b)))continue;
  sa=Number(sa);sb=Number(sb);
  if(!Number.isFinite(sa)||!Number.isFinite(sb))continue;
  const key=`${g.date}|${pairKey(a,b)}`;
  if(!dedupe.has(key))dedupe.set(key,{date:g.date,teamA:a,teamB:b,actualScoreA:sa,actualScoreB:sb});
}
let games=[...dedupe.values()].sort((a,b)=>timeOf(a.date)-timeOf(b.date)||a.teamA.localeCompare(b.teamA));

const bracket=JSON.parse(fs.readFileSync('brackets-2025.json','utf8'));
const pairCounts=new Map(),exactCounts=new Map();
for(const rounds of Object.values(bracket))for(const round of rounds||[])for(const row of round?.[1]||[]){
  if(!Array.isArray(row)||row.length<4)continue;
  const a=canon(row[0]),b=canon(row[2]),pk=pairKey(a,b);
  pairCounts.set(pk,(pairCounts.get(pk)||0)+1);
  const sa=Number(row[1]),sb=Number(row[3]);
  if(Number.isFinite(sa)&&Number.isFinite(sb)){
    const ek=exactKey(a,b,sa,sb);exactCounts.set(ek,(exactCounts.get(ek)||0)+1);
  }
}
const remove=new Set();
for(let i=0;i<games.length;i++){
  const g=games[i],ek=exactKey(g.teamA,g.teamB,g.actualScoreA,g.actualScoreB),n=exactCounts.get(ek)||0;
  if(n>0){remove.add(i);exactCounts.set(ek,n-1);const pk=pairKey(g.teamA,g.teamB);pairCounts.set(pk,Math.max(0,(pairCounts.get(pk)||0)-1))}
}
for(const [pk,n] of pairCounts){
  if(n<=0)continue;
  const candidates=[];
  for(let i=0;i<games.length;i++)if(!remove.has(i)&&pairKey(games[i].teamA,games[i].teamB)===pk)candidates.push(i);
  candidates.sort((a,b)=>timeOf(games[a].date)-timeOf(games[b].date));
  for(let j=0;j<n&&candidates.length;j++)remove.add(candidates.pop());
}
games=games.filter((_,i)=>!remove.has(i)).map(g=>{
  const ma=meta.get(g.teamA),mb=meta.get(g.teamB);
  const regionGame=!!(ma&&mb&&ma.classification===mb.classification&&String(ma.region)===String(mb.region));
  return {...g,regionGame};
});

// This 2A playoff final is absent from both the source score archive and the
// bracket import, so preserve it explicitly in the complete 2025 results.
const alaSouthSummitPlayoff={date:'10/24/2025',teamA:'SOUTH SUMMIT',teamB:'ALA',actualScoreA:55,actualScoreB:20,regionGame:false,playoff:true};
if(!games.some(g=>exactKey(g.teamA,g.teamB,g.actualScoreA,g.actualScoreB)===exactKey(alaSouthSummitPlayoff.teamA,alaSouthSummitPlayoff.teamB,alaSouthSummitPlayoff.actualScoreA,alaSouthSummitPlayoff.actualScoreB)))games.push(alaSouthSummitPlayoff);
games.sort((a,b)=>timeOf(a.date)-timeOf(b.date)||a.teamA.localeCompare(b.teamA));

const out={season:YEAR,generatedAt:new Date().toISOString(),teams:[...aligned].sort(),games};
fs.writeFileSync('full-season-2025.json',JSON.stringify(out));
console.log(`Built ${games.length} regular-season games for ${aligned.size} aligned programs.`);

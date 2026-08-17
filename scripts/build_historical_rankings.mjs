import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const CURRENT_SEASON=2026;
const teams=JSON.parse(fs.readFileSync(path.join(ROOT,'teams-data.json'),'utf8'));
const slug=v=>String(v??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const seasons=new Map();
let programsWithHistory=0;
let seasonRows=0;

for(const team of teams){
  const file=path.join(ROOT,'team-page-data',`${slug(team.team)}.json`);
  if(!fs.existsSync(file))continue;
  let data;
  try{data=JSON.parse(fs.readFileSync(file,'utf8'))}catch(err){console.warn('Skipping invalid team history',team.team,err.message);continue}
  const history=Array.isArray(data?.seasonHistory)?data.seasonHistory:[];
  let used=false;
  for(const s of history){
    const year=Number(s?.year),games=Number(s?.games||0);
    if(!Number.isFinite(year)||year>=CURRENT_SEASON||games<1)continue;
    if(!seasons.has(year))seasons.set(year,[]);
    seasons.get(year).push({
      team:String(team.team||'').trim(),year,
      rating:n(s.rating),wins:Number(s.wins||0),losses:Number(s.losses||0),ties:Number(s.ties||0),
      winPct:n(s.winPct),games,
      pointsFor:Number(s.pointsFor||0),pointsAgainst:Number(s.pointsAgainst||0),
      ppg:n(s.ppg),papg:n(s.papg),avgMargin:n(s.avgMargin),
      opponentWinPct:n(s.opponentWinPct),opponentsOpponentWinPct:n(s.opponentsOpponentWinPct),sos:n(s.sos),
      backgroundColor:String(team.backgroundColor||''),textColor:String(team.textColor||'')
    });
    seasonRows++;used=true;
  }
  if(used)programsWithHistory++;
}

const sortRows=(a,b)=>{
  const ar=Number(a.rating),br=Number(b.rating);
  if(Number.isFinite(br)||Number.isFinite(ar)){
    if(!Number.isFinite(ar))return 1;
    if(!Number.isFinite(br))return -1;
    if(br!==ar)return br-ar;
  }
  const aw=Number(a.winPct||0),bw=Number(b.winPct||0);if(bw!==aw)return bw-aw;
  const as=Number(a.sos||0),bs=Number(b.sos||0);if(bs!==as)return bs-as;
  const am=Number(a.avgMargin||0),bm=Number(b.avgMargin||0);if(bm!==am)return bm-am;
  return a.team.localeCompare(b.team);
};

const ordered={};
for(const year of [...seasons.keys()].sort((a,b)=>b-a))ordered[String(year)]=seasons.get(year).sort(sortRows);
const output={
  generatedAt:new Date().toISOString(),
  currentSeason:CURRENT_SEASON,
  summary:{seasons:Object.keys(ordered).length,programs:programsWithHistory,teamSeasonRows:seasonRows},
  seasons:ordered
};
fs.writeFileSync(path.join(ROOT,'historical-rankings-data.json'),JSON.stringify(output));
console.log(`Built historical-rankings-data.json: ${output.summary.seasons} seasons, ${programsWithHistory} programs, ${seasonRows} team-seasons`);

const alignmentFile=path.join(ROOT,'full-season-alignment-2025.json');
if(fs.existsSync(alignmentFile)){
  const alignment=JSON.parse(fs.readFileSync(alignmentFile,'utf8'));
  const expected=[...new Set((alignment.regions||[]).flatMap(r=>r.teams||[]).map(x=>String(x).trim()).filter(Boolean))];
  const expectedSet=new Set(expected);
  const actualList=(ordered['2025']||[]).map(x=>String(x.team).trim());
  const actual=new Set(actualList);
  const missing=expected.filter(team=>!actual.has(team));
  const extras=actualList.filter(team=>!expectedSet.has(team));
  console.log(`2025 coverage audit: ${actual.size} ranking rows; ${expected.length} alignment teams; ${expected.length-missing.length} aligned teams represented.`);
  console.log(`2025 missing from rankings: ${missing.length?missing.join(' | '):'none'}`);
  console.log(`2025 ranking teams outside alignment: ${extras.length?extras.join(' | '):'none'}`);
}

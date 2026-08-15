import fs from 'node:fs';

const SHEET_ID=process.env.SHEET_ID||'1IHr84tlMdZVAazLDh0HV7ZWoxNH4UpjpLt_UTV8KZwo';
const CLEAN_GAMES_GID=process.env.CLEAN_GAMES_GID||'627882418';
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).replace(/\s+/g,' ').toUpperCase();
const num=v=>{const s=clean(v).replace(/,/g,'');if(s==='')return null;const n=Number(s);return Number.isFinite(n)?n:null};
const aliases={'GUNNISON':'GUNNISON VALLEY','MAPLE MTN':'MAPLE MOUNTAIN','MONUMENT VAL':'MONUMENT VALLEY','CEDAR':'CEDAR CITY','SUMMIT':'SUMMIT ACADEMY','WASATCH ACAD':'WASATCH ACADEMY','WASATCH ACAD.':'WASATCH ACADEMY','HINKLEY':'HINCKLEY','BY HIGH':'BYH','BRIGHAM YOUNG':'BYH','AMERICAN LEADERSHIP':'ALA','AMERICAN LEADERSHIP ACADEMY':'ALA','AMRICAN FORK':'AMERICAN FORK','DESERET HILLS':'DESERT HILLS','MOUNUMENT VALLEY':'MONUMENT VALLEY','MONTUMENT VALLEY':'MONUMENT VALLEY','MOAPA VALLEY(NV)':'MOAPA VALLEY (NV)','VIRGIN VAL (NV)':'VIRGIN VALLEY (NV)','VIRGIN VALLEY (NV))':'VIRGIN VALLEY (NV)','BOULDER CITY(NV)':'BOULDER CITY (NV)','HIGHLAND, ID':'HIGHLAND (ID)','MARSH VALLEY(ID)':'MARSH VALLEY (ID)','ONEIDA ACAD.(ID)':'ONEIDA ACADEMY (ID)','RAYMOND, ALBERTA':'RAYMOND (ALBERTA)','ST LOUIS (HI)':'ST. LOUIS (HI)','CROWNPOINT (NM)':'CROWN POINT (NM)','KIRKLAND (NM)':'KIRTLAND (NM)','MTN CREST JV':'MOUNTAIN CREST JV','EAST HIGH 2ND TEAM':'EAST 2ND TEAM','WEST HIGH 2ND TEAM':'WEST 2ND TEAM','LAYTON CHRISTIAN ACADEMY':'LAYTON CHRISTIAN','UTAH MILITARY ACADEMY - CAMP WILLIAMS':'UMA-LEHI','UMA CAMP WILLIAMS':'UMA-LEHI'};
function team(v){const n=norm(v).replace(/\.+$/,'').trim();if(n.startsWith('WASATCH ACAD'))return'WASATCH ACADEMY';return aliases[n]||n}
const compact=v=>team(v).replace(/[^A-Z0-9]/g,'');
const slug=v=>team(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
function parseDate(v){const s=clean(v);let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(!m){const x=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(x)m=[x[0],x[2],x[3],x[1]]}if(!m)return null;return{year:+m[3],month:+m[1],day:+m[2],key:+m[3]*10000+(+m[1])*100+(+m[2]),ms:Date.UTC(+m[3],+m[1]-1,+m[2]),iso:`${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`}}
function parseCSV(text){const rows=[];let row=[],field='',q=false;for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'&&text[i+1]==='"'){field+='"';i++}else if(c==='"')q=false;else field+=c}else if(c==='"')q=true;else if(c===','){row.push(field);field=''}else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field=''}else field+=c}if(field.length||row.length){row.push(field.replace(/\r$/,''));rows.push(row)}return rows}
const pair=(a,b)=>[a,b].sort().join('|');
const sig=(a,sa,b,sb)=>[[a,sa],[b,sb]].sort((x,y)=>x[0].localeCompare(y[0])).map(x=>`${x[0]}:${x[1]}`).join('|');
const expected=(a,b)=>1/(1+Math.pow(10,(b-a)/400));
const round=x=>x>=0?Math.floor(x+.5):Math.ceil(x-.5);
const mov=m=>m<=1?1:1+.35*Math.pow(Math.log(Math.min(m,40))/Math.log(40),1.5);
function knownBad(date,a,b,sa,sb){const p=pair(a,b),s=sig(a,sa,b,sb);if(date==='9/19/2025'&&p==='MONUMENT VALLEY|PANGUITCH')return true;if(date==='10/18/2024'&&p==='COPPER HILLS|WESTLAKE'&&s==='COPPER HILLS:26|WESTLAKE:41')return true;return false}
function gameKey(date,a,b){const d=parseDate(date);return d?`${d.iso}|${compact(a)}|${compact(b)}`:''}

const teamRows=JSON.parse(fs.readFileSync('teams-data.json','utf8'));
const website=new Set(teamRows.map(t=>team(t.team)));
const weekly=fs.existsSync('weekly-simulation.json')?JSON.parse(fs.readFileSync('weekly-simulation.json','utf8')):{games:[]};
const details=fs.existsSync('deseret-game-details.json')?JSON.parse(fs.readFileSync('deseret-game-details.json','utf8')):{games:{}};
const candidates=[];
let sourceRows=0,verified2026=0,duplicatesRemoved=0,conflicts=0,knownCorrectionsRemoved=0;

const url=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${CLEAN_GAMES_GID}&range=${encodeURIComponent('A1:F50000')}`;
const res=await fetch(url);
if(!res.ok)throw new Error(`Clean Games download failed ${res.status}`);
const rows=parseCSV(await res.text());
for(let i=1;i<rows.length;i++){
  const r=rows[i],date=clean(r[0]),d=parseDate(date),a=team(r[1]),b=team(r[2]),sa=num(r[3]),sb=num(r[4]);
  if(!d||!a||!b||a===b||sa===null||sb===null)continue;
  if(d.year>=2026)continue;
  if(knownBad(date,a,b,sa,sb)){knownCorrectionsRemoved++;continue}
  sourceRows++;
  candidates.push({date,d,a,b,sa,sb,index:i,source:'historical',priority:1,pair:pair(a,b),sig:sig(a,sa,b,sb)});
}

for(let i=0;i<(weekly.games||[]).length;i++){
  const g=weekly.games[i],date=clean(g.date),d=parseDate(date);
  if(!d||d.year!==2026)continue;
  const a=team(g.awayTeam),b=team(g.homeTeam);
  let sa=null,sb=null,source='',priority=0;
  if(g.actualAway!==null&&g.actualAway!==undefined&&g.actualHome!==null&&g.actualHome!==undefined){
    sa=num(g.actualAway);sb=num(g.actualHome);source='weekly-final';priority=3;
  }else{
    const detail=details?.games?.[gameKey(date,a,b)]||details?.games?.[`${d.iso}|${compact(a)}|${compact(b)}`]||null;
    const box=detail?.boxScore?.rows||[];
    if(detail?.final===true&&box.length===2){sa=num(box[0]?.total);sb=num(box[1]?.total);source='deseret-final';priority=2}
  }
  if(!a||!b||a===b||sa===null||sb===null||!source)continue;
  verified2026++;
  candidates.push({date,d,a,b,sa,sb,index:1000000+i,source,priority,pair:pair(a,b),sig:sig(a,sa,b,sb)});
}

candidates.sort((x,y)=>x.d.ms-y.d.ms||x.index-y.index);
const exact=new Map(),lastSig=new Map(),games=[];
for(const g of candidates){
  const k=`${g.d.iso}|${g.pair}`,prior=exact.get(k);
  if(prior){
    duplicatesRemoved++;
    if(prior.sig!==g.sig){
      conflicts++;
      if(g.priority>prior.priority){const at=games.indexOf(prior);if(at>=0)games.splice(at,1);exact.delete(k)}else continue;
    }else if(g.priority<=prior.priority)continue;else{const at=games.indexOf(prior);if(at>=0)games.splice(at,1);exact.delete(k)}
  }
  const sk=`${g.pair}|${g.sig}`,near=lastSig.get(sk);
  if(g.d.year<2026&&near&&g.d.ms>near.d.ms&&(g.d.ms-near.d.ms)<=3*86400000){duplicatesRemoved++;continue}
  exact.set(k,g);lastSig.set(sk,g);games.push(g);
}
games.sort((x,y)=>x.d.key-y.d.key||x.index-y.index);

const ratings=new Map(),history={};
for(const t of website)history[t]=[];
const get=t=>ratings.has(t)?ratings.get(t):1500;
const gameChanges={};
for(const g of games){
  const ra=get(g.a),rb=get(g.b),aa=g.sa>g.sb?1:g.sa<g.sb?0:.5,ab=1-aa,m=Math.abs(g.sa-g.sb),mult=aa===.5?1:mov(m),ca=round(32*(aa-expected(ra,rb))*mult),cb=-ca,na=ra+ca,nb=rb+cb;
  ratings.set(g.a,na);ratings.set(g.b,nb);
  const resa=aa===1?'W':aa===0?'L':'T',resb=ab===1?'W':ab===0?'L':'T';
  const rowA={date:g.date,season:g.d.year,opponent:g.b,result:resa,eloBefore:ra,change:ca,eloAfter:na,margin:m,movMultiplier:+mult.toFixed(3)};
  const rowB={date:g.date,season:g.d.year,opponent:g.a,result:resb,eloBefore:rb,change:cb,eloAfter:nb,margin:m,movMultiplier:+mult.toFixed(3)};
  if(website.has(g.a))history[g.a].push(rowA);
  if(website.has(g.b))history[g.b].push(rowB);
  if(g.d.year===2026){
    const key=`${g.d.iso}|${compact(g.a)}|${compact(g.b)}`;
    gameChanges[key]={date:g.d.iso,awayTeam:g.a,homeTeam:g.b,awayScore:g.sa,homeScore:g.sb,source:g.source,away:{eloBefore:ra,change:ca,eloAfter:na},home:{eloBefore:rb,change:cb,eloAfter:nb}};
  }
}
for(const k of Object.keys(history))if(!history[k].length)delete history[k];
const summary={};
const live={updatedAt:new Date().toISOString(),teams:{}};
for(const [t,rs] of Object.entries(history)){
  const latest=rs.at(-1);let peak=rs[0];for(const r of rs)if(r.eloAfter>peak.eloAfter)peak=r;
  summary[t]={currentElo:latest.eloAfter,currentChange:latest.change,currentEloBefore:latest.eloBefore,currentDate:latest.date,currentOpponent:latest.opponent,currentResult:latest.result,peakElo:peak.eloAfter,peakDate:peak.date,peakSeason:peak.season,peakOpponent:peak.opponent,peakResult:peak.result};
  live.teams[t]={currentElo:latest.eloAfter,eloBefore:latest.eloBefore,change:latest.change,date:latest.date,opponent:latest.opponent,result:latest.result};
}
fs.writeFileSync('team-elo-history.json',JSON.stringify(history));
fs.writeFileSync('elo-summary.json',JSON.stringify(summary));
fs.writeFileSync('elo-live-summary.json',JSON.stringify(live));
fs.writeFileSync('elo-game-changes-2026.json',JSON.stringify({updatedAt:new Date().toISOString(),games:gameChanges},null,2)+'\n');
fs.writeFileSync('elo-cleanup-report.json',JSON.stringify({sourceRows,verified2026,uniqueGames:games.length,duplicatesRemoved,knownCorrectionsRemoved,conflicts,kFactor:32,startingElo:1500,verified2026FinalsOnly:true},null,2)+'\n');
for(const t of website){const p=`team-page-data/${slug(t)}.json`;if(!fs.existsSync(p))continue;const d=JSON.parse(fs.readFileSync(p,'utf8'));d.eloHistory=history[t]||[];fs.writeFileSync(p,JSON.stringify(d))}
console.log(`ELO rebuilt from ${games.length} games; verified 2026 finals ${Object.keys(gameChanges).length}.`);

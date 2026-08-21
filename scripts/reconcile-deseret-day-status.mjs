import fs from 'node:fs';

const WEEKLY='weekly-simulation.json',DETAILS='deseret-game-details.json',BASE='https://sports.deseret.com';
const clean=v=>String(v??'').trim();
const compact=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const confirmedFinalGameIds=new Set(['273455']);
const aliases={
  ALA:['American Leadership','American Leadership Academy'],
  AMERICANLEADERSHIP:['ALA','American Leadership Academy'],
  AMERICANLEADERSHIPACADEMY:['ALA','American Leadership'],
  CEDARCITY:['Cedar'],CEDAR:['Cedar City'],
  GRANDCOUNTY:['Grand'],GRAND:['Grand County'],
  GUNNISONVALLEY:['Gunnison'],GUNNISON:['Gunnison Valley'],
  LAYTONCHRISTIAN:['Layton Christian Academy','LCA'],
  LAYTONCHRISTIANACADEMY:['Layton Christian','LCA'],
  LCA:['Layton Christian','Layton Christian Academy'],
  MONUMENTVALLEY:['Monument Val'],MONUMENTVAL:['Monument Valley'],
  MAPLEMOUNTAIN:['Maple Mtn'],MAPLEMTN:['Maple Mountain'],
  UMALEHI:['UMA Camp Williams','Utah Military Camp Williams','Utah Military Academy Camp Williams'],
  UMACAMPWILLIAMS:['UMA-Lehi','Utah Military Camp Williams','Utah Military Academy Camp Williams'],
  UTAHMILITARYCAMPWILLIAMS:['UMA-Lehi','UMA Camp Williams','Utah Military Academy Camp Williams'],
  UTAHMILITARYACADEMYCAMPWILLIAMS:['UMA-Lehi','UMA Camp Williams','Utah Military Camp Williams']
};

function isoDate(v){
  let m=clean(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m)return`${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
  m=clean(v).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  return m?`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`:'';
}
const gameKey=g=>`${isoDate(g.date)}|${compact(g.awayTeam)}|${compact(g.homeTeam)}`;
const gameId=g=>{const m=clean(g.deseretUrl).match(/\/(\d+)\/?$/);return m?m[1]:''};
function decode(s){return String(s||'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))}
function textOf(html){return decode(html).replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/(?:p|div|li|tr|h[1-6]|section|article)>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/[ \t]+/g,' ').replace(/\n\s+/g,'\n').replace(/\n{3,}/g,'\n\n')}
function namesFor(v){const base=compact(v);return[...new Set([clean(v),...(aliases[base]||[])].filter(Boolean))]}
function escRe(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function positionsOfAny(hay,names){const out=[];for(const n of names){const re=new RegExp(`(^|[^A-Za-z0-9])${escRe(n).replace(/\\ /g,'\\s+')}(?=$|[^A-Za-z0-9])`,'ig');let m;while((m=re.exec(hay))){out.push(m.index+(m[1]?.length||0));if(m.index===re.lastIndex)re.lastIndex++}}return[...new Set(out)].sort((a,b)=>a-b)}

function segmentForGame(text,g){
  const away=positionsOfAny(text,namesFor(g.awayTeam)),home=positionsOfAny(text,namesFor(g.homeTeam));
  let best=null;
  for(const a of away)for(const h of home){const gap=Math.abs(a-h);if(gap>650)continue;if(!best||gap<best.gap)best={a,h,gap}}
  if(!best)return'';
  const lo=Math.min(best.a,best.h),hi=Math.max(best.a,best.h);
  return text.slice(Math.max(0,lo-280),Math.min(text.length,hi+700));
}

function markerPositions(seg,re){return[...seg.matchAll(re)].map(m=>m.index)}
function finalNearGame(seg,g){
  const away=positionsOfAny(seg,namesFor(g.awayTeam)),home=positionsOfAny(seg,namesFor(g.homeTeam));
  let best=null;
  for(const a of away)for(const h of home){const gap=Math.abs(a-h);if(gap>650)continue;if(!best||gap<best.gap)best={a,h,gap}}
  if(!best)return false;
  const lo=Math.min(best.a,best.h),hi=Math.max(best.a,best.h);
  const distance=pos=>pos<lo?lo-pos:pos>hi?pos-hi:0;
  const finals=markerPositions(seg,/\bFinal\b/ig);
  if(!finals.length)return false;
  const finalDist=Math.min(...finals.map(distance));
  const competing=[
    ...markerPositions(seg,/\bHalftime\b/ig),
    ...markerPositions(seg,/\bLive\b/ig),
    ...markerPositions(seg,/\bOT\b/ig),
    ...markerPositions(seg,/\b(?:Q\s*[1-4]|[1-4]\s*Q|[1-4](?:st|nd|rd|th)(?:\s+quarter)?)\b/ig),
    ...markerPositions(seg,/\bScheduled\b/ig),
    ...markerPositions(seg,/\b\d{1,2}(?::\d{2})?\s*[AP]M\b/ig)
  ];
  const otherDist=competing.length?Math.min(...competing.map(distance)):Infinity;
  // A status badge for this matchup should sit close to its two team names.
  // Keeping this window tight prevents a neighboring game's Final badge from leaking in.
  return finalDist<=240&&finalDist<=otherDist;
}

function liveStateForGame(text,g){
  const seg=segmentForGame(text,g);
  if(!seg)return{status:'',clock:'',period:''};
  if(finalNearGame(seg,g))return{status:'Final',clock:'',period:''};

  let m=seg.match(/\b(\d{1,2}:\d{2}(?:\.\d+)?)\s*(?:left|remaining)?\s*(?:in\s*(?:the\s*)?)?(?:Q\s*([1-4])|([1-4])\s*Q|([1-4])(?:st|nd|rd|th)(?:\s+quarter)?)/i);
  if(m){const period=`Q${m[2]||m[3]||m[4]}`;return{status:period,clock:m[1],period}}
  m=seg.match(/\b(?:Q\s*([1-4])|([1-4])\s*Q|([1-4])(?:st|nd|rd|th)(?:\s+quarter)?)\s*[-–—|•:]?\s*(\d{1,2}:\d{2}(?:\.\d+)?)/i);
  if(m){const period=`Q${m[1]||m[2]||m[3]}`;return{status:period,clock:m[4],period}}

  const q=seg.match(/\b(?:Q\s*([1-4])|([1-4])Q|([1-4])(?:st|nd|rd|th)(?:\s+quarter)?)\b/i);
  if(q){const period=`Q${q[1]||q[2]||q[3]}`;return{status:period,clock:'',period}}
  if(/\bHalftime\b/i.test(seg))return{status:'HALFTIME',clock:'',period:'HALFTIME'};
  if(/\bOT\b/i.test(seg))return{status:'OT',clock:'',period:'OT'};
  if(/\bLive\b/i.test(seg))return{status:'Live',clock:'',period:''};
  return{status:'',clock:'',period:''};
}

function directGamePageFinal(html,g){
  const raw=String(html||'');
  const topRaw=raw.slice(0,Math.min(raw.length,220000));
  if(/['"](?:status|gameStatus)['"]\s*:\s*['"]Final['"]/i.test(topRaw))return true;
  const text=textOf(topRaw);
  const beforeDetails=text.split(/Game Details/i)[0]||text.slice(0,12000);
  const away=positionsOfAny(beforeDetails,namesFor(g.awayTeam));
  const home=positionsOfAny(beforeDetails,namesFor(g.homeTeam));
  if(away.length&&home.length&&/\bFinal\b/i.test(beforeDetails))return true;
  return false;
}

function lineScore(seg,names){
  const lines=String(seg||'').split(/\n+/).map(clean).filter(Boolean);
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    if(!names.some(n=>new RegExp(`(^|[^A-Za-z0-9])${escRe(n).replace(/\\ /g,'\\s+')}(?=$|[^A-Za-z0-9])`,'i').test(line)))continue;
    const local=[line,lines[i+1]||''].join(' ')
      .replace(/\(\s*\d+\s*-\s*\d+(?:\s*-\s*\d+)?\s*\)/g,' ')
      .replace(/\b(?:19|20)\d{2}\b/g,' ')
      .replace(/\b\d{1,2}:\d{2}\b/g,' ');
    const nums=[...local.matchAll(/(?:^|[^A-Za-z0-9])(\d{1,3})(?=$|[^A-Za-z0-9])/g)].map(m=>Number(m[1])).filter(n=>Number.isInteger(n)&&n>=0&&n<=199);
    if(nums.length)return nums[nums.length-1];
  }
  return null;
}

function scoreForGame(text,g,status){
  if(!status||!(/^(?:FINAL|LIVE|HALFTIME|OT|Q[1-4])$/i.test(status)))return null;
  const seg=segmentForGame(text,g);if(!seg)return null;
  const away=lineScore(seg,namesFor(g.awayTeam)),home=lineScore(seg,namesFor(g.homeTeam));
  return Number.isInteger(away)&&Number.isInteger(home)?{away,home}:null;
}

function currentTotals(d){
  const rows=d?.boxScore?.rows;
  const away=Number(rows?.[0]?.total),home=Number(rows?.[1]?.total);
  return Number.isFinite(away)&&Number.isFinite(home)?{away,home}:null;
}

function applyDayScore(d,g,score){
  if(!score)return false;
  const rows=d?.boxScore?.rows;
  if(Array.isArray(rows)&&rows.length===2){
    const oldAway=Number(rows[0]?.total),oldHome=Number(rows[1]?.total);
    if(oldAway===score.away&&oldHome===score.home)return false;
    rows[0].total=score.away;
    rows[1].total=score.home;
    d.scoreSource='deseret-day-scoreboard';
    return true;
  }
  d.boxScore={periods:['Q1','Q2','Q3','Q4'],rows:[
    {team:g.awayTeam,quarters:[null,null,null,null],total:score.away},
    {team:g.homeTeam,quarters:[null,null,null,null],total:score.home}
  ],source:'deseret-day-scoreboard'};
  d.scoreSource='deseret-day-scoreboard';
  return true;
}

async function fetchHtml(url){
  const target=new URL(url);target.searchParams.set('_rus',String(Date.now()));
  const r=await fetch(target,{headers:{'user-agent':'Mozilla/5.0 (compatible; RuralUtahSports/1.0; +https://ruralutahsports.github.io/)','cache-control':'no-cache','pragma':'no-cache'},signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);
  return r.text();
}

if(!fs.existsSync(WEEKLY)||!fs.existsSync(DETAILS))process.exit(0);
const weekly=JSON.parse(fs.readFileSync(WEEKLY,'utf8'));
const details=JSON.parse(fs.readFileSync(DETAILS,'utf8'));
const games=(weekly.games||[]).filter(g=>clean(g.deseretUrl));
let updated=0;

for(const g of games){
  if(!confirmedFinalGameIds.has(gameId(g)))continue;
  const key=gameKey(g),d=details.games?.[key];
  if(d&&(!d.final||d.status!=='Final'||d.finalSource!=='confirmed')){
    d.status='Final';d.final=true;d.clock='';d.period='';d.finalSource='confirmed';updated++;
    console.log(`Marked confirmed Final: ${key}`);
  }
}

const dates=[...new Set(games.map(g=>isoDate(g.date)).filter(Boolean))];
for(const date of dates){
  const delta=(Date.parse(`${date}T12:00:00Z`)-Date.now())/86400000;
  if(delta>2.25||delta<-2.25)continue;
  let html;
  try{html=await fetchHtml(`${BASE}/high-school/football/scores-schedule/${date}?region=all`)}catch(e){console.warn(`Day status ${date}: ${e.message}`);continue}
  const text=textOf(html);
  for(const g of games.filter(x=>isoDate(x.date)===date)){
    let state=liveStateForGame(text,g);if(!state.status)continue;
    const key=gameKey(g),d=details.games?.[key];if(!d)continue;
    let stateSource='deseret-day-scoreboard';
    if(/^Live$/i.test(state.status)&&!state.clock&&!state.period&&d?.boxScore?.rows?.length===2){
      try{
        const gameHtml=await fetchHtml(g.deseretUrl);
        if(directGamePageFinal(gameHtml,g)){
          state={status:'Final',clock:'',period:''};
          stateSource='deseret-game-page';
          console.log(`Direct game page confirms Final: ${key}`);
        }
      }catch(e){console.warn(`Direct status fallback ${key}: ${e.message}`)}
    }
    if(d.final===true&&!d.finalSource){
      // An untagged Final entering this reconciler came from the specific game-page scraper.
      d.finalSource='deseret-game-page';updated++;
      console.log(`Preserved game-page Final source: ${key}`);
    }
    const confirmed=confirmedFinalGameIds.has(gameId(g));
    const gamePageFinal=d.final===true&&d.finalSource==='deseret-game-page';
    const before=currentTotals(d);
    const score=scoreForGame(text,g,state.status);
    const scoreChanged=!!score&&(!before||before.away!==score.away||before.home!==score.home);

    if(state.status==='Final'){
      if(!d.final||d.status!=='Final'||d.clock||d.period||d.finalSource!==stateSource){
        d.status='Final';d.final=true;d.clock='';d.period='';d.finalSource=stateSource;updated++;
        console.log(`Marked Final from ${stateSource}: ${key}`);
      }
    }else if(!confirmed&&!gamePageFinal){
      let nextStatus=state.status,nextClock=state.clock,nextPeriod=state.period;
      const priorSpecific=/^(?:Q[1-4]|HALFTIME|OT)$/i.test(String(d.status||''));
      if(state.status==='Live'&&priorSpecific&&!scoreChanged){
        nextStatus=d.status;nextClock=d.clock||'';nextPeriod=d.period||'';
      }else if(state.status==='Live'&&priorSpecific&&scoreChanged){
        // A changed score proves the game moved on; never leave a stale halftime/clock label visible.
        nextStatus='Live';nextClock='';nextPeriod='';
      }
      const hadFinalSource=!!d.finalSource;
      if(d.final||d.status!==nextStatus||String(d.clock||'')!==String(nextClock||'')||String(d.period||'')!==String(nextPeriod||'')||hadFinalSource){
        d.final=false;d.status=nextStatus;d.clock=nextClock||'';d.period=nextPeriod||'';delete d.finalSource;updated++;
        console.log(`Corrected live state from day scoreboard: ${key} -> ${nextStatus}${nextClock?` ${nextClock}`:''}`);
      }
    }

    if(applyDayScore(d,g,score)){updated++;console.log(`Updated verified day-scoreboard score: ${key} -> ${score.away}-${score.home}`)}
  }
}

details.updatedAt=new Date().toISOString();
fs.writeFileSync(DETAILS,JSON.stringify(details,null,2)+'\n');
console.log(`Deseret day-status reconciliation updated ${updated} fields.`);

import fs from 'node:fs';

const WEEKLY='weekly-simulation.json';
const DETAILS='deseret-game-details.json';
const BASE='https://sports.deseret.com';
const TIME_ZONE='America/Denver';
const GRACE_MINUTES=20;

const clean=v=>String(v??'').trim();
const compact=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');

function isoDate(v){
  let m=clean(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m)return`${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
  m=clean(v).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  return m?`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`:'';
}

const gameKey=g=>`${isoDate(g.date)}|${compact(g.awayTeam)}|${compact(g.homeTeam)}`;

function decode(s){
  return String(s||'')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));
}

function textOf(html){
  return decode(html)
    .replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
    .replace(/<br\s*\/?\s*>/gi,'\n')
    .replace(/<\/(?:p|div|li|tr|h[1-6]|section|article)>/gi,'\n')
    .replace(/<[^>]+>/g,' ')
    .replace(/[ \t]+/g,' ')
    .replace(/\n\s+/g,'\n')
    .replace(/\n{3,}/g,'\n\n');
}

function utahNow(){
  const parts=Object.fromEntries(
    new Intl.DateTimeFormat('en-US',{
      timeZone:TIME_ZONE,
      year:'numeric',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',hourCycle:'h23'
    }).formatToParts(new Date())
      .filter(p=>p.type!=='literal')
      .map(p=>[p.type,p.value])
  );
  return{
    date:`${parts.year}-${parts.month}-${parts.day}`,
    minutes:Number(parts.hour)*60+Number(parts.minute)
  };
}

function segmentForGame(text,g){
  const lower=String(text||'').toLowerCase();
  const away=clean(g.awayTeam).toLowerCase();
  const home=clean(g.homeTeam).toLowerCase();
  let a=lower.indexOf(away),h=lower.indexOf(home);

  // A few source labels differ from our internal team labels. Keep this
  // fallback intentionally conservative so we never match a neighboring game.
  if(a<0&&compact(g.awayTeam)==='SAINTJOSEPH')a=lower.indexOf('st. joseph');
  if(h<0&&compact(g.homeTeam)==='SAINTJOSEPH')h=lower.indexOf('st. joseph');
  if(a<0||h<0||Math.abs(a-h)>700)return'';
  const lo=Math.min(a,h),hi=Math.max(a,h);
  return text.slice(Math.max(0,lo-260),Math.min(text.length,hi+260));
}

function kickoffMinutes(seg){
  const m=String(seg||'').match(/\bUpcoming\b[\s\S]{0,180}?@\s*(\d{1,2}):(\d{2})\s*([AP]M)\b/i);
  if(!m)return null;
  let hour=Number(m[1]);
  const minute=Number(m[2]);
  const ampm=m[3].toUpperCase();
  if(hour===12)hour=0;
  if(ampm==='PM')hour+=12;
  if(hour<0||hour>23||minute<0||minute>59)return null;
  return hour*60+minute;
}

function hasRealGameEvidence(d){
  if(clean(d?.clock)||clean(d?.period))return true;
  if(Array.isArray(d?.scoringPlays)&&d.scoringPlays.length)return true;
  if(Array.isArray(d?.boxScore?.rows)&&d.boxScore.rows.length===2)return true;
  return false;
}

async function fetchHtml(url){
  const target=new URL(url);
  target.searchParams.set('_rus',String(Date.now()));
  const r=await fetch(target,{
    headers:{
      'user-agent':'Mozilla/5.0 (compatible; RuralUtahSports/1.0; +https://ruralutahsports.github.io/)',
      'cache-control':'no-cache',
      'pragma':'no-cache'
    },
    signal:AbortSignal.timeout(15000)
  });
  if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);
  return r.text();
}

if(!fs.existsSync(WEEKLY)||!fs.existsSync(DETAILS))process.exit(0);

const weekly=JSON.parse(fs.readFileSync(WEEKLY,'utf8'));
const details=JSON.parse(fs.readFileSync(DETAILS,'utf8'));
const now=utahNow();
const games=(weekly.games||[]).filter(g=>isoDate(g.date)===now.date&&clean(g.deseretUrl));

if(!games.length){
  console.log('Kickoff fallback: no games today.');
  process.exit(0);
}

let html;
try{
  html=await fetchHtml(`${BASE}/high-school/football/scores-schedule/${now.date}?region=all`);
}catch(e){
  console.warn(`Kickoff fallback: ${e.message}`);
  process.exit(0);
}

const text=textOf(html);
let updated=0;

for(const g of games){
  const key=gameKey(g);
  const d=details.games?.[key];
  if(!d||d.final===true||!/^Scheduled$/i.test(clean(d.status))||hasRealGameEvidence(d))continue;

  const seg=segmentForGame(text,g);
  if(!seg)continue;
  const kickoff=kickoffMinutes(seg);
  if(kickoff===null)continue;

  // Deseret sometimes leaves an already-started game labeled Upcoming until
  // the first score/status report arrives. After a 20-minute grace period,
  // show a generic Live state. We never invent a quarter, clock, or score.
  if(now.minutes<kickoff+GRACE_MINUTES)continue;

  d.status='Live';
  d.final=false;
  d.clock='';
  d.period='';
  d.statusSource='kickoff-time-fallback';
  d.kickoffFallbackAt=new Date().toISOString();
  updated++;
  console.log(`Kickoff fallback marked Live: ${key}`);
}

if(updated){
  details.updatedAt=new Date().toISOString();
  fs.writeFileSync(DETAILS,JSON.stringify(details,null,2)+'\n');
}
console.log(`Kickoff live fallback updated ${updated} game(s).`);

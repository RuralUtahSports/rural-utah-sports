(()=>{
'use strict';
const D=window.RUSDynastySim;
if(!D||window.__RUSDynastyModelV2)return;
window.__RUSDynastyModelV2=true;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const rand01=s=>{const x=Math.sin(hash(s)||1)*10000;return x-Math.floor(x)};
const jitter=(team,year,span,salt='')=>(rand01(`${team}|${year}|${salt}`)*2-1)*span;
const classNum={'6A':6,'5A':5,'4A':4,'3A':3,'2A':2,'1A':1,'8P':0};
function rebuildUndefeated(c,seasons){
  let cur=0,best=0;
  for(const s of [...(seasons||[])].sort((a,b)=>(a.year||0)-(b.year||0))){
    if(s?.undefeated){cur++;best=Math.max(best,cur)}else cur=0;
  }
  c.currentUndefeatedSeasonStreak=cur;
  c.longestUndefeatedSeasonStreak=Math.max(c.longestUndefeatedSeasonStreak||0,best);
}
function migrate(U){
  if(!U?.teams)return U;
  for(const name of U.teamOrder||Object.keys(U.teams)){
    const t=U.teams[name];if(!t)continue;
    t.career=t.career||{};
    rebuildUndefeated(t.career,t.seasons);
    if(!Number.isFinite(t.programRating))t.programRating=Math.round(clamp(1500+(Number(t.elo||1500)-1500)*0.7,1150,1950));
  }
  U.modelVersion=2;
  return U;
}
function seasonTarget(s,wonRegion){
  const w=(s?.w||0)+(s?.playoffW||0),l=(s?.l||0)+(s?.playoffL||0),g=w+l+(s?.t||0);
  const p=g?w/g:.5;
  let target=1500+(p-.5)*420;
  if(s?.championship)target+=100;
  else if(s?.runnerUp)target+=45;
  if(wonRegion)target+=25;
  if(s?.undefeated)target+=45;
  return clamp(target,1150,1950);
}
function makeSchedule(U,year,seed){
  const teams=(U.teamOrder||[]).filter(n=>U.teams[n]);
  const count=new Map(teams.map(n=>[n,0])),pairs=new Set(),games=[];
  const add=(a,b)=>{
    if(!a||!b||a===b||count.get(a)>=10||count.get(b)>=10)return false;
    const key=[a,b].sort().join('|');if(pairs.has(key))return false;
    pairs.add(key);games.push({a,b});count.set(a,count.get(a)+1);count.set(b,count.get(b)+1);return true;
  };
  const groups=new Map();
  for(const n of teams){const t=U.teams[n],k=`${t.classification}|${t.region}`;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(n)}
  for(const g of groups.values()){const list=[...g].sort();for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++)add(list[i],list[j])}
  let guard=0;
  while([...count.values()].some(v=>v<10)&&guard++<6000){
    let changed=false;
    const needy=teams.filter(n=>count.get(n)<10).sort((a,b)=>count.get(a)-count.get(b)||rand01(`${year}|${seed}|${a}|order`)-rand01(`${year}|${seed}|${b}|order`));
    for(const a of needy){
      if(count.get(a)>=10)continue;
      const A=U.teams[a],slot=count.get(a),mode=Math.floor(rand01(`${year}|${seed}|${a}|${slot}|mode`)*5);
      const targetDiff=mode<=1?0:mode===2?120:mode===3?240:360;
      const candidates=teams.filter(b=>b!==a&&count.get(b)<10&&!pairs.has([a,b].sort().join('|')));
      candidates.sort((b,c)=>{
        const B=U.teams[b],C=U.teams[c],ad=A.programRating??A.elo??1500;
        const bd=B.programRating??B.elo??1500,cd=C.programRating??C.elo??1500;
        const classB=Math.abs((classNum[A.classification]??3)-(classNum[B.classification]??3))*95;
        const classC=Math.abs((classNum[A.classification]??3)-(classNum[C.classification]??3))*95;
        const strengthB=Math.abs(Math.abs(ad-bd)-targetDiff)*.55;
        const strengthC=Math.abs(Math.abs(ad-cd)-targetDiff)*.55;
        const noiseB=rand01(`${year}|${seed}|${a}|${b}|pick`)*180;
        const noiseC=rand01(`${year}|${seed}|${a}|${c}|pick`)*180;
        return classB+strengthB+noiseB-(classC+strengthC+noiseC);
      });
      if(candidates[0]&&add(a,candidates[0]))changed=true;
    }
    if(!changed)break;
  }
  const start=new Date(year,7,14),used=new Map();
  for(const g of games){
    const au=used.get(g.a)||new Set(),bu=used.get(g.b)||new Set();let w=0;
    while(w<10&&(au.has(w)||bu.has(w)))w++;
    if(w>=10)w=Math.min(9,Math.max(au.size,bu.size));
    au.add(w);bu.add(w);used.set(g.a,au);used.set(g.b,bu);
    const d=new Date(start);d.setDate(start.getDate()+w*7);g.date=`${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
  }
  return games;
}
function injectSchedule(data,U,year,seed){
  const key=String(year),saved=new Map();
  for(const n of U.teamOrder||[]){
    data.schedules[n]=data.schedules[n]||{};
    saved.set(n,Object.prototype.hasOwnProperty.call(data.schedules[n],key)?data.schedules[n][key]:undefined);
    data.schedules[n][key]=[];
  }
  for(const g of makeSchedule(U,year,seed)){
    data.schedules[g.a][key].push({date:g.date,opponent:g.b});
    data.schedules[g.b][key].push({date:g.date,opponent:g.a});
  }
  return()=>{for(const [n,old] of saved){if(old===undefined)delete data.schedules[n][key];else data.schedules[n][key]=old}};
}
const baseNew=D.newUniverse;
D.newUniverse=async(...args)=>{
  const U=migrate(await baseNew(...args));
  for(const name of U.teamOrder||[]){
    const t=U.teams[name];
    t.programRating=Math.round(clamp(1500+(Number(t.elo||1500)-1500)*0.72,1150,1950));
  }
  D.save(U);return U;
};
const baseLoadSave=D.loadSave;
D.loadSave=()=>migrate(baseLoadSave());
const baseSim=D.simulateSeason;
D.simulateSeason=async(U,seed=Date.now()%100000)=>{
  migrate(U);
  const before=U.seasons?.length||0,useGenerated=!(before===0&&U.mode==='historical');
  let restoreSchedule=null,oldSeasons=null,oldMode=null,oldSave=null;
  if(useGenerated){
    const data=await D.load();
    restoreSchedule=injectSchedule(data,U,U.currentSeason,seed);
    oldSeasons=U.seasons;oldMode=U.mode;oldSave=D.save;
    U.seasons=[];U.mode='historical';D.save=()=>{};
  }
  try{await baseSim(U,seed)}
  finally{
    if(useGenerated){
      const produced=U.seasons?.at(-1);
      U.seasons=oldSeasons;
      if(produced){produced.scheduleSource='Generated schedule';U.seasons.push(produced)}
      U.mode=oldMode;D.save=oldSave;restoreSchedule?.();
    }
  }
  if((U.seasons?.length||0)>before){
    const completed=U.seasons.at(-1),year=completed?.year||U.currentSeason;
    const regionWinners=new Set((completed?.regionTitles||[]).map(x=>x.team));
    for(const name of U.teamOrder||[]){
      const t=U.teams[name],s=t?.seasons?.at(-1);if(!t||!s||s.year!==year)continue;
      rebuildUndefeated(t.career,t.seasons);
      const target=seasonTarget(s,regionWinners.has(name)),shock=jitter(name,year,24,'program');
      t.programRating=Math.round(clamp((t.programRating||1500)*0.88+target*0.12+shock,1150,1950));
    }
    D.save(U);
  }
  return U;
};
D.advance=U=>{
  migrate(U);
  if(!U?.seasonComplete)return U;
  U.currentSeason++;
  const year=U.currentSeason;
  for(const name of U.teamOrder||[]){
    const t=U.teams[name];if(!t)continue;
    const end=Number(t.elo||1500),program=Number(t.programRating||1500),rosterShock=jitter(name,year,55,'roster');
    t.elo=Math.round(clamp(1500+(end-1500)*0.84+(program-1500)*0.18+rosterShock,1050,2050));
    t.career.bestElo=Math.max(t.career.bestElo||0,t.elo);
  }
  U.seasonComplete=false;D.save(U);return U;
};
D.MODEL_INFO={version:2,eloCarryover:.84,programPersistence:.88,rosterSwing:55,scheduleMix:'region games plus varied non-region strength targets'};
})();
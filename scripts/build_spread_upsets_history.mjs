import fs from 'node:fs';

const WEEKLY='weekly-simulation.json';
const OUT='spread-upsets-history.json';
const HOME_FIELD_POINTS=3;
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toUpperCase().replace(/\s+/g,' ');
const num=v=>{if(v===null||v===undefined||clean(v)==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
const isoDate=v=>{const s=clean(v);let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return m[3]+'-'+m[1].padStart(2,'0')+'-'+m[2].padStart(2,'0');m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);return m?m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0'):s};
const yearOf=v=>{const m=clean(v).match(/(20\d{2})/);return m?Number(m[1]):null};
const key=g=>isoDate(g.date)+'|'+norm(g.awayTeam)+'|'+norm(g.homeTeam);

const feed=JSON.parse(fs.readFileSync(WEEKLY,'utf8'));
const prior=fs.existsSync(OUT)?JSON.parse(fs.readFileSync(OUT,'utf8')):{rows:[]};
const byKey=new Map((prior.rows||[]).map(r=>[key(r),r]));
let evaluated=0,upsets=0;

for(const g of feed.games||[]){
  const pa=num(g.awayScore),rawHome=num(g.homeScore),aa=num(g.actualAway),ah=num(g.actualHome);
  if([pa,rawHome,aa,ah].some(v=>v===null))continue;
  const k=key(g);
  evaluated++;
  if(aa===ah){byKey.delete(k);continue}
  const ph=rawHome+HOME_FIELD_POINTS;
  if(pa===ph){byKey.delete(k);continue}
  const favorite=pa>ph?g.awayTeam:g.homeTeam;
  const winner=aa>ah?g.awayTeam:g.homeTeam;
  if(norm(favorite)===norm(winner)){byKey.delete(k);continue}
  const spread=Math.abs(pa-ph);
  byKey.set(k,{
    season:yearOf(g.date),
    date:clean(g.date),
    awayTeam:clean(g.awayTeam),
    homeTeam:clean(g.homeTeam),
    winner:clean(winner),
    favorite:clean(favorite),
    spread,
    lineLabel:clean(favorite)+' -'+spread,
    projectedAway:pa,
    projectedHome:ph,
    projectedTotal:pa+ph,
    actualAway:aa,
    actualHome:ah,
    finalMargin:Math.abs(aa-ah)
  });
  upsets++;
}

const rows=[...byKey.values()].sort((a,b)=>Number(b.spread)-Number(a.spread)||Number(b.season)-Number(a.season)||isoDate(a.date).localeCompare(isoDate(b.date)));
const seasons=[...new Set(rows.map(r=>Number(r.season)).filter(Number.isFinite))].sort((a,b)=>b-a);
fs.writeFileSync(OUT,JSON.stringify({updatedAt:new Date().toISOString(),homeFieldPoints:HOME_FIELD_POINTS,seasons,rows},null,2)+'\n');
console.log('Spread upset history: evaluated '+evaluated+' lined finals; '+upsets+' current-feed upsets; '+rows.length+' stored rows.');

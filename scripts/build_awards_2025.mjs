import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const scoring=require('../award-scoring-core.js');

const SEASON=2025,ROSTERS='deseret-rosters-stats-2025.json',ALIGN='full-season-alignment-2025.json',GAMES='scorigami.json',OUT='awards-2025.json';
const clean=v=>String(v??'').trim(),compact=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const aliases={CEDAR:'CEDARCITY',CEDARCITY:'CEDARCITY',GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISONVALLEY',MONUMENTVAL:'MONUMENTVALLEY',MAPLEMTN:'MAPLEMOUNTAIN',AMERICANLEADERSHIP:'ALA',AMERICANLEADERSHIPACADEMY:'ALA'};
const canon=v=>aliases[compact(v)]||compact(v);
const rural=new Set(['3A','2A','1A','8P','8-PLAYER']),big=new Set(['6A','5A','4A']);
const classWeight={'6A':1.18,'5A':1.14,'4A':1.08,'3A':1,'2A':.95,'1A':.90,'8P':.88,'8-PLAYER':.88};
const n=v=>{const m=String(v??'').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):0};
function normPos(v){const x=clean(v).toUpperCase();if(/QB/.test(x))return'QB';if(/RB|HB|FB/.test(x))return'RB';if(/WR|SE|FL/.test(x))return'WR';if(/TE/.test(x))return'TE';if(/OL|OT|OG|G\b|T\b|C\b/.test(x))return'OL';if(/DL|DE|DT|NT/.test(x))return'DL';if(/LB/.test(x))return'LB';if(/DB|CB|FS|SS|SAF/.test(x))return'DB';if(/K|P/.test(x))return'K/P';return'ATH'}
function gradYear(v){const m=clean(v).match(/20\d{2}/);return m?Number(m[0]):null}
function seasonEligible(v){const y=gradYear(v);return y===null||y>=SEASON+1}

// Preserve the original overall/MVP model. Position teams use the same shared
// scoring core as the live award watch.
function legacyStatPoints(cat,vals){const get=(...keys)=>{for(const [k,v] of Object.entries(vals||{}))if(keys.some(x=>compact(k).includes(compact(x))))return n(v);return 0};if(/^Pass/i.test(cat))return get('Yards')*.018+get('TD')*4-get('Int')*2+get('Comp %')*.05;if(/^Rush/i.test(cat))return get('Yards')*.035+get('TD')*6;if(/^Receiv/i.test(cat))return get('Yards')*.035+get('TD')*6+get('Receptions')*.35;if(/^Kick/i.test(cat))return get('FG')*3+get('PAT')+get('Return TD')*6;if(/Defense/i.test(cat))return get('Tackles')*.6+get('Sacks')*3+Math.max(get('Pass Int'),get('Interceptions'))*4+get('Defense TD')*6+get('Return TD')*6;return 0}
function side(cat){return /Defense/i.test(cat)?'Defense':(/Passing|Rushing|Receiving|Kicking/i.test(cat)?'Offense':'Other')}
function yearOf(v){const m=String(v||'').match(/(18\d{2}|19\d{2}|20\d{2})/);return m?+m[1]:0}
function flatten(data){const out=[];for(const e of data.scores||[])for(const g of e.games||[]){if(yearOf(g.date)!==SEASON)continue;if(g.tie)out.push({a:canon(g.team1),b:canon(g.team2),sa:+g.score1,sb:+g.score2,tie:true});else out.push({a:canon(g.winner),b:canon(g.loser),sa:+g.winnerScore,sb:+g.loserScore,tie:false})}return out}
if(!fs.existsSync(ROSTERS))throw new Error(`${ROSTERS} missing; run the 2025 archive builder first`);
const rosterData=JSON.parse(fs.readFileSync(ROSTERS,'utf8')),alignment=JSON.parse(fs.readFileSync(ALIGN,'utf8')),scorigami=JSON.parse(fs.readFileSync(GAMES,'utf8'));
const meta=new Map();for(const r of alignment.regions||[])for(const team of r.teams||[])meta.set(canon(team),{team,classification:r.classification,region:r.region});
const records=new Map([...meta].map(([k])=>[k,{w:0,l:0,t:0,g:0}]));for(const g of flatten(scorigami)){if(records.has(g.a)){records.get(g.a).g++;if(g.tie)records.get(g.a).t++;else records.get(g.a).w++}if(records.has(g.b)){records.get(g.b).g++;if(g.tie)records.get(g.b).t++;else records.get(g.b).l++}}
const players=new Map();for(const [teamName,t] of Object.entries(rosterData.teams||{})){const m=meta.get(canon(teamName));if(!m)continue;const rosterById=new Map((t.roster||[]).map(p=>[p.playerId,p]));for(const sec of t.stats||[])for(const row of sec.rows||[]){const rp=rosterById.get(row.playerId)||{};if(!seasonEligible(rp.class))continue;const id=row.playerId||`${teamName}|${row.number}|${row.name}`;if(!players.has(id)){players.set(id,{id,team:m.team,name:row.name,number:row.number,classYear:rp.class||'',rawPosition:rp.position||'',position:normPos(rp.position),classification:m.classification,region:m.region,offense:0,defense:0,lines:[]})}const p=players.get(id),pts=legacyStatPoints(sec.category,row.values);if(side(sec.category)==='Defense')p.defense+=pts;else if(side(sec.category)==='Offense')p.offense+=pts;p.lines.push({category:sec.category,points:+pts.toFixed(2),values:row.values})}}
for(const p of players.values()){
  const r=records.get(canon(p.team))||{w:0,l:0,t:0,g:0};
  p.teamRecord={wins:r.w,losses:r.l,ties:r.t,games:r.g};p.teamWinPct=r.g?(r.w+r.t*.5)/r.g:0;p.teamBonus=Math.min(8,p.teamWinPct*8);
  p.rawScore=Math.max(p.offense,p.defense)+Math.min(p.offense,p.defense)*.35+p.teamBonus;
  p.weight=classWeight[p.classification]||1;p.allUtahScore=p.rawScore*p.weight;p.mvpScore=p.rawScore;p.ruralMvpScore=rural.has(p.classification)?p.rawScore:0;p.bigMvpScore=big.has(p.classification)?p.rawScore:0;
  p.positionScore=scoring.positionScore(p.position,p.lines);
  p.allUtahPositionScore=p.positionScore*p.weight;
  p.lines.sort((a,b)=>b.points-a.points);
  p.positionLines=p.lines.filter(line=>scoring.positionLineAllowed(p.position,line.category)).sort((a,b)=>scoring.categoryScore(b.category,b.values,p.position)-scoring.categoryScore(a.category,a.values,p.position));
}
const all=[...players.values()].filter(p=>p.rawScore>0||p.positionScore>0);
const publicPlayer=p=>({id:p.id,team:p.team,name:p.name,number:p.number,classYear:p.classYear,position:p.position,rawPosition:p.rawPosition,classification:p.classification,region:p.region,offense:+p.offense.toFixed(2),defense:+p.defense.toFixed(2),teamRecord:p.teamRecord,teamWinPct:+p.teamWinPct.toFixed(4),teamBonus:+p.teamBonus.toFixed(2),rawScore:+p.rawScore.toFixed(2),allUtahScore:+p.allUtahScore.toFixed(2),positionScore:+p.positionScore.toFixed(2),allUtahPositionScore:+p.allUtahPositionScore.toFixed(2),topLines:p.lines.slice(0,3),positionTopLines:p.positionLines.slice(0,3)});
const rank=(rows,score,limit=30)=>rows.slice().sort((a,b)=>score(b)-score(a)||b.rawScore-a.rawScore||a.name.localeCompare(b.name)).slice(0,limit).map(publicPlayer);
const positions=['QB','RB','WR','TE','OL','DL','LB','DB','K/P','ATH'];
const byPosition=(rows,score,limit)=>Object.fromEntries(positions.map(pos=>[pos,rank(rows.filter(p=>p.position===pos&&p.positionScore>0),score,limit)]).filter(([,v])=>v.length));
const allState={};for(const cls of ['6A','5A','4A','3A','2A','1A','8P']){const rows=all.filter(p=>(p.classification==='8-PLAYER'?'8P':p.classification)===cls);const overall=rank(rows,p=>p.rawScore,40);allState[cls]={playerOfYear:overall[0]||null,overall,positions:byPosition(rows,p=>p.positionScore,12)}}
const regionMap={};for(const p of all){const key=`${p.classification}|${p.region}`;(regionMap[key]??=[]).push(p)}const allRegion={};for(const [key,rows] of Object.entries(regionMap)){const overall=rank(rows,p=>p.rawScore,30);allRegion[key]={classification:rows[0].classification,region:rows[0].region,playerOfYear:overall[0]||null,overall,positions:byPosition(rows,p=>p.positionScore,10)}}
const allUtahOverall=rank(all,p=>p.allUtahScore,75);
const ruralRows=all.filter(p=>rural.has(p.classification));
const allRuralOverall=rank(ruralRows,p=>p.rawScore,75);
const allUtah={playerOfYear:allUtahOverall[0]||null,overall:allUtahOverall,positions:byPosition(all,p=>p.allUtahPositionScore,14)};
const allRural={playerOfYear:allRuralOverall[0]||null,overall:allRuralOverall,positions:byPosition(ruralRows,p=>p.positionScore,14)};
const out={season:SEASON,generatedAt:new Date().toISOString(),method:{note:`2025 RUS awards model built from the fall 2025 Deseret school-year archive, RUS 2025 team records and no estimated missing stats. All-State, All-Region, All-Utah and All-Rural position teams use the shared position formulas (${scoring.VERSION}). Offensive award positions count passing + rushing + receiving, defensive stats are excluded from offensive-position scoring, and run-first QBs receive enhanced rushing credit. Final team displays exclude a Player of the Year from that same First/Second Team and use the remaining ranked players for honorable mention.`,scoringVersion:scoring.VERSION,classWeight},coverage:{teamsInArchive:Object.keys(rosterData.teams||{}).length,teamsWithStats:Object.values(rosterData.teams||{}).filter(x=>x.stats?.some(s=>s.rows?.length)).length,rankedPlayers:all.length},mvp:{statewide:rank(all,p=>p.mvpScore,40),offense:rank(all.filter(p=>p.offense>0),p=>p.offense+p.teamBonus,40),defense:rank(all.filter(p=>p.defense>0),p=>p.defense+p.teamBonus,40),rural:rank(ruralRows,p=>p.ruralMvpScore,40),bigSchool:rank(all.filter(p=>big.has(p.classification)),p=>p.bigMvpScore,40)},allUtah,allRural,allState,allRegion};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(`2025 awards: ${out.coverage.rankedPlayers} ranked players from ${out.coverage.teamsWithStats} teams with stats using position scoring ${scoring.VERSION}.`);

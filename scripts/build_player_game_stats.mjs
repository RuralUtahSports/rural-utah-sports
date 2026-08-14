import fs from 'node:fs';

const DETAILS='deseret-game-details.json';
const ROSTERS='deseret-rosters-stats-2026.json';
const WEEKLY='weekly-simulation.json';
const OUT='player-game-stats-2026.json';
const clean=v=>String(v??'').trim();
const compact=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const slug=v=>clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const aliases={CEDAR:'CEDARCITY',CEDARCITY:'CEDARCITY',GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISONVALLEY',MONUMENTVAL:'MONUMENTVALLEY',MAPLEMTN:'MAPLEMOUNTAIN'};
const canon=v=>aliases[compact(v)]||compact(v);
function isoDate(v){const s=clean(v);let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return `${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;return''}
function gameKey(g){return `${isoDate(g.date)}|${compact(g.awayTeam)}|${compact(g.homeTeam)}`}
function playerId(team,no,name){return `${slug(team)}-${slug(no||'x')}-${slug(name||'unknown')}`}
function nameBits(v){const s=clean(v).replace(/[^A-Za-z0-9'’.-]+/g,' ').trim();const p=s.split(/\s+/).filter(Boolean);return {raw:s,last:compact(p[p.length-1]||''),first:compact(p[0]||''),initial:compact((p[0]||'').charAt(0))}}
function rosterIndex(teamData){const byNo=new Map(),all=[];for(const p of teamData?.roster||[]){const x={...p,bits:nameBits(p.name)};all.push(x);const n=compact(p.number);if(n){if(!byNo.has(n))byNo.set(n,[]);byNo.get(n).push(x)}}return{byNo,all}}
function bestRosterMatch(idx,no,name){const n=compact(no),b=nameBits(name),candidates=n?idx.byNo.get(n)||[]:idx.all;if(!candidates.length)return null;if(candidates.length===1){const p=candidates[0];if(!b.last||!p.bits.last||b.last===p.bits.last||b.last.endsWith(p.bits.last)||p.bits.last.endsWith(b.last))return p}
let best=null,score=0;for(const p of candidates){let s=0;if(b.last&&p.bits.last&&b.last===p.bits.last)s+=5;else if(b.last&&p.bits.last&&(b.last.endsWith(p.bits.last)||p.bits.last.endsWith(b.last)))s+=3;if(b.initial&&p.bits.initial&&b.initial===p.bits.initial)s+=2;if(b.first&&p.bits.first&&b.first===p.bits.first)s+=2;if(s>score){score=s;best=p}}return score>=4?best:null}
function normalizeStatTable(table,team,idx){const headers=(table.headers||[]).map(clean);const hu=headers.map(compact);let noI=hu.findIndex(x=>x==='NO'||x==='NUMBER'||x==='#');let nameI=hu.findIndex(x=>x==='PLAYER'||x.includes('PLAYERNAME'));if(noI<0)noI=0;if(nameI<0)nameI=1;const out=[];for(const raw of table.rows||[]){const row=Array.isArray(raw)?raw.map(clean):[];if(!row.length)continue;const no=clean(row[noI]||''),rawName=clean(row[nameI]||'');if(!rawName||compact(rawName)==='PLAYER')continue;const match=bestRosterMatch(idx,no,rawName);const name=match?.name||rawName;const values={};for(let i=0;i<headers.length;i++){if(i===noI||i===nameI)continue;const h=headers[i]||`Stat ${i+1}`;values[h]=clean(row[i]||'')}
out.push({playerId:match?.playerId||playerId(team,no,name),number:no,name,rosterMatched:!!match,category:clean(table.category)||'Stats',values})}return out}
function playMatchesPlayer(play,p){const txt=compact(play),b=nameBits(p.name);if(!b.last||b.last.length<3||!txt.includes(b.last))return false;if(b.initial&&txt.includes(b.initial+b.last))return true;return txt.includes(b.last)}

if(!fs.existsSync(DETAILS)||!fs.existsSync(ROSTERS)||!fs.existsSync(WEEKLY)){console.log('Player game stat inputs missing; skipping.');process.exit(0)}
const details=JSON.parse(fs.readFileSync(DETAILS,'utf8')).games||{};
const rosterData=JSON.parse(fs.readFileSync(ROSTERS,'utf8')).teams||{};
const weekly=JSON.parse(fs.readFileSync(WEEKLY,'utf8')).games||[];
const byKey=new Map(weekly.map(g=>[gameKey(g),g]));
const teams={};let gameCount=0,rowCount=0,matched=0;
for(const [key,d] of Object.entries(details)){
  const g=byKey.get(key);if(!g)continue;
  const gameDate=isoDate(g.date),final=!!d.final,status=clean(d.status),scoreRows=d.boxScore?.rows||[];
  for(const team of [g.awayTeam,g.homeTeam]){
    const rosterKey=Object.keys(rosterData).find(k=>canon(k)===canon(team));
    const teamData=rosterKey?rosterData[rosterKey]:null,idx=rosterIndex(teamData);
    const opponent=canon(team)===canon(g.awayTeam)?g.homeTeam:g.awayTeam;
    const isAway=canon(team)===canon(g.awayTeam);
    const ownScore=scoreRows.find(r=>canon(r.team)===canon(team))?.total;
    const oppScore=scoreRows.find(r=>canon(r.team)===canon(opponent))?.total;
    const rows=[];
    for(const table of d.stats||[]){if(table.team&&canon(table.team)!==canon(team))continue;for(const r of normalizeStatTable(table,team,idx)){rows.push(r);rowCount++;if(r.rosterMatched)matched++}}
    if(!rows.length&&!d.scoringPlays?.length)continue;
    const players={};
    for(const r of rows){if(!players[r.playerId])players[r.playerId]={playerId:r.playerId,number:r.number,name:r.name,rosterMatched:r.rosterMatched,statLines:[],scoringPlays:[]};players[r.playerId].statLines.push({category:r.category,values:r.values})}
    for(const p of Object.values(players))p.scoringPlays=(d.scoringPlays||[]).filter(play=>playMatchesPlayer(play,p)).slice(0,12);
    if(!teams[team])teams[team]={team,games:[]};
    teams[team].games.push({gameKey:key,date:gameDate,opponent,location:isAway?'Away':'Home',status,final,teamScore:Number.isFinite(Number(ownScore))?Number(ownScore):null,opponentScore:Number.isFinite(Number(oppScore))?Number(oppScore):null,url:d.url||g.deseretUrl||'',players:Object.values(players),scoringPlays:d.scoringPlays||[]});
    gameCount++;
  }
}
for(const t of Object.values(teams))t.games.sort((a,b)=>a.date.localeCompare(b.date));
const out={season:2026,updatedAt:new Date().toISOString(),summary:{teams:Object.keys(teams).length,teamGames:gameCount,statRows:rowCount,rosterMatchedRows:matched},teams};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(`Player game stats: ${out.summary.teams} teams, ${gameCount} team-games, ${rowCount} stat rows, ${matched} roster-matched.`);

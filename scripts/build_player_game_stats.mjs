import {matchPlayer, atomicJSON, normalizePlayerStatLines, gameIdentity} from './lib/player-stat-integrity.mjs';
import fs from 'node:fs';
import {applyGameDetailCorrections} from './apply_manual_stat_corrections.mjs';
import {suppressInvalidItaStatInMemory} from './suppress_invalid_tage_ita_attempts.mjs';

const DETAILS='deseret-game-details.json';
const ROSTERS='deseret-rosters-stats-2026.json';
const WEEKLY='weekly-simulation.json';
const TEAM_DATA='deseret-team-data-2026.json';
const OUT='player-game-stats-2026.json';
const clean=v=>String(v??'').trim();
const compact=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const slug=v=>clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const aliases={CEDAR:'CEDARCITY',CEDARCITY:'CEDARCITY',GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISONVALLEY',MONUMENTVAL:'MONUMENTVALLEY',MAPLEMTN:'MAPLEMOUNTAIN',STJOSEPH:'SAINTJOSEPH'};
const canon=v=>aliases[compact(v)]||compact(v);
function isoDate(v){const s=clean(v);let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return `${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;return''}
function gameKey(g){return `${isoDate(g.date)}|${compact(g.awayTeam)}|${compact(g.homeTeam)}`}
function playerId(team,no,name){return `${slug(team)}-${slug(no||'x')}-${slug(name||'unknown')}`}
function cleanGameName(v){return clean(v).replace(/^\s*[A-Z]\s*\.\s*/i,'').replace(/^\s*[A-Z]\s+/i,m=>m.trim().length===1?'':m).replace(/\s+/g,' ').trim()}
function nameBits(v){const s=cleanGameName(v).replace(/[^A-Za-z0-9'’.-]+/g,' ').trim();const p=s.split(/\s+/).filter(Boolean);return {raw:s,last:compact(p[p.length-1]||''),first:compact(p[0]||''),initial:compact((p[0]||'').charAt(0))}}
function rosterIndex(teamData){const byNo=new Map(),all=[];for(const p of teamData?.roster||[]){const x={...p,bits:nameBits(p.name)};all.push(x);const n=compact(p.number);if(n){if(!byNo.has(n))byNo.set(n,[]);byNo.get(n).push(x)}}return{byNo,all}}
function matchScore(idx,no,name){const player=matchPlayer(idx.all,{number:no,name});return{player,score:player?12:0}}
function teamLabelMatches(label,team){const l=compact(label),t=canon(team);return !!l&&!!t&&(l.includes(t)||t.includes(l))}
function statRows(table){const headers=(table.headers||[]).map(clean);const hu=headers.map(compact);let noI=hu.findIndex(x=>x==='NO'||x==='NUMBER'||x==='#');let nameI=hu.findIndex(x=>x==='PLAYER'||x.includes('PLAYERNAME'));if(noI<0)noI=0;if(nameI<0)nameI=1;const out=[];for(const raw of table.rows||[]){const row=Array.isArray(raw)?raw.map(clean):[];if(!row.length)continue;const no=clean(row[noI]||''),rawName=cleanGameName(row[nameI]||'');if(!rawName||compact(rawName)==='PLAYER')continue;const values={};for(let i=0;i<headers.length;i++){if(i===noI||i===nameI)continue;values[headers[i]||`Stat ${i+1}`]=clean(row[i]||'')}out.push({number:no,rawName,category:clean(table.category)||'Stats',values})}return out}
function playMatchesPlayer(play,p){const txt=compact(play),b=nameBits(p.name);if(!b.last||b.last.length<3||!txt.includes(b.last))return false;if(b.first&&txt.includes(b.first+b.last))return true;if(b.initial&&txt.includes(b.initial+b.last))return true;return txt.includes(b.last)}
function scoreValue(...values){for(const value of values){if(value===null||value===undefined||clean(value)==='')continue;const n=Number(value);if(Number.isFinite(n))return n}return null}
const hasScore=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
function scheduleFinal(game){const status=clean(game?.rusStatus).toUpperCase(),result=clean(game?.result).toUpperCase();return status.includes('FINAL')||(hasScore(game?.teamScore)&&hasScore(game?.opponentScore))||['W','L','T'].includes(result)}
function scheduleTeam(scheduleData,teamName){return Object.values(scheduleData?.teams||{}).find(team=>canon(team?.team)===canon(teamName))||null}
function expectedScheduleGame(scheduleData,teamName,game){const team=scheduleTeam(scheduleData,teamName);if(!team)return null;const candidates=(team.schedule||[]).filter(row=>scheduleFinal(row)&&isoDate(row.date)===isoDate(game.date));if(!candidates.length)return null;return candidates.find(row=>canon(row.opponent)===canon(game.opponent))||(candidates.length===1?candidates[0]:null)}
function statCellCount(game){let count=0;for(const player of game?.players||[])for(const line of player.statLines||[])for(const value of Object.values(line.values||{}))if(clean(value)!=='')count++;return count}
function normalizedPreservedGame(teamName,oldGame,schedule){const isAway=canon(schedule.awayTeam)===canon(teamName)||clean(schedule.site).toLowerCase()==='away';return{...oldGame,date:isoDate(schedule.date||oldGame.date),opponent:clean(schedule.opponent)||oldGame.opponent,location:isAway?'Away':'Home',status:'Final',final:true,teamScore:hasScore(schedule.teamScore)?Number(schedule.teamScore):oldGame.teamScore,opponentScore:hasScore(schedule.opponentScore)?Number(schedule.opponentScore):oldGame.opponentScore,url:clean(schedule.gameUrl)||oldGame.url||'',preservedFromPrior:true}}

if(!fs.existsSync(DETAILS)||!fs.existsSync(ROSTERS)||!fs.existsSync(WEEKLY)){console.log('Player game stat inputs missing; skipping.');process.exit(0)}
const details=JSON.parse(fs.readFileSync(DETAILS,'utf8')).games||{};
applyGameDetailCorrections(details);
const rosterData=JSON.parse(fs.readFileSync(ROSTERS,'utf8')).teams||{};
const weekly=JSON.parse(fs.readFileSync(WEEKLY,'utf8')).games||[];
const scheduleData=fs.existsSync(TEAM_DATA)?JSON.parse(fs.readFileSync(TEAM_DATA,'utf8')):null;
let prior={teams:{}};if(fs.existsSync(OUT)){try{prior=JSON.parse(fs.readFileSync(OUT,'utf8'))}catch{}}
const byKey=new Map(weekly.map(g=>[gameKey(g),g]));
const rosterKeys=Object.keys(rosterData),teams={};let gameCount=0,rowCount=0,matched=0;
for(const [key,d] of Object.entries(details)){
  const g=byKey.get(key);if(!g)continue;
  const gameDate=isoDate(g.date),final=!!d.final,status=clean(d.status),scoreRows=d.boxScore?.rows||[];
  const contexts={};
  for(const team of [g.awayTeam,g.homeTeam]){const rk=rosterKeys.find(k=>canon(k)===canon(team));contexts[team]={team,data:rk?rosterData[rk]:null,idx:rosterIndex(rk?rosterData[rk]:null),rows:[]}}
  for(const table of d.stats||[]){
    for(const raw of statRows(table)){
      const candidates=[g.awayTeam,g.homeTeam].map(team=>({team,...matchScore(contexts[team].idx,raw.number,raw.rawName)})).sort((a,b)=>b.score-a.score);
      let assigned='',match=null;
      if(candidates[0].score>=8&&(candidates.length===1||candidates[0].score>candidates[1].score)){assigned=candidates[0].team;match=candidates[0].player}
      else if(table.team){assigned=[g.awayTeam,g.homeTeam].find(team=>teamLabelMatches(table.team,team))||''}
      if(!assigned)continue;
      const name=match?.name||raw.rawName,id=match?.playerId||playerId(assigned,raw.number,name);
      contexts[assigned].rows.push({playerId:id,number:raw.number,name,position:match?.position||'',rosterMatched:!!match,category:raw.category,values:raw.values});rowCount++;if(match)matched++;
    }
  }
  for(const team of [g.awayTeam,g.homeTeam]){
    const ctx=contexts[team],opponent=canon(team)===canon(g.awayTeam)?g.homeTeam:g.awayTeam,isAway=canon(team)===canon(g.awayTeam);
    const ownScore=scoreValue(scoreRows.find(r=>teamLabelMatches(r.team,team))?.total,isAway?g.actualAway:g.actualHome),oppScore=scoreValue(scoreRows.find(r=>teamLabelMatches(r.team,opponent))?.total,isAway?g.actualHome:g.actualAway);
    if(!ctx.rows.length&&!d.scoringPlays?.length)continue;
    const players={};
    for(const r of ctx.rows){if(!players[r.playerId])players[r.playerId]={playerId:r.playerId,number:r.number,name:r.name,position:r.position||'',rosterMatched:r.rosterMatched,statLines:[],scoringPlays:[]};if(!players[r.playerId].position&&r.position)players[r.playerId].position=r.position;players[r.playerId].statLines.push({category:r.category,values:r.values})}
    for(const p of Object.values(players))p.scoringPlays=(d.scoringPlays||[]).filter(play=>playMatchesPlayer(play,p)&&teamLabelMatches(play.split('—')[0],team)).slice(0,12);
    if(!teams[team])teams[team]={team,games:[]};
    teams[team].games.push({gameKey:key,date:gameDate,opponent,location:isAway?'Away':'Home',status,final,teamScore:ownScore,opponentScore:oppScore,url:d.url||g.deseretUrl||'',players:Object.values(players),scoringPlays:(d.scoringPlays||[]).filter(play=>teamLabelMatches(play.split('—')[0],team))});gameCount++;
  }
}
let preservedFinalGames=0,replacedEmptyFinalGames=0;
for(const [priorName,priorTeam] of Object.entries(prior.teams||{})){
  for(const oldGame of priorTeam.games||[]){
    if(!(oldGame.final===true||clean(oldGame.status).toUpperCase().includes('FINAL'))||statCellCount(oldGame)===0)continue;
    const expected=expectedScheduleGame(scheduleData,priorName,oldGame)||{date:oldGame.date,opponent:oldGame.opponent,site:clean(oldGame.location).toLowerCase()};
    let targetKey=Object.keys(teams).find(name=>canon(name)===canon(priorName));
    if(!targetKey){targetKey=priorName;teams[targetKey]={team:priorTeam.team||priorName,games:[]}}
    const target=teams[targetKey],index=(target.games||[]).findIndex(game=>(isoDate(game.date)===isoDate(oldGame.date)&&canon(game.opponent)===canon(oldGame.opponent))||gameIdentity(game)===gameIdentity(oldGame)),restored=normalizedPreservedGame(priorName,oldGame,expected);
    if(index<0){target.games.push(restored);preservedFinalGames++}
    else if(statCellCount(target.games[index])===0){target.games[index]=restored;replacedEmptyFinalGames++}
    else {
      const fresh=target.games[index];
      for(const oldPlayer of oldGame.players||[]){
        let player=matchPlayer(fresh.players||[],oldPlayer,priorName);
        if(!player){(fresh.players||=[]).push(structuredClone(oldPlayer));continue}
        for(const oldLine of oldPlayer.statLines||[]){
          let line=(player.statLines||[]).find(l=>compact(l.category)===compact(oldLine.category));
          if(!line){(player.statLines||=[]).push(structuredClone(oldLine));continue}
          for(const [header,value] of Object.entries(oldLine.values||{})){
            const key=Object.keys(line.values||{}).find(h=>compact(h)===compact(header))||header;
            if(clean(line.values?.[key])===''&&clean(value)!==''||/manual|verified/i.test(clean(oldLine.statSources?.[header]))){
              (line.values||={})[key]=value;
              if(oldLine.statSources?.[header])(line.statSources||={})[key]=oldLine.statSources[header];
            }
          }
        }
      }
    }
  }
}
for(const t of Object.values(teams))t.games.sort((a,b)=>a.date.localeCompare(b.date));
gameCount=Object.values(teams).reduce((sum,team)=>sum+(team.games||[]).length,0);
const out={season:2026,updatedAt:new Date().toISOString(),summary:{teams:Object.keys(teams).length,teamGames:gameCount,statRows:rowCount,rosterMatchedRows:matched,preservedFinalGames,replacedEmptyFinalGames},teams};
for(const team of Object.values(out.teams))for(const game of team.games||[])for(const player of game.players||[])normalizePlayerStatLines(player);
suppressInvalidItaStatInMemory(out);
atomicJSON(OUT,out);
console.log(`Player game stats: ${out.summary.teams} teams, ${gameCount} team-games, ${rowCount} stat rows, ${matched} roster-matched; ${preservedFinalGames} prior final game(s) preserved and ${replacedEmptyFinalGames} empty final game(s) restored.`);

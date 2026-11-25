import fs from 'node:fs';
import {teamKey,isoDate} from './lib/competition-scope-2026.mjs';
import {postseasonFinals} from './lib/postseason-finals-2026.mjs';
const norm=s=>String(s??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const present=v=>v!==null&&v!==undefined&&String(v).trim()!=='';
const find=(obj,t)=>Object.entries(obj.teams||{}).filter(([k])=>teamKey(k)===teamKey(t));
export function applyMuseRecovery(games,rosters,brackets,evidence){
 if([games,rosters,brackets,evidence].some(x=>x?.season!==2026))throw Error('2026 Muse recovery inputs required');
 const finals=postseasonFinals(brackets),report={addedGames:0,addedPlayers:0,addedFields:0,alreadyPresent:0,held:[]};
 for(const row of evidence.rows||[]){
  const {team,date,opponent,playerId,number,name,category,values,sourceUrl}=row;
  if(teamKey(team)==='WHITEHORSE'||!/^https?:\/\//.test(sourceUrl)||!['Passing','Rushing','Receiving','Defense/Special Teams','Kicking'].includes(category))throw Error('Invalid recovery row '+playerId);
  const rs=find(rosters,team),gs=find(games,team);
  if(rs.length!==1||gs.length>1)throw Error('Ambiguous school '+team);
  const matches=(rs[0][1].roster||[]).filter(p=>p.playerId===playerId&&norm(p.name)===norm(name)&&String(p.number)===number);
  if(matches.length!==1)throw Error('Roster identity changed '+playerId);
  const side=finals.filter(g=>g.date===date&&((teamKey(g.awayTeam)===teamKey(team)&&teamKey(g.homeTeam)===teamKey(opponent))||(teamKey(g.homeTeam)===teamKey(team)&&teamKey(g.awayTeam)===teamKey(opponent))));
  if(side.length!==1)throw Error('Official playoff identity missing '+team+' '+date+' '+opponent);
  const f=side[0],home=teamKey(f.homeTeam)===teamKey(team);
  const school=gs.length?gs[0][1]:(games.teams[rs[0][0]]={team:rs[0][0],games:[]});
  const hits=(school.games||[]).filter(g=>isoDate(g.date)===date&&teamKey(g.opponent)===teamKey(opponent));
  if(hits.length>1)throw Error('Duplicate game '+team+' '+date);
  let g=hits[0];
  if(!g){g={date,opponent:home?f.awayTeam:f.homeTeam,teamScore:home?f.actualHome:f.actualAway,opponentScore:home?f.actualAway:f.actualHome,location:f.neutral?'Neutral':home?'Home':'Away',status:'Final',final:true,players:[],scoringPlays:[],manualPartialStats:true};(school.games||=[]).push(g);report.addedGames++;}
  if(Number(g.teamScore)!==(home?f.actualHome:f.actualAway)||Number(g.opponentScore)!==(home?f.actualAway:f.actualHome))throw Error('Final score conflict '+team+' '+date);
  const people=(g.players||[]).filter(p=>p.playerId===playerId||norm(p.name)===norm(name)&&String(p.number)===number);
  if(people.length>1||people.length===1&&people[0].playerId!==playerId)throw Error('Ambiguous game player '+playerId);
  let p=people[0];if(!p){p={playerId,name,number,statLines:[],scoringPlays:[]};(g.players||=[]).push(p);report.addedPlayers++;}
  const lines=(p.statLines||[]).filter(l=>norm(l.category)===norm(category));if(lines.length>1)throw Error('Ambiguous category '+playerId);
  let line=lines[0];if(!line){line={category,values:{},statSources:{}};(p.statLines||=[]).push(line);}
  for(const [field,value] of Object.entries(values)){
   if(!/^(?:\d+|\d+-\d+)$/.test(value))throw Error('Invalid stat value');
   const keys=Object.keys(line.values||{}).filter(k=>norm(k)===norm(field));
   if(keys.length>1)throw Error('Ambiguous field '+playerId+' '+field);
   const k=keys[0]||field;
   if(present(line.values?.[k])){if(String(line.values[k])===value)report.alreadyPresent++;else report.held.push({team,date,playerId,category,field,existing:line.values[k],proposed:value,sourceUrl});continue;}
   (line.values||={})[k]=value;(line.statSources||={})[k]='Muse supplied source report';(line.statEvidence||={})[k]={scope:'postseason',source:sourceUrl,partial:true,...(row.sourceNote?{note:row.sourceNote}:{})};report.addedFields++;
  }
  school.games.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 }
 return report;
}
export function applyStoredMuseRecovery(games,rosters,brackets){
 const evidence=JSON.parse(fs.readFileSync('audits/2026-postseason-muse-recovery.json','utf8'));
 return applyMuseRecovery(games,rosters,brackets,evidence);
}

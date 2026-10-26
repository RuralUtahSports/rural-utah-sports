import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

const CONFIG='manual-stat-corrections-2026.json';
const clean=value=>String(value??'').trim();
const compact=value=>clean(value).toUpperCase().replace(/[^A-Z0-9]/g,'');
const same=(a,b)=>compact(a)===compact(b);
const sameCategory=(a,b)=>same(a,b)||(/^DEFENSE/.test(compact(a))&&/^DEFENSE/.test(compact(b)));

export function findCorrectionConflicts(corrections){
 const groups=new Map();
 for(const c of corrections){if(c.gameOnly)continue;const key=[compact(c.team),compact(c.targetPlayer),compact(c.category),compact(c.stat)].join('|');const group=groups.get(key)||[];group.push(c);groups.set(key,group)}
 return [...groups].filter(([,group])=>group.some(a=>Object.hasOwn(a,'exactValue')&&group.some(b=>Object.hasOwn(b,'minimumValue')&&Number(a.exactValue)<Number(b.minimumValue)))).map(([key,rules])=>({key,ids:rules.map(c=>c.id),reason:'Exact correction conflicts with a minimum floor; retain existing value pending source review'}));
}
function loadCorrections(){
 if(!fs.existsSync(CONFIG))return[];
 const corrections=JSON.parse(fs.readFileSync(CONFIG,'utf8')).corrections||[];
 const conflicts=findCorrectionConflicts(corrections),blocked=new Set(conflicts.flatMap(c=>c.ids));
 if(conflicts.length)console.warn(`Manual stat corrections: ${conflicts.length} conflicting field group(s) retained unchanged for source review`);
 return corrections.filter(c=>!blocked.has(c.id));
}

function correctionTag(container,correction){
  const tags=Array.isArray(container.manualCorrections)?container.manualCorrections:[];
  if(tags.includes(correction.id))return 0;
  container.manualCorrections=[...tags,correction.id];return 1;
}

function atLeast(value,minimum){
  const current=Number(clean(value));
  return Number.isFinite(current)&&current>=minimum?clean(value):String(minimum);
}

function matchesWhenValue(value,correction){
  if(Array.isArray(correction.whenValues)){
    return correction.whenValues.some(expected=>matchesWhenValue(value,{whenValue:expected}));
  }
  if(!Object.prototype.hasOwnProperty.call(correction,'whenValue'))return true;
  const current=clean(value),expected=clean(correction.whenValue);
  const currentNumber=Number(current),expectedNumber=Number(expected);
  if(current!==''&&expected!==''&&Number.isFinite(currentNumber)&&Number.isFinite(expectedNumber))return currentNumber===expectedNumber;
  return current===expected;
}

function correctedValue(value,correction){
  if(!matchesWhenValue(value,correction))return clean(value);
  if(Object.prototype.hasOwnProperty.call(correction,'exactValue'))return String(correction.exactValue);
  return atLeast(value,Number(correction.minimumValue)||0);
}

function replaceText(value,from,to){
  if(!from||!to)return clean(value);
  return clean(value).split(from).join(to);
}

export function applyGameDetailCorrections(games){
  let changes=0;
  for(const correction of loadCorrections()){
    const game=games?.[correction.gameKey];if(!game)continue;
    if(Array.isArray(game.scoringPlays))game.scoringPlays=game.scoringPlays.map(play=>{const next=replaceText(play,correction.scoringPlayFrom,correction.scoringPlayTo);if(next!==play)changes++;return next});
    for(const table of game.stats||[]){
      if(!sameCategory(table.category,correction.category)||!same(table.team,correction.team))continue;
      const headers=(table.headers||[]).map(clean),nameIndex=headers.findIndex(header=>same(header,'PLAYER')||compact(header).includes('PLAYERNAME')),statIndex=headers.findIndex(header=>same(header,correction.stat));if(nameIndex<0||statIndex<0)continue;
      let target=(table.rows||[]).find(row=>Array.isArray(row)&&same(row[nameIndex],correction.targetPlayer));const source=(table.rows||[]).find(row=>Array.isArray(row)&&same(row[nameIndex],correction.sourcePlayer));
      if(!target&&source){target=[...source];target[nameIndex]=correction.targetPlayer;if(correction.targetNumber){const numberIndex=headers.findIndex(header=>same(header,'NO')||same(header,'NUMBER')||header==='#');if(numberIndex>=0)target[numberIndex]=correction.targetNumber}table.rows.push(target);changes++}
      if(target){const next=correctedValue(target[statIndex],correction);if(next!==clean(target[statIndex])){target[statIndex]=next;changes++}}
      if(correction.removeSourceFromGame){const before=table.rows.length;table.rows=table.rows.filter(row=>!Array.isArray(row)||!same(row[nameIndex],correction.sourcePlayer));changes+=before-table.rows.length}
    }
    changes+=correctionTag(game,correction);
  }
  return changes;
}

export function applyRosterStatCorrections(output){
  let changes=0;
  for(const correction of loadCorrections()){
    if(correction.gameOnly)continue;
    const team=Object.values(output?.teams||{}).find(entry=>same(entry.team,correction.team));if(!team)continue;const section=(team.stats||[]).find(item=>same(item.category,correction.category));if(!section)continue;
    const names=[correction.targetPlayer,...(correction.playerAliases||[])];const target=(section.rows||[]).find(row=>names.some(name=>same(row.name,name)));
    if(target){
      const statKey=Object.keys(target.values||{}).find(key=>same(key,correction.stat))||correction.stat,next=correctedValue(target.values?.[statKey],correction);
      if(next!==clean(target.values?.[statKey])){target.values={...(target.values||{}),[statKey]:next};target.statSources={...(target.statSources||{}),[statKey]:'Verified MaxPreps fallback · '+(correction.sourceUrl||'')};changes++}
      if(correction.correctedPlayerName){
        for(const row of [...(team.roster||[]),...(team.stats||[]).flatMap(s=>s.rows||[])])
          if(row.playerId&&row.playerId===target.playerId&&row.name!==correction.correctedPlayerName){row.name=correction.correctedPlayerName;changes++}
      }
    }
    if(correction.removeSourceSeasonRowWhenOnlyCorrection){const before=section.rows.length;section.rows=section.rows.filter(row=>{if(!same(row.name,correction.sourcePlayer))return true;const populated=Object.entries(row.values||{}).filter(([,value])=>clean(value)!=='');return !(populated.length===1&&same(populated[0][0],correction.stat)&&Number(populated[0][1])===Number(correction.minimumValue))});changes+=before-section.rows.length}
    changes+=correctionTag(team,correction);
  }
  return changes;
}

function updateFile(file,field,apply){
  if(!fs.existsSync(file))return 0;const data=JSON.parse(fs.readFileSync(file,'utf8')),changes=apply(field?data[field]:data);if(changes)fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');return changes;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const rosterChanges=updateFile('deseret-rosters-stats-2026.json','',applyRosterStatCorrections),detailChanges=updateFile('deseret-game-details.json','games',applyGameDetailCorrections);
  console.log(`Manual stat corrections applied: ${rosterChanges} roster/stat change(s), ${detailChanges} game-detail change(s).`);
}

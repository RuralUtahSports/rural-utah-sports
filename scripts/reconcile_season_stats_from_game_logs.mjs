import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {applyRosterStatCorrections} from './apply_manual_stat_corrections.mjs';
import {clean, compact, numeric, isoDate, canonTeam, categoryKey, fieldKey, matchPlayer, atomicJSON, gameIdentity} from './lib/player-stat-integrity.mjs';

const LABELS={PASSING:'Passing',RUSHING:'Rushing',RECEIVING:'Receiving',DEFENSESPECIALTEAMS:'Defense/Special Teams',KICKING:'Kicking'};
const HEADERS={COMPATT:'COMP-ATT',PASSINT:'PASS INT.',DEFENSETD:'DEFENSE TD',RETURNTD:'RETURN TD'};
const FIELDS={PASSING:['COMPATT','YARDS','TD','INT'],RUSHING:['CARRIES','YARDS','TD'],RECEIVING:['RECEPTIONS','YARDS','TD'],DEFENSESPECIALTEAMS:['TACKLES','SACKS','PASSINT','DEFENSETD','RETURNTD','PD','FUMREC','CAUSEDFUM','QBHURRIES'],KICKING:['PAT','FG','PTS'],PUNTING:['PUNTS','YARDS'],KICKOFFRETURNS:['RETURNS','YARDS','TD'],PUNTRETURNS:['RETURNS','YARDS','TD']};
const parsed=(field,value)=>{
 if(field==='COMPATT'){
  const pair=/^\d+\s*-\s*\d+$/.test(clean(value))?clean(value).split('-').map(Number):null;
  return pair&&pair[0]<=pair[1]?pair:null;
 }
 const number=numeric(value);return number!==null&&(number>=0||field==='YARDS')?number:null;
};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const format=value=>Array.isArray(value)?value.join('-'):String(Number(value.toFixed(2)));
const sameTeam=(teams,name)=>Object.entries(teams||{}).find(([key])=>canonTeam(key)===canonTeam(name))?.[1];
const final=game=>game.final===true||/FINAL/i.test(clean(game.status));

// One cell per player/category/field/matchup. Conflicting duplicate cells are
// unknown and must not contribute to a computed season total.
export function aggregateGames(team, roster, {cutoff=null, sourceRows=false}={}) {
  const cells=new Map(), conflicts=[], identities=[];
  for(const game of team?.games||[]) {
    const date=isoDate(game.date);
    if(!/^2026-\d\d-\d\d$/.test(date)||cutoff&&date>cutoff||!sourceRows&&!final(game))continue;
    if(!clean(game.opponent))continue;
    for(const incoming of sourceRows?[game]:game.players||[]) {
      const player=matchPlayer(roster,incoming,team.team);
      if(!player){identities.push({date,opponent:game.opponent,name:incoming.name,playerId:incoming.playerId});continue}
      for(const line of incoming.statLines||[]) {
        const category=categoryKey(line.category);
        for(const [header,values] of Object.entries(line.statConflicts||{}))conflicts.push({playerId:player.playerId,name:player.name,category,field:fieldKey(category,header),date,opponent:game.opponent,values});
        for(const [header,value] of Object.entries(line.values||{})) {
          const field=fieldKey(category,header);if(!FIELDS[category]?.includes(field))continue;
          const number=parsed(field,value);if(number===null)continue;
          const key=[player.playerId,category,field,gameIdentity(game)].join('|');
          const previous=cells.get(key);
          if(previous && !equal(previous.value,number)) {
            previous.conflict=true;
            conflicts.push({playerId:player.playerId,name:player.name,category,field,date,opponent:game.opponent,values:[previous.value,number]});
          }else if(!previous)cells.set(key,{player,category,field,date,opponent:game.opponent,value:number,url:game.maxprepsUrl||game.url||''});
        }
      }
    }
  }
  const totals=new Map();
  for(const cell of cells.values()) {
    const key=[cell.player.playerId,cell.category,cell.field].join('|');
    const total=totals.get(key)||{...cell,value:Array.isArray(cell.value)?[0,0]:0,games:[],conflict:false};
    total.conflict ||= !!cell.conflict;
    if(Array.isArray(cell.value))total.value=total.value.map((v,i)=>v+cell.value[i]);else total.value+=cell.value;
    total.games.push({date:cell.date,opponent:cell.opponent,url:cell.url});totals.set(key,total);
  }
  for(const conflict of conflicts){const key=[conflict.playerId,conflict.category,conflict.field].join('|');if(totals.has(key))totals.get(key).conflict=true}
  return {totals,conflicts,identities};
}
export function refreshRates(row, category) {
  const get=field=>{const key=Object.keys(row.values||{}).find(h=>fieldKey(category,h)===field);return parsed(field,row.values?.[key]);};
  const set=(field,value)=>{
    const key=Object.keys(row.values).find(h=>compact(h)===compact(field))||field;
    const provenance=clean(row.statSources?.[key]);
    if(/verified|manual/i.test(provenance))return;
    row.values[key]=value===null?'':format(value);row.statSources||={};row.statSources[key]='Derived from retained season totals';
  };
  const yards=get('YARDS');
  if(category==='PASSING'){
    const pair=get('COMPATT');
    if(pair)set('COMP%',pair[1]>0?pair[0]/pair[1]*100:null);
    if(pair&&yards!==null)set('YARDS/COMP.',pair[0]>0?yards/pair[0]:null);
  }
  if(category==='RUSHING'||category==='RECEIVING'){
    const divisor=get(category==='RUSHING'?'CARRIES':'RECEPTIONS');
    if(divisor!==null&&yards!==null)set(category==='RUSHING'?'YARDS/CARRY':'YARDS/RECEP.',divisor>0?yards/divisor:null);
  }
}
function manualPolicy(team,player,category,field,corrections) {
  return corrections.filter(c=>!c.gameOnly&&canonTeam(c.team)===canonTeam(team)&&categoryKey(c.category)===category&&fieldKey(category,c.stat)===field&&[c.targetPlayer,...c.playerAliases||[],c.correctedPlayerName].some(n=>n&&compact(n)===compact(player.name)));
}
export function reconcileSeasonStats(rosters,games,sources={}) {
  if(rosters.season&&rosters.season!==2026||games.season&&games.season!==2026)throw Error('Expected 2026 season inputs');
  const report={teams:0,players:0,categories:0,fields:0,skippedTeams:0,incompleteTeams:[],decisions:[],conflicts:[],unmatchedIdentities:[]};
  const corrections=sources.corrections||[];
  for(const [teamName,team] of Object.entries(rosters.teams||{})) {
    report.teams++;
    const known=[...(team.roster||[]),...(team.stats||[]).flatMap(s=>s.rows||[])];
    const local=sameTeam(games.teams,teamName)||{team:teamName,games:[]};
    const cached=sameTeam(sources.maxprepsGames?.teams,teamName)||{team:teamName,games:[]};
    const observed=aggregateGames({...local,team:teamName},known,{cutoff:sources.cutoff});
    const corroboration=aggregateGames({...cached,team:teamName},known,{sourceRows:true,cutoff:sources.cutoff});
    report.conflicts.push(...observed.conflicts.map(x=>({team:teamName,...x})),...corroboration.conflicts.map(x=>({team:teamName,source:'MaxPreps',...x})));
    report.unmatchedIdentities.push(...observed.identities.map(x=>({team:teamName,...x})));
    const saved=sameTeam(sources.maxprepsSeason?.teams,teamName);
    const sourceAllowed=sources.maxprepsSeason?.season===2026&&sources.maxprepsGames?.season===2026;
    const candidates=new Map();
    for(const incoming of sourceAllowed?saved?.rows||[]:[]) {
      const player=matchPlayer(known,incoming,teamName);if(!player)continue;
      const category=categoryKey(incoming.category);
      for(const [header,value] of Object.entries(incoming.values||{})) {
        const field=fieldKey(category,header),number=parsed(field,value);
        if(!FIELDS[category]?.includes(field)||number===null)continue;
        const key=[player.playerId,category,field].join('|');
        const old=candidates.get(key);
        candidates.set(key,{player,category,field,value:number,header,conflict:!!old&&(!equal(old.value,number)||old.conflict)});
      }
    }
    let changed=0;
    for(const [key,candidate] of candidates) {
      const {player,category,field,value}=candidate,proof=corroboration.totals.get(key);
      let section=(team.stats||[]).find(s=>categoryKey(s.category)===category);
      let row=section?.rows?.find(r=>r.playerId===player.playerId);
      const header=Object.keys(row?.values||{}).find(h=>fieldKey(category,h)===field)||HEADERS[field]||candidate.header;
      const existing=parsed(field,row?.values?.[header]);
      if(equal(existing,value))continue;
      const record={team:teamName,player:player.name,playerId:player.playerId,category,field,previous:existing,proposed:value,sourceUrl:saved?.sourceUrl,sourceUpdatedAt:saved?.lastUpdated||null,sourceSnapshotAt:sources.maxprepsSeason?.updatedAt||null,gameCoverage:proof?.games||[]};
      // A source season cell must agree with its unique per-game evidence. The
      // publication timestamp alone cannot establish its regular-season scope.
      if(candidate.conflict||!proof||proof.conflict||!equal(proof.value,value)){
        report.decisions.push({...record,status:'review',reason:'Source season cell is not corroborated by unique in-scope game cells'});continue;
      }
      const policies=manualPolicy(teamName,player,category,field,corrections);
      const locked=policies.some(c=>Object.hasOwn(c,'exactValue')&&!Object.hasOwn(c,'whenValue')&&!Array.isArray(c.whenValues)) ||
        policies.some(c=>Object.hasOwn(c,'exactValue')&&policies.some(other=>Object.hasOwn(other,'minimumValue')&&Number(c.exactValue)<Number(other.minimumValue))) ||
        policies.some(c=>Object.hasOwn(c,'exactValue')&&[...(c.whenValues||[]),...(Object.hasOwn(c,'whenValue')?[c.whenValue]:[])].some(bad=>equal(parsed(field,bad),value))&&!equal(parsed(field,c.exactValue),value));
      const belowFloor=policies.some(c=>Object.hasOwn(c,'minimumValue')&&(typeof value!=='number'||value<c.minimumValue));
      const existingSource=clean(row?.statSources?.[header]);
      if(locked||belowFloor||/manual|verified/i.test(existingSource)&&!policies.length||existing!==null&&
        (Array.isArray(value)?value[0]<existing[0]||value[1]<existing[1]:value<existing)&&!/^Calculated from complete game logs/.test(existingSource)){
        report.decisions.push({...record,status:'preserved',reason:'Retained verified correction or more complete season value'});continue;
      }
      if(!section){section={category:LABELS[category]||candidate.category,headers:[],rows:[]};(team.stats||=[]).push(section)}
      if(!row){row={playerId:player.playerId,name:player.name,number:player.number,rosterMatched:true,values:{}};section.rows.push(row)}
      row.values[header]=format(value);row.statSources||={};row.statSources[header]='MaxPreps season total corroborated by unique game logs';
      row.statEvidence||={};row.statEvidence[header]={sourceUrl:saved.sourceUrl,sourceUpdatedAt:saved.lastUpdated||null,sourceSnapshotAt:sources.maxprepsSeason.updatedAt,throughDate:proof.games.map(g=>g.date).sort().at(-1),games:proof.games.length};
      section.headers||=[];if(!section.headers.includes(header))section.headers.push(header);
      report.fields++;changed++;report.decisions.push({...record,status:'corrected',reason:'Source season cell agrees with unique in-scope source game cells'});
    }
    // Game sums are observations, never a replacement merely because some
    // other player reported stats in each game. Retain conflicts for review.
    for(const [key,total] of observed.totals) {
      const row=(team.stats||[]).find(s=>categoryKey(s.category)===total.category)?.rows?.find(r=>r.playerId===total.player.playerId);
      const header=Object.keys(row?.values||{}).find(h=>fieldKey(total.category,h)===total.field),current=parsed(total.field,row?.values?.[header]);
      if(!equal(current,total.value))report.decisions.push({team:teamName,player:total.player.name,playerId:total.player.playerId,category:total.category,field:total.field,previous:current,gameSum:total.value,status:'review',reason:total.conflict?'Conflicting duplicate game cells':'Game sums alone cannot establish player/category completeness'});
    }
    for(const section of team.stats||[])for(const row of section.rows||[])refreshRates(row,categoryKey(section.category));
    if(changed)report.players+=new Set(report.decisions.filter(d=>d.team===teamName&&d.status==='corrected').map(d=>d.playerId)).size;
    const review=report.decisions.filter(d=>d.team===teamName&&d.status==='review');
    if(review.length){report.skippedTeams++;report.incompleteTeams.push({team:teamName,reviewFields:review.length})}
  }
  rosters.updatedAt=new Date().toISOString();
  rosters.summary={...rosters.summary,gameLogSeasonReconciliation:{teams:report.teams,players:report.players,fields:report.fields,skippedTeams:report.skippedTeams,incompleteTeams:report.incompleteTeams,policy:'Game presence is not player/category completeness. Only source-season cells corroborated by unique in-scope source game cells may repair totals; preserve verified corrections, unknowns and fuller totals. All unresolved differences remain review items.'}};
  return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(process.argv.includes('--self-test'))process.exit(spawnSync(process.execPath,['--test','tests/player-stat-integrity.test.mjs'],{stdio:'inherit'}).status??1);
  const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
  const rosters=read('deseret-rosters-stats-2026.json');
  const report=reconcileSeasonStats(rosters,read('player-game-stats-2026.json'),{maxprepsSeason:read('maxpreps-stats-fallback-2026.json'),maxprepsGames:read('maxpreps-player-game-stats-2026.json'),corrections:read('manual-stat-corrections-2026.json').corrections});
  applyRosterStatCorrections(rosters);
  atomicJSON('deseret-rosters-stats-2026.json',rosters);
  fs.mkdirSync('audits',{recursive:true});atomicJSON('audits/2026-stat-reconciliation.json',report);
  console.log(`Corroborated ${report.fields} source season cells; ${report.decisions.filter(d=>d.status==='review').length} differences retained for review; ${report.conflicts.length} duplicate conflicts.`);
}

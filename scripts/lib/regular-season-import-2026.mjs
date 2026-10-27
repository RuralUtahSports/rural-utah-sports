import {teamKey,gameKey} from './competition-scope-2026.mjs';
import {samePlayer,compact} from './stat-import-integrity-2026.mjs';

// A successful HTTP import is not evidence of regular-season scope, field
// completeness or a newer provider reporting date. Keep imports as candidates
// until a reviewed correction batch authorizes individual replacements.
export function retainSeasonStatistics(retained, incoming) {
  if(retained.season!==2026||incoming.season!==2026)throw Error('Expected 2026 season data');
  const output=structuredClone(incoming),changes=[],identityConflicts=[];
  const saved=new Map(Object.entries(retained.teams||{}).map(([name,t])=>[teamKey(name),t]));
  for(const [name,team] of Object.entries(output.teams||{})) {
    const previous=saved.get(teamKey(name));
    if(JSON.stringify(previous?.stats||[])!==JSON.stringify(team.stats||[]))changes.push(name);
    team.stats=structuredClone(previous?.stats||[]);
    // Keep a verified/published stat row attached to its original roster identity.
    // An ID reused for another name/jersey is a candidate, never a new link.
    const referenced=new Set((previous?.stats||[]).flatMap(s=>s.rows||[]).map(p=>p.playerId).filter(Boolean));
    for(const person of previous?.roster||[]){
      if(!referenced.has(person.playerId))continue;
      const matches=(team.roster||[]).filter(p=>p.playerId===person.playerId);
      if(matches.length!==1||['number','name','class','height','weight'].some(k=>String(matches[0][k]??'')!==String(person[k]??''))){
        identityConflicts.push({team:name,playerId:person.playerId});
        team.roster=(team.roster||[]).filter(p=>p.playerId!==person.playerId);
        team.roster.push(structuredClone(person));
      }
    }
  }
  // A transient missing school must not erase previously published statistics.
  for(const [name,team] of Object.entries(retained.teams||{}))if(!Object.keys(output.teams||{}).some(n=>teamKey(n)===teamKey(name)))output.teams[name]=structuredClone(team);
  output.summary={...output.summary,regularSeasonImportReview:{policy:'retain-published-season-cells-until-source-reviewed',candidateTeams:changes,identityConflicts,retainedPublishedUpdatedAt:retained.updatedAt,verified:false}};
  output.summary.teamsWithStats=Object.values(output.teams).filter(t=>t.stats?.some(s=>s.rows?.length)).length;
  output.summary.statRows=Object.values(output.teams).reduce((n,t)=>n+(t.stats||[]).reduce((sum,s)=>sum+(s.rows||[]).length,0),0);
  return {rosters:output,candidateTeams:changes};
}

// A rebuilt source response may omit games or repeat an old coach submission.
// Retain previously reported nonblank cells; conflicting replacements remain in
// the candidate artifact until a reviewed batch explicitly authorizes them.
export function retainReportedGameCells(retained,incoming){
  const output=structuredClone(incoming);
  for(const [name,saved] of Object.entries(retained.teams||{})){
    const targets=Object.entries(output.teams||{}).filter(([t])=>teamKey(t)===teamKey(name));
    if(targets.length>1)throw Error('Ambiguous imported game team');
    if(!targets.length){output.teams[name]=structuredClone(saved);continue;}
    const target=targets[0][1],seen=new Set();target.games||=[];
    for(const prior of saved.games||[]){
      const key=gameKey(prior,name);if(!key||seen.has(key))throw Error('Duplicate or invalid retained game identity');seen.add(key);
      const matches=target.games.filter(g=>gameKey(g,name)===key);
      if(matches.length>1)throw Error('Duplicate imported game identity');
      if(!matches.length){target.games.push(structuredClone(prior));continue;}
      const game=matches[0];game.players||=[];
      for(const key of ['teamScore','opponentScore','final','status'])if(Object.hasOwn(prior,key))game[key]=prior[key];
      const ids=new Set();
      for(const person of prior.players||[]){
        if(!person.playerId||ids.has(person.playerId))throw Error('Duplicate or missing retained player identity');ids.add(person.playerId);
        // A changed provider ID must not create a second copy of a known athlete.
        game.players=game.players.filter(p=>p.playerId===person.playerId||compact(p.name)!==compact(person.name)||String(p.number)!==String(person.number));
        const players=game.players.filter(p=>p.playerId===person.playerId);
        if(players.length>1)throw Error('Duplicate imported player identity');
        if(!players.length){game.players.push(structuredClone(person));continue;}
        const player=players[0];
        if(!samePlayer(person,player)){game.players[game.players.indexOf(player)]=structuredClone(person);continue;}
        // Preserve the original reported representation, including unknowns and
        // distinct source categories. New coach fields remain in the candidate
        // artifact; only a reviewed batch can change an existing player's lines.
        player.statLines=structuredClone(person.statLines||[]);

      }
    }
  }
  return output;
}

export function retainVerifiedGameCells(retained,incoming,batch){
  const output=structuredClone(incoming);
  for(const d of batch.decisions.filter(d=>d.target==='game')){
    const locate=data=>Object.entries(data.teams||{}).find(([name])=>teamKey(name)===teamKey(d.team))?.[1];
    const previous=locate(retained),target=locate(output);
    if(!previous||!target)throw Error('Missing reviewed game team: '+d.team);
    const saved=previous.games.find(g=>gameKey(g,d.team)===gameKey(d,d.team));
    if(!saved)throw Error('Missing reviewed baseline game: '+d.id);
    let game=target.games.find(g=>gameKey(g,d.team)===gameKey(d,d.team));
    if(!game){game=structuredClone(saved);target.games.push(game);}
    const person=saved.players.find(p=>p.playerId===d.playerId);
    let player=game.players.find(p=>p.playerId===d.playerId);
    if(!person)throw Error('Missing reviewed baseline player: '+d.id);
    if(!player){player=structuredClone(person);game.players.push(player);}
    const norm=v=>String(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
    const line=person.statLines.find(l=>norm(l.category)===norm(d.category));
    const field=Object.keys(line?.values||{}).find(k=>norm(k)===norm(d.field));
    if(!field||String(line.values[field])!==d.verifiedReplacement)throw Error('Reviewed baseline game value changed: '+d.id);
    let dest=player.statLines.find(l=>norm(l.category)===norm(d.category));
    if(!dest){dest={category:d.category,values:{}};player.statLines.push(dest);}
    const key=Object.keys(dest.values||{}).find(k=>norm(k)===norm(d.field))||field;
    (dest.values||={})[key]=line.values[field];
    for(const meta of ['statEvidence','statSources'])if(line[meta]?.[field])(dest[meta]||={})[key]=structuredClone(line[meta][field]);
  }
  return output;
}

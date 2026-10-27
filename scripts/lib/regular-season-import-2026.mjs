import {teamKey,gameKey} from './competition-scope-2026.mjs';

// A successful HTTP import is not evidence of regular-season scope, field
// completeness or a newer provider reporting date. Keep imports as candidates
// until a reviewed correction batch authorizes individual replacements.
export function retainSeasonStatistics(retained, incoming) {
  if(retained.season!==2026||incoming.season!==2026)throw Error('Expected 2026 season data');
  const output=structuredClone(incoming),changes=[];
  const saved=new Map(Object.entries(retained.teams||{}).map(([name,t])=>[teamKey(name),t]));
  for(const [name,team] of Object.entries(output.teams||{})) {
    const previous=saved.get(teamKey(name));
    if(JSON.stringify(previous?.stats||[])!==JSON.stringify(team.stats||[]))changes.push(name);
    team.stats=structuredClone(previous?.stats||[]);
  }
  // A transient missing school must not erase previously published statistics.
  for(const [name,team] of Object.entries(retained.teams||{}))if(!Object.keys(output.teams||{}).some(n=>teamKey(n)===teamKey(name)))output.teams[name]=structuredClone(team);
  output.summary={...output.summary,regularSeasonImportReview:{policy:'retain-published-season-cells-until-source-reviewed',candidateTeams:changes,retainedPublishedUpdatedAt:retained.updatedAt,verified:false}};
  output.summary.teamsWithStats=Object.values(output.teams).filter(t=>t.stats?.some(s=>s.rows?.length)).length;
  output.summary.statRows=Object.values(output.teams).reduce((n,t)=>n+(t.stats||[]).reduce((sum,s)=>sum+(s.rows||[]).length,0),0);
  return {rosters:output,candidateTeams:changes};
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

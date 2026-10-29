// Explicit reported-aggregate corrections; complete-team rankings remain held.
const groups=new Set(['passing','rushing','receiving','defense','kicking']);
export function applyReviewedTeamAdjustments(retained,manifest){
 if(retained.season!==2026||manifest.season!==2026||manifest.scope!=='reviewed-reported-aggregate-adjustments-only'||manifest.holds?.length)throw Error('Invalid or unresolved team-stat review');
 const output=structuredClone(retained),seen=new Set(),changes=[];
 for(const d of manifest.decisions){
  const key=JSON.stringify([d.team,d.path]);
  if(seen.has(key)||!d.sourceBatches?.length||!((d.path.length===2&&groups.has(d.path[0]))||(d.path.length===1&&['totalOffense','totalYardsPerGame','yardsPerPlay'].includes(d.path[0])))||!Number.isFinite(d.originalValue)||!Number.isFinite(d.verifiedReplacement)||d.computedBefore!==d.originalValue||d.priorPRValue!==d.verifiedReplacement)throw Error('Unreviewed or duplicate team-stat decision');
  seen.add(key);let parent=output.teams[d.team];if(!parent)throw Error('Missing reviewed team');
  for(const k of d.path.slice(0,-1)){if(!Object.hasOwn(parent,k))throw Error('Missing reviewed aggregate group');parent=parent[k];}
  const k=d.path.at(-1);if(!Object.hasOwn(parent,k))throw Error('Missing reviewed aggregate field');
  if(parent[k]!==d.originalValue&&parent[k]!==d.verifiedReplacement)throw Error('Newer team-stat value needs source review: '+d.team+'.'+d.path.join('.'));
  if(parent[k]!==d.verifiedReplacement){parent[k]=d.verifiedReplacement;changes.push(key);}
 }
 return {data:output,changes};
}
export function preservePublishedTeamStatistics(retained,candidate,manifest){
 if(candidate.season!==2026||!candidate.teams||!Object.keys(candidate.teams).length)throw Error('Invalid team-stat import candidate');
 // Rebuilding reported player rows does not certify complete teams, dependent
 // rates, peer rankings or game denominators. Keep that output for review.
 return applyReviewedTeamAdjustments(retained,manifest);
}

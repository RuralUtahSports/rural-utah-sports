import fs from 'node:fs';
import crypto from 'node:crypto';

export const POLICY = '2026-regular-season-only-v1';
const compact = v => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const aliases = {
  CEDAR:'CEDARCITY', GRANDCOUNTY:'GRAND', GUNNISON:'GUNNISONVALLEY', MONUMENTVALLEY:'MONUMENTVAL',
  MAPLEMTN:'MAPLEMOUNTAIN', STJOSEPH:'SAINTJOSEPH', STJOSEPHS:'SAINTJOSEPH',
  JUDGEMEMORIALCATHOLIC:'JUDGEMEMORIAL', LAYTONCHRISTIANACADEMY:'LAYTONCHRISTIAN',
  AMERICANLEADERSHIP:'ALA', AMERICANLEADERSHIPACADEMY:'ALA',
  UTAHMILITARYACADEMYHILLFIELD:'UMAHILLFIELD', UTAHMILITARYACADEMYHILLFIELDHAWKS:'UMAHILLFIELD',
  UMAHF:'UMAHILLFIELD', UTAHMILITARYACADEMYCAMPWILLIAMS:'UMALEHI', UMACW:'UMALEHI',
  BEAVERDAMAZ:'BEAVERDAM', BEAVERDAMARIZONA:'BEAVERDAM'
};
export const teamKey = v => aliases[compact(v)] || compact(v);
export function isoDate(value) {
  const s=String(value ?? '').trim(); let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(!m){const us=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(us)m=[us[0],us[3],us[1],us[2]];}
  if(!m){const named=s.match(/^([A-Za-z]+) (\d{1,2}), (\d{4})$/);const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];const month=named?months.indexOf(named[1].slice(0,3).toLowerCase())+1:0;if(month)m=[s,named[3],String(month),named[2]];}
  if(!m)return null;
  const result=`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  const d=new Date(result+'T00:00:00Z');return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===result?result:null;
}
export function gameKey(game, team) {
  const date=isoDate(game.date),a=teamKey(game.awayTeam||team||game.team),b=teamKey(game.homeTeam||game.opponent);
  return date&&a&&b&&a!==b?`${date}|${[a,b].sort().join('|')}`:null;
}
const realTeam=v=>typeof v==='string'&&v.trim()&&!/\b(bye|tbd|winner|loser|matchup)\b/i.test(v);
const sourceOK=e=>e&&/^https:\/\/(?:www\.)?(?:maxpreps\.com|sports\.deseret\.com|uhsaa\.org)\//.test(e.url||'');

// Positive schedule/competition evidence only. A date, a score, or absence from
// the playoff bracket is never sufficient to mark a game regular-season.
export function createCompetitionIndex({brackets={},review={}}={}) {
  const observations=new Map();
  const add=(game,phase,evidence)=>{
    const key=gameKey(game);if(!key||!key.startsWith('2026-')||!sourceOK(evidence))return;
    const list=observations.get(key)||[];list.push({phase,evidence});observations.set(key,list);
  };
  if(brackets.season===2026)for(const [classification,c] of Object.entries(brackets.classifications||{})){
    if(c.status!=='official')continue;
    for(const round of c.rounds||[])for(const g of round.games||[]){
      if(!realTeam(g.a?.name)||!realTeam(g.b?.name))continue;
      add({date:g.date,awayTeam:g.a.name,homeTeam:g.b.name},'postseason',{
        url:c.sourceUrl,kind:'cached-official-bracket',classification,round:round.name,observedAt:brackets.updatedAt
      });
    }
  }
  if(review.season===2026)for(const g of review.games||[]){
    if(!['regular-season','postseason'].includes(g.phase)||g.verification!=='schedule-reviewed')continue;
    for(const e of g.evidence||[])if(e.kind==='schedule-competition-label'&&e.observedAt)add(g,g.phase,e);
  }
  return {
    observations,
    classify(game,team){
      const key=gameKey(game,team),rows=observations.get(key)||[],phases=new Set(rows.map(x=>x.phase));
      return {key,phase:phases.size===1?[...phases][0]:'unknown',reason:phases.size>1?'conflicting-competition-evidence':rows.length?'schedule-or-competition-evidence':'unverified-competition-phase',evidence:rows.map(x=>x.evidence)};
    }
  };
}
export function partitionGames(games,index,team){
  const result={regular:[],postseason:[],unknown:[]};
  for(const game of games){const scope=index.classify(game,team);result[scope.phase==='regular-season'?'regular':scope.phase==='postseason'?'postseason':'unknown'].push({game,scope});}
  return result;
}
export function chooseRegularSeasonTotal({retainedValue,approval,regularCells=[],expectedGameKeys=[],sourceScope='unknown'}){
  // Never derive regular season by subtracting playoff rows from cumulative data.
  if(approval?.scope==='regular-season'&&approval.reviewedBy&&approval.sources?.length&&approval.sources.every(url=>sourceOK({url}))&&retainedValue!==null&&retainedValue!==undefined&&retainedValue!==''&&Number.isFinite(Number(retainedValue))&&approval.value===retainedValue)
    return {value:retainedValue,status:'preserved-verified',method:'reviewed-source-total'};
  const keys=new Set();let sum=0;
  for(const cell of regularCells){
    if(cell.phase!=='regular-season'||!cell.verified||!sourceOK({url:cell.sourceUrl})||keys.has(cell.gameKey)||cell.value===null||cell.value===undefined||cell.value===''||!Number.isFinite(Number(cell.value)))
      return {value:null,retainedValue,status:'review-required',reason:'incomplete-or-conflicting-field-evidence'};
    keys.add(cell.gameKey);sum+=Number(cell.value);
  }
  if(!expectedGameKeys.length||new Set(expectedGameKeys).size!==expectedGameKeys.length||keys.size!==expectedGameKeys.length||expectedGameKeys.some(k=>!keys.has(k)))
    return {value:null,retainedValue,status:'review-required',reason:sourceScope==='includes-postseason'?'cumulative-total-cannot-be-separated':'regular-season-field-coverage-incomplete'};
  // A complete game sum is a proposal; it still cannot silently overwrite a saved total.
  return {value:null,retainedValue,proposedValue:sum,status:'review-required',reason:'complete-game-sum-needs-source-review'};
}
export const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export function assertApprovedRegularSeasonFile(file,{reviewFile='regular-season-stat-review-2026.json'}={}){
  const review=JSON.parse(fs.readFileSync(reviewFile,'utf8'));
  const entry=(review.approvedFiles||[]).find(x=>x.path===file);
  if(review.season!==2026||review.policy!==POLICY||!entry||entry.scope!=='regular-season'||!entry.reviewedBy||!isoDate(entry.reviewedAt)||!entry.sources?.length||entry.sources.some(url=>!sourceOK({url}))||entry.sha256!==sha256(fs.readFileSync(file)))
    throw new Error(`REGULAR_SEASON_REVIEW_REQUIRED: ${file} lacks source-reviewed, hash-bound regular-season certification. Retained file unchanged; do not subtract incomplete playoff stats. Run scripts/audit_regular_season_2026.mjs.`);
  return entry;
}
export function assertClassifiedFinals(games,index){
  const unclassified=games.filter(g=>index.classify(g).phase==='unknown');
  if(unclassified.length)throw new Error(`REGULAR_SEASON_REVIEW_REQUIRED: ${unclassified.length} final games have unknown/conflicting competition phase.`);
  return games.filter(g=>index.classify(g).phase==='regular-season');
}

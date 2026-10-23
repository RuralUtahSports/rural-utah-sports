import fs from 'node:fs';

/**
 * Add verified 2026 Richfield positions after Deseret roster/stat aggregation.
 * Source-of-truth audit: richfield-positions-2026.json
 * No statistics or player identities are changed. Unknown positions stay blank.
 */
export function applyRichfieldPositionOverrides(result, options={}){
  const file=options.file||'richfield-positions-2026.json';
  if(!fs.existsSync(file))return {updated:0,unverified:0,review:0,missing:true};
  const audit=JSON.parse(fs.readFileSync(file,'utf8'));
  if(audit?.season!==2026||audit?.team!=='RICHFIELD'||!Array.isArray(audit.players)){
    throw new Error('Invalid Richfield 2026 position audit');
  }
  const richfield=result.teams?.RICHFIELD;
  if(!richfield)return {updated:0,unverified:0,review:0,missing:false};
  const byID=new Map(audit.players.map(p=>[p.playerId,p]));
  let updated=0,unverified=0,review=0;
  for(const p of richfield.roster||[]){
    const rec=byID.get(p.playerId);
    if(!rec)continue;
    if(!rec.position){unverified++;continue}
    if(String(p.position||'').trim()&&String(p.position).trim()!=='-')continue;
    p.position=rec.position;
    p.positionSource=audit.sourceUrl;
    if(/mismatch/.test(rec.matchStatus||'')){p.positionReview=true;review++}
    updated++;
  }
  return {updated,unverified,review,missing:false};
}

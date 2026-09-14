// Shared identity and final-score reconciliation for 2026 football.
export const canonicalTeam = value => {
  const key=String(value??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  return ({EASTWOODTEXAS:'EASTWOODTX',STJOSEPH:'SAINTJOSEPH',CEDAR:'CEDARCITY',
    GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISONVALLEY',MONUMENTVALLEY:'MONUMENTVAL',
    MAPLEMTN:'MAPLEMOUNTAIN',UTAHMILITARYACADEMYCAMPWILLIAMS:'UMALEHI',
    UMACAMPWILLIAMS:'UMALEHI'})[key]||key;
};
export const isoDate = value => {
  const s=String(value??'').trim(),m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m?m[3]+'-'+m[1].padStart(2,'0')+'-'+m[2].padStart(2,'0'):s;
};
const score = v => v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))&&Number(v)>=0;
const near=(a,b)=>Math.abs(Date.parse(isoDate(a))-Date.parse(isoDate(b)))<=3*86400000;
export function reconcileFinalGames(input,{details={},corrections=[]}={}) {
  const finalDetails=Object.entries(details).filter(([,d])=>
    (d?.final===true||/^final$/i.test(d?.status||''))&&
    score(d?.boxScore?.rows?.[0]?.total)&&score(d?.boxScore?.rows?.[1]?.total));
  const out=[];
  for(const raw of input){
    const g={...raw,awayTeam:canonicalTeam(raw.awayTeam)==='EASTWOODTX'?'EASTWOOD, TX':raw.awayTeam,
      homeTeam:canonicalTeam(raw.homeTeam)==='EASTWOODTX'?'EASTWOOD, TX':raw.homeTeam};
    const a=canonicalTeam(g.awayTeam),h=canonicalTeam(g.homeTeam);
    const matches=finalDetails.filter(([key,d])=>{
      const [date,away,home]=key.split('|');
      return near(g.date,d.date||date)&&canonicalTeam(d.awayTeam||away)===a&&canonicalTeam(d.homeTeam||home)===h;
    }).sort((x,y)=>String(y[1].fetchedAt||'').localeCompare(String(x[1].fetchedAt||'')));
    if(matches.length){const d=matches[0][1];g.actualAway=Number(d.boxScore.rows[0].total);g.actualHome=Number(d.boxScore.rows[1].total);g.source='deseret';}
    const correction=corrections.find(c=>isoDate(c.date)===isoDate(g.date)&&canonicalTeam(c.awayTeam)===a&&canonicalTeam(c.homeTeam)===h);
    if(correction){g.actualAway=correction.actualAway;g.actualHome=correction.actualHome;g.source='verified';}
    if(!score(g.actualAway)||!score(g.actualHome))continue;
    g.actualAway=Number(g.actualAway);g.actualHome=Number(g.actualHome);
    const i=out.findIndex(x=>near(x.date,g.date)&&canonicalTeam(x.awayTeam)===a&&canonicalTeam(x.homeTeam)===h);
    if(i<0)out.push(g);
    else if(g.source==='verified'||(g.source==='deseret'&&out[i].source!=='verified'))out[i]=g;
  }
  return out;
}

/* RUS Madden-style team grades. Separate from the spread-calibrated power model.
   This does not estimate point spreads; its OVR/OFF/DEF are relative 50-99 grades. */
(function(root){
"use strict";
const DAY=86400000;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const validNumber=(x)=>x!==null&&x!==undefined&&x!==""&&Number.isFinite(Number(x));
const isEight=(c)=>String(c||"").trim().toUpperCase()==="8P";
const dateOf=(s)=>{
 const m=String(s||"").match(/^(\d{1,2})\/(\d{1,2})\/(20\d{2})$/);
 return m ? Date.UTC(+m[3],+m[1]-1,+m[2]) : NaN;
};
const rankGrades=(values)=>{
 const sorted=values.slice().sort((a,b)=>a-b);
 return values.map(x=>{
  const lower=sorted.findIndex(v=>v>=x);
  const count=sorted.filter(v=>v===x).length;
  const position=lower+(count-1)/2;
  return clamp(Math.round(50+49*(sorted.length===1?0.5:position/(sorted.length-1))),50,99);
 });
};
function build(weeklyData,teamData,eloData){
 const teams=Array.isArray(teamData)?teamData.filter(t=>t&&t.team&&t.classification):[];
 const school=new Map(teams.map(t=>[t.team,t]));
 const source=Array.isArray(weeklyData?.games)?weeklyData.games:[];
 const finished=[],seen=new Set();
 for(const g of source){
  if(!school.has(g.awayTeam)||!school.has(g.homeTeam))continue;
  if(isEight(school.get(g.awayTeam).classification)!==isEight(school.get(g.homeTeam).classification))continue;
  if(!validNumber(g.actualAway)||!validNumber(g.actualHome))continue;
  const away=Number(g.actualAway),home=Number(g.actualHome);
  if(away<0||home<0||away+home===0)continue;
  const date=dateOf(g.date);
  if(!Number.isFinite(date))continue;
  const reported=String(g.actualWinner||"").toUpperCase().trim();
  if(reported&&reported!=="TIE"){
   const winner=away>home?g.awayTeam:home>away?g.homeTeam:"TIE";
   if(reported!==winner)continue;
  }
  const key=g.date+"|"+[g.awayTeam,g.homeTeam].sort().join("|");
  if(seen.has(key))continue;
  seen.add(key);
  finished.push({away:g.awayTeam,home:g.homeTeam,awayScore:away,homeScore:home,date,eight:isEight(school.get(g.awayTeam).classification)});
 }
 const result={};
 for(const format of ["11P","8P"]){
  const eight=format==="8P";
  const group=teams.filter(t=>isEight(t.classification)===eight);
  const names=group.map(t=>t.team),indices=new Map(names.map((name,i)=>[name,i]));
  const games=finished.filter(g=>g.eight===eight);
  const latest=games.length?Math.max(...games.map(g=>g.date)):NaN;
  const base=games.length?games.reduce((sum,g)=>sum+g.awayScore+g.homeScore,0)/(games.length*2):28;
  const prior=names.map(n=>clamp(((Number(eloData?.[n]?.currentElo)||1500)-1500)*.012,-11,11));
  const counts=names.map(()=>0),wins=names.map(()=>0),totalWeights=names.map(()=>0);
  const observations=games.map(g=>{
   const a=indices.get(g.away),h=indices.get(g.home);
   const age=(latest-g.date)/DAY;
   const weight=.58+.62*clamp(1-age/65,0,1);
   counts[a]++;counts[h]++;
   if(g.awayScore>g.homeScore)wins[a]++;
   else if(g.homeScore>g.awayScore)wins[h]++;
   totalWeights[a]+=weight;totalWeights[h]+=weight;
   // Split the same 2.5-point home-field assumption into each team's scoring.
   return {a,h,away:g.awayScore+1.25,home:g.homeScore-1.25,weight};
  });
  // Opponent-adjusted scoring: neutral PF ≈ league mean + attack - opponent defense.
  // Weak Elo prior prevents fragile rankings for teams with very few played games.
  let offense=prior.slice(),defense=prior.slice();
  for(let iteration=0;iteration<180;iteration++){
   const offenseTotals=prior.map(x=>2*x),defenseTotals=prior.map(x=>2*x);
   for(const g of observations){
    offenseTotals[g.a]+=g.weight*(g.away-base+defense[g.h]);
    offenseTotals[g.h]+=g.weight*(g.home-base+defense[g.a]);
    defenseTotals[g.h]+=g.weight*(base+offense[g.a]-g.away);
    defenseTotals[g.a]+=g.weight*(base+offense[g.h]-g.home);
   }
   const newOffense=offenseTotals.map((v,i)=>v/(2+totalWeights[i]));
   const newDefense=defenseTotals.map((v,i)=>v/(2+totalWeights[i]));
   const maxChange=Math.max(0,...newOffense.map((v,i)=>Math.abs(v-offense[i])),...newDefense.map((v,i)=>Math.abs(v-defense[i])));
   offense=newOffense;defense=newDefense;
   if(maxChange<.00001)break;
  }
  // Madden grades are percentiles, not points: OVR never predicts a margin.
  const attackGrades=rankGrades(offense),defenseGrades=rankGrades(defense);
  const ratings=group.map((team,i)=>{
   const w=counts[i]?wins[i]/counts[i]:.5;
   return {
    name:team.team,
    classification:team.classification,
    region:team.region||"",
    overall:clamp(Math.round(.51*attackGrades[i]+.49*defenseGrades[i]+2*(w-.5)),50,99),
    offense:attackGrades[i],
    defense:defenseGrades[i],
    played:counts[i],
    provisional:counts[i]<4,
    adjustedPF:Number((base+offense[i]).toFixed(1)),
    adjustedPA:Number((base-defense[i]).toFixed(1)),
    backgroundColor:team.backgroundColor||"#222",
    textColor:team.textColor||"#fff"
   };
  });
  ratings.sort((a,b)=>b.overall-a.overall||b.offense-a.offense||a.name.localeCompare(b.name));
  result[format]={
   teams:ratings,
   games:games.length,
   latestGame:Number.isFinite(latest)?new Date(latest).toISOString().slice(0,10):null,
   description:"Game-based Madden-style percentile grades (overall, offense, defense) from 2026 opponent-adjusted results with a small Elo prior. Not calibrated to point spreads."
  };
 }
 return result;
}
root.RUSMaddenRatings={build};
})(typeof window!=="undefined"?window:globalThis);

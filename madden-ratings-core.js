/* RUS Madden-style team grades, 2026 statewide recalibration.
   Uses opponent-adjusted scoring, current ELO, and a statewide-strength benchmark
   from the separate spread model; Madden grades NEVER equal point spreads. */
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
// Continuous (rather than percentile) normalization prevents every dominant
// small-class program from automatically becoming 98-99 overall.
const linearGrades=(values)=>{
 if(!values.length)return [];
 const lo=Math.min(...values),hi=Math.max(...values);
 return values.map(v=>clamp(Math.round(hi===lo?75:50+49*(v-lo)/(hi-lo)),50,99));
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
function build(weeklyData,teamData,eloData,powerData){
 // Use the existing statewide opponent-adjusted point-spread model as one
 // strength benchmark, not as the Madden overall itself. Calculate it here
 // when the caller has not precomputed it, to keep results deterministic.
 const benchmark=powerData||(root.RUSPowerRatings&&root.RUSPowerRatings.build(weeklyData,teamData,eloData));
 if(!benchmark||!benchmark["11P"]||!benchmark["8P"])throw new Error("RUS Madden Ratings require RUS Power Ratings as a statewide strength benchmark.");
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
  // Unlike the old all-percentile grading, OVR combines three distinct
  // strength signals measured across the SAME football format:
  // - 75% neutral-field opponent-adjusted Power Rating, rescaled to 50-99
  // - 10% adjusted 2026 scoring margin, normalized linearly (not by rank)
  // - 15% statewide ELO, normalized linearly for opponent context
  // This anchors an 88-90-quality program below 98-99 elite programs even
  // when both dominate their respective classification schedules.
  const benchmarkRows=benchmark[format].teams||[];
  const powerByName=new Map(benchmarkRows.map(t=>[t.name,t.rating]));
  const powerValues=names.map(n=>powerByName.get(n));
  if(powerValues.some(v=>!Number.isFinite(v)))throw new Error("RUS Power Ratings are missing a team in "+format);
  const scaledPower=linearGrades(powerValues);
  const scoringStrength=offense.map((v,i)=>v+defense[i]);
  const scoredGrade=linearGrades(scoringStrength);
  const eloGrade=linearGrades(names.map(n=>Number(eloData?.[n]?.currentElo)||1500));
  // Offense/defense split depends on OPPONENT-ADJUSTED scoring estimates.
  // Their difference is a tendency, not independent percentile strength.
  const attackStyle=rankGrades(offense),defenseStyle=rankGrades(defense);
  const ratings=group.map((team,i)=>{
   const overall=clamp(Math.round(.75*scaledPower[i]+.10*scoredGrade[i]+.15*eloGrade[i]),50,99);
   const rawBias=Math.round(.55*(attackStyle[i]-defenseStyle[i]));
   const headroom=Math.min(overall-50,99-overall);
   const bias=clamp(rawBias,-Math.min(10,headroom),Math.min(10,headroom));
   return {
    name:team.team,
    classification:team.classification,
    region:team.region||"",
    overall,
    offense:overall+bias,
    defense:overall-bias,
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
   description:"Statewide strength-calibrated Madden grades: 75% opponent-adjusted statewide power benchmark, 10% linear adjusted 2026 scoring margin, 15% statewide ELO. Separate opponent-adjusted offensive/defensive tendency; no Madden grade is a predicted point spread."
  };
 }
 return result;
}
root.RUSMaddenRatings={build};
})(typeof window!=="undefined"?window:globalThis);

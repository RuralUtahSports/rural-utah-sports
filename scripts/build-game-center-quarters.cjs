/* Build a compact, audited 2026 quarter-scoring dataset from RUS's existing sources.
 * Never infer an unreported quarter score (including a likely 0). */
"use strict";
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n),"utf8"));
const weekly=read("weekly-simulation.json");
const raw=read("deseret-game-details.json");
const overrides=read("game-center-quarter-overrides-2026.json");
const compact=name=>String(name||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const iso=date=>{const m=String(date||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?m[3]+"-"+m[1].padStart(2,"0")+"-"+m[2].padStart(2,"0"):"";};
const numeric=x=>x!==null&&x!==undefined&&String(x).trim()!==""&&Number.isFinite(Number(x))&&Number(x)>=0?Number(x):null;
const orderedNames=(rowA,rowB,a,b)=>{
 const match=(x,name)=>compact(x).includes(compact(name));
 if(match(rowA.team,a)&&match(rowB.team,b))return[rowA,rowB];
 if(match(rowA.team,b)&&match(rowB.team,a))return[rowB,rowA];
 // A matchup may have plain unhelpful team labels; do not guess which team's quarters they represent.
 return null;
};
const manual=new Map(overrides.map(x=>[x.iso+"|"+compact(x.away)+"|"+compact(x.home),x]));
const out=[],tallies={};
for(const g of weekly.games||[]){
 const a=String(g.awayTeam||"").toUpperCase(),b=String(g.homeTeam||"").toUpperCase();
 const ga=numeric(g.actualAway),gb=numeric(g.actualHome),day=iso(g.date);
 const declared=String(g.actualWinner||"").trim().toUpperCase();
 const winner=ga!==null&&gb!==null?(ga>gb?a:gb>ga?b:"TIE"):"";
 if(!a||!b||!day||ga===null||gb===null||ga+gb===0||!declared||declared!==winner)continue;
 const key=day+"|"+compact(a)+"|"+compact(b);
 const reverse=day+"|"+compact(b)+"|"+compact(a);
 const item={iso:day,away:a,home:b,awayTotal:ga,homeTotal:gb,status:"unavailable",reason:"no_verified_quarters"};
 const override=manual.get(key);
 if(override){
  const q=override.quarters;
  if(!Array.isArray(q)||q.length!==2||q.some(v=>v.length!==override.periods.length||v.some(n=>numeric(n)===null)))throw Error("Incomplete manually sourced quarter scores "+key);
  if(q[0].reduce((s,n)=>s+n,0)!==ga||q[1].reduce((s,n)=>s+n,0)!==gb)throw Error("Manual scores conflict with confirmed final "+key);
  Object.assign(item,{status:"verified",reason:undefined,periods:override.periods,quarters:q,sourceUrl:override.sourceUrl,source:"verified_manual"});
 }else{
  const d=raw.games?.[key]||raw.games?.[reverse];
  if(!d){item.reason="not_in_source";}
  else if(!d.final){item.reason="source_not_final";}
  else{
   const box=d.boxScore,rr=box?.rows||[],periods=box?.periods||[];
   item.sourceUrl=/^https:\/\/sports\.deseret\.com\//.test(d.url||"")?d.url:undefined;
   if(rr.length!==2||!Array.isArray(periods)||periods.length<4){item.reason="no_quarter_box";}
   else{
    const paired=orderedNames(rr[0],rr[1],a,b);
    if(!paired){item.reason="team_label_unmatched";}
    else if(numeric(paired[0].total)!==ga||numeric(paired[1].total)!==gb){item.reason="final_total_conflict";item.status="conflict";}
    else{
     let rows=paired.map(r=>(Array.isArray(r.quarters)?r.quarters:[]).map(numeric));
     let labels=periods.slice();
     // Certain Deseret OT boxes omit the Q1 header but include Q1 points as an
     // explicit trailing number after each team's record in the team label.
     // Recover only those explicitly printed points, never compute by subtraction.
     if(labels[0]==="Q2"&&labels.includes("OT")||labels[0]==="Q2"&&labels.some(x=>/\bOT\b/.test(x))){
      const first=paired.map(r=>{const m=String(r.team).match(/\)\s*(\d{1,2})\s*$/);return m?Number(m[1]):null});
      if(first.every(n=>n!==null)){labels=["Q1",...labels];rows=rows.map((arr,i)=>[first[i],...arr]);}
     }
     const len=labels.length;
     if(rows.some(arr=>arr.length!==len)){item.reason="quarter_count_conflict";item.status="conflict";}
     else if(rows.some((arr,i)=>arr.reduce((s,v)=>s+(v??0),0)>[ga,gb][i])){item.reason="quarter_sum_conflict";item.status="conflict";}
     else if(rows.every((arr,i)=>arr.every(v=>v!==null)&&arr.reduce((s,v)=>s+v,0)===[ga,gb][i])){
      Object.assign(item,{status:"verified",reason:undefined,periods:labels,quarters:rows,source:"deseret"});
     }else if(rows.some(arr=>arr.some(v=>v!==null))){
      // Preserve only source-reported cells; blanks remain blanks, including Q4.
      Object.assign(item,{status:"partial",reason:"missing_quarter_cells",periods:labels,quarters:rows,source:"deseret"});
     }else{item.reason="no_quarter_values";}
    }
   }
  }
 }
 tallies[item.status]=(tallies[item.status]||0)+1;
 if(item.reason)tallies[item.reason]=(tallies[item.reason]||0)+1;
 out.push(item);
}
out.sort((a,b)=>b.iso.localeCompare(a.iso)||a.away.localeCompare(b.away));
const generated={season:2026,method:"Verified weekly finals crosschecked with Deseret quarter boxes; source blanks are never inferred.",sourceFiles:["weekly-simulation.json","deseret-game-details.json","game-center-quarter-overrides-2026.json"],summary:{total:out.length,verified:tallies.verified||0,partial:tallies.partial||0,unavailable:tallies.unavailable||0,conflict:tallies.conflict||0,reasonCounts:tallies},games:out};
fs.writeFileSync(path.join(root,"game-center-quarter-scores-2026.json"),JSON.stringify(generated)+"\n");
console.log("Game Center quarter audit:",JSON.stringify(generated.summary));

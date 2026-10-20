/* Game Center 2.0 — enhancements consume the existing verified RUS model and datasets. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
const num=x=>x==null||String(x).trim()===""?null:(Number.isFinite(Number(x))?Number(x):null);
const fmt=x=>x==null?"—":Number(x).toLocaleString("en-US",{maximumFractionDigits:1});
const percent=x=>(x*100).toFixed(1)+"%";
const getTeam=(obj,name)=>obj?.teams?.[name]||null;
const state={snapshot:null,teamStats:null,playerStats:null,quarterData:null,quarterError:false,details:null,detailsLoading:null,series:null,seriesFor:"",gameSelected:"",teamStatsError:false,playerError:false,detailsError:false,sd:{}};
const fetchData=async path=>{const response=await fetch(path,{cache:"no-store"});if(!response.ok)throw Error(path+" "+response.status);return response.json()};
function comparable(a,b){
 return a!==null&&a!==undefined&&b!==null&&b!==undefined&&Number.isFinite(a)&&Number.isFinite(b);
}
function barRow(label,a,b,higherBetter=true,suffix=""){
 const valid=comparable(a,b),max=valid?Math.max(Math.abs(a),Math.abs(b),1):1;
 const widthA=valid?Math.max(2,Math.round(Math.max(0,a)/max*100)):0;
 const widthB=valid?Math.max(2,Math.round(Math.max(0,b)/max*100)):0;
 const better=valid?(Math.abs(a-b)<0.001?"tie":(a>b)===higherBetter?"a":"b"):"missing";
 return '<div class="v2-stat"><div class="v2-stat-pair"><div class="'+(better==="a"?"v2-leading":"")+'"><strong>'+fmt(a)+(a==null?"":suffix)+'</strong><div class="v2-stat-track"><i style="width:'+widthA+'%;--fill:var(--tone-a)"></i></div></div>'+
   '<div class="v2-stat-name">'+esc(label)+'</div>'+
   '<div class="'+(better==="b"?"v2-leading":"")+'"><strong>'+fmt(b)+(b==null?"":suffix)+'</strong><div class="v2-stat-track"><i style="width:'+widthB+'%;--fill:var(--tone-b)"></i></div></div></div></div>';
}
function compare(){
 const s=state.snapshot;if(!s)return;
 const ta=getTeam(state.teamStats,s.a.name),tb=getTeam(state.teamStats,s.b.name);
 const host=$("v2Stats"),coverage=$("v2Coverage");
 $("v2StatsA").textContent=s.a.name;$("v2StatsB").textContent=s.b.name;
 host.style.setProperty("--tone-a",color(s.a.backgroundColor));
 host.style.setProperty("--tone-b",color(s.b.backgroundColor));
 if(!state.teamStats){host.innerHTML='<div class="empty">'+(state.teamStatsError?"Team stats temporarily unavailable.":"Loading 2026 team stats…")+'</div>';return;}
 const avg=(o,path)=>{let v=o;for(const p of path.split("."))v=v?.[p];return num(v)};
 const winPct=t=>t&&num(t.wins)!==null&&num(t.losses)!==null&&(Number(t.wins)+Number(t.losses)+Number(t.ties||0))>0?Number(t.wins)/(Number(t.wins)+Number(t.losses)+Number(t.ties||0))*100:null;
 const ppgA=avg(ta,"ppg"),ppgB=avg(tb,"ppg");
 const pairs=[
  ["RUS Power Rating",s.a.rating,s.b.rating,true,""],
  ["2026 Win %",winPct(ta),winPct(tb),true,"%"],
  ["Points scored / game",ppgA,ppgB,true,""],
  ["Points allowed / game",avg(ta,"pointsAllowedPerGame"),avg(tb,"pointsAllowedPerGame"),false,""],
  ["Scoring margin / game",avg(ta,"scoringMargin"),avg(tb,"scoringMargin"),true,""],
  ["Reported total yards / game",avg(ta,"totalYardsPerGame"),avg(tb,"totalYardsPerGame"),true,""],
  ["Reported rushing yards / game",avg(ta,"rushing.yardsPerGame"),avg(tb,"rushing.yardsPerGame"),true,""],
  ["Reported passing yards / game",avg(ta,"passing.yardsPerGame"),avg(tb,"passing.yardsPerGame"),true,""]
 ];
 host.innerHTML=pairs.map(v=>barRow(...v)).join("");
 coverage.textContent="2026 team stats · "+(ta?.record||"No reported record")+" / "+(tb?.record||"No reported record")+". Offensive yardages derive from reported player season totals; some schools have incomplete reporting.";
}
function color(str){return /^#[\da-f]{6}$/i.test(String(str))?str:"#f14d07"}
function probabilitySD(snapshot){
 if(state.sd[snapshot.format])return state.sd[snapshot.format];
 const map=new Map((snapshot.ratings?.[snapshot.format]?.teams||[]).map(t=>[t.name,t]));
 const rows=snapshot.games||[];
 let sum=0,n=0;
 for(const g of rows){
  const a=map.get(g.awayTeam),h=map.get(g.homeTeam);
  if(!a||!h)continue;
  // Compare the displayed 2026 strength difference with the final margin.
  // This is descriptive *in-sample* dispersion, not prospective validation.
  const residual=(g.away-g.home)-(a.rating-h.rating-2.5);
  if(!Number.isFinite(residual))continue;
  sum+=residual*residual;n++;
 }
 const sd=n>=15?Math.sqrt(sum/n):null;
 state.sd[snapshot.format]={sd,n};
 return state.sd[snapshot.format];
}
function winChance(diff,sd){
 if(!Number.isFinite(diff)||!Number.isFinite(sd)||sd<=0)return null;
 // Logistic CDF with variance matched to the observed margin residual RMS.
 const scale=Math.sqrt(3)*sd/Math.PI;
 const result=1/(1+Math.exp(-diff/scale));
 return Math.max(.005,Math.min(.995,result));
}
function renderProbability(){
 const s=state.snapshot;
 if(!s)return;
 const {sd,n}=probabilitySD(s),p=winChance(s.difference,sd);
 const holder=$("v2Probability");
 if(p==null){holder.innerHTML='<div class="empty">Insufficient scored games to estimate the margin variability for this format.</div>';return;}
 const toneA=color(s.a.backgroundColor),toneB=color(s.b.backgroundColor);
 const calc=(venue)=>winChance(s.neutral+(venue==="a"?s.home:venue==="b"?-s.home:0),sd);
 holder.innerHTML='<div class="v2-prob-intro"><div><span>'+esc(s.a.name)+'</span><strong>'+percent(p)+'</strong></div><div><span>'+esc(s.b.name)+'</span><strong>'+percent(1-p)+'</strong></div></div>'+
 '<div class="v2-prob-track" role="img" aria-label="'+esc(s.a.name)+" "+percent(p)+" chance, "+esc(s.b.name)+" "+percent(1-p)+' chance"><i style="width:'+(p*100).toFixed(1)+'%;background:'+toneA+'"></i><i style="width:'+((1-p)*100).toFixed(1)+'%;background:'+toneB+'"></i></div>'+
 '<div class="v2-prob-options"><button type="button" data-v2-venue="neutral" class="'+(s.venue==="neutral"?"is-current":"")+'">Neutral<br><b>'+percent(calc("neutral"))+'</b></button>'+
 '<button type="button" data-v2-venue="a" class="'+(s.venue==="a"?"is-current":"")+'">'+esc(s.a.name)+' home<br><b>'+percent(calc("a"))+'</b></button>'+
 '<button type="button" data-v2-venue="b" class="'+(s.venue==="b"?"is-current":"")+'">'+esc(s.b.name)+' home<br><b>'+percent(calc("b"))+'</b></button></div>';
 $("v2ProbMethod").textContent="Experimental estimate based on the existing RUS power spread and the 2026 in-sample game-margin variability ("+n+" finalized games, "+fmt(sd)+"-point RMS residual). No out-of-sample validation; not an official RUS forecast, sportsbook odds or a guarantee.";
}
const dateMillis=d=>{
 const parts=String(d||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 if(parts)return Date.UTC(+parts[3],+parts[1]-1,+parts[2]);
 const iso=String(d||"").match(/^(\d{4})-(\d{2})-(\d{2})/);
 return iso?Date.UTC(+iso[1],+iso[2]-1,+iso[3]):0;
};
function rivalry(){
 const s=state.snapshot;
 if(!s)return;
 const host=$("v2Rivalry");
 const key=[s.a.name,s.b.name].sort().join("|");
 if(state.seriesFor!==key){
  state.seriesFor=key;
  state.series=null;
 }
 if(!state.series){host.innerHTML='<div class="empty">Loading recorded rivalry history…</div>';return;}
 const games=state.series.slice().sort((a,b)=>a.stamp-b.stamp);
 if(!games.length){host.innerHTML='<div class="empty">No recorded meetings for this pairing.</div>';return;}
 let wA=0,wB=0,t=0,aStreak=0,bStreak=0,maxA=0,maxB=0,pts=[];
 const nameA=s.a.name,nameB=s.b.name;
 for(let i=0;i<games.length;i++){
  const g=games[i],scoreA=g.team1===nameA?g.score1:g.score2,scoreB=g.team1===nameB?g.score1:g.score2;
  if(scoreA>scoreB){wA++;aStreak++;bStreak=0;maxA=Math.max(maxA,aStreak);}
  else if(scoreB>scoreA){wB++;bStreak++;aStreak=0;maxB=Math.max(maxB,bStreak);}
  else{t++;aStreak=0;bStreak=0;}
  pts.push({x:i,lead:wA-wB,year:new Date(g.stamp).getUTCFullYear()});
 }
 const first=games[0],last=games[games.length-1],largest=Math.max(1,...pts.map(p=>Math.abs(p.lead)));
 const width=720,height=238,left=35,right=30,top=26,bottom=28,plotW=width-left-right,mid=(height-top-bottom)/2+top,scaleY=(mid-top)/largest;
 const x=i=>left+(pts.length===1?plotW/2:i*plotW/(pts.length-1)),y=lead=>mid-lead*scaleY;
 const line=pts.map((p,i)=>(i?"L":"M")+x(i).toFixed(1)+","+y(p.lead).toFixed(1)).join(" ");
 const dots=pts.filter((p,i)=>i%Math.max(1,Math.ceil(pts.length/18))===0||i===pts.length-1)
  .map(p=>'<circle cx="'+x(p.x).toFixed(1)+'" cy="'+y(p.lead).toFixed(1)+'" r="4" fill="#f14d07"><title>'+p.year+': '+(p.lead>0?nameA+" +"+p.lead:p.lead<0?nameB+" +"+Math.abs(p.lead):"Series tied")+'</title></circle>').join("");
 host.innerHTML='<div class="v2-history-metrics"><span><strong>'+wA+'–'+wB+(t?"–"+t:"")+'</strong>Recorded series</span><span><strong>'+maxA+'</strong>'+esc(nameA)+' max W streak</span><span><strong>'+maxB+'</strong>'+esc(nameB)+' max W streak</span></div>'+
 '<div class="v2-svg-wrap"><svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Cumulative rivalry series lead from '+new Date(first.stamp).getUTCFullYear()+' to '+new Date(last.stamp).getUTCFullYear()+'"><line x1="'+left+'" y1="'+mid+'" x2="'+(width-right)+'" y2="'+mid+'" stroke="#888" stroke-dasharray="5 5"/>'+
 '<path d="'+line+'" fill="none" stroke="#f14d07" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'+dots+
 '<text x="'+left+'" y="15" fill="#aaa" font-size="11">'+esc(nameA)+' leads ↑</text><text x="'+left+'" y="'+(height-6)+'" fill="#aaa" font-size="11">'+new Date(first.stamp).getUTCFullYear()+'</text>'+
 '<text x="'+(width-right)+'" y="'+(height-6)+'" text-anchor="end" fill="#aaa" font-size="11">'+new Date(last.stamp).getUTCFullYear()+'</text><text x="'+left+'" y="'+(height-37)+'" fill="#aaa" font-size="11">'+esc(nameB)+' leads ↓</text></svg></div>'+
 '<p class="note">Each step represents a recorded meeting (not an evenly spaced year). The center line is a tied series. Historic RUS records may be incomplete.</p>';
}
function playerLeader(team,category,stat){
 const record=state.playerStats?.teams?.[team];
 const group=record?.stats?.find(x=>String(x.category).toLowerCase()===category.toLowerCase());
 if(!group)return null;
 const scored=(group.rows||[]).map(r=>({id:r.playerId,name:r.name,number:r.number,n:num(r.values?.[stat]),td:num(r.values?.TD)})).filter(r=>r.n!==null&&r.n>0);
 scored.sort((a,b)=>b.n-a.n||a.name.localeCompare(b.name));
 return scored[0]||null;
}
function players(){
 const s=state.snapshot;
 if(!s)return;
 const host=$("v2Players");
 if(!state.playerStats){host.innerHTML='<div class="empty">'+(state.playerError?"Player totals unavailable; use the full stat leaders page.":"Loading player season totals…")+'</div>';return;}
 const categories=[
  ["Passing","Passing","Yards","pass yards"],
  ["Rushing","Rushing","Yards","rush yards"],
  ["Receiving","Receiving","Yards","rec yards"],
  ["Defense","Defense/Special Teams","Tackles","tackles"]
 ];
 host.innerHTML=[s.a,s.b].map(t=>{
  const rows=categories.map(([title,cat,stat,unit])=>{
   const p=playerLeader(t.name,cat,stat);
   const url=p?.id?"player.html?id="+encodeURIComponent(p.id)+"&season=2026":"";
   return '<div class="v2-player-row"><span>'+esc(title)+'</span><div>'+(p?
    '<b>'+(url?'<a href="'+url+'">'+esc(p.name)+'</a>':esc(p.name))+'</b><small>'+(p.number&&p.number!=="-"?"#"+esc(p.number)+" · ":"")+fmt(p.n)+" "+unit+'</small>':
    '<b>No reported total</b><small>—</small>')+'</div></div>';
  }).join("");
  return '<article class="v2-player-team"><h3>'+esc(t.name)+'</h3>'+rows+'</article>';
 }).join("");
 const snapshots=[s.a.name,s.b.name].map(team=>({team,date:state.playerStats?.teams?.[team]?.maxprepsLastUpdated})).filter(x=>x.date);
 const timing=snapshots.map(x=>x.team+" MaxPreps fallback: "+x.date.slice(0,10)).join(" · ");
 $("v2PlayerSource").textContent="Reported 2026 season totals from RUS's Deseret/MaxPreps data. Not every game has complete player stats. "+(timing?timing+". ":"")+"A fallback's last-update date does not verify newer games.";
}
function gameKey(g){return g.date+"|"+g.awayTeam+"|"+g.homeTeam;}
function gameOptions(){
 const s=state.snapshot;if(!s)return;
 const games=(s.games||[]).filter(g=>[s.a.name,s.b.name].includes(g.awayTeam)||[s.a.name,s.b.name].includes(g.homeTeam))
   .sort((a,b)=>b.stamp-a.stamp).slice(0,24);
 const selected=$("v2GameSelect");
 const old=state.gameSelected;
 selected.innerHTML=games.map(g=>'<option value="'+esc(gameKey(g))+'">'+esc(g.date+" · "+g.awayTeam+" "+g.away+"–"+g.home+" "+g.homeTeam)+'</option>').join("");
 if(!games.length){selected.innerHTML='<option value="">No verified 2026 games</option>';selected.disabled=true;state.gameSelected="";$("v2GameReport").innerHTML='<div class="empty">No verified 2026 completed games were found for the selected schools.</div>';return;}
 selected.disabled=false;
 state.gameSelected=games.some(g=>gameKey(g)===old)?old:gameKey(games[0]);
 selected.value=state.gameSelected;
 renderBreakdown();
}
function detailLookup(data,g){
 const key=(n)=>String(n||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
 const iso=String(g.date||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 if(!iso)return null;
 const day=iso[3]+"-"+iso[1].padStart(2,"0")+"-"+iso[2].padStart(2,"0");
 const id1=day+"|"+key(g.awayTeam)+"|"+key(g.homeTeam),id2=day+"|"+key(g.homeTeam)+"|"+key(g.awayTeam);
 return data?.games?.[id1]||data?.games?.[id2]||null;
}
// Require a unique team identity before comparing a source row's total.
function alignedDetailRows(detail,g){
 const rows=detail?.boxScore?.rows;
 if(!Array.isArray(rows)||rows.length!==2)return null;
 const key=n=>String(n||"").split("(")[0].toUpperCase().replace(/[^A-Z0-9]+/g," ").trim();
 const a=key(g.awayTeam),b=key(g.homeTeam);
 if(!a||!b||a===b)return null;
 const names=rows.map(r=>key(r.team));
 const matches=(label,name)=>label===name||label.startsWith(name+" ");
 const forward=matches(names[0],a)&&matches(names[1],b);
 const reverse=matches(names[0],b)&&matches(names[1],a);
 if(forward===reverse)return null;
 if(forward)return rows;
 if(reverse)return [rows[1],rows[0]];
 return null;
}
function validQuarterRows(periods,rows,totals,partial=false){
 if(!Array.isArray(periods)||periods.length<4||!Array.isArray(rows)||rows.length!==2)return false;
 if(periods.slice(0,4).join("|")!=="Q1|Q2|Q3|Q4")return false;
 if(periods.slice(4).some(p=>!/\bOT\b/.test(String(p))))return false;
 return rows.every((row,i)=>{
  if(!Array.isArray(row)||row.length!==periods.length)return false;
  if(row.some(n=>n!==null&&(!Number.isInteger(n)||n<0)))return false;
  const sum=row.reduce((s,n)=>s+(n??0),0);
  return row.includes(null)?partial&&sum<=totals[i]:sum===totals[i];
 });
}

function breakdownHTML(detail,g){
 if(!detail?.final)return '<div class="empty">No verified final game-detail report is available for this result.</div>';
 const box=detail.boxScore,rows=alignedDetailRows(detail,g);
 if(!rows||rows.some((r,i)=>num(r.total)!==[g.away,g.home][i]))
  return '<div class="warning">The detailed box score conflicts with the RUS final or its team labels could not be verified.</div>';
 const period=box.periods;
 if(!validQuarterRows(period,rows.map(r=>r.quarters),[g.away,g.home]))
  return '<div class="empty">Quarter-by-quarter scoring has not been verified for this game.</div>';
 const tables=rows.slice(0,2).map(row=>{
  const values=Array.isArray(row.quarters)?row.quarters:[];
  return '<div class="v2-quarters-row"><b>'+esc(row.team||"Team")+'</b>'+
   period.map((label,i)=>'<span><small>'+esc(label)+'</small>'+esc(values[i]??"—")+'</span>').join("")+
   '<strong>'+fmt(num(row.total))+'</strong></div>';
 }).join("");
 const plays=Array.isArray(detail.scoringPlays)?detail.scoringPlays.map((p,i)=>{
  const s=typeof p==="string"?p:p?.text||p?.description||"";
  return s?'<li><b>'+(i+1)+'.</b> '+esc(s)+'</li>':"";
 }).filter(Boolean):[];
 return '<div class="v2-quarters">'+tables+'</div>'+
  (plays.length?'<details class="v2-plays"><summary>Scoring plays ('+plays.length+')</summary><ol>'+plays.join("")+'</ol></details>':
   '<p class="note">Scoring-play details not available for this game.</p>')+
  (detail.url&&/^https:\/\/sports\.deseret\.com\//.test(detail.url)?'<p><a class="text-link" target="_blank" rel="noopener noreferrer" href="'+esc(detail.url)+'">Source game report ↗</a></p>':"");
}

const quartersKey=(g)=>{const m=String(g.date||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 return m?m[3]+"-"+m[1].padStart(2,"0")+"-"+m[2].padStart(2,"0")+"|"+g.awayTeam+"|"+g.homeTeam:"";};
const sourceLink=(url)=>/^https:\/\/sports\.deseret\.com\/high-school\/football\/game\//.test(String(url||""))
 ? '<p><a class="text-link" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Source game report ↗</a></p>':"";
function auditedQuarterHTML(record,g){
 if(!record)return '<div class="empty">Quarter-by-quarter scoring has not been verified for this game.</div>';
 if(record.awayTotal!==g.away||record.homeTotal!==g.home)return '<div class="warning">RUS has updated this final since the quarter archive was generated. Quarter scores are withheld until the new totals can be checked.</div>';
 const reasons={not_in_source:"No source game report",source_not_final:"Game report is not yet marked final",no_quarter_box:"No quarter-by-quarter table reported",team_label_unmatched:"Quarter-score team labels could not be verified",quarter_sum_conflict:"Quarter totals do not add up",final_total_conflict:"Source final differs from RUS final",no_quarter_values:"No quarter points reported",quarter_count_conflict:"Incomplete quarter period structure"};
 const link=sourceLink(record.sourceUrl);
 if(record.status==="conflict")
  return '<div class="warning">Quarter scoring withheld: '+esc(reasons[record.reason]||"Source-data conflict")+'. The official RUS final above is unaffected.</div>'+link;
 if(record.status!=="verified"&&record.status!=="partial")
  return '<div class="empty">Quarter-by-quarter scoring has not been verified for this game. '+esc(reasons[record.reason]||"Not reported")+'.</div>'+link;
 if(record.away!==g.awayTeam||record.home!==g.homeTeam||
    !validQuarterRows(record.periods,record.quarters,[g.away,g.home],record.status==="partial"))
  return '<div class="warning">Quarter-by-quarter scoring has not been verified for this game. Inconsistent quarter data withheld.</div>'+link;
 const teams=[g.awayTeam,g.homeTeam],totals=[g.away,g.home];
 const rows=teams.map((name,i)=>{
  const cells=(record.quarters?.[i]||[]);
  return '<div class="v2-quarters-row"><b>'+esc(name)+'</b>'+
   (record.periods||[]).map((period,j)=>'<span><small>'+esc(period)+'</small>'+ (cells[j]==null?"—":esc(cells[j]))+'</span>').join("")+
   '<strong>'+esc(totals[i])+'</strong></div>';
 }).join("");
 return '<div class="v2-quarters">'+rows+'</div>'+
  '<p class="note">'+(record.status==="verified"?"Quarter-by-quarter points verified against the RUS final.":"Only reported quarter cells are shown. A dash means unknown, NOT zero.")+'</p>'+link;
}
function safeScoringHTML(detail,g){
 if(!detail?.final)return '<p class="note">Verified scoring-play details unavailable for this game.</p>';
 const rows=alignedDetailRows(detail,g);
 if(!rows)return '<p class="note">Source game details have no confirmable final box score.</p>';
 const total=rows.map(x=>num(x.total));
 const actual=[g.away,g.home];
 if(total.length!==2||total.some((v,i)=>v!==actual[i]))return '<div class="warning">Scoring plays withheld because the source final conflicts with the RUS verified final.</div>';
 const plays=(detail.scoringPlays||[]).map(x=>typeof x==="string"?x:x?.text||x?.description||"").filter(Boolean);
 return plays.length?'<details class="v2-plays" open><summary>Recorded scoring plays ('+plays.length+')</summary><ol>'+plays.map((line,i)=>'<li><b>'+(i+1)+'.</b> '+esc(line)+'</li>').join("")+'</ol></details>':
  '<p class="note">No scoring-play text was supplied for this game.</p>';
}
function renderBreakdown(){
 const s=state.snapshot;if(!s)return;
 const g=(s.games||[]).find(x=>gameKey(x)===state.gameSelected);
 if(!g)return;
 $("v2GameTitle").textContent=g.awayTeam+" "+g.away+" – "+g.home+" "+g.homeTeam+" · "+g.date;
 const report=$("v2GameReport"),btn=$("v2LoadDetail");
 if(!state.quarterData){
  report.innerHTML='<div class="empty">'+(state.quarterError?"Quarter-score audit unavailable. Final score remains verified.":"Loading audited quarter-by-quarter scoring…")+'</div>';
  btn.hidden=true;return;
 }
 const entry=state.quarterData.get(quartersKey(g));
 report.innerHTML=auditedQuarterHTML(entry,g);
 if(state.details){
  const detail=detailLookup(state.details,g);
  report.innerHTML+=safeScoringHTML(detail,g);btn.hidden=true;return;
 }
 btn.hidden=!entry||!["verified","partial"].includes(entry.status);
 btn.textContent=state.detailsLoading?"Loading recorded scoring plays…":"Show scoring plays";
 btn.disabled=!!state.detailsLoading;
 if(state.detailsError){btn.hidden=true;report.innerHTML+='<p class="note">Scoring-play source temporarily unavailable.</p>';}
}
async function loadDetails(){
 if(state.details||state.detailsLoading)return;
 state.detailsLoading=fetchData("deseret-game-details.json").then(v=>{state.details=v;state.detailsError=false;})
 .catch(e=>{state.detailsError=true;console.warn("Game Center game details unavailable",e);})
 .finally(()=>{state.detailsLoading=null;renderBreakdown();});
 renderBreakdown();
 await state.detailsLoading;
}

function update(){
 const get=window.RUSGameCenter?.snapshot;
 const fresh=typeof get==="function"?get():null;
 if(!fresh)return;
 const old=state.snapshot;
 const newPair=!old||old.a.name!==fresh.a.name||old.b.name!==fresh.b.name||old.format!==fresh.format;
 state.snapshot=fresh;
 compare();renderProbability();players();
 if(newPair){state.gameSelected="";state.seriesFor=[fresh.a.name,fresh.b.name].sort().join("|");state.series=fresh.history;gameOptions();rivalry();}
 else {if(!state.series&&fresh.history)state.series=fresh.history;rivalry();}
}
window.addEventListener("rus:game-center-update",update);
window.addEventListener("rus:game-center-history-ready",()=>{
 const snap=window.RUSGameCenter?.snapshot?.();
 if(!snap)return;
 state.series=snap.history;
 state.seriesFor=[snap.a.name,snap.b.name].sort().join("|");
 rivalry();
});
document.addEventListener("click",event=>{
 const venue=event.target.closest?.("[data-v2-venue]");
 if(venue){const original=document.querySelector('[data-venue="'+venue.dataset.v2Venue+'"]');original?.click();}
});
$("v2GameSelect")?.addEventListener("change",ev=>{state.gameSelected=ev.target.value;renderBreakdown()});
$("v2LoadDetail")?.addEventListener("click",loadDetails);
void Promise.all([
 fetchData("team-stats-2026.json").then(v=>state.teamStats=v).catch(e=>{state.teamStatsError=true;console.warn("Team comparison data unavailable",e)}),
 fetchData("deseret-stat-metrics-2026.json").then(v=>state.playerStats=v).catch(e=>{state.playerError=true;console.warn("Player season data unavailable",e)}),
 fetchData("game-center-quarter-scores-2026.json").then(v=>{state.quarterData=new Map((v.games||[]).map(g=>[g.iso+"|"+g.away+"|"+g.home,g]));}).catch(e=>{state.quarterError=true;console.warn("Quarter audit unavailable",e)})
]).then(()=>{compare();players();renderBreakdown()});
update();
window.RUSGameCenterV2Test=Object.freeze({winChance,detailLookup,breakdownHTML,barRow,probabilitySD,auditedQuarterHTML,safeScoringHTML,alignedDetailRows,validQuarterRows});
})();
(function(s){'use strict';
const key=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,''),eps=1e-10;
const caps={'6A':16,'5A':16,'4A':16,'3A':13,'2A':9,'1A':9,'8P':11};
function probability(g,elo){const a=elo.teams?.[g.awayTeam]?.currentElo,h=elo.teams?.[g.homeTeam]?.currentElo;return Number.isFinite(a)&&Number.isFinite(h)?1/(1+10**((h-a)/400)):.5;}
function predicted(g){return g.winner===g.awayTeam?1:g.winner===g.homeTeam?0:Number(g.awayScore)>Number(g.homeScore)?1:0;}
function opening(rank,cap){if(rank>cap)return {kind:'out'};if(cap===16)return {kind:'game',opponent:17-rank,host:rank<=8};const byes=cap===13?3:cap===9?7:5;if(rank<=byes)return {kind:'bye'};return {kind:'game',opponent:cap===13?17-rank:cap===9?17-rank:17-rank,host:rank<(17-rank)};}
function analyze(m,team,classification,elo,target=16,progress=()=>{}){
const own=m.indices.get(team);if(own===undefined)throw Error('Select an eligible team.');const indices=m.names.map((n,i)=>i).filter(i=>m.rows.get(m.names[i]).classification===classification&&m.rows.get(m.names[i]).postseasonEligible),cap=caps[classification];
const evaluate=bits=>{const v=Float64Array.from(m.values);bits.forEach((b,j)=>{if(b)for(const i of indices)v[i]+=m.coefficients[j][i];});const sorted=[...indices].sort((a,b)=>v[b]-v[a]||m.names[a].localeCompare(m.names[b]));const rank=1+indices.filter(i=>i!==own&&v[i]>v[own]+eps).length,safeRank=1+indices.filter(i=>i!==own&&v[i]>=v[own]-eps).length;return {rank,safeRank,rpi:v[own],sorted,v};};
const baseline=m.remaining.map(predicted),base=evaluate(baseline),hist={},opponents={},samples=10000,probs=m.remaining.map(g=>probability(g,elo));let qualified=0,host=0,bye=0,ties=0,rng=19281001;const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
for(let n=0;n<samples;n++){const bits=probs.map(p=>random()<p?1:0),r=evaluate(bits);hist[r.rank]=(hist[r.rank]||0)+1;if(r.rank!==r.safeRank){ties++;continue;}if(!m.rows.get(team).postseasonEligible)continue;const o=opening(r.rank,cap);if(o.kind!=='out')qualified++;if(o.host)host++;if(o.kind==='bye')bye++;if(o.opponent){const name=m.names[r.sorted[o.opponent-1]];if(name)opponents[name]=(opponents[name]||0)+1;}if(n%2000===0)progress(`Simulating finishes: ${n}/${samples}`);}
let best=null,checked=0,limit=100000,exhaustive=true;const maxDepth=Math.min(3,m.remaining.length),bits=[...baseline];
function search(start,left,changes){if(checked>=limit){exhaustive=false;return;}if(!left){checked++;const r=evaluate(bits);if(r.safeRank<=target&&m.rows.get(team).postseasonEligible){best={...r,bits:[...bits],changes:[...changes]};}return;}for(let j=start;j<=bits.length-left&&!best;j++){bits[j]=1-baseline[j];search(j+1,left-1,[...changes,j]);bits[j]=baseline[j];if(!exhaustive)break;}}
for(let d=0;d<=maxDepth&&!best&&exhaustive;d++)search(0,d,[]);
const ownGames=m.remaining.map((g,j)=>({g,j})).filter(({g})=>[key(g.awayTeam),key(g.homeTeam)].includes(key(team)));
const tolerance=ownGames.map(({g,j})=>{const b=[...baseline];b[j]=key(g.awayTeam)===key(team)?0:1;const r=evaluate(b);return {game:g,rank:r.rank,safeRank:r.safeRank,qualifies:r.safeRank<=target&&m.rows.get(team).postseasonEligible};});
const ripple=m.remaining.map((g,j)=>({game:g,delta:m.coefficients[j][own]})).filter(r=>! [key(r.game.awayTeam),key(r.game.homeTeam)].includes(key(team))&&Math.abs(r.delta)>eps).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,12);
return {team,classification,target,cap,samples,hist,opponents,qualified,host,bye,ties,eligible:m.rows.get(team).postseasonEligible,base:{rank:base.rank,safeRank:base.safeRank,rpi:base.rpi},baseline,best:best?{rank:best.rank,safeRank:best.safeRank,bits:best.bits,changes:best.changes}:null,checked,exhaustive,maxDepth,tolerance,ripple,remaining:m.remaining,missingElo:m.remaining.filter(g=>!Number.isFinite(elo.teams?.[g.awayTeam]?.currentElo)||!Number.isFinite(elo.teams?.[g.homeTeam]?.currentElo)).length};
}
const api={analyze,probability,predicted,opening};if(typeof module==='object'&&module.exports)module.exports=api;else s.RUSRpiAdvanced=api;
})(globalThis);

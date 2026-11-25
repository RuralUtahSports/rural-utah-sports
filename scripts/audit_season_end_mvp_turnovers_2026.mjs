// Read-only compare of actual 2026 award inputs and old/new scoring.
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {postseasonFinals} from './lib/postseason-finals-2026.mjs';
import {teamKey,isoDate} from './lib/competition-scope-2026.mjs';
const require=createRequire(import.meta.url);
const base=require('../award-scoring-core.js'),next=require('../award-postseason-turnovers-2026.js');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const source=read('deseret-rosters-stats-2026.json'),cache=read('maxpreps-stats-fallback-2026.json'),metadata=read('teams-data.json'),standings=read('standings-2026.json'),rankings=read('state-top25-history-2026.json');
const reported=require('../maxpreps-primary-reported-2026.js').applyPrimary(source,cache,metadata).data;
delete reported.teams[Object.keys(reported.teams).find(t=>teamKey(t)==='WHITEHORSE')];
require('../reviewed-hunt-postseason-2026.js').apply(reported);
const html=fs.readFileSync('all-utah.html','utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const page=scripts.find(s=>s.includes('function build(){')&&s.includes('async function init()'));
if(!page)throw Error('All-Utah scoring script not found');
const prefix=page.slice(0,page.indexOf('async function init()'));
const contexts=base.buildTeamContexts(standings,rankings);
function calculate(scoring){
 const window={RUSPostseasonAwardScoring2026:scoring};
 const input={data:reported,metadata,standings,rankings,contexts};
 // Execute the production page's actual build() rather than reimplement its math.
 const players=vm.runInNewContext(prefix+'\n data=input.data;teams=input.metadata;standings=input.standings;stateTop25=input.rankings;teamContexts=input.contexts;build().filter(p=>p.overallW>0);',{window,input,console,Map,Set});
 const by=(metric,filter=()=>true)=>players.filter(filter).sort((a,b)=>b[metric]-a[metric]);
 const overall=by('overallW')[0],notOverall=p=>p!==overall;
 const groups={
  allUtah:by('overallW'),
  offense:by('offW',p=>notOverall(p)&&p.offW>0),
  defense:by('defW',p=>notOverall(p)&&p.defW>0),
  rural:by('rawOverall',p=>notOverall(p)&&['3A','2A','1A','8P','8-PLAYER'].includes(p.classification)),
  bigSchool:by('rawOverall',p=>notOverall(p)&&['6A','5A','4A'].includes(p.classification))
 };
 const metric={allUtah:'overallW',offense:'offW',defense:'defW',rural:'rawOverall',bigSchool:'rawOverall'};
 return {players:players.length,leaders:Object.fromEntries(Object.entries(groups).map(([k,list])=>[k,list.slice(0,10).map(p=>({id:p.id,name:p.name,team:p.team,score:Number(p[metric[k]].toFixed(3))}))]))};
}
const old=calculate(base),updated=calculate(next);
const games=read('player-game-stats-2026.json'),finals=postseasonFinals(read('official-brackets-2026.json'));
const sides=[];
for(const g of finals)for(const [t,o] of [[g.awayTeam,g.homeTeam],[g.homeTeam,g.awayTeam]]){
 if(teamKey(t)==='WHITEHORSE')continue;
 const school=Object.entries(games.teams).find(([k])=>teamKey(k)===teamKey(t))?.[1];
 const hits=(school?.games||[]).filter(x=>isoDate(x.date)===g.date&&teamKey(x.opponent)===teamKey(o));
 const rows=hits.length===1?(hits[0].players||[]).filter(p=>p.statLines?.some(l=>Object.values(l.values||{}).some(v=>v!==null&&v!==undefined&&String(v).trim()!==''))).length:0;
 sides.push({team:t,opponent:o,date:g.date,classification:g.classification,rows});
}
const changes=Object.keys(updated.leaders).map(k=>({award:k,old:old.leaders[k][0]||null,new:updated.leaders[k][0]||null,changed:old.leaders[k][0]?.id!==updated.leaders[k][0]?.id}));
const report={season:2026,provisional:true,policy:'Same reported season totals and schedule context for both formulas; Whitehorse withheld; missing individual stats remain unverified.',old,updated,changes,playoffCoverage:{eligibleSides:sides.length,covered:sides.filter(s=>s.rows>0).length,missing:sides.filter(s=>!s.rows)}};
fs.mkdirSync('audit-output',{recursive:true});
fs.writeFileSync('audit-output/season-end-mvp-comparison-2026.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({changes,players:updated.players,playoffCoverage:report.playoffCoverage},null,2));

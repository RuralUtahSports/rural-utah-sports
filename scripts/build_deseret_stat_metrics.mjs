import fs from 'node:fs';

const SOURCE='deseret-rosters-stats-2026.json';
const OUTPUT='deseret-stat-metrics-2026.json';
const source=JSON.parse(fs.readFileSync(SOURCE,'utf8'));
const compact=value=>String(value??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
const nonEmpty=value=>value!==null&&value!==undefined&&String(value).trim()!=='';
const targets=[
  {category:'Passing',match:v=>String(v||'').toUpperCase().startsWith('PASS'),metrics:[['Yards',['Yards']],['TD',['TD','Touchdowns']]]},
  {category:'Rushing',match:v=>String(v||'').toUpperCase().startsWith('RUSH'),metrics:[['Yards',['Yards']],['TD',['TD','Touchdowns']]]},
  {category:'Receiving',match:v=>String(v||'').toUpperCase().startsWith('RECEIV'),metrics:[['Yards',['Yards']]]},
  {category:'Defense/Special Teams',match:v=>String(v||'').toUpperCase().includes('DEFENSE'),metrics:[['Tackles',['Tackles','Total Tackles']],['Sacks',['Sacks']]]}
];

function findMetric(section,wants){
  const headers=section?.headers||Object.keys(section?.rows?.[0]?.values||{});
  for(const want of wants){const hit=headers.find(h=>compact(h)===compact(want));if(hit)return hit}
  for(const want of wants){const hit=headers.find(h=>compact(h).includes(compact(want)));if(hit)return hit}
  return'';
}

const teams={};
let sections=0,rows=0;
for(const [teamKey,team] of Object.entries(source.teams||{})){
  const slim=[];
  for(const target of targets){
    const merged=new Map();
    for(const section of team?.stats||[]){
      if(!target.match(section?.category))continue;
      const fields=target.metrics.map(([out,wants])=>[out,findMetric(section,wants)]).filter(([,src])=>src);
      if(!fields.length)continue;
      for(const row of section.rows||[]){
        const values={};
        for(const [out,src] of fields){const value=row.values?.[src];if(nonEmpty(value))values[out]=value}
        if(!Object.keys(values).length)continue;
        const id=String(row.playerId||'').trim()||`${compact(row.name)}|${String(row.number||'').trim()}`;
        const existing=merged.get(id)||{playerId:row.playerId||'',number:row.number||'',name:row.name||'',values:{}};
        Object.assign(existing.values,values);
        merged.set(id,existing);
      }
    }
    if(merged.size){
      const categoryRows=[...merged.values()].sort((a,b)=>String(a.name).localeCompare(String(b.name)));
      const headers=target.metrics.map(([out])=>out).filter(out=>categoryRows.some(row=>Object.hasOwn(row.values,out)));
      slim.push({category:target.category,headers,rows:categoryRows});
      sections++;
      rows+=categoryRows.length;
    }
  }
  teams[teamKey]={team:team?.team||teamKey,stats:slim};
}

const sourceBytes=fs.statSync(SOURCE).size;
const payload={
  season:source.season||2026,
  deseretSeason:source.deseretSeason,
  updatedAt:source.updatedAt,
  summary:{teams:Object.keys(teams).length,sections,rows,sourceBytes},
  teams
};
const text=JSON.stringify(payload)+'\n';
fs.writeFileSync(OUTPUT,text);
const outputBytes=Buffer.byteLength(text);
const reduction=sourceBytes?100-(outputBytes/sourceBytes*100):0;
console.log(`Built ${OUTPUT}: ${Object.keys(teams).length} teams, ${rows} tracked rows, ${(outputBytes/1024).toFixed(1)} KB (${reduction.toFixed(1)}% smaller than source).`);

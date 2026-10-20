// Explicit inventory of every football player stat column published in the
// 2025 and 2026 Deseret roster feeds. The composite passing row gives two
// independent metrics (completions and attempts).
export const playerMetrics=[
 {section:'Rushing',fields:['CARRIES'],key:'rushingCarries',label:'Rushing Attempts',unit:'carries'},
 {section:'Rushing',fields:['YARDS'],key:'rushingYards',label:'Rushing Yards',unit:'yards',officialId:'rush-yards-season'},
 {section:'Rushing',fields:['YARDS/CARRY'],key:'rushingYardsPerCarry',label:'Rushing Yards per Carry',unit:'yards/carry',rate:{fields:['CARRIES'],min:25}},
 {section:'Rushing',fields:['TD'],key:'rushingTouchdowns',label:'Rushing Touchdowns',unit:'TD',officialId:'rush-td-season'},
 {section:'Passing',fields:['COMP-ATT'],component:'completions',key:'passingCompletions',label:'Pass Completions',unit:'completions'},
 {section:'Passing',fields:['COMP-ATT'],component:'attempts',key:'passingAttempts',label:'Pass Attempts',unit:'attempts'},
 {section:'Passing',fields:['COMP%'],key:'passingCompletionPct',label:'Completion Percentage',unit:'%',rate:{fields:['COMP-ATT'],component:'attempts',min:40}},
 {section:'Passing',fields:['YARDS'],key:'passingYards',label:'Passing Yards',unit:'yards',officialId:'pass-yards-season'},
 {section:'Passing',fields:['YARDS/COMP.'],key:'passingYardsPerCompletion',label:'Passing Yards per Completion',unit:'yards/completion',rate:{fields:['COMP-ATT'],component:'completions',min:20}},
 {section:'Passing',fields:['TD'],key:'passingTouchdowns',label:'Passing Touchdowns',unit:'TD',officialId:'pass-td-season'},
 {section:'Passing',fields:['Int','INT'],key:'passingInterceptionsThrown',label:'Interceptions Thrown',unit:'INT',negativeOutcome:true},
 {section:'Receiving',fields:['RECEPTIONS'],key:'receptions',label:'Receptions',unit:'catches'},
 {section:'Receiving',fields:['YARDS'],key:'receivingYards',label:'Receiving Yards',unit:'yards',officialId:'receiving-yards-season'},
 {section:'Receiving',fields:['YARDS/RECEP.'],key:'receivingYardsPerReception',label:'Receiving Yards per Reception',unit:'yards/catch',rate:{fields:['RECEPTIONS'],min:15}},
 {section:'Receiving',fields:['TD'],key:'receivingTouchdowns',label:'Receiving Touchdowns',unit:'TD'},
 {section:'Kicking',fields:['FG'],key:'fieldGoalsMade',label:'Field Goals Made',unit:'FG'},
 {section:'Kicking',fields:['PAT'],key:'extraPointsMade',label:'Extra Points Made',unit:'PAT'},
 {section:'Kicking',fields:['Pts'],key:'kickingPoints',label:'Kicking Points',unit:'points'},
 {section:'Defense/Special Teams',fields:['TACKLES'],key:'tackles',label:'Tackles',unit:'tackles',officialId:'tackles-season'},
 {section:'Defense/Special Teams',fields:['SACKS'],key:'sacks',label:'Sacks',unit:'sacks',officialId:'sacks-season'},
 {section:'Defense/Special Teams',fields:['PASS INT.'],key:'defensiveInterceptions',label:'Defensive Interceptions',unit:'INT',officialId:'interceptions-season'},
 {section:'Defense/Special Teams',fields:['DEFENSE TD'],key:'defensiveTouchdowns',label:'Defensive Touchdowns',unit:'TD'},
 {section:'Defense/Special Teams',fields:['RETURN TD'],key:'returnTouchdowns',label:'Return Touchdowns',unit:'TD'},
 {section:'Defense/Special Teams',fields:['FUM REC'],key:'fumbleRecoveries',label:'Fumble Recoveries',unit:'recoveries'},
 {section:'Defense/Special Teams',fields:['PD'],key:'passesDefended',label:'Passes Defended',unit:'PD'},
 {section:'Defense/Special Teams',fields:['CAUSED FUM'],key:'forcedFumbles',label:'Forced Fumbles',unit:'fumbles'},
 {section:'Defense/Special Teams',fields:['PASS INT YDS'],key:'interceptionReturnYards',label:'Interception Return Yards',unit:'yards'},
 {section:'Defense/Special Teams',fields:['PASS INT AVG'],key:'interceptionReturnAverage',label:'Interception Return Average',unit:'yards/INT',rate:{fields:['PASS INT.'],min:2}},
 {section:'Defense/Special Teams',fields:['FR YDS'],key:'fumbleReturnYards',label:'Fumble Return Yards',unit:'yards'}
];

// Team box-score/stat-feed measures derived from published team-stat tables.
// Scoring / record totals already have full historical comparisons elsewhere.
export const teamMetrics=[
 ['passing.completions','Passing Completions','completions'],
 ['passing.attempts','Passing Attempts','attempts'],
 ['passing.yards','Passing Yards','yards'],
 ['passing.td','Passing Touchdowns','TD'],
 ['passing.interceptions','Passing Interceptions Thrown','INT'],
 ['passing.compPct','Passing Completion Percentage','%', 'passing.attempts',40],
 ['passing.yardsPerAttempt','Passing Yards per Attempt','yards/attempt','passing.attempts',40],
 ['passing.yardsPerGame','Passing Yards per Game','yards/game','games',6],
 ['rushing.carries','Rushing Attempts','carries'],
 ['rushing.yards','Rushing Yards','yards'],
 ['rushing.td','Rushing Touchdowns','TD'],
 ['rushing.yardsPerCarry','Rushing Yards per Carry','yards/carry','rushing.carries',50],
 ['rushing.yardsPerGame','Rushing Yards per Game','yards/game','games',6],
 ['receiving.receptions','Receptions','receptions'],
 ['receiving.yards','Receiving Yards','yards'],
 ['receiving.td','Receiving Touchdowns','TD'],
 ['receiving.yardsPerCatch','Receiving Yards per Catch','yards/catch','receiving.receptions',25],
 ['receiving.yardsPerGame','Receiving Yards per Game','yards/game','games',6],
 ['defense.tackles','Tackles','tackles'],
 ['defense.sacks','Sacks','sacks'],
 ['defense.interceptions','Defensive Interceptions','INT'],
 ['defense.td','Defensive Touchdowns','TD'],
 ['defense.returnTd','Return Touchdowns','TD'],
 ['kicking.fieldGoals','Field Goals','FG'],
 ['kicking.pat','Extra Points','PAT'],
 ['totalOffense','Total Offense Yards','yards'],
 ['totalYardsPerGame','Total Yards per Game','yards/game','games',6],
 ['yardsPerPlay','Yards per Play','yards/play','games',6]
].map(([path,label,unit,qualifier,min])=>({path,key:path.replace(/[^a-z0-9]+/gi,'_'),label,unit,
  rate:qualifier?{path:qualifier,min}:null,
  negativeOutcome:path==='passing.interceptions'}));

export const parsedNumeric=(v)=>{
 if(v===undefined||v===null||String(v).trim()==='')return null;
 const n=Number(String(v).replace(/,/g,'').trim());return Number.isFinite(n)?n:null;
};
export function composite(raw,component){
 if(typeof raw!=='string'||!/^(\d+)\s*-\s*(\d+)$/.test(raw))return null;
 const m=raw.match(/^(\d+)\s*-\s*(\d+)$/);const completed=Number(m[1]),attempted=Number(m[2]);
 if(completed>attempted)return null;
 return component==='completions'?completed:attempted;
}
function fieldValue(values,fields,component){
 if(!values||typeof values!=='object')return null;
 for(const f of fields){
  // Respect different "Int" / "INT" spellings; no implicit category collapse.
  if(Object.prototype.hasOwnProperty.call(values,f)){
   return component?composite(values[f],component):parsedNumeric(values[f]);
  }
 }
 return null;
}
export function playerValue(values,metric){
 const amount=fieldValue(values,metric.fields,metric.component);
 if(amount===null)return null;
 if(metric.rate){
  const tries=fieldValue(values,metric.rate.fields,metric.rate.component);
  if(tries===null||tries<metric.rate.min)return null;
 }
 return amount;
}
export function getPath(obj,path){
 return path.split('.').reduce((o,k)=>o?.[k],obj);
}
export function teamValue(team,metric){
 const amount=parsedNumeric(getPath(team,metric.path));
 if(amount===null)return null;
 if(metric.rate&&!(parsedNumeric(getPath(team,metric.rate.path))>=metric.rate.min))return null;
 return amount;
}
export function validatePlayerMetricCoverage(archives){
 const observed=new Set();
 for(const archive of archives)for(const t of Object.values(archive.teams||{}))for(const section of t.stats||[]){
  for(const r of section.rows||[])for(const field of Object.keys(r.values||{}))observed.add(section.category+'|'+field);
 }
 const known=new Set(playerMetrics.flatMap(m=>m.fields.map(f=>m.section+'|'+f)));
 const missing=[...observed].filter(x=>!known.has(x)).sort();
 if(missing.length)throw Error('Untracked player statistic column(s): '+missing.join(', '));
 return {observed:[...observed].sort(),covered:known.size,metrics:playerMetrics.length};
}
export function validateTeamMetricCoverage(teamArchives){
 // Every numeric team statistical leaf is either monitored or explicitly
 // handled by historical score/season aggregates, or is structural metadata.
 const monitored=new Set(teamMetrics.map(m=>m.path));
 const coveredHistorically=new Set(['games','wins','losses','ties','pointsFor','pointsAgainst',
   'ppg','pointsAllowedPerGame','scoringMargin']);
 const exempt=new Set(['categories','statCoverage','hasPlayerStats','rankings']);
 const observed=new Set();
 function visit(v,path=''){
  for(const [key,value] of Object.entries(v||{})){
   const p=path?path+'.'+key:key;
   if(exempt.has(key)&&!path)continue;
   if(typeof value==='number'&&Number.isFinite(value))observed.add(p);
   else if(value&&typeof value==='object'&&!Array.isArray(value))visit(value,p);
  }
 }
 for(const a of teamArchives)for(const t of Object.values(a.teams||{}))visit(t);
 const missing=[...observed].filter(x=>!monitored.has(x)&&!coveredHistorically.has(x)).sort();
 if(missing.length)throw Error('Untracked numeric team stat column(s): '+missing.join(', '));
 return {observed:[...observed].sort(),monitored:monitored.size};
}

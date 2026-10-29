/* Source-crosschecked 6A preview totals, October 29, 2026.
 * RUS's DESERET source cache is incomplete for these athletes.
 * These are current reported figures for preview use only, NOT certified
 * regular-season field-by-field game sums. Existing audited Hunt #193 stays separate.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.RUSPreviewSourceChecks2026=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const source='https://www.deseret.com/sports/2026/10/29/high-school-football-6a-first-round-previews/';
 const observed='2026-10-29';
 const fixes=[
  {team:'FARMINGTON',id:'farmington-17-alton-dahl',name:'Alton Dahl',number:'17',category:'Passing',
   old:{'YARDS':'2157','COMP-ATT':'172-318','COMP%':'54.09','YARDS/COMP.':'12.54'},corrected:{'YARDS':'2347','COMP-ATT':'189-347','COMP%':'54.47','YARDS/COMP.':'12.42'}},
  {team:'FARMINGTON',id:'farmington-32-brogan-jeppesen',name:'Brogan Jeppesen',number:'32',category:'Rushing',
   old:{'CARRIES':'73','YARDS':'316','YARDS/CARRY':'4.33','TD':'2'},corrected:{'CARRIES':'91','YARDS':'410','YARDS/CARRY':'4.51','TD':'3'}},
  {team:'FARMINGTON',id:'farmington-14-thayne-boyle',name:'Thayne Boyle',number:'14',category:'Receiving',
   old:{'RECEPTIONS':'34','YARDS':'326','YARDS/RECEP.':'9.59'},corrected:{'RECEPTIONS':'39','YARDS':'380','YARDS/RECEP.':'9.74'}},
  {team:'MOUNTAIN RIDGE',id:'mountain-ridge-7-xander-thayer',name:'Xander Thayer',number:'7',category:'Receiving',
   old:{'RECEPTIONS':'29','YARDS':'751','YARDS/RECEP.':'25.9','TD':'8'},corrected:{'RECEPTIONS':'35','YARDS':'892','YARDS/RECEP.':'25.49','TD':'9'}},
  {team:'MOUNTAIN RIDGE',id:'mountain-ridge-45-tyson-dunn',name:'Tyson Dunn',number:'45',category:'Rushing',
   old:{'CARRIES':'43','YARDS':'496','YARDS/CARRY':'11.53'},corrected:{'CARRIES':'56','YARDS':'610','YARDS/CARRY':'10.89'}},
  {team:'LONE PEAK',id:'lone-peak-23-ayden-laws',name:'Ayden Laws',number:'23',category:'Rushing',
   old:{'CARRIES':'83','YARDS':'360','YARDS/CARRY':'4.34','TD':'0'},corrected:{'CARRIES':'111','YARDS':'525','YARDS/CARRY':'4.73','TD':'1'}},
  {team:'LONE PEAK',id:'lone-peak-20-pili-mounga',name:'Pili Mounga',number:'20',category:'Rushing',
   old:{'CARRIES':'46','YARDS':'255','YARDS/CARRY':'5.54','TD':'2'},corrected:{'CARRIES':'62','YARDS':'357','YARDS/CARRY':'5.76','TD':'3'}},
  {team:'LONE PEAK',id:'lone-peak-13-marshall-durfey',name:'Marshall Durfey',number:'13',category:'Passing',
   old:{'COMP-ATT':'20-35','COMP%':'57.14','YARDS':'306','YARDS/COMP.':'15.3'},corrected:{'COMP-ATT':'29-55','COMP%':'52.73','YARDS':'400','YARDS/COMP.':'13.79'}},
  {team:'LONE PEAK',id:'lone-peak-4-dillon-sykes',name:'Dillon Sykes',number:'4',category:'Receiving',
   old:{'RECEPTIONS':'15','YARDS':'141','YARDS/RECEP.':'9.4'},corrected:{'RECEPTIONS':'20','YARDS':'205','YARDS/RECEP.':'10.25'}}
 ];
 const norm=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 const round=(n)=>String(Math.round((n+Number.EPSILON)*100)/100);
 function validate(){
  const ids=new Set();
  for(const d of fixes){
   if(ids.has(d.id)||!d.number||!d.team||!d.name)throw Error('Duplicate/ambiguous reviewed identity');
   ids.add(d.id);
   const y=Number(d.corrected.YARDS),den=Number(d.corrected.CARRIES??d.corrected.RECEPTIONS);
   if(den>0){const rate=d.corrected['YARDS/CARRY']??d.corrected['YARDS/RECEP.'];if(rate&&Math.abs(y/den-Number(rate))>.011)throw Error('Derived rate inconsistent: '+d.id);}
   const passing=d.corrected['COMP-ATT'];
   if(passing){
    const pair=passing.split('-').map(Number);
    if(pair.length!==2||pair[0]>pair[1]||Math.abs(pair[0]/pair[1]*100-Number(d.corrected['COMP%']))>.011||
      Math.abs(y/pair[0]-Number(d.corrected['YARDS/COMP.']))>.011)throw Error('Passing components inconsistent: '+d.id);
   }
  }
  return true;
 }
 function apply(data,{onlyId=null}={}){
  validate();
  if(data?.season!==2026||!data.teams)throw Error('Expected 2026 reported season source');
  const outcome={applied:[],alreadyCurrent:[],held:[],scope:'2026 reported only; current-source preview cross-check'};
  for(const d of fixes.filter(x=>!onlyId||x.id===onlyId)){
   const school=Object.entries(data.teams).filter(([k])=>norm(k)===norm(d.team));
   if(school.length!==1){outcome.held.push({id:d.id,reason:'missing team'});continue}
   const t=school[0][1],roster=(t.roster||[]).filter(x=>x.playerId===d.id);
   if(roster.length!==1||norm(roster[0].name)!==norm(d.name)||String(roster[0].number)!==d.number){outcome.held.push({id:d.id,reason:'identity mismatch'});continue}
   const hits=(t.stats||[]).filter(s=>norm(s.category)===norm(d.category)).flatMap(s=>(s.rows||[]).filter(p=>p.playerId===d.id));
   if(hits.length!==1||String(hits[0].number)!==d.number||norm(hits[0].name)!==norm(d.name)){outcome.held.push({id:d.id,reason:'stat row ambiguity'});continue}
   const row=hits[0],targets=[];
   for(const [k,newValue] of Object.entries(d.corrected)){
    const existingKey=Object.keys(row.values||{}).find(x=>norm(x)===norm(k));
    const old=existingKey?String(row.values[existingKey]):null;
    if(old!==String(d.old[k])&&old!==String(newValue)){targets.length=0;outcome.held.push({id:d.id,reason:'source changed: '+k});break}
    targets.push({key:existingKey||k,value:newValue,old});
   }
   if(!targets.length)continue;
   let changed=false;
   for(const t of targets){
    if(t.old===String(t.value))continue;
    row.values[t.key]=t.value;
    (row.statSources||={})[t.key]='Preview cross-checked Oct 29 Deseret; cached MaxPreps yardage corroboration where available';
    changed=true;
   }
   (changed?outcome.applied:outcome.alreadyCurrent).push(d.id);
  }
  return outcome;
 }
 return {source,observed,fixes,validate,apply};
});

// School single-season player records: compare published 2026 season totals
// against historical Deseret News SCHOOL SEASON leaderboards, not 2025 alone.
// Every emitted alert has a named prior holder, prior season and >=2 historical
// seasons in the same statistical category. Historical reporting is incomplete.
import fs from 'node:fs';
import path from 'node:path';

export const SCHOOL_PLAYER_SEASON_CATEGORIES=Object.freeze({
 rushingTouchdowns:'Rushing Touchdowns',
 rushingYards:'Rushing Yards',
 passingTouchdowns:'Passing Touchdowns',
 passingYards:'Passing Yards',
 receivingTouchdowns:'Receiving Touchdowns',
 receivingYards:'Receiving Yards',
 returnTouchdowns:'Return Touchdowns',
 defensiveTouchdowns:'Defense Touchdowns',
 tackles:'Defense Tackles',
 defensiveInterceptions:'Defense Interceptions',
 sacks:'Defense Sacks',
 fieldGoalsMade:'Kicking Field Goals',
 extraPointsMade:'Kicking PATs'
});
const slug=v=>String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const normalize=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const equivalent=v=>({
 CEDAR:'CEDARCITY',GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISONVALLEY',
 MONUMENTVAL:'MONUMENTVALLEY',MAPLEMNTN:'MAPLEMOUNTAIN',MAPLEMTN:'MAPLEMOUNTAIN',
 AMERICANLEADERSHIPACADEMY:'ALA',SAINTJOSEPH:'STJOSEPH'
})[normalize(v)]||normalize(v);
const numeric=x=>{
 if(x==null||String(x).trim()==='')return null;
 const n=Number(String(x).replace(/,/g,''));
 return Number.isFinite(n)&&n>=0?n:null;
};
const stableLeader=(a,b)=>b.value-a.value||b.season-a.season||a.player.localeCompare(b.player);
export function buildHistoricalPlayerSeasonAlerts({player2026,teamNames,asOf,archiveDir='team-player-records'}){
 const alerts=[],catalog=[],seenCategory=new Set(),missing=[];
 const archiveMap=new Map();
 if(fs.existsSync(archiveDir))for(const file of fs.readdirSync(archiveDir)){
  if(!file.endsWith('.json'))continue;
  try{
   const item=JSON.parse(fs.readFileSync(path.join(archiveDir,file),'utf8'));
   if(item?.team&&Array.isArray(item.categories))archiveMap.set(equivalent(item.team),item);
  }catch(e){throw new Error('Invalid school-season leaderboards: '+file+' '+e.message);}
 }
 const used=new Set();
 for(const [teamKey,current] of player2026){
  const archive=archiveMap.get(equivalent(teamKey));
  if(!archive)continue;
  const school=teamNames.get(teamKey)||archive.team||teamKey;
  for(const [metricKey,categoryName] of Object.entries(SCHOOL_PLAYER_SEASON_CATEGORIES)){
   const group=(archive.categories||[]).find(c=>c.category===categoryName);
   const state=current.get(metricKey);
   if(!group||!state?.leader)continue;
   seenCategory.add(metricKey);
   const past=(group.entries||[]).map(row=>({
     player:String(row.player||'').trim(),season:Number(row.season),value:numeric(row.value)
   })).filter(row=>row.player&&Number.isInteger(row.season)&&row.season>=1900&&row.season<2026&&row.value!==null);
   const years=[...new Set(past.map(row=>row.season))].sort((a,b)=>a-b);
   // A lone prior season is not meaningful school-history coverage. Do NOT
   // recreate the previous "everything broke" problem for newly formed teams.
   if(years.length<2){missing.push({team:school,categoryKey:metricKey,reason:'Fewer than two different documented prior seasons'});continue;}
   past.sort(stableLeader);
   const previous=past[0],player=state.leader;
   if(!previous||player.value<=previous.value)continue; // ties are NOT broken records
   const def=state.def;
   if(def?.rate){missing.push({team:school,categoryKey:metricKey,reason:'Unverified rate-stat denominator'});continue;}
   const alert={
     recordType:'seasonPlayer',status:'historical-school-high',scope:'reported-school-history',
     season:2026,team:school,player:player.name,playerId:player.playerId||'',
     categoryKey:metricKey,category:def?.label||categoryName,unit:def?.unit||group.valueLabel||'',
     value:player.value,previousValue:previous.value,previousPlayer:previous.player,
     previousSeason:previous.season,asOf,
     historicalSeasons:years.length,earliestHistoricalSeason:years[0],
     historySource:'Deseret News historical school single-season leaderboards',
     sourceUrl:archive.sourceUrl||'',
     // We cannot infer that all earlier seasons were reported. This is a new
     // *reported* school record, not a guaranteed all-time school record.
     note:'Exceeds the highest reported prior school single-season total in the Deseret News historical school record table. Some historical seasons or players may be missing; independently verify before claiming an all-time school record.'
   };
   const id=equivalent(school)+'|'+metricKey;
   if(used.has(id))throw new Error('Duplicate historical school-season alert '+id);
   used.add(id);
   alerts.push(alert);
  }
 }
 alerts.sort((a,b)=>b.value/Math.max(1,b.previousValue)-a.value/Math.max(1,a.previousValue)||
   a.team.localeCompare(b.team)||a.categoryKey.localeCompare(b.categoryKey));
 for(const [key,category] of Object.entries(SCHOOL_PLAYER_SEASON_CATEGORIES)){
  catalog.push({key,category,source:'Deseret historical school single-season leaderboards',
    monitored:seenCategory.has(key),qualifier:'At least two different recorded prior seasons per school/category'});
 }
 return{alerts,catalog,missing,archiveTeams:archiveMap.size};
}

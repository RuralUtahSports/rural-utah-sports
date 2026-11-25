import {isoDate,teamKey} from './competition-scope-2026.mjs';
export function postseasonFinals(brackets){
 if(brackets?.season!==2026)return [];
 const out=[];
 for(const [classification,c] of Object.entries(brackets.classifications||{})){
  if(c.status!=='official'||!/^https:\/\/(?:www\.)?(?:maxpreps\.com|uhsaa\.org)\//i.test(c.sourceUrl||''))continue;
  for(const round of c.rounds||[])for(const g of round.games||[]){
   if(!g.a?.name||!g.b?.name||!Number.isFinite(g.a.score)||!Number.isFinite(g.b.score)||!isoDate(g.date)||teamKey(g.a.name)===teamKey(g.b.name))continue;
   out.push({date:isoDate(g.date),awayTeam:g.b.name,homeTeam:g.a.name,actualAway:g.b.score,actualHome:g.a.score,classification,round:round.name,sourceUrl:c.sourceUrl,neutral:/stadium|university|college|neutral/i.test(g.venue||'')&&!/home field|home site/i.test(g.venue||'')});
  }
 }
 return out;
}
export function normalizePlayoffSubmission(row,team,finals){
 const day=isoDate(row.date),a=teamKey(team),b=teamKey(row.opponent);
 if(!day||!a||!b)return row;
 const matches=finals.filter(g=>((teamKey(g.awayTeam)===a&&teamKey(g.homeTeam)===b)||(teamKey(g.homeTeam)===a&&teamKey(g.awayTeam)===b)));
 // Exact local dates need no adjustment. A one-day UTC rollover may be
 // corrected only with a MaxPreps contest URL explicitly naming the local date.
 if(matches.some(g=>g.date===day))return row;
 let url;try{url=new URL(row.url,'https://www.maxpreps.com')}catch{return row}
 if(!/^(?:www\.)?maxpreps\.com$/i.test(url.hostname)||!url.pathname.includes('/football/game/'))return row;
 const m=url.pathname.match(/\/(\d{1,2})-(\d{1,2})-(2026)\/?$/);if(!m)return row;
 const sourceDate=isoDate(m[1]+'/'+m[2]+'/'+m[3]);if(!sourceDate||Math.abs(Date.parse(sourceDate)-Date.parse(day))!==86400000)return row;
 const hits=matches.filter(g=>g.date===sourceDate);return hits.length===1?{...row,date:sourceDate,originalSourceDate:day}:row;
}

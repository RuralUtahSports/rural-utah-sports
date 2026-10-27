export const compact=v=>String(v??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
export const reportedNumber=v=>v===null||v===undefined||String(v).trim()===''?null:/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(String(v).trim().replace(/,/g,''))?Number(String(v).trim().replace(/,/g,'')):null;
export function samePlayer(a,b){
 return !!a&&!!b&&!!compact(a.name)&&compact(a.name)===compact(b.name)&&String(a.number??'').trim()===String(b.number??'').trim()&&(!a.playerId||!b.playerId||a.playerId===b.playerId);
}
// Exact repeated submissions are harmless; differing submissions need review.
// Do not select the largest value, the last response, or a nearby opponent.
export function uniquePlayerSubmissions(rows){
 const grouped=new Map(),conflicts=[];
 for(const row of rows||[]){
  const key=[row.date,compact(row.opponent),row.playerId||compact(row.name),String(row.number??'')].join('|');
  const previous=grouped.get(key);
  if(!previous){grouped.set(key,row);continue;}
  const cells=r=>JSON.stringify((r.statLines||[]).map(l=>[compact(l.category),Object.entries(l.values||{}).sort(([a],[b])=>a.localeCompare(b))]).sort(([a],[b])=>a.localeCompare(b)));
  if(!samePlayer(previous,row)||cells(previous)!==cells(row)){grouped.set(key,null);conflicts.push(key);}
 }
 const rejected=new Set(conflicts);
 return {rows:[...grouped].filter(([key,row])=>row&&!rejected.has(key)).map(([,row])=>row),conflicts};
}

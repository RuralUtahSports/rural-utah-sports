import fs from 'node:fs';
import path from 'node:path';

const BASE='https://sports.deseret.com';
const OUT_DIR='team-player-records';
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const compact=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const slug=v=>clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const SLUG_OVERRIDES={ALA:'american-leadership',AMERICANLEADERSHIPACADEMY:'american-leadership',AMERICANLEADERSHIP:'american-leadership',CEDARCITY:'cedar',CEDAR:'cedar',GRANDCOUNTY:'grand',GRAND:'grand',GUNNISON:'gunnison-valley',GUNNISONVALLEY:'gunnison-valley',JUANDIEGOCATHOLIC:'juan-diego',JUANDIEGO:'juan-diego',LAYTONCHRISTIANACADEMY:'layton-christian',LAYTONCHRISTIAN:'layton-christian',MONUMENTVAL:'monument-valley',MONUMENTVALLEY:'monument-valley',MAPLEMTN:'maple-mountain',MAPLEMOUNTAIN:'maple-mountain',SAINTJOSEPH:'st-joseph',UMALEHI:'utah-military-camp-williams',UMAHILLFIELD:'utah-military-hillfield'};
const schoolSlug=v=>SLUG_OVERRIDES[compact(v)]||slug(v);
function decode(s){return String(s||'').replace(/<!--\s*-->/g,'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))}
function text(html){return clean(decode(String(html||'')).replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' '))}
function cells(row){const out=[];const re=/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi;let m;while((m=re.exec(row)))out.push(text(m[1]));return out}
function parse(html){const categories=[];const re=/<table\b[^>]*>([\s\S]*?)<\/table>/gi;let m;while((m=re.exec(html))){const rows=[...m[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(x=>cells(x[1])).filter(r=>r.some(Boolean));if(rows.length<3)continue;const title=clean(rows[0][0]),headers=rows[1].map(clean);if(!title||headers.length<3||compact(headers[0])!=='PLAYER'||compact(headers[1])!=='SEASON')continue;const entries=[];for(const row of rows.slice(2)){const player=clean(row[0]),season=Number(String(row[1]||'').match(/\d{4}/)?.[0]),raw=clean(row[2]);if(!player||!Number.isFinite(season)||!raw)continue;const number=Number(raw.replace(/,/g,''));entries.push({player,season,value:Number.isFinite(number)?number:raw})}if(entries.length)categories.push({category:title,valueLabel:headers[2],entries})}return categories}
async function fetchHtml(url){const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; RuralUtahSports/1.0; +https://ruralutahsports.com/)'},redirect:'follow',signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return r.text()}

const teams=JSON.parse(fs.readFileSync('teams-data.json','utf8')).map(t=>clean(t?.team)).filter(Boolean);
fs.mkdirSync(OUT_DIR,{recursive:true});
let next=0,success=0,withRecords=0,failures=0,totalCategories=0,totalEntries=0;
async function build(team){const deseretSlug=schoolSlug(team),sourceUrl=`${BASE}/high-school/school/${deseretSlug}/football/team-records`,file=path.join(OUT_DIR,`${slug(team)}.json`);try{const html=await fetchHtml(sourceUrl),categories=parse(html);const payload={team,source:'Deseret News',sourceUrl,updatedAt:new Date().toISOString(),coverageNote:'Records reflect statistics reported to Deseret News and may not include every season or player.',categories};fs.writeFileSync(file,JSON.stringify(payload,null,2)+'\n');success++;if(categories.length)withRecords++;totalCategories+=categories.length;totalEntries+=categories.reduce((n,c)=>n+c.entries.length,0)}catch(e){failures++;console.warn(`${team}: ${e.message}`);if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify({team,source:'Deseret News',sourceUrl,updatedAt:new Date().toISOString(),coverageNote:'No Deseret News team-record data is currently available.',categories:[]},null,2)+'\n')}}
async function worker(){while(true){const i=next++;if(i>=teams.length)return;await build(teams[i]);await new Promise(r=>setTimeout(r,75))}}
await Promise.all(Array.from({length:Math.min(6,teams.length)},()=>worker()));
const summary={updatedAt:new Date().toISOString(),teams:teams.length,pagesFetched:success,teamsWithRecords:withRecords,failedPages:failures,categories:totalCategories,entries:totalEntries};
fs.writeFileSync(path.join(OUT_DIR,'index.json'),JSON.stringify(summary,null,2)+'\n');
console.log(`Deseret team records: ${withRecords}/${teams.length} teams, ${totalCategories} categories, ${totalEntries} entries, ${failures} page failure(s).`);
if(success<Math.max(90,Math.floor(teams.length*.8)))throw new Error(`Too many team-record page failures: ${success}/${teams.length}`);

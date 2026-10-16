// Check whether GitHub Actions can read Deseret Sports before starting a multi-year rebuild.
// On a blocked source, leave the historical snapshot intact and let the workflow
// merge the existing, locally available 2026 game-stat feed.
import fs from 'node:fs';

const schedule='https://sports.deseret.com/high-school/football/scores-schedule/2025-09-12';
const game='https://sports.deseret.com/high-school/football/game/2018-09-15/orem-football-vs-santa-margarita-calif-football/168535';
const checks=[
  {name:'schedule',url:schedule,pattern:/\/high-school\/football\/game\/2025-09-12\//i},
  {name:'game',url:game,pattern:/Orem[\s\S]*Santa Margarita|Santa Margarita[\s\S]*Orem/i}
];
const userAgent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
async function check({name,url,pattern}){
  try{
    const response=await fetch(url,{headers:{'user-agent':userAgent},redirect:'follow',signal:AbortSignal.timeout(15000)});
    if(!response.ok)return{name,ok:false,reason:`HTTP ${response.status}`};
    const html=await response.text();
    if(!pattern.test(html))return{name,ok:false,reason:'Unexpected page content'};
    return{name,ok:true,reason:'accessible'};
  }catch(error){return{name,ok:false,reason:String(error?.message||error)}}
}
const results=await Promise.all(checks.map(check));
const available=results.every(r=>r.ok);
for(const result of results)console.log(`Deseret ${result.name}: ${result.reason}`);
if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`available=${available}\n`);
const message=available
  ? 'Historical source is accessible; full rebuild is permitted.'
  : 'Historical source is unavailable; full rebuild will be skipped. Preserve existing 2001–present records and update from local 2026 stats.';
console.log(available?message:`::warning::${message}`);
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(
  process.env.GITHUB_STEP_SUMMARY,
  `### Player record source probe\n${message}\n\n${results.map(r=>`- ${r.name}: ${r.reason}`).join('\n')}\n`
);

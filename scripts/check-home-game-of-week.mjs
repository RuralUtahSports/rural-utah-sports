import fs from 'node:fs';

const fail=m=>{console.error(`GAME OF THE WEEK CHECK FAILED: ${m}`);process.exitCode=1};
const js=fs.readFileSync('home-game-of-week.js','utf8');
const loader=fs.readFileSync('weekly-simulation-promo.js','utf8');
const config=JSON.parse(fs.readFileSync('game-of-the-week-2026.json','utf8'));
const week=JSON.parse(fs.readFileSync('home-week-data.json','utf8'));

for(const token of ['Game of the Week','RURAL_CLASSES','3A','2A','1A','8P','game-of-the-week-2026.json','home-week-data.json','RUS Line','lineText','Pick ’em','Open Game Center','rus-gotw-sponsor','Presented by']){
  if(!js.includes(token))fail(`home-game-of-week.js missing ${token}`);
}
if(js.includes('RUS Projection:'))fail('Homepage Game of the Week should show a line instead of the exact score projection');
for(const token of ['home-game-of-week.js?v=20260819-gotw2','data-rus-home-gotw','loadHomeGotw']){
  if(!loader.includes(token))fail(`weekly loader missing ${token}`);
}
if(config.season!==2026)fail('Game of the Week config season must be 2026');
if(!['auto','manual'].includes(String(config.selectionMode||'').toLowerCase()))fail('selectionMode must be auto or manual');
if(config.sponsor?.active!==false)fail('Sponsor should ship inactive until a sponsor is sold');
if(!Array.isArray(week.games)||!week.games.length)fail('home-week-data.json has no games to choose from');
if(!process.exitCode)console.log(`Game of the Week checks passed with ${week.games.length} weekly games available; homepage now shows the RUS line instead of an exact projected score.`);

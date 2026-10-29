// Read-only local page regressions; no external traffic or writes.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
 const root=process.cwd(),out=process.env.RUS_BROWSER_OUTPUT||'/tmp/rus-corrected-pages';fs.mkdirSync(out,{recursive:true});
 const cases=[['south-summit-3-ian-mair','SOUTH SUMMIT','1397'],['south-summit-8-brody-larsen','SOUTH SUMMIT','1251'],['monticello-6-cache-young','MONTICELLO','2230'],['duchesne-17-alec-thomas','DUCHESNE','54'],['south-summit-11-cash-rockhill','SOUTH SUMMIT','140'],['monticello-7-cash-mack','MONTICELLO','672'],['monticello-11-canyon-christensen','MONTICELLO','187'],['ben-lomond-2-dashawn-gordan','BEN LOMOND','26'],['manti-1-kingston-wright','MANTI','3032'],['canyon-view-2-owen-williams','CANYON VIEW','2165']];
 const browser=await chromium.launch({executablePath:process.env.RUS_CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox','--disable-dev-shm-usage']}),results=[];
 try{for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900}});await context.route('**/*',route=>{
   const req=route.request(),u=new URL(req.url());if(req.method()!=='GET'||u.hostname!=='rus.test')return route.abort();
   const f=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile())return route.fulfill({status:404,body:''});
   return route.fulfill({body:fs.readFileSync(f),contentType:({'.html':'text/html','.js':'application/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'})[path.extname(f)]||'application/octet-stream'});
  });const p=await context.newPage();p.setDefaultTimeout(20000);
  for(const [id,team,yards] of cases){const errors=[];const listener=e=>errors.push(e.message);p.on('pageerror',listener);
   await p.goto('https://rus.test/player.html?id='+id);await p.waitForSelector('.data-table');
   const totals=(await p.locator('.data-table').first().innerText()).replace(/,/g,'');assert.match(totals,new RegExp('\\b'+yards+'\\b'));assert.deepEqual(errors,[]);p.off('pageerror',listener);
   const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,id+' viewport overflow');results.push({width,page:'player',id,verifiedValue:yards});
  }
  for(const team of [...new Set([...cases.map(x=>x[1]),'MOUNTAIN RIDGE','WESTLAKE'])]){await p.goto('https://rus.test/team.html?team='+encodeURIComponent(team));await p.waitForFunction(()=>document.body.innerText.includes('Season')&&document.body.innerText.includes('2026'));
   assert.doesNotMatch(await p.locator('body').innerText(),/Failed to load|Team not found/i);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,team+' viewport overflow');const expected={MANTI:[2,8,21,28],'CANYON VIEW':[7,3,28,21],'MOUNTAIN RIDGE':[10,0,21,13],WESTLAKE:[7,3,13,21]}[team];if(expected){const data=await p.evaluate(async t=>await(await fetch('team-current-data/'+t.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.json')).json(),team);assert.deepEqual([data.standing.wins,data.standing.losses],expected.slice(0,2));const finals=data.current.schedule.filter(g=>g.date==='2026-10-15');assert.equal(finals.length,1);assert.deepEqual([finals[0].teamScore,finals[0].opponentScore],expected.slice(2));}results.push({width,page:'team',team});}
  await p.screenshot({path:path.join(out,width+'-team.png'),fullPage:true});await context.close();
 }}finally{await browser.close();}console.log(JSON.stringify({checks:results.length,results}));
})().catch(e=>{console.error(e);process.exitCode=1;});

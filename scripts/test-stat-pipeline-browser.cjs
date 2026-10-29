// Read-only browser regression: adversarial responses are local fixtures; all non-GET and external requests are blocked.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
 const root=process.cwd(),results=[],out=process.env.RUS_BROWSER_OUTPUT||'/tmp/rus-pipeline-browser';fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.RUS_CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900}});let missing=false,tamper=false,poison=true;const errors=[];
  await context.route('**/*',async route=>{
   const request=route.request(),u=new URL(request.url());
   if(request.method()!=='GET'||!['policy.test','ruralutahsports.com','www.ruralutahsports.com'].includes(u.hostname))return route.abort();
   if(u.pathname==='/regular-season-publication-2026.json'&&missing)return route.fulfill({status:503,body:'Unavailable'});
   const file=path.join(root,decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
   let body=fs.readFileSync(file);
   if(u.pathname==='/deseret-rosters-stats-2026.json'&&poison){
    const data=JSON.parse(body);for(const t of Object.values(data.teams))for(const s of t.stats||[])for(const p of s.rows||[])for(const key of Object.keys(p.values||{}))if(/yards/i.test(key))p.values[key]='987654321';body=JSON.stringify(data);
   }
   if(u.pathname==='/region-awards-2026.lock.json'&&tamper)body=body.toString()+' ';
   await route.fulfill({body,contentType:({'.html':'text/html','.js':'application/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream'});
  });
  const p=await context.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));
  await p.goto('https://policy.test/stat-leaders.html');await p.waitForSelector('#results table');
  assert.equal(await p.locator('#leaderSourceMode').inputValue(),'reported');
  assert.match(await p.locator('#heroCopy').innerText(),/MaxPreps prioritized over older RUS\/Deseret values/);
  assert.match(await p.locator('#results').innerText(),/Reported position/i);
  assert.match(await p.locator('#results thead').innerText(),/Source/i);
  assert.match(await p.locator('#scopeNote').innerText(),/MaxPreps is first for 4A–6A/);
  assert.match(await p.locator('#scopeNote').innerText(),/NOT regular-season-only/);
  assert.equal(await p.locator('#shareStatCategory').isDisabled(),true);
  assert.equal(await p.locator('#shareAllStats').isDisabled(),true);
  const reportedTotal=await p.locator('#summary').innerText();
  assert.ok(Number((reportedTotal.match(/\d+/)||[])[0])>20,'Reported passing view should include athletes beyond the few verified entries');
  assert.equal(await p.locator('.leaders tbody tr:first-child .rank').innerText(),'#1');
  assert.match(await p.locator('#summary').innerText(),/Provisional order/i);
  results.push({width,test:'reported 2026 passing has broad coverage, provisional order, postseason warning'});
  // The default adversarial fixture poisons reported yards. Use the actual
  // retained 2026 source for a separate source-reviewed athlete regression.
  poison=false;
  await p.reload();await p.waitForSelector('#results table');
  await p.locator('[data-cat="Passing"]').click();
  const sourced=await p.evaluate(()=>{
    const get=(category,id)=>buildRows(category).find(r=>r.playerId===id);
    const d=get('Passing','farmington-17-alton-dahl'),a=get('Rushing','lone-peak-23-ayden-laws');
    return {dahl:{value:d?.values?.YARDS,source:d?.statSources?.YARDS},
      laws:{value:a?.values?.YARDS,source:a?.statSources?.YARDS}};
  });
  assert.equal(sourced.dahl.value,'2347');
  assert.match(sourced.dahl.source,/MaxPreps/);
  assert.equal(sourced.laws.value,'505','Explicit MaxPreps-first priority replaces older 360 and Deseret preview 525');
  assert.match(sourced.laws.source,/MaxPreps/);
  results.push({width,test:'4A–6A reported leaderboard prioritizes MaxPreps over nonblank and reviewed Deseret preview totals'});
  const huntRows=p.locator('#results tbody tr').filter({hasText:'Jaxon Hunt'});
  assert.equal(await huntRows.count(),1,'Expected Jaxon Hunt exactly once in reported passing');
  assert.match(await huntRows.first().innerText(),/3386|3,386/);
  assert.match(await huntRows.first().innerText(),/Reviewed|MaxPreps/);
  await p.locator('#leaderSourceMode').selectOption('verified');
  const huntVerified=p.locator('#results tbody tr').filter({hasText:'Jaxon Hunt'});
  assert.equal(await huntVerified.count(),1,'Verified Hunt regular-season passing should appear once');
  assert.match(await huntVerified.first().innerText(),/3386|3,386/);
  await p.goto('https://policy.test/player.html?id=mountain-ridge-11-jaxon-hunt');
  await p.waitForSelector('.data-table');
  assert.match(await p.locator('#page').innerText(),/3386|3,386/);
  assert.match(await p.locator('#page').innerText(),/2026 passing-yard correction/);
  results.push({width,test:'Hunt 3386 verified regular-season yards in player leaders and player profile'});
  for(const [id,expected] of [['farmington-17-alton-dahl','2347'],['lone-peak-23-ayden-laws','505'],['mountain-ridge-7-xander-thayer','892']]){
    await p.goto('https://policy.test/player.html?id='+id);
    await p.waitForSelector('.data-table');
    assert.match((await p.locator('#page').innerText()).replace(/,/g,''),new RegExp(expected),'Updated 6A reported preview total missing for '+id);
    assert.match(await p.locator('#page').innerText(),/October 29 preview cross-check/);
    assert.match(await p.locator('#page').innerText(),/Matched MaxPreps statistics first/);
  }
  results.push({width,test:'3 prioritized 6A player profiles show crosschecked 2026 preview season totals'});

  poison=true;
  await p.goto('https://policy.test/stat-leaders.html');await p.waitForSelector('#results table');

  await p.locator('#leaderSourceMode').selectOption('verified');
  await p.locator('[data-cat="Passing"]').click();await p.locator('[data-class="2A"]').click();
  assert.match((await p.locator('#results').innerText()).replace(/,/g,''),/1397/);assert.doesNotMatch(await p.locator('#results').innerText(),/987654321/);
  assert.match(await p.locator('#heroCopy').innerText(),/Coverage is incomplete/);
  assert.equal(await p.locator('#shareStatCategory').isDisabled(),false);
  results.push({width,test:'verified 2026 season leaderboard ignores poisoned reported cumulative totals'});
  await p.screenshot({path:`${out}/${width}-verified-leaders.png`,fullPage:true});
  const resumed=await p.evaluate(async()=>{
   const publication=await(await fetch('regular-season-publication-2026.json')).json(),data=await(await fetch('player-game-stats-2026.json')).json(),policy=window.RUSRegularSeasonPolicy2026;
   return ['TIMPVIEW','SALEM HILLS'].map(team=>{
    const opponent=team==='TIMPVIEW'?'MAPLE MOUNTAIN':'TIMPANOGOS',game=data.teams[team].games.find(g=>g.opponent===opponent&&g.date==='2026-09-19'),duplicate={...structuredClone(game),date:'2026-09-18'};
    const one=policy.regularGames([game],team,publication),both=policy.regularGames([game,duplicate],team,publication);
    return {team,count:both.length,statsUnchanged:JSON.stringify(one)===JSON.stringify(both),phase:policy.phase(duplicate,team,publication)};
   });
  });
  for(const r of resumed){assert.equal(r.count,1);assert.equal(r.statsUnchanged,true);assert.equal(r.phase,'regular-season');results.push({width,test:r.team+' resumed game counted exactly once'});}

  missing=true;await p.reload();await p.waitForFunction(()=>document.querySelector('#results').textContent.includes('could not be loaded'));
  assert.equal(await p.locator('#results table').count(),0);results.push({width,test:'missing reviewed publication fails closed'});missing=false;
  for(const file of ['mvp-race.html','all-utah.html','all-state-watch.html']){
   await p.goto('https://policy.test/'+file);await p.waitForFunction(()=>document.querySelector('#updated')?.textContent.includes('source report')||document.querySelector('#updated')?.textContent.includes('Updated'));
   assert.doesNotMatch(await p.locator('body').innerText(),/987654321/);results.push({width,test:file+' uses reviewed projection'});
  }
  await p.goto('https://policy.test/player.html?id=south-summit-3-ian-mair');await p.waitForSelector('.rus-rank-list');
  assert.match((await p.locator('.rus-rank-list').innerText()).replace(/,/g,''),/1397/);assert.doesNotMatch(await p.locator('.rus-rank-list').innerText(),/987654321/);
  assert.equal(await p.locator('script[data-rus-player-awards]').count(),1);results.push({width,test:'profile ranks use reviewed fields with one versioned integration'});
  await p.goto('https://policy.test/team-stats.html');
  await p.waitForFunction(()=>document.querySelector('#methodNote')?.textContent.includes('2026 REPORTED DATA'));
  assert.match(await p.locator('#methodNote').innerText(),/NOT official statewide\/class\/region rankings/);
  await p.locator('#metricFilter').selectOption('passingYardsPerGame');
  await p.waitForFunction(()=>document.querySelectorAll('#rows tr').length>0);
  const passingRows=await p.locator('#rows tr').count();
  assert.equal(passingRows,116,'Reported passing teams must not be filtered by incomplete certification');
  assert.equal(await p.locator('#rankHeader').textContent(),'Rank held');
  assert.equal(await p.locator('.rank-cell').first().innerText(),'—');
  assert.equal(await p.locator('.rank-detail').first().innerText(),'Not certified');
  assert.match(await p.locator('#rows').innerText(),/BOX ELDER/);
  results.push({width,test:'2026 reported passing data visible without certifying rankings'});
  await p.locator('#classFilter').selectOption('3A');
  assert.ok((await p.locator('#rows tr').count())>0,'3A reported passing teams visible');
  results.push({width,test:'2026 classification filters retain reported passing teams'});
  missing=true;await p.reload();await p.waitForFunction(()=>document.querySelector('#methodNote')?.textContent.includes('could not be loaded'));
  assert.equal(await p.locator('#rows tr').count(),0);
  await p.locator('#search').fill('BOX ELDER');
  assert.equal(await p.locator('#rows tr').count(),0,'A filter event must not bypass missing reviewed-source boundary');
  missing=false;results.push({width,test:'2026 team reported view still fails closed without reviewed publication'});
  await p.locator('#seasonFilter').selectOption('2025');await p.waitForFunction(()=>document.querySelectorAll('#rows tr').length>0);
  assert.equal(await p.locator('#rankHeader').textContent(),'Rank');
  assert.match(await p.locator('.rank-cell').first().innerText(),/#/);
  results.push({width,test:'2025 team statistics and rankings remain operational'});
  await p.goto('https://policy.test/region-awards.html');await p.waitForFunction(()=>document.querySelector('#ar-region')?.options.length>0);await p.waitForTimeout(250);
  assert.doesNotMatch(await p.locator('#ar-error').innerText(),/Unable to load/);results.push({width,test:'original frozen awards remain operational'});
  await p.screenshot({path:`${out}/${width}-locked-awards.png`,fullPage:false});
  tamper=true;await p.reload();await p.waitForFunction(()=>document.querySelector('#ar-error')?.textContent.includes('snapshot changed'));
  results.push({width,test:'changed frozen candidate inputs are rejected'});assert.deepEqual(errors,[]);
  await context.close();
 }
 await browser.close();fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify({checks:results.length,results}));
})().catch(e=>{console.error(e);process.exit(1)});

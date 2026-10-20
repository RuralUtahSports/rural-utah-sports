#!/usr/bin/env node
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
(async()=>{
 const {buildHistoricalPlayerSeasonAlerts, SCHOOL_PLAYER_SEASON_CATEGORIES}=
  await import('../scripts/historical-player-season-alerts.mjs');
 assert.equal(Object.keys(SCHOOL_PLAYER_SEASON_CATEGORIES).length,13);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rus-player-season-'));
 try{
  const file={team:'SAMPLE SCHOOL',sourceUrl:'https://sports.deseret.com/high-school/school/sample-school/football/team-records',
   categories:[
    {category:'Defense Tackles',entries:[
     {player:'Old Leader',season:2014,value:125},
     {player:'Previous Leader',season:2018,value:140},
     {player:'Current excluded',season:2026,value:200}
    ]},
    {category:'Passing Yards',entries:[{player:'One Historical Year',season:2025,value:500}]},
    {category:'Rushing Yards',entries:[
     {player:'Old',season:2018,value:1300},
     {player:'Old 2',season:2023,value:1400}
    ]}
   ]};
  fs.writeFileSync(path.join(tmp,'sample-school.json'),JSON.stringify(file));
  const metric=(key,name,value)=>[key,{leader:{name,value,playerId:name.toLowerCase().replaceAll(' ','-')},
    def:{key,label:key,unit:key==='tackles'?'tackles':'yards'}}];
  const current=new Map([['SAMPLESCHOOL',new Map([
   metric('tackles','New Tackles Player',146),
   metric('passingYards','First Year Only',700),
   metric('rushingYards','Tied Record',1400)
  ])]]);
  const out=buildHistoricalPlayerSeasonAlerts({
   player2026:current,teamNames:new Map([['SAMPLESCHOOL','SAMPLE SCHOOL']]),
   asOf:'2026-10-20',archiveDir:tmp
  });
  assert.equal(out.alerts.length,1,'Only multi-season tackles high should trigger');
  const a=out.alerts[0];
  assert.equal(a.categoryKey,'tackles');
  assert.equal(a.status,'historical-school-high');
  assert.equal(a.previousValue,140);
  assert.equal(a.previousPlayer,'Previous Leader');
  assert.equal(a.previousSeason,2018);
  assert.equal(a.historicalSeasons,2);
  assert.ok(out.missing.some(m=>m.categoryKey==='passingYards'),'One-year baseline must be excluded');
  assert.ok(!out.alerts.some(m=>m.categoryKey==='rushingYards'),'Ties must be excluded');
  const history=fs.readdirSync('team-player-records').filter(f=>f.endsWith('.json'));
  assert.ok(history.length>50,'Missing school historical season record files');
  const example=JSON.parse(fs.readFileSync('team-player-records/morgan.json','utf8'));
  assert.ok(example.categories?.some(c=>c.category==='Defense Tackles'&&c.entries.some(e=>e.season<=2015)),'Historical Morgan tackle source missing');
  console.log('PASS: school-season comparisons use true historical leaders, exclude 2026 archive rows, exclude ties and one-season baselines; '+history.length+' school archives');
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});

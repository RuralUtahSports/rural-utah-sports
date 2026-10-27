#!/usr/bin/env node
// Regressions for authentic school palettes in both team-page record tabs.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const colors=JSON.parse(fs.readFileSync('team-colors-exact.json','utf8'));
const fallback=JSON.parse(fs.readFileSync('teams-data.json','utf8'));
const styleNodes=[];
const doc={
 getElementById(id){return styleNodes.find(x=>x.id===id)||null},
 head:{appendChild(node){styleNodes.push(node)}},
 createElement(type){assert.equal(type,'style');return{id:'',textContent:''}}
};
const ctx={window:{},document:doc,console,
 fetch:async url=>{
  const data=url.startsWith('team-colors-exact.json')?colors:url.startsWith('teams-data.json')?fallback:null;
  if(!data)throw Error('Unexpected palette asset: '+url);
  return{ok:true,json:async()=>data}
 }};
vm.runInNewContext(fs.readFileSync('team-record-theme.js','utf8'),ctx,{filename:'team-record-theme.js'});
const api=ctx.window.RUSTeamRecordTheme;
assert.ok(api,'Team Record Theme missing');
const examples=['COPPER HILLS','WATER CANYON','MURRAY','PANGUITCH','TIMPANOGOS','WEST FIELD','DESERET PEAK','MOUNTAIN RIDGE','ALA','ALTA'];
async function test(){
 const palettes=await api.readPalette();
 let count=0;
 for(const team of examples){
  const row=colors.find(x=>x.team===team);
  assert.ok(row,'Exact school palette missing: '+team);
  const t=api.themeFor(team,palettes);
  assert.equal(t.primary,row.backgroundColor.toUpperCase(),team+' primary mismatch');
  assert.equal(t.secondary,row.textColor.toUpperCase(),team+' secondary mismatch');
  assert.ok(api.contrast(t.accent,'#080808')>=4.5,team+' values unreadable on black');
  assert.ok(api.contrast(t.primary,t.onPrimary)>=4.5,team+' header labels unreadable');
  for(const kind of ['player','team']){
   const applied={};
   const el={style:{setProperty(k,v){applied[k]=v}},dataset:{}};
   await api.apply(el,team);
   assert.equal(applied['--rus-record-primary'],t.primary);
   assert.equal(applied['--rus-record-secondary'],t.secondary);
   assert.equal(applied['--rus-record-on-primary'],t.onPrimary);
   assert.equal(el.dataset.rusSchoolColors,'1');
   count++;
  }
 }
 assert.equal(styleNodes.length,1,'Theme styles must only mount once');
 const rules=styleNodes[0].textContent;
 for(const selector of [
  '.rus-player-records-section .rus-player-record-card h3',
  '.rus-team-stat-records-section .rus-team-stat-record-card h3',
  '.rus-player-records-section .rus-player-record-wrap thead th',
  '.rus-team-stat-records-section .rus-team-stat-record-wrap thead th',
  '.rus-player-records-section .rus-player-record-value',
  '.rus-team-stat-records-section .rus-team-stat-record-value'
 ])assert.ok(rules.includes(selector),'Missing theme selector: '+selector);
 assert.ok(rules.includes('-webkit-overflow-scrolling:touch'),'Mobile records tables must scroll');
 const player=fs.readFileSync('team-player-records.js','utf8');
 const team=fs.readFileSync('team-stat-records.js','utf8');
 for(const [code,label] of [[player,'player'],[team,'team']]){
  assert.ok(code.includes('window.RUSTeamRecordTheme.apply(section,team)'),label+' never applies the theme');
  assert.ok(code.includes('fetch('),label+' should still load existing record source');
 }
 const page=fs.readFileSync('team-page-content.html','utf8');
 assert.ok(page.includes('<script src="team-record-theme.js?v=20261020-record-school-colors1"></script>'),'Missing palette script on team pages');
 const tabs=fs.readFileSync('team-tabs.js','utf8');
 assert.ok(tabs.includes('team-player-records.js?v=20261020-school-colors1'));
 assert.ok(tabs.includes('team-stat-records.js?v=20261020-school-colors1'));
 const teamLoader=fs.readFileSync('team.html','utf8');
 assert.match(teamLoader,/fetch\(`team-page-content\.html\?v=\$\{VERSION\}`\)/,'Team loader must fetch the content containing the palette runtime');
 assert.match(teamLoader,/for\(const old of \[\.\.\.document\.querySelectorAll\('script'\)\]\)await copyScript\(old\)/,'Content scripts, including record palettes, must execute in document order');
 const unknown=api.themeFor('UNKNOWN SCHOOL',palettes);
 assert.equal(unknown.primary,'#F14D07','Missing data must show neutral RUS fallback');
 console.log('PASS: '+count+' authentic school themes in player and team records; CSS contrast, mobile scroll, lazy tab loaders');
}
test().catch(e=>{console.error(e);process.exitCode=1});

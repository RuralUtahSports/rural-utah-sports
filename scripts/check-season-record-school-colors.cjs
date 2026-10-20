#!/usr/bin/env node
// Check that the actual share-graphic renderer uses the repository's school
// primary AND secondary colors instead of RUS orange for every record.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('home-season-record-alerts.js','utf8');
const testSrc=src.replace(/\}\)\(\);\s*$/,'globalThis.__schoolThemeTest={palette,draw,contrast,loadTeamColors,card};})();');
assert.notEqual(testSrc,src,'Could not access actual school record renderer');
const schoolColors=JSON.parse(fs.readFileSync('team-colors-exact.json','utf8'));
const rows=JSON.parse(fs.readFileSync('teams-data.json','utf8'));
const fills=[],texts=[];
const graphic={
 fillStyle:'#000000',font:'',textAlign:'left',
 fillRect(x,y,w,h){fills.push({x,y,w,h,color:this.fillStyle});},
 fillText(text,x,y){texts.push({text,x,y,color:this.fillStyle,font:this.font});},
 measureText(text){return{width:String(text).length*15};}
};
const canvas={width:0,height:0,getContext(){return graphic;}};
const document={
 readyState:'loading',addEventListener(){},getElementById(){return null},
 head:{appendChild(){}},
 createElement(type){return type==='canvas'?canvas:{dataset:{},innerHTML:'',addEventListener(){}};}
};
const ctx={document,console,fetch:async url=>({ok:true,json:async()=>url.startsWith('team-colors-exact.json')?schoolColors:rows})};
vm.runInNewContext(testSrc,ctx,{filename:'home-season-record-alerts.js'});
const {palette,draw,contrast,loadTeamColors,card}=ctx.__schoolThemeTest;
const teams=['COPPER HILLS','WATER CANYON','MURRAY','PANGUITCH','TIMPANOGOS','WEST FIELD','DESERET PEAK','MOUNTAIN RIDGE'];
const matchColors=team=>schoolColors.find(c=>c.team===team);
const record=(team,value)=>({team,recordType:'seasonTeam',status:'broken',category:'Most Points Scored in a Season',value,unit:'points',previousValue:200,previousSeason:2024,date:'2026-10-16'});
(async()=>{
 await loadTeamColors();
 for(const team of teams){
  const expected=matchColors(team);
  assert.ok(expected,'Exact color file lacks '+team);
  const theme=palette(team);
  assert.equal(theme.primary,expected.backgroundColor.toUpperCase(),'Primary color mismatch: '+team);
  assert.equal(theme.secondary,expected.textColor.toUpperCase(),'Secondary color mismatch: '+team);
  assert.ok(contrast(theme.accent,'#121212')>=4.49,'Stat text lacks contrast for '+team);
  const html=card(record(team,300));
  assert.ok(html.includes('--team-primary:'+theme.primary),'On-screen card primary not themed for '+team);
  assert.ok(html.includes('--team-secondary:'+theme.secondary),'On-screen card secondary not themed for '+team);
 }
 const chosen=['COPPER HILLS','WATER CANYON','MURRAY','PANGUITCH','TIMPANOGOS'];
 draw(chosen.map((team,i)=>record(team,300+i)), 'Single-Season Team Records',1,2);
 chosen.forEach((team,i)=>{
  const theme=palette(team),y=222+i*202;
  assert.ok(fills.some(f=>f.x===70&&f.y===y&&f.w===16&&f.h===187&&f.color===theme.primary),
   team+' primary stripe missing from export');
  assert.ok(fills.some(f=>f.x===86&&f.y===y&&f.w===5&&f.h===187&&f.color===theme.secondary),
   team+' secondary stripe missing from export');
  assert.ok(fills.some(f=>f.x===102&&f.y===y+39&&f.h===43&&f.color===theme.primary),
   team+' school-color name banner missing');
  assert.ok(texts.some(t=>t.text===team&&t.color===theme.chipText),
   team+' team name banner contrast/color invalid');
  assert.ok(texts.some(t=>t.text===String(300+i)+' points'&&t.color===theme.accent),
   team+' statistic text does not match its school');
 });
 assert.ok(new Set(chosen.map(t=>palette(t).primary)).size===chosen.length,'School colors incorrectly collapsed');
 assert.ok(texts.some(t=>t.text==='2026 SEASON RECORDS'&&t.color==='#F14D07'),'Keep RUS orange branding');
 console.log('PASS authentic colors for '+teams.length+' schools on-screen and export; primary, secondary and accessible stat text');
})().catch(e=>{console.error(e);process.exitCode=1;});

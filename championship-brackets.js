(()=>{
const data={
'6A':[
['First Round',[['#16 Layton','41','#17 Cedar Valley','16']]],
['Second Round',[['#1 Corner Canyon','63','#16 Layton','9'],['#8 Syracuse','31','#9 Westlake','28'],['#4 Mountain Ridge','35','#13 Riverton','21'],['#5 Herriman','62','#12 Weber','32'],['#2 Skyridge','63','#15 Copper Hills','3'],['#7 American Fork','21','#10 Lehi','20'],['#3 Davis','42','#14 Bingham','21'],['#6 Lone Peak','41','#11 Farmington','14']]],
['Quarterfinals',[['#1 Corner Canyon','56','#8 Syracuse','14'],['#4 Mountain Ridge','22','#5 Herriman','14'],['#2 Skyridge','56','#7 American Fork','29'],['#3 Davis','38','#6 Lone Peak','41']]],
['Semifinals',[['Corner Canyon','59','Mountain Ridge','20'],['Skyridge','7','Lone Peak','13']]],
['Championship',[['Corner Canyon','35','Lone Peak','20']]]],
'5A':[
['First Round',[['#16 Pleasant Grove','7','#17 Northridge','21'],['#15 Alta','49','#18 Roy','7'],['#9 Bountiful','56','#24 Clearfield','6'],['#10 Granger','35','#23 Taylorsville','0'],['#13 Timpview','40','#20 Wasatch','15'],['#14 Spanish Fork','42','#19 Hunter','7'],['#12 Olympus','42','#21 Cyprus','0'],['#11 West Field','41','#22 Viewmont','34']]],
['Second Round',[['#1 West','56','#17 Northridge','13'],['#8 West Jordan','32','#9 Bountiful','34'],['#4 Orem','40','#13 Timpview','22'],['#5 Woods Cross','13','#12 Olympus','6'],['#2 Fremont','31','#15 Alta','27'],['#7 Brighton','49','#10 Granger','8'],['#3 Springville','49','#14 Spanish Fork','14'],['#6 Box Elder','35','#11 West Field','13']]],
['Quarterfinals',[['West','14','Bountiful','3'],['Orem','35','Woods Cross','7'],['Fremont','14','Brighton','27'],['Springville','28','Box Elder','21']]],
['Semifinals',[['West','7','Orem','34'],['Brighton','24','Springville','30']]],
['Championship',[['Orem','42','Springville','7']]]],
'4A':[
['First Round',[['#16 East','41','#17 Murray','34'],['#15 Timpanogos','41','#18 Bear River','14'],['#9 Sky View','69','#24 Juan Diego','14'],['#10 Mountain Crest','54','#23 Uintah','7'],['#13 Highland','42','#20 Dixie','14'],['#14 Green Canyon','10','#19 Desert Hills','3'],['#12 Salem Hills','35','#21 Mountain View','12'],['#11 Skyline','53','#22 Tooele','22']]],
['Second Round',[['#1 Ridgeline','73','#16 East','14'],['#8 Park City','23','#9 Sky View','20'],['#4 Hurricane','43','#13 Highland','7'],['#5 Provo','45','#12 Salem Hills','6'],['#2 Crimson Cliffs','48','#15 Timpanogos','27'],['#7 Stansbury','49','#10 Mountain Crest','42'],['#3 Snow Canyon','20','#14 Green Canyon','23'],['#6 Pine View','14','#11 Skyline','21']]],
['Quarterfinals',[['Ridgeline','49','Park City','3'],['Hurricane','13','Provo','28'],['Crimson Cliffs','35','Stansbury','14'],['Green Canyon','28','Skyline','26']]],
['Semifinals',[['Ridgeline','48','Provo','22'],['Crimson Cliffs','21','Green Canyon','24']]],
['Championship',[['Ridgeline','56','Green Canyon','0']]]],
'3A':[
['First Round',[['#8 Canyon View','12','#9 Ogden','14'],['#4 Juab','65','#13 Ben Lomond','16'],['#5 Grantsville','54','#12 Carbon','17'],['#7 Richfield','41','#10 Logan','21'],['#6 North Sanpete','30','#11 Union','14']]],
['Quarterfinals',[['#1 Cedar','49','#9 Ogden','14'],['#4 Juab','26','#5 Grantsville','20'],['#2 Morgan','49','#7 Richfield','14'],['#3 Manti','55','#6 North Sanpete','17']]],
['Semifinals',[['Cedar','23','Juab','16'],['Morgan','28','Manti','42']]],
['Championship',[['Cedar','41','Manti','35']]]],
'2A':[
['First Round',[['#8 Providence Hall','6','#9 Judge Memorial','11'],['#7 Delta','1','#10 Grand','F']]],
['Quarterfinals',[['#1 San Juan','77','#9 Judge Memorial','2'],['#4 Summit Academy','48','#5 Emery','14'],['#2 South Sevier','43','#7 Delta','42'],['#3 South Summit','55','#6 American Leadership','20']]],
['Semifinals',[['San Juan','51','Summit Academy','27'],['South Sevier','0','South Summit','34']]],
['Championship',[['San Juan','57','South Summit','10']]]],
'1A':[
['First Round',[['#8 Gunnison Valley','28','#9 North Sevier','12']]],
['Quarterfinals',[['#1 Kanab','49','#8 Gunnison Valley','0'],['#4 North Summit','18','#5 Millard','14'],['#2 Beaver','49','#7 Parowan','0'],['#3 Duchesne','42','#6 Enterprise','6']]],
['Semifinals',[['Kanab','43','North Summit','19'],['Beaver','24','Duchesne','14']]],
['Championship',[['Kanab','24','Beaver','13']]]],
'8-Player':[
['First Round',[['#8 St. Joseph','12','#9 Water Canyon','22'],['#7 UMA Camp Williams','55','#10 Panguitch','6'],['#6 Monticello','1','#11 Monument Valley','F']]],
['Quarterfinals',[['#1 Rich','55','#9 Water Canyon','14'],['#4 Whitehorse','38','#5 UMA Hillfield','20'],['#2 Milford','57','#7 UMA Camp Williams','0'],['#3 Altamont','24','#6 Monticello','43']]],
['Semifinals',[['Rich','50','Whitehorse','8'],['Milford','83','Monticello','24']]],
['Championship',[['Rich','21','Milford','12']]]]
};
let teamMap=new Map();
const aliases={
  'ST JOSEPH':'SAINT JOSEPH','ST JOSEPH CATHOLIC':'SAINT JOSEPH','UMA CAMP WILLIAMS':'UMA-LEHI','UMA HILLFIELD':'UMA-HILLFIELD',
  'AMERICAN LEADERSHIP':'ALA','CEDAR':'CEDAR CITY','MONUMENT VALLEY':'MONUMENT VAL'
};
const clean=v=>String(v??'').trim();
const stripSeed=v=>clean(v).replace(/^#\d+\s*/, '');
const norm=v=>stripSeed(v).toUpperCase().replace(/[.'’]/g,'').replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
function lookup(name){const n=norm(name),key=aliases[n]||n;return teamMap.get(key)||teamMap.get(n)||null}
function safeHex(v,f){return /^#[0-9A-F]{6}$/i.test(clean(v))?clean(v):f}
function ordinal(n){n=Number(n)||0;const m=n%100;if(m>=11&&m<=13)return n+'th';switch(n%10){case 1:return n+'st';case 2:return n+'nd';case 3:return n+'rd';default:return n+'th'}}
const style=document.createElement('style');style.textContent=`
.bracket-test{margin-top:34px;border-top:4px solid #F14D07;padding-top:24px}.bracket-head{display:flex;align-items:end;justify-content:space-between;gap:15px;flex-wrap:wrap;margin-bottom:14px}.bracket-head h3{font-size:25px;text-transform:uppercase}.bracket-head p{color:#999;font-size:13px;margin-top:5px}.bracket-tabs{display:flex;gap:7px;flex-wrap:wrap}.bracket-tab{border:1px solid #444;background:#191919;color:#fff;padding:9px 12px;border-radius:5px;font-weight:900;cursor:pointer}.bracket-tab.active{background:#F14D07;color:#000;border-color:#F14D07}.bracket-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;background:#090909;border:1px solid #333;border-radius:8px;padding:16px}.bracket-grid{display:flex;gap:20px;min-width:max-content;align-items:stretch}.bracket-round{width:220px;display:flex;flex-direction:column}.bracket-round-title{text-align:center;color:#F14D07;font-size:11px;font-weight:900;text-transform:uppercase;margin-bottom:10px;min-height:28px;display:flex;align-items:center;justify-content:center}.bracket-games{flex:1;display:flex;flex-direction:column;justify-content:space-around;gap:10px}.bracket-game{position:relative;border:1px solid #393939;border-radius:6px;background:#151515;overflow:hidden;min-height:62px}.bracket-team{display:grid;grid-template-columns:1fr auto;gap:8px;padding:7px 9px;font-size:12px;align-items:center;border-left:5px solid transparent}.bracket-team+ .bracket-team{border-top:1px solid #333}.bracket-team.win{font-weight:900}.bracket-team.has-color{background:linear-gradient(90deg,var(--team-bg) 0 7px,rgba(255,255,255,.025) 7px 100%);border-left-color:var(--team-bg)}.bracket-team-name{color:var(--team-fg,#fff)}.bracket-score{font-weight:900;color:#F14D07}.bracket-champ .bracket-game{border-color:#F14D07}.bracket-title-count{padding:9px 10px 10px;border-top:1px solid #333;text-align:center;background:#0d0d0d}.bracket-title-count strong{display:block;color:#F14D07;font-size:12px;text-transform:uppercase}.bracket-title-count span{display:block;color:#aaa;font-size:10px;margin-top:3px}.bracket-note{color:#777;font-size:11px;margin-top:10px}.bracket-source{color:#777;font-size:11px;margin-top:10px}@media(max-width:600px){.bracket-round{width:190px}.bracket-scroll{padding:12px}.bracket-head h3{font-size:21px}}
`;document.head.appendChild(style);
const main=document.querySelector('main.container')||document.querySelector('main');if(!main)return;
const sec=document.createElement('section');sec.className='bracket-test';sec.innerHTML=`<div class="bracket-head"><div><h3>2025 Playoff Brackets</h3><p>Test view built from the UHSAA All Time Playoffs sheet. Pick a classification to view its complete 2025 path to the title.</p></div><div class="bracket-tabs" id="bracketTabs"></div></div><div class="bracket-scroll"><div id="bracketGrid" class="bracket-grid"></div></div><p class="bracket-source">School colors are pulled from the Rural Utah Sports team database when available. Forfeits are shown as “F,” matching the playoff sheet. On phones, swipe left/right to move through rounds.</p>`;main.appendChild(sec);
const tabs=sec.querySelector('#bracketTabs'),grid=sec.querySelector('#bracketGrid');
function nScore(v){const n=Number(v);return Number.isFinite(n)?n:null}
function teamHTML(label,score,isWin){const t=lookup(label),bg=t?safeHex(t.backgroundColor,'#F14D07'):null,fg=t?safeHex(t.textColor,'#FFFFFF'):'#FFFFFF';const css=bg?` style="--team-bg:${bg};--team-fg:${fg}"`:'';return `<div class="bracket-team ${isWin?'win ':''}${bg?'has-color':''}"${css}><span class="bracket-team-name">${clean(label)}</span><span class="bracket-score">${score}</span></div>`}
function championshipCountHTML(cls,g){if(cls!=='8-Player')return'';const a=nScore(g[1]),b=nScore(g[3]);let winner=null;if(a!==null&&b!==null)winner=a>b?g[0]:b>a?g[2]:null;if(!winner)return'';const t=lookup(winner);if(!t)return'';const count=Number(t.stateChampionships||0);if(!count)return'';return `<div class="bracket-title-count"><strong>${stripSeed(winner)} • ${ordinal(count)} State Championship</strong><span>Updated all-time title count after the 2025 championship</span></div>`}
function gameHTML(g,cls,isChamp){const a=nScore(g[1]),b=nScore(g[3]);const aw=a!==null&&b!==null?a>b:(String(g[3]).toUpperCase()==='F');const bw=a!==null&&b!==null?b>a:false;return `<div class="bracket-game">${teamHTML(g[0],g[1],aw)}${teamHTML(g[2],g[3],bw)}${isChamp?championshipCountHTML(cls,g):''}</div>`}
function render(cls){[...tabs.children].forEach(b=>b.classList.toggle('active',b.dataset.cls===cls));grid.innerHTML=data[cls].map((r,i)=>{const champ=i===data[cls].length-1;return `<div class="bracket-round ${champ?'bracket-champ':''}"><div class="bracket-round-title">${r[0]}</div><div class="bracket-games">${r[1].map(g=>gameHTML(g,cls,champ)).join('')}</div></div>`}).join('');sec.querySelector('.bracket-scroll').scrollLeft=0}
Object.keys(data).forEach((cls,i)=>{const b=document.createElement('button');b.type='button';b.className='bracket-tab'+(i===0?' active':'');b.dataset.cls=cls;b.textContent=cls;b.addEventListener('click',()=>render(cls));tabs.appendChild(b)});
async function loadTeams(){try{const r=await fetch('teams-data.json');if(!r.ok)throw new Error('teams');const teams=await r.json();for(const t of teams){teamMap.set(norm(t.team),t)}render('6A')}catch(e){console.warn('Bracket team colors unavailable',e);render('6A')}}
loadTeams();
})();
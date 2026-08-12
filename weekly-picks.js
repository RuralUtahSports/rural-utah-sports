const WP_TZ='America/Denver';
const WP_RELEASE_HOUR=16;
let wpWeeks=[],wpWeekKey='',wpMode='mypicks';

function wpParseDate(value){
  const s=String(value??'').trim();
  let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m)return{y:Number(m[3]),m:Number(m[1]),d:Number(m[2])};
  m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m)return{y:Number(m[1]),m:Number(m[2]),d:Number(m[3])};
  const d=new Date(s);if(!Number.isFinite(d.getTime()))return null;
  return{y:d.getFullYear(),m:d.getMonth()+1,d:d.getDate()};
}
function wpYmdKey(p){return p?p.y*10000+p.m*100+p.d:0}
function wpMondayKey(p){
  if(!p)return'';const d=new Date(Date.UTC(p.y,p.m-1,p.d));const day=d.getUTCDay();const diff=day===0?-6:1-day;d.setUTCDate(d.getUTCDate()+diff);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}
function wpMountainNowKey(){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:WP_TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  const o={};for(const p of parts)o[p.type]=p.value;
  return Number(`${o.year}${o.month}${o.day}${o.hour}${o.minute}`);
}
function wpReleaseKey(week){const p=week.firstDate;return Number(`${p.y}${String(p.m).padStart(2,'0')}${String(p.d).padStart(2,'0')}${String(WP_RELEASE_HOUR).padStart(2,'0')}00`)}
function wpReleased(week){return wpMountainNowKey()>=wpReleaseKey(week)}
function wpDateLabel(p){if(!p)return'';return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(p.y,p.m-1,p.d)))}
function wpReleaseLabel(week){const p=week.firstDate;return `${wpDateLabel(p)} at 4:00 PM Mountain Time`}
function wpGameKey(g){return `${g.date}|${g.awayTeam}|${g.homeTeam}`}
function wpStorageKey(weekKey){return `rus-weekly-picks-${weekKey}`}
function wpLoadPicks(weekKey){try{const x=JSON.parse(localStorage.getItem(wpStorageKey(weekKey))||'{}');return x&&typeof x==='object'?x:{}}catch{return{}}}
function wpSavePicks(weekKey,picks){try{localStorage.setItem(wpStorageKey(weekKey),JSON.stringify(picks))}catch{}}
function wpActualWinner(g){
  if(String(g.actualWinner??'').trim())return String(g.actualWinner).trim();
  const a=Number(g.actualAway),h=Number(g.actualHome);if(Number.isFinite(a)&&Number.isFinite(h)&&a!==h)return a>h?g.awayTeam:g.homeTeam;return'';
}
function wpBuildWeeks(){
  const map=new Map();
  for(const g of weekly||[]){const p=wpParseDate(g.date);if(!p)continue;const key=wpMondayKey(p);if(!map.has(key))map.set(key,{key,games:[],firstDate:p,lastDate:p});const w=map.get(key);w.games.push(g);if(wpYmdKey(p)<wpYmdKey(w.firstDate))w.firstDate=p;if(wpYmdKey(p)>wpYmdKey(w.lastDate))w.lastDate=p;}
  wpWeeks=[...map.values()].sort((a,b)=>wpYmdKey(b.firstDate)-wpYmdKey(a.firstDate));
  for(const w of wpWeeks)w.games.sort((a,b)=>wpYmdKey(wpParseDate(a.date))-wpYmdKey(wpParseDate(b.date))||String(a.awayTeam).localeCompare(String(b.awayTeam)));
  if(!wpWeekKey&&wpWeeks.length){const today=wpParseDate(new Intl.DateTimeFormat('en-US',{timeZone:WP_TZ}).format(new Date())),key=wpMondayKey(today),current=wpWeeks.find(w=>w.key===key);wpWeekKey=(current||wpWeeks[0]).key;}
}
function wpWeekLabel(w){const a=wpDateLabel(w.firstDate),b=wpDateLabel(w.lastDate);return a===b?a:`${a} – ${b}`}
function wpCurrentWeek(){return wpWeeks.find(w=>w.key===wpWeekKey)||wpWeeks[0]||null}
function wpSummary(week,picks){
  let picked=0,completed=0,correct=0;for(const g of week.games){const p=picks[wpGameKey(g)];if(p)picked++;const actual=wpActualWinner(g);if(actual&&p){completed++;if(actual===p)correct++;}}
  return{picked,completed,correct,accuracy:completed?correct/completed*100:null};
}
function wpSetPick(key,team){
  const w=wpCurrentWeek();if(!w||wpReleased(w))return;const picks=wpLoadPicks(w.key);picks[key]=team;wpSavePicks(w.key,picks);wpRenderBody();
}
function wpReset(){const w=wpCurrentWeek();if(!w||wpReleased(w))return;if(!confirm('Clear all of your picks for this week?'))return;try{localStorage.removeItem(wpStorageKey(w.key))}catch{}wpRenderBody();}
function wpSwitchMode(mode){wpMode=mode;document.querySelectorAll('.wp-mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));wpRenderBody();}
function wpMini(value,label){return `<div class="mini"><div class="mini-value">${value}</div><div class="mini-label">${label}</div></div>`}
function wpTeamButton(g,team,picks,locked){const selected=picks[wpGameKey(g)]===team;return `<button class="wp-team${selected?' selected':''}" ${locked?'disabled':''} onclick="wpSetPick('${encodeURIComponent(wpGameKey(g))}','${String(team).replace(/'/g,"\\'")}')"><span class="wp-team-name">${esc(team)}</span></button>`}
function wpPickCard(g,picks,locked){
  const key=wpGameKey(g),pick=picks[key]||'',actual=wpActualWinner(g);let status='';if(actual&&pick)status=actual===pick?'<div class="wp-status wp-correct">✓ Correct</div>':'<div class="wp-status wp-wrong">✕ Incorrect</div>';else if(actual)status='<div class="wp-status wp-pending">No pick submitted</div>';
  const btn=(team)=>{const selected=pick===team;return `<button class="wp-team${selected?' selected':''}" ${locked?'disabled':''} data-key="${encodeURIComponent(key)}" data-team="${encodeURIComponent(team)}"><span class="wp-team-name">${esc(team)}</span></button>`};
  const score=actual?(g.actualAway??'—')+'–'+(g.actualHome??'—'):'Pick a winner';
  return `<div class="wp-game"><div class="wp-game-date">${esc(g.date)}</div><div class="wp-teams">${btn(g.awayTeam)}${btn(g.homeTeam)}</div><div class="wp-scoreline">${score}</div>${status}</div>`;
}
function wpBindPickButtons(){document.querySelectorAll('.wp-team[data-key]').forEach(b=>b.onclick=()=>{const key=decodeURIComponent(b.dataset.key),team=decodeURIComponent(b.dataset.team);const w=wpCurrentWeek();if(!w||wpReleased(w))return;const picks=wpLoadPicks(w.key);picks[key]=team;wpSavePicks(w.key,picks);wpRenderBody();});}
function wpRenderMyPicks(w,released,picks){
  const s=wpSummary(w,picks),locked=released;return `<div class="wp-summary">${wpMini(`${s.picked}/${w.games.length}`,'Picks Made')}${wpMini(s.completed,'Graded')}${wpMini(s.correct,'Correct')}${wpMini(s.accuracy===null?'—':s.accuracy.toFixed(1)+'%','Accuracy')}</div><div class="wp-pick-grid">${w.games.map(g=>wpPickCard(g,picks,locked)).join('')}</div><p class="wp-note">Picks are saved only in this browser. ${released?'This week is locked because the RUS predictions have been released.':'You can change picks until 4:00 PM Mountain Time on the first game date.'}</p>`;
}
function wpRenderRus(w,released){
  if(!released)return `<div class="wp-lock"><strong>RUS predictions are locked.</strong><div class="wp-small">They will be revealed ${wpReleaseLabel(w)}. Make your own picks first.</div></div>`;
  return `<div class="table-wrap wp-rus-table"><table><thead><tr><th>Date</th><th>Away Team</th><th>Projection</th><th>Home Team</th><th>RUS Pick</th></tr></thead><tbody>${w.games.map(g=>`<tr><td>${esc(g.date)}</td><td class="left">${teamPill(g.awayTeam)}</td><td class="weekly-score">${g.awayScore??'—'}-${g.homeScore??'—'}</td><td class="left">${teamPill(g.homeTeam)}</td><td class="accent">${esc(g.winner||'—')}</td></tr>`).join('')}</tbody></table></div>`;
}
function wpRenderResults(w,released,picks){
  return `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Away</th><th>Home</th><th>Final</th><th>Winner</th><th>My Pick</th><th>My Result</th><th>RUS Pick</th></tr></thead><tbody>${w.games.map(g=>{const key=wpGameKey(g),pick=picks[key]||'',actual=wpActualWinner(g),mine=!actual||!pick?'—':actual===pick?'✓':'✕',cls=mine==='✓'?'win':mine==='✕'?'loss':'pending',final=actual?`${g.actualAway??'—'}-${g.actualHome??'—'}`:'—';return `<tr><td>${esc(g.date)}</td><td class="left">${teamPill(g.awayTeam)}</td><td class="left">${teamPill(g.homeTeam)}</td><td>${final}</td><td>${esc(actual||'—')}</td><td>${esc(pick||'—')}</td><td><span class="wp-result-badge ${cls}">${mine}</span></td><td>${released?esc(g.winner||'—'):'Locked'}</td></tr>`}).join('')}</tbody></table></div>`;
}
function wpRenderBody(){
  const w=wpCurrentWeek(),body=document.getElementById('wpBody');if(!w||!body)return;const released=wpReleased(w),picks=wpLoadPicks(w.key),reset=document.getElementById('wpReset');if(reset)reset.disabled=released;
  const lock=document.getElementById('wpRelease');if(lock)lock.innerHTML=released?`<strong>RUS predictions are live.</strong><div class="wp-small">Released at ${wpReleaseLabel(w)}. Visitor picks for this week are now locked.</div>`:`<strong>Blind picks are open.</strong><div class="wp-small">RUS predictions stay hidden and visitor picks remain editable until ${wpReleaseLabel(w)}.</div>`;
  if(wpMode==='rus')body.innerHTML=wpRenderRus(w,released);else if(wpMode==='results')body.innerHTML=wpRenderResults(w,released,picks);else{body.innerHTML=wpRenderMyPicks(w,released,picks);wpBindPickButtons();}
}
function wpRenderShell(){
  const root=document.getElementById('weeklyContent');if(!root||!wpWeeks.length)return;root.className='';root.innerHTML=`<div class="wp-week-controls"><div class="field"><label>Week</label><select id="wpWeek">${wpWeeks.map(w=>`<option value="${w.key}" ${w.key===wpWeekKey?'selected':''}>${wpWeekLabel(w)}</option>`).join('')}</select></div><button class="wp-reset" id="wpReset">Reset My Picks</button></div><div class="wp-mode-tabs"><button class="wp-mode active" data-mode="mypicks">My Picks</button><button class="wp-mode" data-mode="rus">RUS Predictions</button><button class="wp-mode" data-mode="results">Results</button></div><div class="wp-lock" id="wpRelease"></div><div id="wpBody"></div>`;
  document.getElementById('wpWeek').onchange=e=>{wpWeekKey=e.target.value;wpMode='mypicks';document.querySelectorAll('.wp-mode').forEach(b=>b.classList.toggle('active',b.dataset.mode==='mypicks'));wpRenderBody();};
  document.getElementById('wpReset').onclick=wpReset;document.querySelectorAll('.wp-mode').forEach(b=>b.onclick=()=>wpSwitchMode(b.dataset.mode));wpRenderBody();
}
function wpInit(){try{if(typeof weekly==='undefined'||!Array.isArray(weekly)||!weekly.length)return false;wpBuildWeeks();wpRenderShell();return true}catch(e){console.error(e);return false}}
(function wpWait(){let tries=0;const timer=setInterval(()=>{tries++;if(wpInit()||tries>100)clearInterval(timer)},100)})();

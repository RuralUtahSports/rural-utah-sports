const WP_TZ='America/Denver';
const WP_RELEASE_HOUR=16;
let wpWeek=null,wpMode='mypicks';

function wpParseDate(value){
  const s=String(value??'').trim();
  let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m)return{y:+m[3],m:+m[1],d:+m[2]};
  m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m)return{y:+m[1],m:+m[2],d:+m[3]};
  const d=new Date(s);if(!Number.isFinite(d.getTime()))return null;
  return{y:d.getFullYear(),m:d.getMonth()+1,d:d.getDate()};
}
function wpYmdKey(p){return p?p.y*10000+p.m*100+p.d:0}
function wpDateKey(d){return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`}
function wpCurrentFootballWeekKey(p){
  if(!p)return'';
  const d=new Date(Date.UTC(p.y,p.m-1,p.d)),day=d.getUTCDay();
  if(day>=1&&day<=3)d.setUTCDate(d.getUTCDate()+(4-day));
  else d.setUTCDate(d.getUTCDate()-(day===0?3:day-4));
  return wpDateKey(d);
}
function wpGameFootballWeekKey(p){
  if(!p)return'';
  const d=new Date(Date.UTC(p.y,p.m-1,p.d)),day=d.getUTCDay();
  if(day===3)d.setUTCDate(d.getUTCDate()+1);
  else d.setUTCDate(d.getUTCDate()-((day+3)%7));
  return wpDateKey(d);
}
function wpMountainParts(){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:WP_TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()),o={};
  for(const p of parts)o[p.type]=p.value;
  return{y:+o.year,m:+o.month,d:+o.day,h:+o.hour,min:+o.minute};
}
function wpMountainNowKey(){const p=wpMountainParts();return Number(`${p.y}${String(p.m).padStart(2,'0')}${String(p.d).padStart(2,'0')}${String(p.h).padStart(2,'0')}${String(p.min).padStart(2,'0')}`)}
function wpReleaseKey(week){const p=week.firstDate;return Number(`${p.y}${String(p.m).padStart(2,'0')}${String(p.d).padStart(2,'0')}${String(WP_RELEASE_HOUR).padStart(2,'0')}00`)}
function wpReleased(week){return wpMountainNowKey()>=wpReleaseKey(week)}
function wpDateLabel(p){return p?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(p.y,p.m-1,p.d))):''}
function wpWeekLabel(w){const a=wpDateLabel(w.firstDate),b=wpDateLabel(w.lastDate);return a===b?a:`${a} – ${b}`}
function wpReleaseLabel(w){return `${wpDateLabel(w.firstDate)} at 4:00 PM Mountain Time`}
function wpGameKey(g){return `${g.date}|${g.awayTeam}|${g.homeTeam}`}
function wpStorageKey(key){return `rus-weekly-picks-${key}`}
function wpLoadPicks(key){try{const x=JSON.parse(localStorage.getItem(wpStorageKey(key))||'{}');return x&&typeof x==='object'?x:{}}catch{return{}}}
function wpSavePicks(key,picks){try{localStorage.setItem(wpStorageKey(key),JSON.stringify(picks))}catch{}}
function wpActualWinner(g){
  if(String(g.actualWinner??'').trim())return String(g.actualWinner).trim();
  const a=Number(g.actualAway),h=Number(g.actualHome);
  return Number.isFinite(a)&&Number.isFinite(h)&&a!==h?(a>h?g.awayTeam:g.homeTeam):'';
}
function wpBuildCurrentWeek(){
  const today=wpMountainParts(),currentKey=wpCurrentFootballWeekKey(today),games=[];
  let firstDate=null,lastDate=null;
  for(const g of weekly||[]){
    const p=wpParseDate(g.date);if(!p||wpGameFootballWeekKey(p)!==currentKey)continue;
    games.push(g);
    if(!firstDate||wpYmdKey(p)<wpYmdKey(firstDate))firstDate=p;
    if(!lastDate||wpYmdKey(p)>wpYmdKey(lastDate))lastDate=p;
  }
  games.sort((a,b)=>wpYmdKey(wpParseDate(a.date))-wpYmdKey(wpParseDate(b.date))||String(a.awayTeam).localeCompare(String(b.awayTeam)));
  wpWeek=games.length?{key:currentKey,games,firstDate,lastDate}:null;
}
function wpSummary(w,picks){let picked=0,completed=0,correct=0;for(const g of w.games){const p=picks[wpGameKey(g)],actual=wpActualWinner(g);if(p)picked++;if(actual&&p){completed++;if(actual===p)correct++;}}return{picked,completed,correct,accuracy:completed?correct/completed*100:null}}
function wpMini(value,label){return `<div class="mini"><div class="mini-value">${value}</div><div class="mini-label">${label}</div></div>`}
function wpPickCard(g,picks,locked){
  const key=wpGameKey(g),pick=picks[key]||'',actual=wpActualWinner(g);
  let status='';
  if(actual&&pick)status=actual===pick?'<div class="wp-status wp-correct">✓ Correct</div>':'<div class="wp-status wp-wrong">✕ Incorrect</div>';
  else if(actual)status='<div class="wp-status wp-pending">No pick submitted</div>';
  const btn=team=>`<button class="wp-team${pick===team?' selected':''}" ${locked?'disabled':''} data-key="${encodeURIComponent(key)}" data-team="${encodeURIComponent(team)}"><span class="wp-team-name">${esc(team)}</span></button>`;
  return `<div class="wp-game"><div class="wp-game-date">${esc(g.date)}</div><div class="wp-teams">${btn(g.awayTeam)}${btn(g.homeTeam)}</div><div class="wp-scoreline">${actual?(g.actualAway??'—')+'–'+(g.actualHome??'—'):'Pick a winner'}</div>${status}</div>`;
}
function wpBindPickButtons(){document.querySelectorAll('.wp-team[data-key]').forEach(b=>b.onclick=()=>{if(!wpWeek||wpReleased(wpWeek))return;const picks=wpLoadPicks(wpWeek.key);picks[decodeURIComponent(b.dataset.key)]=decodeURIComponent(b.dataset.team);wpSavePicks(wpWeek.key,picks);wpRenderBody()})}
function wpReset(){if(!wpWeek||wpReleased(wpWeek))return;if(!confirm('Clear all of your picks for this week?'))return;try{localStorage.removeItem(wpStorageKey(wpWeek.key))}catch{}wpRenderBody()}
function wpSwitchMode(mode){wpMode=mode;document.querySelectorAll('.wp-mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));wpRenderBody()}
function wpRenderMyPicks(w,released,picks){const s=wpSummary(w,picks);return `<div class="wp-summary">${wpMini(`${s.picked}/${w.games.length}`,'Picks Made')}${wpMini(s.completed,'Graded')}${wpMini(s.correct,'Correct')}${wpMini(s.accuracy===null?'—':s.accuracy.toFixed(1)+'%','Accuracy')}</div><div class="wp-pick-grid">${w.games.map(g=>wpPickCard(g,picks,released)).join('')}</div><p class="wp-note">Only games from the current football week are available to pick. ${released?'This week is locked because the RUS predictions have been released.':'You can change picks until 4:00 PM Mountain Time on the first game date.'}</p>`}
function wpRenderRus(w,released){if(!released)return `<div class="wp-lock"><strong>RUS predictions are locked.</strong><div class="wp-small">They will be revealed ${wpReleaseLabel(w)}. Make your own picks first.</div></div>`;return `<div class="table-wrap wp-rus-table"><table><thead><tr><th>Date</th><th>Away Team</th><th>Projection</th><th>Home Team</th><th>RUS Pick</th></tr></thead><tbody>${w.games.map(g=>`<tr><td>${esc(g.date)}</td><td class="left">${teamPill(g.awayTeam)}</td><td class="weekly-score">${g.awayScore??'—'}-${g.homeScore??'—'}</td><td class="left">${teamPill(g.homeTeam)}</td><td class="accent">${esc(g.winner||'—')}</td></tr>`).join('')}</tbody></table></div>`}
function wpRenderResults(w,released,picks){return `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Away</th><th>Home</th><th>Final</th><th>Winner</th><th>My Pick</th><th>My Result</th><th>RUS Pick</th></tr></thead><tbody>${w.games.map(g=>{const key=wpGameKey(g),pick=picks[key]||'',actual=wpActualWinner(g),mine=!actual||!pick?'—':actual===pick?'✓':'✕',cls=mine==='✓'?'win':mine==='✕'?'loss':'pending',final=actual?`${g.actualAway??'—'}-${g.actualHome??'—'}`:'—';return `<tr><td>${esc(g.date)}</td><td class="left">${teamPill(g.awayTeam)}</td><td class="left">${teamPill(g.homeTeam)}</td><td>${final}</td><td>${esc(actual||'—')}</td><td>${esc(pick||'—')}</td><td><span class="wp-result-badge ${cls}">${mine}</span></td><td>${released?esc(g.winner||'—'):'Locked'}</td></tr>`}).join('')}</tbody></table></div>`}
function wpRenderBody(){if(!wpWeek)return;const body=document.getElementById('wpBody');if(!body)return;const released=wpReleased(wpWeek),picks=wpLoadPicks(wpWeek.key),reset=document.getElementById('wpReset');if(reset)reset.disabled=released;const lock=document.getElementById('wpRelease');if(lock)lock.innerHTML=released?`<strong>RUS predictions are live.</strong><div class="wp-small">Released at ${wpReleaseLabel(wpWeek)}. Visitor picks for this week are now locked.</div>`:`<strong>Blind picks are open.</strong><div class="wp-small">RUS predictions stay hidden and visitor picks remain editable until ${wpReleaseLabel(wpWeek)}.</div>`;if(wpMode==='rus')body.innerHTML=wpRenderRus(wpWeek,released);else if(wpMode==='results')body.innerHTML=wpRenderResults(wpWeek,released,picks);else{body.innerHTML=wpRenderMyPicks(wpWeek,released,picks);wpBindPickButtons()}}
function wpRenderShell(){
  const root=document.getElementById('weeklyContent');if(!root)return;
  root.className='';
  if(!wpWeek){root.innerHTML='<div class="wp-lock"><strong>No current-week games are available yet.</strong><div class="wp-small">The picker will populate automatically when this week\'s schedule is in the Weekly Simulation data.</div></div>';return}
  root.innerHTML=`<div class="wp-week-controls"><div class="field"><label>Current Football Week</label><div class="wp-current-week">${esc(wpWeekLabel(wpWeek))} • ${wpWeek.games.length} game${wpWeek.games.length===1?'':'s'}</div></div><button class="wp-reset" id="wpReset">Reset My Picks</button></div><div class="wp-mode-tabs"><button class="wp-mode active" data-mode="mypicks">My Picks</button><button class="wp-mode" data-mode="rus">RUS Predictions</button><button class="wp-mode" data-mode="results">Results</button></div><div class="wp-lock" id="wpRelease"></div><div id="wpBody"></div>`;
  const current=document.querySelector('.wp-current-week');if(current){current.style.cssText='min-height:42px;display:flex;align-items:center;background:#171717;border:1px solid #444;border-radius:5px;padding:0 12px;color:#fff;font-weight:900'}
  document.getElementById('wpReset').onclick=wpReset;document.querySelectorAll('.wp-mode').forEach(b=>b.onclick=()=>wpSwitchMode(b.dataset.mode));wpRenderBody();
}
function wpInit(){try{if(typeof weekly==='undefined'||!Array.isArray(weekly)||!weekly.length)return false;wpBuildCurrentWeek();wpRenderShell();return true}catch(e){console.error(e);return false}}
(function wpWait(){let tries=0;const timer=setInterval(()=>{tries++;if(wpInit()||tries>100)clearInterval(timer)},100)})();

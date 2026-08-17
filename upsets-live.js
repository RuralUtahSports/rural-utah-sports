(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='upsets.html')return;
const root=document.getElementById('featureRoot');if(!root)return;
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
const num=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
const get=async(name,fallback=null)=>{try{const r=await fetch(`${name}?v=${Date.now()}`,{cache:'no-store'});return r.ok?await r.json():fallback}catch{return fallback}};
const fmtDate=d=>{const n=Date.parse(String(d||''));return Number.isFinite(n)?new Date(n).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):String(d||'')};
function teamPill(name,map){const t=map.get(norm(name)),bg=t?.backgroundColor||'#222',fg=t?.textColor||'#fff';return `<a class="team-pill" style="--bg:${esc(bg)};--fg:${esc(fg)}" href="team.html?team=${encodeURIComponent(t?.team||name)}">${esc(t?.team||name)}</a>`}
function fallbackRows(changes,utah){const rows=[];for(const g of Object.values(changes?.games||{})){const a=num(g.awayScore),b=num(g.homeScore),ae=num(g.away?.eloBefore),he=num(g.home?.eloBefore);if([a,b,ae,he].some(x=>x===null)||a===b)continue;const ak=norm(g.awayTeam),hk=norm(g.homeTeam);if(!utah.has(ak)||!utah.has(hk))continue;const awayWon=a>b,winner=awayWon?ak:hk,loser=awayWon?hk:ak,we=awayWon?ae:he,le=awayWon?he:ae;if(we>=le)continue;rows.push({season:2026,date:g.date,winner,loser,margin:Math.abs(a-b),winnerElo:we,loserElo:le,eloGap:le-we,winnerChance:1/(1+Math.pow(10,(le-we)/400))})}return rows.sort((a,b)=>b.eloGap-a.eloGap)}
async function run(){
 root.innerHTML='<div class="loading">Building upset history…</div>';
 const [history,teams,changes]=await Promise.all([get('upsets-history.json'),get('teams-data.json',[]),get('elo-game-changes-2026.json',{})]);
 const teamMap=new Map((teams||[]).map(t=>[norm(t.team),t])),utah=new Set(teamMap.keys());
 let rows=Array.isArray(history?.rows)?history.rows:fallbackRows(changes,utah);
 // Defense in depth: even the prebuilt file is filtered again in the browser.
 rows=rows.filter(r=>utah.has(norm(r.winner))&&utah.has(norm(r.loser))).sort((a,b)=>Number(b.eloGap)-Number(a.eloGap));
 const seasons=(history?.seasons||[...new Set(rows.map(r=>Number(r.season)).filter(Number.isFinite))]).slice().sort((a,b)=>b-a);
 root.innerHTML=`<div class="feature-note"><strong>Utah vs. Utah only.</strong> Out-of-state games are excluded. Upsets are ranked by the pregame ELO difference: the larger the gap a lower-rated winner overcame, the bigger the upset.</div><div class="toolbar"><div class="field"><label for="upsetSeason">Season</label><select id="upsetSeason"><option value="all">All Time</option>${seasons.map(y=>`<option value="${y}"${y===2026?' selected':''}>${y}</option>`).join('')}</select></div><div class="field"><label for="upsetLimit">Show</label><select id="upsetLimit"><option value="25">Top 25</option><option value="50" selected>Top 50</option><option value="100">Top 100</option></select></div></div><div id="upsetSummary"></div><div id="upsetTable"></div>`;
 const seasonSel=document.getElementById('upsetSeason'),limitSel=document.getElementById('upsetLimit'),summary=document.getElementById('upsetSummary'),out=document.getElementById('upsetTable');
 const render=()=>{const season=seasonSel.value,limit=Number(limitSel.value)||50,filtered=rows.filter(r=>season==='all'||String(r.season)===season),shown=filtered.slice(0,limit);summary.innerHTML=`<h2 class="section-title">${season==='all'?'All-Time':'Season '+season} Upsets</h2><p class="muted" style="margin:-8px 0 14px">${filtered.length.toLocaleString()} Utah-vs-Utah ELO upset${filtered.length===1?'':'s'} found${filtered.length>limit?` • showing top ${limit}`:''}.</p>`;out.innerHTML=shown.length?`<div class="table-wrap"><table><thead><tr><th>#</th><th>Date</th><th class="left">Upset Winner</th><th class="left">Favorite</th><th>Won By</th><th>Pregame ELO Gap</th><th>Winner Chance</th></tr></thead><tbody>${shown.map((r,i)=>`<tr><td class="rank">${i+1}</td><td>${esc(fmtDate(r.date))}</td><td class="left">${teamPill(r.winner,teamMap)}</td><td class="left">${teamPill(r.loser,teamMap)}</td><td>${Number(r.margin)||0}</td><td><strong>${Math.round(Number(r.eloGap)||0)}</strong></td><td>${((Number(r.winnerChance)||0)*100).toFixed(1)}%</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No Utah-vs-Utah ELO upsets are available for this season yet.</div>'};
 seasonSel.onchange=render;limitSel.onchange=render;render();
}
run().catch(e=>{console.error(e);root.innerHTML='<div class="empty">Upset data could not be loaded. Try refreshing in a moment.</div>'});
})();
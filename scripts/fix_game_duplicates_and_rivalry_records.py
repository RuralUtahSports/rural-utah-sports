#!/usr/bin/env python3
from pathlib import Path

# Games: normalize known aliases and remove exact duplicate game rows.
p=Path('games.html')
s=p.read_text(encoding='utf-8')
old="function flattenScorigami(data){const out=[];for(const entry of (data.scores||[])){for(const g of (Array.isArray(entry.games)?entry.games:[])){if(g.tie){const s1=Number(g.score1),s2=Number(g.score2);out.push({date:g.date||'',team1:g.team1||'',team2:g.team2||'',score1:s1,score2:s2,tie:true,total:s1+s2,margin:Math.abs(s1-s2),year:yearOf(g.date)})}else{const s1=Number(g.winnerScore),s2=Number(g.loserScore);out.push({date:g.date||'',team1:g.winner||'',team2:g.loser||'',score1:s1,score2:s2,tie:false,total:s1+s2,margin:s1-s2,year:yearOf(g.date)})}}}return out}"
new="""const TEAM_ALIASES={'WASATCH ACAD':'WASATCH ACADEMY'};
function canonicalTeam(v){const name=String(v??'').trim();return TEAM_ALIASES[norm(name)]||name}
function gameDedupKey(date,a,sa,b,sb){const pairs=[[keyName(a),Number(sa)],[keyName(b),Number(sb)]].sort((x,y)=>x[0].localeCompare(y[0]));return `${String(date||'').trim()}|${pairs[0][0]}:${pairs[0][1]}|${pairs[1][0]}:${pairs[1][1]}`}
function flattenScorigami(data){const out=[],seen=new Set();for(const entry of (data.scores||[])){for(const g of (Array.isArray(entry.games)?entry.games:[])){if(g.tie){const s1=Number(g.score1),s2=Number(g.score2),team1=canonicalTeam(g.team1),team2=canonicalTeam(g.team2),key=gameDedupKey(g.date,team1,s1,team2,s2);if(seen.has(key))continue;seen.add(key);out.push({date:g.date||'',team1,team2,score1:s1,score2:s2,tie:true,total:s1+s2,margin:Math.abs(s1-s2),year:yearOf(g.date)})}else{const s1=Number(g.winnerScore),s2=Number(g.loserScore),team1=canonicalTeam(g.winner),team2=canonicalTeam(g.loser),key=gameDedupKey(g.date,team1,s1,team2,s2);if(seen.has(key))continue;seen.add(key);out.push({date:g.date||'',team1,team2,score1:s1,score2:s2,tie:false,total:s1+s2,margin:s1-s2,year:yearOf(g.date)})}}}return out}"""
if old not in s:
    raise RuntimeError('games flattenScorigami marker not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# Records: add a dedicated most-lopsided-rivalries leaderboard.
p=Path('records.html')
s=p.read_text(encoding='utf-8')
section='''\n<section class="record-card" id="rivalryRecords" style="margin-top:20px"><div class="record-header"><div><h3>Most Lopsided Rivalries</h3></div><p>Series with at least 10 meetings, ranked by the largest difference in wins after exact duplicate game rows are removed.</p></div><div id="rivalryLeaderboard" class="loading">Loading rivalry records...</div></section>\n'''
marker='<section class="stat-directory">'
if 'id="rivalryRecords"' not in s:
    if marker not in s:
        raise RuntimeError('records directory marker not found')
    s=s.replace(marker,section+marker,1)

fn='''\nfunction renderRivalryRecords(data){
  const holder=document.getElementById('rivalryLeaderboard');
  if(!holder)return;
  const rows=(data?.mostLopsidedBySeriesGap||[]).slice(0,10);
  holder.className='';
  if(!rows.length){holder.innerHTML='<div class="loading">No rivalry records are available.</div>';return}
  holder.innerHTML=`<table class="leaderboard"><thead><tr><th>Rank</th><th>Rivalry</th><th>Series</th><th>Meetings</th><th>Win Gap</th><th style="text-align:right">Dominance</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${i<3?'top-'+(i+1):''}"><td class="rank">${i+1}</td><td class="team-cell">${teamBadge(r.leader)} <span style="color:#777;font-weight:900">vs</span> ${teamBadge(r.trailer)}</td><td><strong>${escapeHTML(r.recordForLeader||'—')}</strong><div class="detail">${escapeHTML(r.leader)} leads</div></td><td>${Number(r.meetings||0).toLocaleString()}</td><td class="value" style="text-align:center">${Number(r.seriesGap||0)}</td><td class="value">${Number.isFinite(Number(r.leaderWinPctAllMeetings))?(Number(r.leaderWinPctAllMeetings)*100).toFixed(1)+'%':'—'}</td></tr>`).join('')}</tbody></table>`;
}
async function loadRivalries(){
  const holder=document.getElementById('rivalryLeaderboard');
  try{const r=await fetch('rivalry-dominance.json?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('Rivalry data unavailable');renderRivalryRecords(await r.json())}catch(e){console.error(e);if(holder){holder.className='error';holder.textContent='Unable to load rivalry records.'}}
}
'''
if 'function renderRivalryRecords' not in s:
    marker='function seasonRows(stat,cls){'
    if marker not in s:
        raise RuntimeError('records function marker not found')
    s=s.replace(marker,fn+'\n'+marker,1)

old_load="""    for(const t of teams)teamByName.set(normalize(t.team),t);
    buildClassFilter();
    buildStatSelect('currentElo');
    render();"""
new_load="""    for(const t of teams)teamByName.set(normalize(t.team),t);
    buildClassFilter();
    buildStatSelect('currentElo');
    render();
    await loadRivalries();"""
if old_load not in s:
    raise RuntimeError('records load marker not found')
s=s.replace(old_load,new_load,1)
p.write_text(s,encoding='utf-8')

print('Patched games.html and records.html')

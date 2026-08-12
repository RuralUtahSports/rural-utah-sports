#!/usr/bin/env python3
from pathlib import Path
import re

# Records
p=Path('records.html'); s=p.read_text(encoding='utf-8')
s=s.replace("let eloSummary={};\nlet mode='alltime';","let eloSummary={};\nlet streakRecords={};\nlet mode='alltime';")
marker="{key:'regionTitles',label:'Most Region Titles',recordField:'regionTitles',format:'int',note:'Most region championships recorded in the Record Book.'},"
streaks="{key:'winStreak',label:'Longest Winning Streak',streakField:'longestWinStreak',format:'int',note:'Longest run of consecutive wins in the historical schedule database. Ties break a winning streak.'},\n{key:'lossStreak',label:'Longest Losing Streak',streakField:'longestLossStreak',format:'int',note:'Longest run of consecutive losses in the historical schedule database. Ties break a losing streak.'},\n"
if 'Longest Winning Streak' not in s:
    if marker not in s: raise RuntimeError('records stat marker missing')
    s=s.replace(marker,streaks+marker,1)
old="""    }else{
      value=stat.recordField?number(rec?.[stat.recordField]):number(t[stat.field]);
    }"""
new="""    }else if(stat.streakField){
      const streak=streakRecords[clean(t.team)]?.[stat.streakField];
      value=number(streak?.length);
      if(streak&&value!==null){
        const dates=[streak.startDate,streak.endDate].filter(Boolean).join(' → ');
        const opponents=[streak.startOpponent,streak.endOpponent].filter(Boolean).join(' → ');
        detail=[dates,opponents].filter(Boolean).join(' • ');
      }
    }else{
      value=stat.recordField?number(rec?.[stat.recordField]):number(t[stat.field]);
    }"""
if 'else if(stat.streakField)' not in s:
    if old not in s: raise RuntimeError('records row marker missing')
    s=s.replace(old,new,1)
old="""    const [teamRes,seasonRes,recordRes,eloRes]=await Promise.all([
      fetch('teams-data.json?v='+stamp,{cache:'no-store'}),
      fetch('greatest-seasons-data-v2.json?v='+stamp,{cache:'no-store'}),
      fetch('team-records.json?v='+stamp,{cache:'no-store'}),
      fetch('elo-summary.json?v='+stamp,{cache:'no-store'})
    ]);"""
new="""    const [teamRes,seasonRes,recordRes,eloRes,streakRes]=await Promise.all([
      fetch('teams-data.json?v='+stamp,{cache:'no-store'}),
      fetch('greatest-seasons-data-v2.json?v='+stamp,{cache:'no-store'}),
      fetch('team-records.json?v='+stamp,{cache:'no-store'}),
      fetch('elo-summary.json?v='+stamp,{cache:'no-store'}),
      fetch('streak-records.json?v='+stamp,{cache:'no-store'})
    ]);"""
if 'streakRes]=await Promise.all' not in s:
    if old not in s: raise RuntimeError('records load marker missing')
    s=s.replace(old,new,1)
if 'streakRecords=await streakRes.json()' not in s:
    s=s.replace("if(eloRes.ok)eloSummary=await eloRes.json();","if(eloRes.ok)eloSummary=await eloRes.json();\n    if(streakRes.ok)streakRecords=await streakRes.json();",1)
p.write_text(s,encoding='utf-8')

# Team page enhancement assets
p=Path('team.html'); s=p.read_text(encoding='utf-8')
if 'team-enhancements.css' not in s:
    s=s.replace('</head>','<link rel="stylesheet" href="team-enhancements.css">\n<script src="team-enhancements.js"></script>\n</head>',1)
p.write_text(s,encoding='utf-8')

# Game database deep links
p=Path('games.html'); s=p.read_text(encoding='utf-8')
old="if(params.get('q'))$('search').value=params.get('q');else if(params.get('team'))$('search').value=params.get('team');filter()"
new="if(params.get('search'))$('search').value=params.get('search');else if(params.get('q'))$('search').value=params.get('q');else if(params.get('team'))$('search').value=params.get('team');filter()"
if "params.get('search')" not in s:
    if old not in s: raise RuntimeError('games query marker missing')
    s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# Team directory comparison CTA
p=Path('teams.html'); s=p.read_text(encoding='utf-8')
if '.compare-link{' not in s:
    s=s.replace('</style>','.compare-link{display:inline-block;background:#F14D07;color:#000;text-decoration:none;border-radius:5px;padding:10px 15px;font-size:11px;font-weight:900;text-transform:uppercase;margin:0 0 18px}.compare-link:hover{background:#fff}\n</style>',1)
if 'Compare Any Two Teams' not in s:
    m=re.search(r'(<p class="subtitle">.*?</p>)',s,re.S)
    if not m: raise RuntimeError('teams subtitle missing')
    s=s[:m.end()]+'<a class="compare-link" href="compare.html">Compare Any Two Teams</a>'+s[m.end():]
p.write_text(s,encoding='utf-8')

# Homepage comparison card
p=Path('index.html'); s=p.read_text(encoding='utf-8')
if '<h3>Team Comparison</h3>' not in s:
    marker='<div class="card"><h3>Football Simulators</h3>'
    card='<div class="card"><h3>Team Comparison</h3><p>Compare any two Utah football programs by all-time record, championships, ELO, playoff success, greatest seasons, and head-to-head history.</p><a href="compare.html">Compare Teams</a></div>'
    if marker not in s: raise RuntimeError('homepage simulator marker missing')
    s=s.replace(marker,card+marker,1)
p.write_text(s,encoding='utf-8')

# Rankings historical archive selector
p=Path('rankings.html'); s=p.read_text(encoding='utf-8')
if '.archive-controls{' not in s:
    s=s.replace('.note{','.archive-controls{background:#000;border:1px solid #333;border-top:4px solid #F14D07;border-radius:7px;padding:16px;margin-bottom:20px;display:flex;align-items:end;gap:12px;flex-wrap:wrap}.archive-field{display:flex;flex-direction:column;gap:6px}.archive-field label{color:#888;font-size:10px;font-weight:900;text-transform:uppercase}.archive-field select{height:42px;min-width:210px;background:#1c1c1c;color:#fff;border:1px solid #444;border-radius:5px;padding:0 10px;font-weight:800}.archive-help{color:#777;font-size:11px;padding-bottom:10px}\n.note{',1)
s=s.replace('<p class="subtitle">Rural Utah Sports preseason rankings by classification. These rankings are the baseline for the 2026 in-season power ranking system.</p>','<p class="subtitle" id="rankingSubtitle">Rural Utah Sports preseason rankings by classification. These rankings are the baseline for the 2026 in-season power ranking system.</p>',1)
oldmeta='<div class="meta"><div class="badge"><strong>2026</strong> Preseason</div><div class="badge">6A–8-Player</div><div class="badge">RUS Baseline Rankings</div></div>'
newmeta='<div class="meta" id="rankingMeta"><div class="badge"><strong>2026</strong> Preseason</div><div class="badge">6A–8-Player</div><div class="badge">RUS Rankings Archive</div></div><section class="archive-controls"><div class="archive-field"><label for="rankingSnapshot">Ranking Week</label><select id="rankingSnapshot"></select></div><div class="archive-help">Every published ranking snapshot is preserved here for later viewing.</div></section>'
if 'id="rankingSnapshot"' not in s:
    if oldmeta not in s: raise RuntimeError('rankings meta marker missing')
    s=s.replace(oldmeta,newmeta,1)
replacement="""let rankingArchive=null,rankingColors={};
function renderSnapshot(key){
  const root=document.getElementById('rankings'),snap=(rankingArchive?.snapshots||[]).find(x=>x.key===key)||rankingArchive?.snapshots?.at(-1);
  if(!snap){root.className='error';root.textContent='No rankings snapshots are available.';return}
  document.getElementById('rankingSubtitle').textContent=`Rural Utah Sports ${snap.label} rankings by classification. Select another published ranking week to view the historical archive.`;
  document.getElementById('rankingMeta').innerHTML=`<div class="badge"><strong>${esc(rankingArchive.season||2026)}</strong> ${esc(snap.label||'Rankings')}</div><div class="badge">${esc(snap.date||'')}</div><div class="badge">RUS Rankings Archive</div>`;
  root.className='rank-grid';root.innerHTML=order.map(cls=>card(cls,snap.classifications?.[cls]||[],rankingColors)).join('');
}
(async()=>{const root=document.getElementById('rankings');try{const stamp=Date.now(),[r,c]=await Promise.all([fetch('rankings-history-2026.json?v='+stamp,{cache:'no-store'}),fetch('team-colors-exact.json?v='+stamp,{cache:'no-store'})]);if(!r.ok||!c.ok)throw new Error('Ranking archive unavailable');rankingArchive=await r.json();const colorRows=await c.json();for(const x of colorRows)rankingColors[x.team]=x;const snaps=rankingArchive.snapshots||[],select=document.getElementById('rankingSnapshot');select.innerHTML=[...snaps].reverse().map(x=>`<option value="${esc(x.key)}">${esc(x.label)}${x.date?' — '+esc(x.date):''}</option>`).join('');const latest=snaps.at(-1);if(latest){select.value=latest.key;renderSnapshot(latest.key)}select.addEventListener('change',()=>renderSnapshot(select.value))}catch(e){console.error(e);root.className='error';root.textContent='Rankings archive could not be loaded.'}})();"""
if 'let rankingArchive=' not in s:
    s,n=re.subn(r'\(async\(\)=>\{.*?\}\)\(\);',replacement,s,count=1,flags=re.S)
    if n!=1: raise RuntimeError('rankings renderer marker missing')
p.write_text(s,encoding='utf-8')

print('Patched history tools')

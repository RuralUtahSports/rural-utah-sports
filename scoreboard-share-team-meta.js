(()=>{
'use strict';
if(!/(?:^|\/)scoreboard\.html$/i.test(location.pathname))return;
if(window.__RUS_SCOREBOARD_SHARE_TEAM_META__)return;
window.__RUS_SCOREBOARD_SHARE_TEAM_META__=true;

function parseClassRank(row){
  const line=row.querySelector('.rus-rank-line')?.textContent?.replace(/\s+/g,' ').trim()||'';
  const m=line.match(/RUS\s+([0-9A-Z-]+)\s+Rank:\s*#(\d+)/i);
  return m?{cls:m[1].toUpperCase(),rank:Number(m[2])}:null;
}
function enrichForShare(){
  const restores=[];
  document.querySelectorAll('#board .team-row').forEach(row=>{
    const name=row.querySelector('.team-name'),meta=row.querySelector('.team-meta');
    if(!name||!meta)return;
    const originalName=name.textContent||'',originalMeta=meta.textContent||'';
    const record=row.querySelector('.rus-team-record')?.textContent?.trim()||'';
    const rank=parseClassRank(row);
    restores.push(()=>{name.textContent=originalName;meta.textContent=originalMeta});
    if(rank)name.textContent=`#${rank.rank} ${originalName}`;
    const parts=[originalMeta.trim(),record].filter(Boolean);
    meta.textContent=parts.join(' • ');
  });
  setTimeout(()=>restores.forEach(fn=>fn()),0);
}

document.addEventListener('click',e=>{
  if(e.target?.closest?.('#shareScoreboardGrid'))enrichForShare();
},true);
})();

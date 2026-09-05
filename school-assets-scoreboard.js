(()=>{
'use strict';
if(!/(?:^|\/)scoreboard\.html$/i.test(location.pathname))return;
if(window.__RUS_SCOREBOARD_SCHOOL_ASSETS__)return;
window.__RUS_SCOREBOARD_SCHOOL_ASSETS__=true;
const A=window.RUSSchoolAssets;if(!A)return;
const norm=A.norm||((v)=>String(v??'').trim().toUpperCase().replace(/\s+/g,' '));
const style=document.createElement('style');
style.textContent=`
.winner .actual b{color:#73d977 !important;font-size:30px !important;font-weight:1000 !important;text-shadow:0 0 10px rgba(115,217,119,.45),0 0 20px rgba(115,217,119,.18) !important}
.winner .actual{color:#9ee7a1 !important}
.rus-team-record{display:inline-block;margin-top:5px;padding:2px 6px;border-radius:999px;background:#202020;border:1px solid #3a3a3a;color:#ddd;font-size:9px;font-weight:1000;line-height:1.15;white-space:nowrap}
.rus-rank-line{margin-top:5px;color:#F14D07;font-size:10px;font-weight:1000;line-height:1.2;white-space:normal}
.rus-rank-line.rus-rank-1{color:#d5ad35}.rus-rank-line.rus-rank-2{color:#d7d9dc}.rus-rank-line.rus-rank-3{color:#cf8754}
.rus-state-rank{color:#d7d7d7}.rus-rank-line.rus-state-top-1 .rus-state-rank{color:#d5ad35}.rus-rank-line.rus-state-top-2 .rus-state-rank{color:#d7d9dc}.rus-rank-line.rus-state-top-3 .rus-state-rank{color:#cf8754}
.rus-elo-line{margin-top:5px;font-size:9px;font-weight:1000;line-height:1.25;color:#bbb;white-space:normal}.rus-elo-line .rus-elo-change{margin-left:4px}.rus-elo-line .rus-elo-up{color:#73d977}.rus-elo-line .rus-elo-down{color:#ff7b7b}.rus-elo-line .rus-elo-even{color:#bbb}
.rus-box-record{display:inline-block;margin-left:7px;padding:2px 6px;border-radius:999px;background:#202020;border:1px solid #3a3a3a;color:#bbb;font-size:8px;font-weight:900;white-space:nowrap;vertical-align:middle}
.final-game .box-table tbody tr:first-child .rus-box-record,.final-game .box-table tbody tr:last-child .rus-box-record{color:#ddd}
.rus-live-mercy{font-size:9px;font-weight:1000;text-transform:uppercase;padding:5px 8px;border-radius:999px;background:#ffd54a;color:#000;white-space:nowrap}
@media(max-width:700px){.winner .actual b{font-size:27px !important}.rus-team-record{font-size:8px;margin-top:4px}.rus-rank-line{font-size:9px;margin-top:4px}.rus-elo-line{font-size:8px;margin-top:4px}.rus-box-record{font-size:7px;margin-left:4px;padding:2px 5px}.rus-live-mercy{font-size:8px}}
`;
document.head.appendChild(style);

const rankingAliases={
  'CEDAR CITY':'CEDAR','GRAND COUNTY':'GRAND','MONUMENT VAL':'MONUMENT VALLEY','UMA LEHI':'UMA-LEHI',
  'UTAH MILITARY ACADEMY - CAMP WILLIAMS':'UMA-LEHI','LAYTON CHRISTIAN ACADEMY':'LAYTON CHRISTIAN'
};
const rankKey=team=>rankingAliases[norm(team)]||norm(team);
const compact=v=>norm(v).replace(/[^A-Z0-9]/g,'');
const isoDate=d=>{
  const s=String(d||'').trim();
  let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m)return`${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
  m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  return m?`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`:'';
};
const detailKey=g=>`${isoDate(g.date)}|${compact(g.awayTeam)}|${compact(g.homeTeam)}`;
const pairKey=(a,b)=>[rankKey(a),rankKey(b)].sort().join('|');
let oosRankMap=new Map();
let rankMap=new Map();
let stateRankMap=new Map();
let recordMap=new Map(),eloPairMap=new Map(),mercyCount=null;
let refreshQueued=false,refreshDelayTimer=null;

function teamFromLink(link){let team='';try{team=new URL(link.href,location.href).searchParams.get('team')||link.textContent||''}catch{team=link.textContent||''}return team}
function applyTeamRecords(){
  if(!recordMap.size)return;
  document.querySelectorAll('.team-row').forEach(row=>{
    const link=row.querySelector('.team-name'),meta=row.querySelector('.team-meta');if(!link||!meta)return;
    const holder=link.parentElement;if(!holder||holder.querySelector('.rus-team-record'))return;
    const rec=recordMap.get(rankKey(teamFromLink(link)));if(!rec)return;
    const badge=document.createElement('div');badge.className='rus-team-record';badge.textContent=rec;badge.title=`Current 2026 record: ${rec}`;holder.insertBefore(badge,meta);
  });
}
function applyScoreboardRanks(){
  document.querySelectorAll('.team-row').forEach(row=>{
    const link=row.querySelector('.team-name'),meta=row.querySelector('.team-meta');if(!link||!meta)return;
    const holder=link.parentElement;if(!holder||holder.querySelector('.rus-rank-line'))return;
    const team=teamFromLink(link),key=rankKey(team),info=rankMap.get(key),stateRank=stateRankMap.get(key);if(!info&&!stateRank)return;
    const rank=document.createElement('div'),classTop=info?.rank<=3?` rus-rank-${info.rank}`:'',stateTop=stateRank<=3?` rus-state-top-${stateRank}`:'';
    rank.className=`rus-rank-line${classTop}${stateTop}`;
    const classPart=info?`RUS ${info.cls} Rank: #${info.rank}`:'',statePart=stateRank?`<span class="rus-state-rank">State: #${stateRank}</span>`:'';
    rank.innerHTML=[classPart,statePart].filter(Boolean).join(' &nbsp;•&nbsp; ');rank.title=[info?`${info.cls} rank: #${info.rank}`:'',stateRank?`State rank: #${stateRank}`:''].filter(Boolean).join(' • ');holder.insertBefore(rank,meta);
  });
}
function applyOosRanks(){
  document.querySelectorAll('#board .team-row').forEach(row=>{
    const link=row.querySelector('.team-name'),meta=row.querySelector('.team-meta');
    if(!link||!meta||row.querySelector('.rus-oos-rank'))return;
    const info=oosRankMap.get(compact(teamFromLink(link)));if(!info)return;
    const parts=[];
    if(Number.isInteger(info.stateRank)&&info.stateRank>0)parts.push(`${info.state} #${info.stateRank}`);
    if(Number.isInteger(info.nationalRank)&&info.nationalRank>0)parts.push(`National #${info.nationalRank}`);
    if(!parts.length)return;
    const line=document.createElement('div');line.className='rus-oos-rank rus-rank-line';
    line.textContent=parts.join(' • ');
    const source=document.createElement('a');source.textContent=`${info.source} • ${info.asOf}`;
    source.style.cssText='display:block;color:#aaa;font-size:9px;margin-top:3px';
    try{const url=new URL(info.sourceUrl);if(url.protocol==='https:'){source.href=url.href;source.target='_blank';source.rel='noopener noreferrer'}}catch{}
    line.appendChild(source);meta.insertAdjacentElement('afterend',line);
  });
}
fetch(`oos-graphic-rankings.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{
  for(const info of data?.rankings||[]){
    if(info.season!==2026)continue;
    for(const name of [info.team,...(info.aliases||[])])oosRankMap.set(compact(name),info);
  }
  queueRefresh(30);
}).catch(()=>{});
function applyFinalEloChanges(){
  if(!eloPairMap.size)return;
  document.querySelectorAll('.game.final-game').forEach(card=>{
    const rows=[...card.querySelectorAll('.team-row')].slice(0,2);if(rows.length!==2)return;
    const links=rows.map(row=>row.querySelector('.team-name'));if(links.some(x=>!x))return;
    const names=links.map(teamFromLink),game=eloPairMap.get(pairKey(names[0],names[1]));if(!game)return;
    rows.forEach((row,i)=>{
      const holder=links[i].parentElement,meta=row.querySelector('.team-meta');if(!holder||!meta||holder.querySelector('.rus-elo-line'))return;
      const key=rankKey(names[i]),info=key===rankKey(game.awayTeam)?game.away:key===rankKey(game.homeTeam)?game.home:null;
      if(!info||!Number.isFinite(Number(info.eloBefore))||!Number.isFinite(Number(info.eloAfter))||!Number.isFinite(Number(info.change)))return;
      const change=Number(info.change),cls=change>0?'rus-elo-up':change<0?'rus-elo-down':'rus-elo-even',line=document.createElement('div');
      line.className='rus-elo-line';line.innerHTML=`ELO ${Number(info.eloBefore)} → ${Number(info.eloAfter)} <span class="rus-elo-change ${cls}">(${change>0?'+':''}${change})</span>`;line.title='Postgame ELO change from this verified final';holder.insertBefore(line,meta.nextSibling);
    });
  });
}
function recordText(row){const w=Number(row?.wins||0),l=Number(row?.losses||0),t=Number(row?.ties||0);return t?`${w}-${l}-${t}`:`${w}-${l}`}
function applyFinalBoxRecords(){
  if(!recordMap.size)return;
  document.querySelectorAll('.game.final-game .box-table tbody tr').forEach(row=>{
    const cell=row.querySelector('td:first-child');if(!cell||cell.querySelector('.rus-box-record'))return;
    const team=[...cell.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(' ').trim()||cell.textContent.trim(),rec=recordMap.get(rankKey(team));if(!rec)return;
    const badge=document.createElement('span');badge.className='rus-box-record';badge.textContent=rec;badge.title=`Current 2026 record: ${rec}`;cell.appendChild(badge);
  });
}
function applyLiveMercyBadges(){
  document.querySelectorAll('.game.live-game').forEach(card=>{
    if(card.querySelector('.mercy-badge,.rus-live-mercy'))return;
    const status=card.querySelector('.status')?.textContent||'';if(!/\bQ4\b|4TH|FOURTH/i.test(status))return;
    const scores=[...card.querySelectorAll('.actual b')].map(x=>Number(x.textContent.trim()));if(scores.length<2||!scores.every(Number.isFinite)||Math.abs(scores[0]-scores[1])<44)return;
    const foot=card.querySelector('.game-foot');if(!foot)return;
    const badge=document.createElement('span');badge.className='rus-live-mercy';badge.textContent='44+ Mercy Rule';badge.title='A 44-point lead was reached in the fourth quarter.';foot.insertBefore(badge,foot.querySelector('.deseret-link'));
  });
}
function applyMercySummary(){
  if(mercyCount===null)return;
  document.querySelectorAll('#summary .summary').forEach(box=>{
    const label=box.querySelector('span');if(!label||!/44\+.*Mercy Rule/i.test(label.textContent))return;
    const value=box.querySelector('strong'),next=String(mercyCount);if(value&&value.textContent!==next)value.textContent=next;
  });
}
function refreshScoreboardExtras(){applyOosRanks();applyTeamRecords();applyScoreboardRanks();applyFinalEloChanges();applyFinalBoxRecords();applyLiveMercyBadges();applyMercySummary()}
function queueRefresh(delay=0){
  if(delay>0){clearTimeout(refreshDelayTimer);refreshDelayTimer=setTimeout(()=>queueRefresh(),delay);return}
  if(refreshQueued)return;refreshQueued=true;
  const run=()=>{refreshQueued=false;refreshScoreboardExtras()};
  if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:220});
  else requestAnimationFrame(run);
}
function watchScoreboard(){
  const root=document.querySelector('main');if(!root)return;
  const observer=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      if(mutation.type==='characterData'||mutation.type==='attributes'||mutation.addedNodes.length||mutation.removedNodes.length){queueRefresh(40);return}
    }
  });
  observer.observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
}

Promise.all([
  fetch(`rankings-history-2026.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():null),
  fetch(`state-top25-history-2026.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():null)
]).then(([classData,stateData])=>{
  const classSnapshots=classData?.snapshots||[],classSnap=classSnapshots.at(-1);
  const stateSnapshots=stateData?.snapshots||[],label=String(classSnap?.label||'').trim();
  const matching=stateSnapshots.find(s=>String(s?.label||'').trim()===label);
  const dated=[...stateSnapshots].sort((a,b)=>Date.parse(a?.date||0)-Date.parse(b?.date||0));
  const stateSnap=matching||dated.at(-1);
  if(!classSnap&&!stateSnap)return;
  const nextClass=new Map(),nextState=new Map();
  for(const [cls,teams] of Object.entries(classSnap?.classifications||{}))(teams||[]).forEach((team,i)=>nextClass.set(rankKey(team),{rank:i+1,cls}));
  (stateSnap?.teams||stateSnap?.rankings||[]).forEach((team,i)=>{
    const name=typeof team==='string'?team:team?.team;if(name)nextState.set(rankKey(name),Number(team?.rank)||i+1);
  });
  rankMap=nextClass;stateRankMap=nextState;queueRefresh(30);
}).catch(()=>{});
fetch(`standings-2026.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{
  const next=new Map();for(const teams of Object.values(data?.byClassification||{}))for(const row of teams||[])if(row?.team)next.set(rankKey(row.team),recordText(row));
  recordMap=next;queueRefresh(30);
}).catch(()=>{});
fetch(`elo-game-changes-2026.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{
  const next=new Map();for(const game of Object.values(data?.games||{})){if(!game?.awayTeam||!game?.homeTeam)continue;const key=pairKey(game.awayTeam,game.homeTeam),prior=next.get(key);if(!prior||String(game.date||'')>String(prior.date||''))next.set(key,game)}
  eloPairMap=next;queueRefresh(30);
}).catch(()=>{});
Promise.all([
  fetch(`weekly-simulation.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():null),
  fetch(`deseret-game-details.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():null)
]).then(([weekly,details])=>{
  if(!weekly)return;let count=0;
  for(const g of weekly.games||[]){
    const d=details?.games?.[detailKey(g)]||null,sheetDone=g.actualAway!==null&&g.actualAway!==undefined&&g.actualHome!==null&&g.actualHome!==undefined,box=d?.boxScore?.rows||[];
    const away=sheetDone?Number(g.actualAway):Number(box[0]?.total),home=sheetDone?Number(g.actualHome):Number(box[1]?.total);
    if(!Number.isFinite(away)||!Number.isFinite(home)||Math.abs(away-home)<44)continue;
    const sourceFinal=sheetDone||!!d?.final,status=String(d?.status||''),q4=!sourceFinal&&(/\bQ4\b|4TH|FOURTH/i.test(status)||/\bQ4\b/i.test(String(d?.clock||''))||/\bQ4\b/i.test(String(d?.period||'')));
    if(sourceFinal||q4)count++;
  }
  mercyCount=count;queueRefresh(30);
}).catch(()=>{});

document.addEventListener('change',e=>{if(e.target?.id==='classFilter'||e.target?.id==='statusFilter')queueRefresh(20)});
document.addEventListener('input',e=>{if(e.target?.id==='search')queueRefresh(20)});
document.addEventListener('click',e=>{if(e.target?.closest('.game-details>summary'))queueRefresh(20)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)queueRefresh()});
window.addEventListener('pageshow',()=>queueRefresh(),{passive:true});
watchScoreboard();queueRefresh(60);
})();

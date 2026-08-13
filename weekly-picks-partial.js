(()=>{
'use strict';
function apply(){
  if(typeof wpeSummary!=='function'||typeof wpeRenderBoard!=='function'||typeof wpCurrentWeek!=='function')return false;
  wpeSummary=function(w,picks,scores,user){
    let picked=0,scorePicks=0,completed=0,correct=0,losses=0,errorGames=0,totalError=0;
    for(const g of w.games){
      const k=wpGameKey(g),s=scores[k]||{},pick=picks[k]||wpePickFromScore(g,s);
      if(pick)picked++;
      if(Number.isFinite(Number(s.away))&&Number.isFinite(Number(s.home)))scorePicks++;
      const actual=wpActualWinner(g);
      if(actual&&pick){completed++;if(actual===pick)correct++;else losses++}
      const e=wpeError(g,s);if(e!==null){errorGames++;totalError+=e}
    }
    return{picked,scorePicks,completed,correct,losses,errorGames,totalError,avgError:errorGames?totalError/errorGames:null,accuracy:completed?correct/completed*100:null,eligible:!!user&&picked>0};
  };
  wpeRusRow=function(w){
    let correct=0,losses=0,errorGames=0,totalError=0;
    for(const g of w.games){
      const actual=wpActualWinner(g);
      if(actual&&g.winner){if(actual===g.winner)correct++;else losses++}
      const e=wpeError(g,{away:g.awayScore,home:g.homeScore});if(e!==null){errorGames++;totalError+=e}
    }
    const completed=correct+losses;
    return{username:'RUS',picked:w.games.length,scorePicks:w.games.length,correct,losses,completed,totalError,avgError:errorGames?totalError/errorGames:null,accuracy:completed?correct/completed*100:null,eligible:true,isRus:true};
  };
  const rank=(a,b)=>(Number(!a.eligible)-Number(!b.eligible))||(b.correct-a.correct)||((b.accuracy??-1)-(a.accuracy??-1))||(b.completed-a.completed)||((a.avgError??Infinity)-(b.avgError??Infinity))||a.username.localeCompare(b.username);
  wpeBoardRows=function(w){const rows=wpeLoadBoard(w.key).map(x=>wpeEntryRow(w,x.entry||{}));if(wpReleased(w))rows.push(wpeRusRow(w));return rows.sort(rank)};
  wpeBoardTable=function(rows,label){
    const w=wpCurrentWeek(),gameCount=w?.games?.length||0;
    return `<div class="table-wrap"><table><thead><tr><th>Rank</th><th>Username</th><th>Picks</th><th>W-L</th><th>Accuracy</th><th>Avg Error</th><th>Status</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td class="accent">${r.eligible?i+1:'—'}</td><td class="left stat-team">${esc(r.username)}</td><td>${r.picked??0}${gameCount?`/${gameCount}`:''}</td><td>${r.completed?`${r.correct}-${r.losses}`:'—'}</td><td>${r.accuracy==null?'—':r.accuracy.toFixed(1)+'%'}</td><td>${r.avgError==null?'—':r.avgError.toFixed(1)}</td><td>${r.isRus?'RUS':r.eligible&&gameCount&&r.picked>=gameCount?'Complete':r.eligible?'Partial':'No Picks'}</td></tr>`).join('')}</tbody></table></div><p class="wp-note">${label} accepts partial entries. Rankings use most correct picks, then accuracy, then number of graded picks, then lower average point error. Score guesses are optional.</p>`;
  };
  wpeRenderBoard=async function(w){
    const body=document.getElementById('wpBody');if(!body)return;
    if(!wpReleased(w)){body.innerHTML='<div class="wp-lock"><strong>Leaderboard opens when picks lock.</strong><div class="wp-small">It opens at 4:00 PM Mountain Time on the first game date.</div></div>';return}
    const e=wpeActive(w);wpeSaveBoard(w,e);body.innerHTML='<div class="loading">Loading leaderboard...</div>';
    if(typeof window.RUS_WEEKLY_PICKS_FETCH==='function'){
      try{const remote=await window.RUS_WEEKLY_PICKS_FETCH(w.key,w.games);if(Array.isArray(remote)){if(!remote.some(x=>x.isRus))remote.push(wpeRusRow(w));remote.sort(rank);body.innerHTML=wpeBoardTable(remote,'Global leaderboard');return}}catch(err){console.error(err)}
    }
    body.innerHTML=wpeBoardTable(wpeBoardRows(w),'This-device leaderboard');
  };
  return true;
}
if(apply())return;let tries=0;const timer=setInterval(()=>{if(apply()||++tries>200)clearInterval(timer)},100);
})();

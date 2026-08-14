(()=>{
  const path=(location.pathname.split('/').pop()||'').toLowerCase();
  if(path!=='team.html')return;

  const finite=v=>Number.isFinite(Number(v));
  const summary=games=>{
    const out={games:0,wins:0,losses:0,ties:0,pf:0,pa:0};
    for(const g of Array.isArray(games)?games:[]){
      out.games++;
      if(g.result==='W')out.wins++;
      else if(g.result==='L')out.losses++;
      else if(g.result==='T')out.ties++;
      out.pf+=Number(g.teamScore||0);
      out.pa+=Number(g.opponentScore||0);
    }
    return out;
  };

  function targetFor(year){
    if(typeof currentHistory==='undefined'||!Array.isArray(currentHistory))return null;
    const row=currentHistory.find(x=>String(x.year)===String(year));
    if(!row)return null;
    const keys=['games','wins','losses','ties','pointsFor','pointsAgainst'];
    if(!keys.every(k=>finite(row[k])))return null;
    return{
      games:Number(row.games),wins:Number(row.wins),losses:Number(row.losses),ties:Number(row.ties),
      pf:Number(row.pointsFor),pa:Number(row.pointsAgainst)
    };
  }

  function same(a,b){
    return a.games===b.games&&a.wins===b.wins&&a.losses===b.losses&&a.ties===b.ties&&a.pf===b.pf&&a.pa===b.pa;
  }

  function removableSubset(games,target){
    const cur=summary(games);
    if(same(cur,target))return [];
    const need={
      games:cur.games-target.games,
      wins:cur.wins-target.wins,
      losses:cur.losses-target.losses,
      ties:cur.ties-target.ties,
      pf:cur.pf-target.pf,
      pa:cur.pa-target.pa
    };
    if(Object.values(need).some(v=>v<0)||need.games<1||need.games>6)return null;

    const chosen=[];
    function dfs(start,left,w,l,t,pf,pa){
      if(left===0)return w===need.wins&&l===need.losses&&t===need.ties&&pf===need.pf&&pa===need.pa;
      if(games.length-start<left)return false;
      for(let i=start;i<=games.length-left;i++){
        const g=games[i],gw=g.result==='W'?1:0,gl=g.result==='L'?1:0,gt=g.result==='T'?1:0,
          gpf=Number(g.teamScore||0),gpa=Number(g.opponentScore||0);
        if(w+gw>need.wins||l+gl>need.losses||t+gt>need.ties||pf+gpf>need.pf||pa+gpa>need.pa)continue;
        chosen.push(i);
        if(dfs(i+1,left-1,w+gw,l+gl,t+gt,pf+gpf,pa+gpa))return true;
        chosen.pop();
      }
      return false;
    }
    return dfs(0,need.games,0,0,0,0,0)?chosen.slice():null;
  }

  function reconcile(){
    if(typeof currentSchedules==='undefined'||typeof currentHistory==='undefined')return false;
    let changed=false;
    for(const [year,list] of Object.entries(currentSchedules||{})){
      const games=Array.isArray(list)?list:[],target=targetFor(year);
      if(!target||same(summary(games),target))continue;
      const remove=removableSubset(games,target);
      if(!remove||!remove.length)continue;
      const drop=new Set(remove);
      const cleaned=games.filter((_,i)=>!drop.has(i));
      if(same(summary(cleaned),target)){
        currentSchedules[year]=cleaned;
        changed=true;
        console.info(`RUS schedule reconciliation: ${year} ${games.length} → ${cleaned.length} games`);
      }
    }
    if(changed&&typeof updateSchedule==='function')updateSchedule();
    return true;
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    try{
      if(reconcile()||attempts>=30)clearInterval(timer);
    }catch(err){
      if(attempts>=30)clearInterval(timer);
    }
  },150);
})();

(()=>{
  const host=document.getElementById('weekReviewGrid');
  if(!host)return;
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const num=v=>v===null||v===undefined||v===''?null:Number(v);
  const valid=v=>Number.isFinite(v);
  const logo=name=>window.RUSSchoolAssets?.logoUrl?RUSSchoolAssets.logoUrl(name):'RUSlogoNew.png';
  const finalGames=games=>games.filter(g=>valid(num(g.actualAway))&&valid(num(g.actualHome)));
  const result=g=>{
    const a=num(g.actualAway),h=num(g.actualHome),pa=num(g.awayScore),ph=num(g.homeScore);
    const winner=a>h?g.awayTeam:h>a?g.homeTeam:'Tie';
    const loser=a>h?g.homeTeam:h>a?g.awayTeam:'Tie';
    return {g,a,h,pa,ph,winner,loser,margin:Math.abs(a-h),total:a+h,predWinner:pa>ph?g.awayTeam:ph>pa?g.homeTeam:'Tie',predMargin:valid(pa)&&valid(ph)?Math.abs(pa-ph):0};
  };
  const card=(label,r,blurb)=>{
    if(!r)return `<div class="review-card empty-review"><span>${esc(label)}</span><strong>Waiting on finals</strong><p>This will fill in automatically as games finish.</p></div>`;
    const g=r.g;
    return `<a class="review-card" href="scoreboard.html"><div class="review-label">${esc(label)}</div><div class="review-matchup"><div><img src="${esc(logo(g.awayTeam))}" alt=""><b>${esc(g.awayTeam)}</b></div><strong>${r.a}–${r.h}</strong><div><img src="${esc(logo(g.homeTeam))}" alt=""><b>${esc(g.homeTeam)}</b></div></div><p>${esc(blurb)}</p></a>`;
  };
  async function load(){
    try{
      const r=await fetch(`weekly-simulation.json?v=${Date.now()}`,{cache:'no-store'}); if(!r.ok)throw new Error();
      const data=await r.json(), rows=finalGames(data.games||[]).map(result).filter(x=>x.winner!=='Tie');
      if(!rows.length){host.innerHTML=card('Top Win',null,'');return}
      const upsets=rows.filter(x=>x.predWinner!=='Tie'&&x.predWinner!==x.winner).sort((a,b)=>b.predMargin-a.predMargin||b.margin-a.margin);
      const upset=upsets[0]||null;
      const topWin=[...rows].sort((a,b)=>{
        const aOpp=a.winner===a.g.awayTeam?a.ph:a.pa,bOpp=b.winner===b.g.awayTeam?b.ph:b.pa;
        return (valid(bOpp)?bOpp:0)-(valid(aOpp)?aOpp:0)||b.margin-a.margin;
      })[0];
      const close=[...rows].sort((a,b)=>a.margin-b.margin||b.total-a.total)[0];
      const blow=[...rows].sort((a,b)=>b.margin-a.margin)[0];
      const high=[...rows].sort((a,b)=>b.total-a.total)[0];
      const correct=rows.filter(x=>x.predWinner===x.winner).sort((a,b)=>{
        const ae=Math.abs((a.pa-a.ph)-(a.a-a.h)),be=Math.abs((b.pa-b.ph)-(b.a-b.h)); return ae-be;
      })[0]||null;
      host.innerHTML=[
        card('Top Win',topWin,`${topWin.winner} picked up one of the strongest wins of the week.`),
        card('Biggest Upset',upset,upset?`${upset.winner} flipped a ${upset.predMargin}-point RUS prediction.`:''),
        card('Closest Game',close,`${close.margin}-point finish.`),
        card('Biggest Blowout',blow,`${blow.margin}-point winning margin.`),
        card('Highest Scoring',high,`${high.total} combined points.`),
        card('RUS Pick of the Week',correct,correct?`RUS correctly picked ${correct.winner}.`:'')
      ].join('');
    }catch{host.innerHTML='<div class="review-card empty-review"><span>Week in Review</span><strong>Updating…</strong><p>Final-game highlights will appear here automatically.</p></div>'}
  }
  load(); setInterval(load,60000);
})();

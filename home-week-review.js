(()=>{
  const host=document.getElementById('weekReviewGrid');
  if(!host)return;

  const style=document.createElement('style');
  style.textContent=`
    .week-review-grid{gap:14px!important}
    .review-card{padding:0!important;overflow:hidden;min-height:190px;display:flex!important;flex-direction:column;background:linear-gradient(180deg,#181818 0%,#121212 100%)!important;border:1px solid #3a3a3a!important;box-shadow:0 8px 20px rgba(0,0,0,.22)}
    .review-card:hover{border-color:#F14D07!important;transform:translateY(-2px)!important;box-shadow:0 12px 28px rgba(0,0,0,.32)}
    .review-label{margin:0!important;padding:13px 16px 10px;color:#F14D07!important;font-size:12px!important;border-bottom:1px solid #292929;letter-spacing:.55px}
    .review-scoreboard{padding:10px 14px 8px;display:flex;flex-direction:column;gap:5px}
    .review-team-row{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;padding:7px 10px;border-radius:7px;min-height:46px;overflow:hidden;border-left:4px solid var(--review-team-color,#444);background:linear-gradient(90deg,var(--review-team-wash,rgba(255,255,255,.025)) 0%,rgba(255,255,255,.018) 55%,rgba(255,255,255,.01) 100%)}
    .review-team-row.winner{box-shadow:inset 0 0 0 1px var(--review-team-border,rgba(255,255,255,.08));background:linear-gradient(90deg,var(--review-team-wash-strong,rgba(255,255,255,.085)) 0%,rgba(255,255,255,.045) 62%,rgba(255,255,255,.02) 100%)}
    .review-team-main{display:flex;align-items:center;gap:9px;min-width:0}
    .review-team-main img{width:34px!important;height:34px!important;object-fit:contain;flex:0 0 34px}
    .review-team-name{font-size:12px;font-weight:900;line-height:1.15;white-space:normal;overflow-wrap:anywhere;color:#f2f2f2}
    .review-team-score{font-size:27px;font-weight:1000;line-height:1;color:#d6d6d6;min-width:34px;text-align:right;font-variant-numeric:tabular-nums}
    .review-team-row.winner .review-team-score{color:#fff;text-shadow:0 0 12px var(--review-team-glow,rgba(255,255,255,.15))}
    .review-team-row.winner .review-team-name{color:#fff}
    .review-final{font-size:8px;font-weight:900;letter-spacing:.8px;text-transform:uppercase;color:#777;text-align:center;margin:0 14px;padding:5px 0;border-top:1px solid #242424;border-bottom:1px solid #242424}
    .review-card p{margin:0!important;padding:10px 16px 14px;color:#999!important;font-size:11px!important;line-height:1.45;min-height:49px;margin-top:auto!important}
    .review-card-main{display:flex;flex:1;flex-direction:column;color:inherit;text-decoration:none;min-height:0}
    .review-share-button{margin:0 14px 14px;min-height:36px;border:1px solid #F14D07;border-radius:7px;background:#1a1a1a;color:#fff;font-size:9px;font-weight:1000;text-transform:uppercase;cursor:pointer}
    .review-share-button:hover{background:#F14D07;color:#000}
    .empty-review{padding:16px!important}
    .empty-review strong{font-size:15px}
    @media(max-width:600px){.review-card{min-height:auto}.review-team-score{font-size:25px}.review-team-main img{width:32px!important;height:32px!important;flex-basis:32px}.review-team-name{font-size:12px}}
  `;
  document.head.appendChild(style);

  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#039;');
  const num=v=>v===null||v===undefined||v===''?null:Number(v);
  const valid=v=>Number.isFinite(v);
  const norm=v=>String(v??'').trim().toUpperCase().replace(/[.'’]/g,'').replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
  const aliases={'CEDAR':'CEDAR CITY','MONUMENT VALLEY':'MONUMENT VAL','UMA CAMP WILLIAMS':'UMA LEHI','UTAH MILITARY ACADEMY CAMP WILLIAMS':'UMA LEHI','ST JOSEPH':'SAINT JOSEPH','AMERICAN LEADERSHIP':'ALA','WASATCH ACADEMY':'WASATCH ACAD'};
  const key=v=>aliases[norm(v)]||norm(v);
  const compact=v=>String(v??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  const isoDate=d=>{
    const s=String(d||'').trim();
    let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(m)return`${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
    m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    return m?`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`:'';
  };
  const dateMs=d=>{
    const iso=isoDate(d);
    if(!iso)return 0;
    const [y,m,day]=iso.split('-').map(Number);
    return new Date(y,m-1,day).getTime();
  };
  const thursdayStart=ts=>{
    const d=new Date(ts);
    d.setHours(0,0,0,0);
    const back=(d.getDay()+3)%7;
    d.setDate(d.getDate()-back);
    return d.getTime();
  };
  const currentWeekGames=games=>{
    const start=thursdayStart(Date.now());
    const end=start+(7*24*60*60*1000);
    return games.filter(g=>{
      const t=dateMs(g?.date);
      return t>=start&&t<end;
    });
  };
  const detailKey=g=>`${isoDate(g.date)}|${compact(g.awayTeam)}|${compact(g.homeTeam)}`;
  const safeHex=(v,f='#444444')=>/^#[0-9A-F]{3}(?:[0-9A-F]{3})?$/i.test(String(v||''))?String(v):f;
  const hexRgb=hex=>{let h=String(hex||'').replace('#','');if(h.length===3)h=h.split('').map(x=>x+x).join('');const n=parseInt(h,16);return Number.isFinite(n)?`${(n>>16)&255},${(n>>8)&255},${n&255}`:'68,68,68'};
  const logo=name=>window.RUSSchoolAssets?.logoUrl?RUSSchoolAssets.logoUrl(name):'RUSlogoNew.png';
  let teamColors=new Map(),detailGames={},eloGames={};
  const finalGames=games=>games.filter(g=>valid(num(g.actualAway))&&valid(num(g.actualHome)));
  const finalLabel=g=>{
    const d=detailGames?.[detailKey(g)]||null;
    const text=[d?.status,d?.period,d?.clock].filter(Boolean).join(' ');
    const multi=text.match(/\b(\d+)\s*OT\b/i);
    if(multi)return`Final - ${multi[1]}OT`;
    if(/\bOT\b/i.test(text))return'Final - OT';
    return'Final';
  };
  const result=g=>{
    const a=num(g.actualAway),h=num(g.actualHome),pa=num(g.awayScore),ph=num(g.homeScore);
    const winner=a>h?g.awayTeam:h>a?g.homeTeam:'Tie';
    const loser=a>h?g.homeTeam:h>a?g.awayTeam:'Tie';
    return {g,a,h,pa,ph,winner,loser,margin:Math.abs(a-h),total:a+h,predWinner:pa>ph?g.awayTeam:ph>pa?g.homeTeam:'Tie',predMargin:valid(pa)&&valid(ph)?Math.abs(pa-ph):0,finalLabel:finalLabel(g)};
  };
  const colorFor=name=>teamColors.get(key(name))||teamColors.get(norm(name))||null;
  const teamRow=(name,score,isWinner)=>{
    const t=colorFor(name),bg=safeHex(t?.backgroundColor),rgb=hexRgb(bg);
    const vars=`--review-team-color:${bg};--review-team-wash:rgba(${rgb},.12);--review-team-wash-strong:rgba(${rgb},.23);--review-team-border:rgba(${rgb},.42);--review-team-glow:rgba(${rgb},.42)`;
    return `<div class="review-team-row ${isWinner?'winner':''}" style="${vars}"><div class="review-team-main"><img src="${esc(logo(name))}" alt=""><span class="review-team-name">${esc(name)}</span></div><strong class="review-team-score">${score}</strong></div>`;
  };
  const card=(label,r,blurb)=>{
    if(!r)return `<div class="review-card empty-review"><span>${esc(label)}</span><strong>Waiting on finals</strong><p>This will fill in automatically as games finish.</p></div>`;
    const g=r.g;
    return `<article class="review-card" data-review-card><a class="review-card-main" href="scoreboard.html"><div class="review-label">${esc(label)}</div><div class="review-scoreboard">${teamRow(g.awayTeam,r.a,r.winner===g.awayTeam)}${teamRow(g.homeTeam,r.h,r.winner===g.homeTeam)}</div><div class="review-final">${esc(r.finalLabel||'Final')}</div><p>${esc(blurb)}</p></a><button type="button" class="review-share-button">Share Graphic</button></article>`;
  };
  function weeklyEloExtremes(rows){
    const rowMap=new Map(rows.map(r=>[detailKey(r.g),r]));
    let gain=null,loss=null;
    for(const game of Object.values(eloGames||{})){
      const r=rowMap.get(detailKey(game));
      if(!r)continue;
      if(!colorFor(game.awayTeam)||!colorFor(game.homeTeam))continue;
      const awayChange=Number(game?.away?.change),homeChange=Number(game?.home?.change);
      if(Number.isFinite(awayChange)&&(!gain||awayChange>gain.change))gain={change:awayChange,team:game.awayTeam,r};
      if(Number.isFinite(homeChange)&&(!gain||homeChange>gain.change))gain={change:homeChange,team:game.homeTeam,r};
      if(Number.isFinite(awayChange)&&(!loss||awayChange<loss.change))loss={change:awayChange,team:game.awayTeam,r};
      if(Number.isFinite(homeChange)&&(!loss||homeChange<loss.change))loss={change:homeChange,team:game.homeTeam,r};
    }
    return{gain,loss};
  }
  async function load(){
    try{
      const stamp=Date.now();
      const [r,tr,dr,er]=await Promise.all([
        fetch(`weekly-simulation.json?v=${stamp}`,{cache:'no-store'}),
        fetch(`teams-data.json?v=${stamp}`,{cache:'no-store'}).catch(()=>null),
        fetch(`deseret-game-details.json?v=${stamp}`,{cache:'no-store'}).catch(()=>null),
        fetch(`elo-game-changes-2026.json?v=${stamp}`,{cache:'no-store'}).catch(()=>null)
      ]);
      if(!r.ok)throw new Error();
      if(tr?.ok){
        teamColors=new Map();
        for(const t of await tr.json())if(t?.team){teamColors.set(key(t.team),t);teamColors.set(norm(t.team),t)}
      }
      if(dr?.ok){const details=await dr.json();detailGames=details?.games||{}}else detailGames={};
      if(er?.ok){const e=await er.json();eloGames=e?.games||{}}else eloGames={};
      const data=await r.json(), weekGames=currentWeekGames(data.games||[]), rows=finalGames(weekGames).map(result).filter(x=>x.winner!=='Tie');
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
      const {gain,loss}=weeklyEloExtremes(rows);
      host.innerHTML=[
        card('Top Win',topWin,`${topWin.winner} picked up one of the strongest wins of the week.`),
        card('Biggest Upset',upset,upset?`${upset.winner} flipped a ${upset.predMargin}-point RUS prediction.`:''),
        card('Closest Game',close,`${close.margin}-point finish.`),
        card('Biggest Blowout',blow,`${blow.margin}-point winning margin.`),
        card('Highest Scoring',high,`${high.total} combined points.`),
        card('RUS Pick of the Week',correct,correct?`RUS correctly picked ${correct.winner}.`:''),
        card('Largest ELO Gain',gain?.r,gain?`${gain.team} gained +${gain.change} ELO from this game.`:''),
        card('Largest ELO Loss',loss?.r,loss?`${loss.team} lost ${Math.abs(loss.change)} ELO from this game.`:'')
      ].join('');
    }catch{host.innerHTML='<div class="review-card empty-review"><span>Week in Review</span><strong>Updating…</strong><p>Final-game highlights will appear here automatically.</p></div>'}
  }
  load(); setInterval(load,300000);
})();

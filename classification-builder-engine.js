(() => {
  'use strict';
  const clean = v => String(v ?? '').trim();
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const formPoints = v => clean(v).split('-').reduce((s,r)=>s+(r==='W'?1:r==='T'?.5:0),0);
  const pairKey = (a,b) => [a,b].sort((x,y)=>x.localeCompare(y)).join('|||');
  const classLevel = v => ({'6A':6,'5A':5,'4A':4,'3A':3,'2A':2,'1A':1,'8P':0,'8-PLAYER':0})[clean(v).toUpperCase()] ?? null;
  function context(t1,t2){
    const sim=window.simulator||{pairs:{}},p=sim.pairs?.[pairKey(t1,t2)];
    if(!p)return{h1:0,h2:0,ties:0,commonDiff:0,commonRows:[]};
    const forward=t1===p.a,h=p.h2h||{},c=p.common||{};
    return{h1:forward?Number(h.aWins||0):Number(h.bWins||0),h2:forward?Number(h.bWins||0):Number(h.aWins||0),ties:Number(h.ties||0),commonDiff:forward?Number(c.difference||0):-Number(c.difference||0),commonRows:c.rows||[]};
  }
  window.calculate = function(t1,t2){
    const sim=window.simulator||{teams:{}},a=sim.teams?.[t1],b=sim.teams?.[t2];
    if(!a||!b)return null;
    const ctx=context(t1,t2),pd1=Number(a.avgDiff||0),pd2=Number(b.avgDiff||0),pdTotal=Math.abs(pd1)+Math.abs(pd2);
    let pdScore1=pdTotal?50+50*(pd1-pd2)/pdTotal:50;
    const sos1=Number(a.sos||0),sos2=Number(b.sos||0),sosTotal=Math.abs(sos1)+Math.abs(sos2);
    let sosScore1=sosTotal?50+50*(sos1-sos2)/sosTotal:50;
    const winScore1=Number(a.winPct||0)*100,winScore2=Number(b.winPct||0)*100;
    const fp1=formPoints(a.recentForm),fp2=formPoints(b.recentForm),formScore1=(fp1+fp2)?fp1/(fp1+fp2)*100:50;
    const commonScore1=ctx.commonRows.length&&ctx.commonDiff!==0?(ctx.commonDiff>0?100:0):50;
    const hTotal=ctx.h1+ctx.h2+ctx.ties,h2hScore1=hTotal?(ctx.h1+ctx.ties*.5)/hTotal*100:50;
    const elo1=Number(a.elo)||1500,elo2=Number(b.elo)||1500,eloScore1=(1/(1+Math.pow(10,-(elo1-elo2)/400)))*100;
    const model1=eloScore1*.35+pdScore1*.20+sosScore1*.15+winScore1*.10+formScore1*.10+commonScore1*.05+h2hScore1*.05;
    const model2=(100-eloScore1)*.35+(100-pdScore1)*.20+(100-sosScore1)*.15+winScore2*.10+(100-formScore1)*.10+(100-commonScore1)*.05+(100-h2hScore1)*.05;
    const prob1=(model1+model2)?model1/(model1+model2)*100:50;
    let p1=(Number(a.avgPF||0)+Number(b.avgPA||0))/2,p2=(Number(b.avgPF||0)+Number(a.avgPA||0))/2;
    const recentGap=clamp(Number(a.recent10Diff||0)-Number(b.recent10Diff||0),-60,60),recentAdj=recentGap*.5;
    p1+=recentAdj/2;p2-=recentAdj/2;
    const eloAdj=clamp(eloScore1-(100-eloScore1),-100,100)*.25;p1+=eloAdj/2;p2-=eloAdj/2;
    const modelAdj=(prob1-(100-prob1))*.10;p1+=modelAdj;p2-=modelAdj;
    const l1=classLevel(a.classification),l2=classLevel(b.classification),classAdj=(l1==null||l2==null)?0:clamp((l1-l2)*8,-48,48);
    p1+=classAdj/2;p2-=classAdj/2;
    p1=Math.max(0,Math.round(p1));p2=Math.max(0,Math.round(p2));
    if(p1===1)p1=3;if(p2===1)p2=3;
    if(prob1>=50&&p1<=p2)p1=p2+3;if(prob1<50&&p2<=p1)p2=p1+3;
    return{a,b,ctx,prob1,prob2:100-prob1,p1,p2,winner:prob1>=50?t1:t2};
  };
})();

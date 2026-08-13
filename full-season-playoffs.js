(()=>{
  const F=window.RUSFullSeason=window.RUSFullSeason||{};
  const clamp=n=>Math.max(.03,Math.min(.97,n));
  const roundLabels=size=>size>=32?['First Round','Second Round','Quarterfinals','Semifinals','Championship']:size>=16?['First Round','Quarterfinals','Semifinals','Championship']:size>=8?['Quarterfinals','Semifinals','Championship']:['Semifinals','Championship'];
  const bracketSize=n=>{let s=2;while(s<n)s*=2;return s};
  const seedOrder=size=>{let order=[1,2];while(order.length<size){const sum=order.length*2+1;order=order.flatMap(s=>[s,sum-s])}return order};
  const marginChange=(ea,eb,aWon,aScore,bScore)=>{
    const ex=1/(1+Math.pow(10,(eb-ea)/400));
    const margin=Math.max(1,Math.min(40,Math.abs(aScore-bScore)));
    const ratio=Math.log(margin)/Math.log(40),mult=Math.min(1.35,1+.35*Math.pow(ratio,1.5));
    const raw=32*mult*((aWon?1:0)-ex);
    return Math.sign(raw)*Math.round(Math.abs(raw));
  };

  F.simulatePlayoffs=(R,seed=1)=>{
    if(!R?.rpi)return R;
    const S=window.RUSSeasonSim,playoffs=new Map();
    let serial=0;

    const play=(a,b,elos)=>{
      serial++;
      if(!a&&!b)return{a:null,b:null,bye:true,winner:null};
      if(!a||!b){
        const winner=a||b;
        return{a:a||null,b:b||null,bye:true,winner,scoreA:null,scoreB:null,probA:null};
      }

      const ea=Number(elos.get(a.team))||F.initialElo(a.team),eb=Number(elos.get(b.team))||F.initialElo(b.team);
      const ia=F.info(a.team),ib=F.info(b.team),ra=F.resolve(a.team),rb=F.resolve(b.team);
      let prob,p1,p2;
      if(ia&&ib&&typeof window.calculate==='function'){
        const model=calculate(ra,rb),base=clamp((Number(model?.prob1)||50)/100),oa=F.initialElo(a.team),ob=F.initialElo(b.team);
        const logit=Math.log(base/(1-base))+(((ea-oa)-(eb-ob))/400)*Math.LN10;
        prob=clamp(1/(1+Math.exp(-logit)));
        p1=Number(model?.p1)||24;
        p2=Number(model?.p2)||21;
      }else{
        prob=clamp(1/(1+Math.pow(10,(eb-ea)/400)));
        p1=Number(ia?.avgPF)||Number(ib?.avgPA)||24;
        p2=Number(ib?.avgPF)||Number(ia?.avgPA)||21;
      }

      const sim=S.score({prob,p1,p2,oe:eb},Number(seed)+100000+serial*29),aWon=!!sim.won;
      const chg=marginChange(ea,eb,aWon,sim.a,sim.b);
      elos.set(a.team,ea+chg);
      elos.set(b.team,eb-chg);
      const winner=aWon?a:b,loser=aWon?b:a;
      return{a,b,bye:false,probA:prob,scoreA:sim.a,scoreB:sim.b,winner,loser,eloChangeA:chg,eloAfterA:ea+chg,eloAfterB:eb-chg};
    };

    for(const [classification,rows] of R.rpi.entries()){
      const cap=F.playoffFieldSize?.(R.season,classification)||R.playoffCaps?.get?.(classification)||rows.length;
      rows.forEach(r=>r.playoffSeed=null);
      const qualified=rows.filter(r=>r.eligible).slice(0,cap).map((r,i)=>{
        r.playoff=true;
        r.playoffSeed=i+1;
        return{team:r.team,seed:i+1,classification};
      });
      for(const r of rows)if(!r.playoffSeed)r.playoff=false;
      if(qualified.length<2)continue;

      const size=bracketSize(qualified.length),labels=roundLabels(size),order=seedOrder(size);
      const elos=new Map(qualified.map(t=>[t.team,Number(R.stats.get(t.team)?.elo)||F.initialElo(t.team)]));
      let alive=order.map(s=>s<=qualified.length?qualified[s-1]:null),rounds=[];

      for(let ri=0;alive.length>1;ri++){
        const games=[],next=[];
        for(let i=0;i<alive.length;i+=2){
          const g=play(alive[i],alive[i+1],elos);
          g.index=i/2;
          games.push(g);
          next.push(g.winner);
        }
        rounds.push({label:labels[ri]||`Round ${ri+1}`,games});
        alive=next;
      }

      const champion=alive[0]||null,finalGame=rounds.at(-1)?.games?.[0]||null;
      playoffs.set(classification,{classification,fieldSize:qualified.length,bracketSize:size,field:qualified,rounds,champion,finalGame});
    }

    R.playoffs=playoffs;
    return R;
  };
})();

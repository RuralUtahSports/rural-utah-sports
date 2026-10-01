(function(scope){
  'use strict';
  const caps={'6A':16,'5A':16,'4A':16,'3A':13,'2A':9,'1A':9,'8P':11},eps=1e-10;
  const key=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const date=v=>{if(/^\d{4}-\d{2}-\d{2}/.test(String(v)))return String(v).slice(0,10);const d=new Date(v);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const monday=v=>{const d=new Date(date(v)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);};
  function bounds(m,team,wins=null){
    const i=m.indices.get(team),own=m.remaining.map((g,j)=>[g,j]).filter(([g])=>[key(g.awayTeam),key(g.homeTeam)].includes(key(team))),ownSet=new Set(own.map(x=>x[1]));
    let best=1,worst=1;
    for(const [name,t] of m.indices){
      if(t===i||!m.rows.get(name).postseasonEligible||m.rows.get(name).classification!==m.rows.get(team).classification)continue;
      let min=m.values[t]-m.values[i],max=min;
      if(wins===null){for(const c of m.coefficients){const d=c[t]-c[i];min+=Math.min(0,d);max+=Math.max(0,d);}}
      else{
        const deltas=[];
        m.coefficients.forEach((c,j)=>{const d=c[t]-c[i];if(!ownSet.has(j)){min+=Math.min(0,d);max+=Math.max(0,d);}else{const win=key(m.remaining[j].awayTeam)===key(team)?1:0,loss=1-win;min+=d*loss;max+=d*loss;deltas.push(d*(win-loss));}});
        deltas.sort((a,b)=>a-b);min+=deltas.slice(0,wins).reduce((s,n)=>s+n,0);max+=deltas.slice(-wins||deltas.length).reduce((s,n)=>s+n,0);
      }
      if(min>eps)best++;if(max>=-eps)worst++;
    }
    return {best,worst};
  }
  function analyze(m,request,calculate,progress=()=>{}){
    const paths=scope.RUSRpiPaths || (typeof require==='function'?require('./rpi-paths-core.js'):null),team=request.team,classification=request.classification,cutoff=request.target||caps[classification],target=m.indices.get(team);
    if(target===undefined)throw new Error('Choose a team available in the RPI standings.');
    const classTeams=m.names.filter(n=>m.rows.get(n).classification===classification),indices=classTeams.map(n=>m.indices.get(n)),current=calculate(m.teams,{games:m.games},m.oos),currentRows=current[classification]||[],currentByName=new Map(currentRows.map(r=>[r.team,r]));
    const scenarios={},pack=(sample,label)=>{
      if(!sample)return null;
      const all=calculate(m.teams,{games:paths.project(m.games,m.remaining,sample.bits)},m.oos),row=all[classification].find(r=>r.team===team),rank=1+all[classification].filter(r=>r.postseasonEligible&&r.team!==team&&r.rpi>row.rpi+eps).length,safeRank=1+all[classification].filter(r=>r.postseasonEligible&&r.team!==team&&r.rpi>=row.rpi-eps).length;
      if(Math.abs(row.rpi-sample.rpi)>eps)throw new Error('Scenario verification failed. Please try again.');
      const name='s'+Object.keys(scenarios).length;scenarios[name]={label,bits:sample.bits};return {rank,safeRank,record:row.record,rpi:row.rpi,scenario:name};
    };
    progress('Finding games that affect the seeds…');
    const valuesFor=bits=>{const v=Float64Array.from(m.values);bits.forEach((b,j)=>{if(b)for(const i of indices)v[i]+=m.coefficients[j][i];});return v;};
    const seedIndices=indices.filter(i=>m.rows.get(m.names[i]).postseasonEligible);
    const rank=(values,i)=>1+seedIndices.filter(t=>t!==i&&values[t]>values[i]+eps).length;
    let rng=90231;const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
    const effects=m.remaining.map(g=>({date:g.date,awayTeam:g.awayTeam,homeTeam:g.homeTeam,own:[key(g.awayTeam),key(g.homeTeam)].includes(key(team)),rpiAwayDelta:0,awayHelps:false,homeHelps:false,seedSwing:0,classSwing:0,bubbleSwing:0}));
    const sampleCount=64;
    for(let s=0;s<sampleCount;s++){
      const bits=m.remaining.map(()=>random()<.5?1:0),values=valuesFor(bits);
      for(let j=0;j<m.remaining.length;j++){
        const c=m.coefficients[j],baseline=values[target];
        const away=Float64Array.from(values),home=Float64Array.from(values);
        for(const i of indices){away[i]+=c[i]*(1-bits[j]);home[i]-=c[i]*bits[j];}
        const ar=rank(away,target),hr=rank(home,target),e=effects[j];
        e.rpiAwayDelta=c[target];e.awayHelps ||= ar<hr;e.homeHelps ||= hr<ar;e.seedSwing=Math.max(e.seedSwing,Math.abs(ar-hr));
        let swing=0,crossing=0;
        for(const i of indices){const a=rank(away,i),h=rank(home,i);swing+=Math.abs(a-h);if((a<=cutoff)!==(h<=cutoff))crossing++;}
        e.classSwing=Math.max(e.classSwing,swing);e.bubbleSwing=Math.max(e.bubbleSwing,crossing);
        if(!Number.isFinite(baseline))throw new Error('Incomplete RPI model.');
      }
    }
    const today=request.asOf||new Date().toISOString().slice(0,10),weekStart=monday(today),end=new Date(weekStart+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+7);const weekEnd=end.toISOString().slice(0,10);
    const rooting=effects.filter(e=>date(e.date)>=today&&date(e.date)<weekEnd&&(e.seedSwing||Math.abs(e.rpiAwayDelta)>eps)).sort((a,b)=>b.seedSwing-a.seedSwing||Math.abs(b.rpiAwayDelta)-Math.abs(a.rpiAwayDelta)).map(e=>({...e,winner:e.awayHelps&&e.homeHelps?null:e.awayHelps?e.awayTeam:e.homeHelps?e.homeTeam:e.rpiAwayDelta>eps?e.awayTeam:e.rpiAwayDelta<-eps?e.homeTeam:null,conditional:e.awayHelps&&e.homeHelps}));
    const impact=effects.filter(e=>date(e.date)>=today&&e.classSwing).sort((a,b)=>b.bubbleSwing-a.bubbleSwing||b.classSwing-a.classSwing).slice(0,20);
    progress('Checking playoff status and minimum wins…');
    const statuses=classTeams.map(name=>{const b=bounds(m,name),row=currentByName.get(name),eligible=m.rows.get(name).postseasonEligible;return {team:name,rank:row?1+currentRows.filter(r=>r.team!==name&&m.rows.get(r.team)?.postseasonEligible&&r.rpi>row.rpi+eps).length:null,record:row?.record||'0-0',rpi:row?.rpi||0,remaining:m.remaining.filter(g=>[key(g.awayTeam),key(g.homeTeam)].includes(key(name))).map(g=>({date:g.date,opponent:key(g.awayTeam)===key(name)?g.homeTeam:g.awayTeam})),bounds:b,status:!eligible?'Ineligible with this schedule':b.worst<=cutoff?'Clinched (proven)':b.best>cutoff?'Eliminated (proven)':'Unresolved'};}).sort((a,b)=>(a.rank||999)-(b.rank||999));
    const own=m.remaining.filter(g=>[key(g.awayTeam),key(g.homeTeam)].includes(key(team))),qualifying=paths.search(m,{team,classification,target:cutoff},{trials:60,eligibleSeeds:true}),minimum=[];
    for(let w=0;w<=own.length;w++){const found=qualifying.paths.filter(p=>p.wins===w).sort((a,b)=>a.safeRank-b.safeRank||b.rpi-a.rpi)[0],b=bounds(m,team,w);minimum.push({wins:w,losses:own.length-w,status:found?'Path found':!m.rows.get(team).postseasonEligible?'Ineligible with this schedule':b.best>cutoff?'Cannot qualify (proven)':qualifying.exhaustive?'No clear qualifying path (all combinations)':'No path found; unresolved',example:pack(found,`${team}: ${w} remaining wins`)});}
    progress('Comparing a win and loss in the next game…');
    const next=own.filter(g=>date(g.date)>=today).sort((a,b)=>date(a.date).localeCompare(date(b.date)))[0];let comparison=null;
    if(next){comparison={game:next};for(const won of [true,false]){const base={team,classification,target:won?1:64,asOf:today,condition:{type:'game',selector:'next',won}},hi=paths.search(m,{...base,mode:'highest',target:1},{trials:24,eligibleSeeds:true}),lo=paths.search(m,{...base,mode:'lowest',target:64},{trials:24,eligibleSeeds:true});comparison[won?'win':'loss']={highest:pack(hi.paths[0],`${team} ${won?'wins':'loses'} next game: highest`),lowest:pack(lo.paths[0],`${team} ${won?'wins':'loses'} next game: lowest`),highestProven:hi.proven,lowestProven:lo.proven};}}
    progress('Checking the head-to-head seed race…');
    const rival=request.raceTeam&&classTeams.includes(request.raceTeam)&&request.raceTeam!==team?request.raceTeam:classTeams.find(n=>n!==team);let race=null;
    if(rival){const r=paths.search(m,{team,classification,target:1,mode:'race',raceTeam:rival},{trials:40,eligibleSeeds:true});race={rival,found:Boolean(r.paths.length),exhaustive:r.exhaustive,example:pack(r.paths[0],`${team} finishes ahead of ${rival}`)};}
    progress('Calculating the weekly results recap…');
    const finals=m.games.filter(paths.final),weeks=[...new Set(finals.map(g=>monday(g.date)).concat(weekStart))].filter(w=>w<=weekStart).sort(),selectedWeek=weeks.includes(request.week)?request.week:[...weeks].reverse().find(w=>finals.some(g=>monday(g.date)===w))||weekStart;
    const prior=finals.filter(g=>date(g.date)<selectedWeek),added=finals.filter(g=>monday(g.date)===selectedWeek).sort((a,b)=>date(a.date).localeCompare(date(b.date))||a.awayTeam.localeCompare(b.awayTeam));
    let previous=calculate(m.teams,{games:prior},m.oos)[classification]||[];
    const calculateBefore=new Map(previous.map(r=>[r.team,r]));
    let before=previous.find(r=>r.team===team),recapGames=[];
    const accumulated=[...prior];
    for(const g of added){accumulated.push(g);const nextRows=calculate(m.teams,{games:accumulated},m.oos)[classification]||[],old=previous.find(r=>r.team===team),now=nextRows.find(r=>r.team===team),delta=(now?.rpi||0)-(old?.rpi||0);if(Math.abs(delta)>eps)recapGames.push({date:g.date,awayTeam:g.awayTeam,homeTeam:g.homeTeam,away:g.actualAway,home:g.actualHome,delta,rankBefore:old?.rank,rankAfter:now?.rank});previous=nextRows;}
    const after=previous.find(r=>r.team===team),recap={week:selectedWeek,weeks,before,after,games:recapGames.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)),movement:previous.map(row=>{const old=calculateBefore.get(row.team);return {team:row.team,before:old?.rank,after:row.rank,change:old?old.rank-row.rank:null};})};
    return {colors:Object.fromEntries(m.teams.map(t=>[t.team,{background:t.backgroundColor,text:t.textColor}])),team,classification,cutoff,sampleCount,weekStart,today,rooting,impact,statuses,minimum,comparison,race,recap,scenarios,remaining:m.remaining.map(g=>({date:g.date,awayTeam:g.awayTeam,homeTeam:g.homeTeam}))};
  }
  // The week baseline is kept per analysis; no state leaks between teams.
  const api={analyze,bounds,monday,date,caps};
  if(typeof module==='object'&&module.exports)module.exports=api;else scope.RUSRpiInsights=api;
})(typeof window==='object'?window:globalThis);

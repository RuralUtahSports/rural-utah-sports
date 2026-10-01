importScripts('rpi-picks-core.js?v=20261001-paths1','rpi-paths-core.js?v=20261001-lab5','rpi-insights-core.js?v=20261001-lab5');
let prepared,source;
self.onmessage=event=>{
  try {
    const {request}=event.data;
    if(!prepared){
      source={teams:event.data.teams,games:event.data.games,oos:event.data.oos};
      prepared=RUSRpiPaths.model(source.teams,source.games,source.oos,RUSRpiPicks.calculate,(done,total)=>self.postMessage({type:'progress',done,total}));
    }
    const {teams,games,oos}=source;
    if(['lab','rooting','impact','comparison','minimum','status','recap'].includes(request.mode)){
      const lab=RUSRpiInsights.analyze(prepared,request,RUSRpiPicks.calculate,message=>self.postMessage({type:'stage',message}));
      self.postMessage({type:'result',result:{request,lab}});return;
    }
    const attach=result=>{
    if(result.paths.length){
      const example=result.paths[0];
      // Verify the winning witness with the full calculator rather than just its affine representation.
      const standings=RUSRpiPicks.calculate(teams,{games:RUSRpiPaths.project(games,prepared.remaining,example.bits)},oos);
      result.standings=standings[request.classification];
      const target=result.standings.find(row=>row.team===request.team);
      const verifiedSeed=1+result.standings.filter(row=>row.team!==request.team && row.rpi>=target.rpi-1e-10).length;
      const verifiedRank=1+result.standings.filter(row=>row.team!==request.team && row.rpi>target.rpi+1e-10).length;
      if(result.request.mode==='race'){
        const rival=result.standings.find(row=>row.team===result.request.raceTeam);
        if(!rival||target.rpi<=rival.rpi+1e-10)throw new Error('The seed-race scenario did not pass verification.');
        example.rank=verifiedRank;example.safeRank=verifiedSeed;
      }else if(verifiedSeed!==example.safeRank || verifiedRank!==example.rank || (!result.request.mode && (verifiedSeed>request.target || !target.postseasonEligible)))throw new Error('The example path did not pass verification. Please try again.');
      result.exampleGames=prepared.remaining.map((g,j)=>({date:g.date,awayTeam:g.awayTeam,homeTeam:g.homeTeam,winner:example.bits[j]?g.awayTeam:g.homeTeam,own:result.own.includes(j)}));
    }
    return result;
    };
    const result=request.mode==='range'?{
      request,
      highest:attach(RUSRpiPaths.search(prepared,{...request,mode:'highest',target:1})),
      lowest:attach(RUSRpiPaths.search(prepared,{...request,mode:'lowest',target:64}))
    }:attach(RUSRpiPaths.search(prepared,request));
    self.postMessage({type:'result',result});
  }catch(error){self.postMessage({type:'error',message:error.message});}
};

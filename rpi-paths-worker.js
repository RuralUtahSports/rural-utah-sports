importScripts('rpi-picks-core.js?v=20261001-paths1','rpi-paths-core.js?v=20261001-repeat3');
let prepared,source;
self.onmessage=event=>{
  try {
    const {request}=event.data;
    if(!prepared){
      source={teams:event.data.teams,games:event.data.games,oos:event.data.oos};
      prepared=RUSRpiPaths.model(source.teams,source.games,source.oos,RUSRpiPicks.calculate,(done,total)=>self.postMessage({type:'progress',done,total}));
    }
    const {teams,games,oos}=source;
    const attach=result=>{
    if(result.paths.length){
      const example=result.paths[0];
      // Verify the winning witness with the full calculator rather than just its affine representation.
      const standings=RUSRpiPicks.calculate(teams,{games:RUSRpiPaths.project(games,prepared.remaining,example.bits)},oos);
      result.standings=standings[request.classification];
      const target=result.standings.find(row=>row.team===request.team);
      const verifiedSeed=1+result.standings.filter(row=>row.team!==request.team && row.rpi>=target.rpi-1e-10).length;
      const verifiedRank=1+result.standings.filter(row=>row.team!==request.team && row.rpi>target.rpi+1e-10).length;
      if(verifiedSeed!==example.safeRank || verifiedRank!==example.rank || (!result.request.mode && (verifiedSeed>request.target || !target.postseasonEligible)))throw new Error('The example path did not pass verification. Please try again.');
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

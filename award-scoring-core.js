(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.RUSAwardScoring=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const VERSION='2026-08-31-v6';
  const DEFENSE_SCALE=2.5;
  const TEAM_CONTEXT_RECORD_WEIGHT=.50;
  const TEAM_CONTEXT_SOS_WEIGHT=.30;
  const TEAM_CONTEXT_QUALITY_WIN_WEIGHT=.20;
  const QUALITY_WIN_RECORD_WEIGHT=.85;
  const QUALITY_WIN_TOP25_WEIGHT=.15;
  const TEAM_CONTEXT_FULL_GAMES=5;
  const TEAM_CONTEXT_CAPS=Object.freeze({mvp:.10,allUtah:.07,allRural:.05,allState:.05,allRegion:.02});
  const clean=v=>String(v??'').trim();
  const compact=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
  const n=v=>{const m=String(v??'').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):0};
  const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,Number(v)||0));
  const teamAliases={CEDAR:'CEDARCITY',CEDARCITY:'CEDARCITY',GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISONVALLEY',MONUMENTVAL:'MONUMENTVALLEY',MAPLEMTN:'MAPLEMOUNTAIN'};
  const teamKey=v=>teamAliases[compact(v)]||compact(v);

  function statValue(values,...wanted){
    const entries=Object.entries(values||{});
    for(const key of wanted){
      const target=compact(key);
      const hit=entries.find(([k])=>compact(k)===target);
      if(hit)return n(hit[1]);
    }
    return 0;
  }

  function passDetails(values){
    const entries=Object.entries(values||{});
    const yards=statValue(values,'YARDS','PASS YARDS')||(()=>{const hit=entries.find(([k])=>/^yards$/i.test(String(k).trim()));return hit?n(hit[1]):0})();
    const td=statValue(values,'TD','TDS','PASS TD','PASS TDS');
    const interceptions=statValue(values,'INT','INTS','INTERCEPTIONS');
    const compAtt=entries.find(([k])=>compact(k)==='COMPATT');
    const match=compAtt?String(compAtt[1]??'').match(/(\d+)\s*[-/]\s*(\d+)/):null;
    const completions=match?Number(match[1]):statValue(values,'COMP','COMPLETIONS');
    const attempts=match?Number(match[2]):statValue(values,'ATT','ATTEMPTS','PASS ATT');
    const pctEntry=entries.find(([k])=>/COMP(?:LETION)?\s*%|COMP(?:LETION)?\s*PCT/i.test(String(k)));
    const compPct=pctEntry?n(pctEntry[1]):(attempts?completions/attempts*100:0);
    const ypa=attempts?yards/attempts:0;
    return {yards,td,interceptions,completions,attempts,compPct,ypa};
  }

  function passingScore(values){
    const s=passDetails(values);
    let score=s.yards*.025+s.td*5-s.interceptions*2.5;
    if(s.attempts>=10){
      if(s.compPct>60)score+=Math.min(5,(s.compPct-60)*.25);
      if(s.ypa>7)score+=Math.min(4,(s.ypa-7)*.8);
    }
    return Math.max(0,score);
  }

  function rushingScore(values){
    return Math.max(0,statValue(values,'YARDS','RUSH YARDS')*.035+statValue(values,'TD','TDS','RUSH TD','RUSH TDS')*6);
  }

  function qbRushingScore(values){
    const yards=statValue(values,'YARDS','RUSH YARDS');
    const td=statValue(values,'TD','TDS','RUSH TD','RUSH TDS');
    const carries=statValue(values,'CARRIES','RUSH ATT','RUSH ATTEMPTS','ATTEMPTS','ATT');
    const listedYpc=statValue(values,'YARDS/CARRY','YARDS PER CARRY','YPC');
    const ypc=carries?yards/carries:listedYpc;
    let score=yards*.05+td*6;
    if(carries>=5&&ypc>6)score+=Math.min(4,(ypc-6)*.35);
    return Math.max(0,score);
  }

  function receivingScore(values){
    return Math.max(0,statValue(values,'YARDS','REC YARDS','RECEIVING YARDS')*.035+statValue(values,'TD','TDS','REC TD','RECEIVING TD')*6+statValue(values,'RECEPTIONS','REC')*.35);
  }

  function kickingScore(values){
    // K/P award scoring is intentionally pure kicking production. Return TDs,
    // defensive production and offensive production belong to their own awards.
    return Math.max(0,statValue(values,'FG','FIELD GOALS')*3+statValue(values,'PAT','PATS'));
  }

  function defenseScore(values){
    const base=statValue(values,'TACKLES')*.6+statValue(values,'SACKS')*3+Math.max(statValue(values,'PASS INT','PASS INTS'),statValue(values,'INTERCEPTIONS','INTS'))*4+statValue(values,'DEFENSE TD','DEFENSIVE TD')*6+statValue(values,'RETURN TD','RETURN TDS')*6;
    return Math.max(0,base*DEFENSE_SCALE);
  }

  function isPassing(category){return /^Pass/i.test(category||'')}
  function isRushing(category){return /^Rush/i.test(category||'')}
  function isReceiving(category){return /^Receiv/i.test(category||'')}
  function isKicking(category){return /^Kick/i.test(category||'')}
  function isDefense(category){return /Defense/i.test(category||'')}
  function isOffenseLine(category){return isPassing(category)||isRushing(category)||isReceiving(category)}
  function isOffensePosition(position){return ['QB','RB','WR','TE','ATH'].includes(String(position||'').toUpperCase())}
  function isKickingPosition(position){return compact(position)==='KP'}

  function categoryScore(category,values,position=''){
    const pos=String(position||'').toUpperCase();
    if(isPassing(category))return passingScore(values);
    if(isRushing(category))return pos==='QB'?qbRushingScore(values):rushingScore(values);
    if(isReceiving(category))return receivingScore(values);
    if(isKicking(category))return kickingScore(values);
    if(isDefense(category))return defenseScore(values);
    return 0;
  }

  function positionLineAllowed(position,category){
    if(isOffensePosition(position))return isOffenseLine(category);
    if(isKickingPosition(position))return isKicking(category);
    return true;
  }

  function positionScore(position,lines){
    let total=0;
    for(const line of lines||[]){
      const category=line.category??line.cat??'';
      if(!positionLineAllowed(position,category))continue;
      total+=categoryScore(category,line.values||{},position);
    }
    return Math.max(0,total);
  }

  function standingsRows(standings){
    const rows=[];
    for(const group of Object.values(standings?.byClassification||{}))if(Array.isArray(group))rows.push(...group);
    if(!rows.length&&Array.isArray(standings?.teams))rows.push(...standings.teams);
    return rows;
  }

  function top25Rows(rankings){
    if(Array.isArray(rankings?.snapshots)&&rankings.snapshots.length){
      const latest=rankings.snapshots.map((snapshot,index)=>({snapshot,index,time:Date.parse(snapshot?.date)||0})).sort((a,b)=>a.time-b.time||a.index-b.index).at(-1)?.snapshot;
      if(Array.isArray(latest?.teams))return latest.teams;
    }
    if(Array.isArray(rankings?.rankings))return rankings.rankings;
    if(Array.isArray(rankings?.teams))return rankings.teams;
    return Array.isArray(rankings)?rankings:[];
  }

  function buildTop25Ranks(rankings){
    const ranks=new Map();
    top25Rows(rankings).slice(0,25).forEach((row,index)=>{
      const team=typeof row==='string'?row:row?.team,rank=Math.max(1,n(typeof row==='string'?index+1:row?.rank||index+1));
      const key=teamKey(team);
      if(key&&rank<=25)ranks.set(key,rank);
    });
    return ranks;
  }

  function top25RankValue(rank){
    const value=n(rank);
    if(value<1)return 0;
    if(value>=1&&value<=5)return 1;
    if(value<=10)return .75;
    if(value<=25)return .40;
    return 0;
  }

  function qualityWinOpponentStrength(records,top25Ranks,opponent){
    const record=records.get(opponent),rank=top25Ranks.get(opponent);
    if(!record&&!rank)return .5;
    return clamp((record?.winPct??.5)*QUALITY_WIN_RECORD_WEIGHT+top25RankValue(rank)*QUALITY_WIN_TOP25_WEIGHT);
  }

  function neutralTeamContext(team=''){
    return {team:clean(team),wins:0,losses:0,ties:0,games:0,winPct:.5,sos:.5,sosPercentile:.5,qualityWinScore:0,qualityWinCount:0,top25Wins:0,quality:.5,reliability:0,bonusStrength:0};
  }

  function buildTeamContexts(standings,rankings){
    const records=new Map();
    for(const row of standingsRows(standings)){
      const key=teamKey(row?.team);
      if(!key)continue;
      const wins=Math.max(0,n(row.wins)),losses=Math.max(0,n(row.losses)),ties=Math.max(0,n(row.ties)),games=wins+losses+ties;
      records.set(key,{team:clean(row.team),wins,losses,ties,games,winPct:games?(wins+ties*.5)/games:.5});
    }
    const top25Ranks=buildTop25Ranks(rankings),opponents=new Map([...records.keys()].map(key=>[key,[]]));
    for(const game of standings?.games||[]){
      const away=teamKey(game?.awayTeam),home=teamKey(game?.homeTeam),awayRaw=game?.actualAway,homeRaw=game?.actualHome,awayScore=Number(awayRaw),homeScore=Number(homeRaw);
      if(!away||!home||clean(awayRaw)===''||clean(homeRaw)===''||!Number.isFinite(awayScore)||!Number.isFinite(homeScore))continue;
      if(opponents.has(away))opponents.get(away).push({opponent:home,won:awayScore>homeScore});
      if(opponents.has(home))opponents.get(home).push({opponent:away,won:homeScore>awayScore});
    }
    const raw=[...records.entries()].map(([key,record])=>{
      const played=opponents.get(key)||[],gameCount=Math.max(record.games,played.length),missingGames=Math.max(0,gameCount-played.length);
      const sos=gameCount?(played.reduce((sum,game)=>sum+(records.get(game.opponent)?.winPct??.5),0)+missingGames*.5)/gameCount:.5;
      let qualityWinTotal=0,qualityWinCount=0,top25Wins=0;
      for(const game of played)if(game.won){qualityWinTotal+=qualityWinOpponentStrength(records,top25Ranks,game.opponent);qualityWinCount++;if(top25Ranks.has(game.opponent))top25Wins++}
      const qualityWinScore=gameCount?qualityWinTotal/gameCount:0;
      return {key,...record,sos,qualityWinScore,qualityWinCount,top25Wins};
    });
    const ordered=raw.map(row=>row.sos).sort((a,b)=>a-b),denominator=Math.max(1,ordered.length-1),contexts=new Map();
    for(const row of raw){
      const lower=ordered.filter(value=>value<row.sos).length,equal=ordered.filter(value=>value===row.sos).length;
      const sosPercentile=ordered.length<=1?.5:(lower+Math.max(0,equal-1)/2)/denominator;
      const quality=clamp(row.winPct*TEAM_CONTEXT_RECORD_WEIGHT+sosPercentile*TEAM_CONTEXT_SOS_WEIGHT+row.qualityWinScore*TEAM_CONTEXT_QUALITY_WIN_WEIGHT);
      const reliability=clamp(row.games/TEAM_CONTEXT_FULL_GAMES);
      const bonusStrength=clamp((quality-.5)/.5)*reliability;
      contexts.set(row.key,{team:row.team,wins:row.wins,losses:row.losses,ties:row.ties,games:row.games,winPct:row.winPct,sos:row.sos,sosPercentile,qualityWinScore:row.qualityWinScore,qualityWinCount:row.qualityWinCount,top25Wins:row.top25Wins,quality,reliability,bonusStrength});
    }
    return contexts;
  }

  function teamContextFor(contexts,team){
    const key=teamKey(team);
    if(contexts instanceof Map)return contexts.get(key)||neutralTeamContext(team);
    return contexts?.[key]||neutralTeamContext(team);
  }

  function teamContextCap(award='mvp'){
    const key=compact(award);
    if(key==='ALLUTAH')return TEAM_CONTEXT_CAPS.allUtah;
    if(key==='ALLRURAL')return TEAM_CONTEXT_CAPS.allRural;
    if(key==='ALLSTATE')return TEAM_CONTEXT_CAPS.allState;
    if(key==='ALLREGION')return TEAM_CONTEXT_CAPS.allRegion;
    return TEAM_CONTEXT_CAPS.mvp;
  }

  function applyTeamContext(score,context,award='mvp'){
    const base=Math.max(0,Number(score)||0),strength=clamp(context?.bonusStrength),cap=teamContextCap(award);
    return base*(1+cap*strength);
  }

  function teamContextBonus(score,context,award='mvp'){
    const base=Math.max(0,Number(score)||0);
    return applyTeamContext(base,context,award)-base;
  }

  return {VERSION,DEFENSE_SCALE,TEAM_CONTEXT_RECORD_WEIGHT,TEAM_CONTEXT_SOS_WEIGHT,TEAM_CONTEXT_QUALITY_WIN_WEIGHT,QUALITY_WIN_RECORD_WEIGHT,QUALITY_WIN_TOP25_WEIGHT,TEAM_CONTEXT_FULL_GAMES,TEAM_CONTEXT_CAPS,compact,n,clamp,teamKey,statValue,passDetails,passingScore,rushingScore,qbRushingScore,receivingScore,kickingScore,defenseScore,isPassing,isRushing,isReceiving,isKicking,isDefense,isOffenseLine,isOffensePosition,isKickingPosition,categoryScore,positionLineAllowed,positionScore,top25Rows,buildTop25Ranks,top25RankValue,qualityWinOpponentStrength,neutralTeamContext,buildTeamContexts,teamContextFor,teamContextCap,applyTeamContext,teamContextBonus};
});

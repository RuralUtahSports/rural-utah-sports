(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.RUSAwardScoring=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const VERSION='2026-08-18-v3';
  const DEFENSE_SCALE=3;
  const clean=v=>String(v??'').trim();
  const compact=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
  const n=v=>{const m=String(v??'').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):0};

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

  return {VERSION,DEFENSE_SCALE,compact,n,statValue,passDetails,passingScore,rushingScore,qbRushingScore,receivingScore,kickingScore,defenseScore,isPassing,isRushing,isReceiving,isKicking,isDefense,isOffenseLine,isOffensePosition,isKickingPosition,categoryScore,positionLineAllowed,positionScore};
});

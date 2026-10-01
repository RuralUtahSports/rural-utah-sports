(function(scope) {
  'use strict';
  const norm = value => String(value || '').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const teamKey = value => norm(value).replace(/ /g,'');
  const final = g => [g.actualAway,g.actualHome].every(v => v !== null && v !== undefined && String(v).trim() !== '' && Number.isFinite(Number(v)));
  const aliases = {'CEDAR CITY':['cedar'], 'SAINT JOSEPH':['st joseph','st. joseph'], 'ALA':['american leadership academy'], 'UMA-LEHI':['uma camp williams'], 'MONUMENT VALLEY':['monument val']};
  function parseQuestion(question, teams) {
    const q=norm(question);
    if (/\b(if|unless|without|assuming|wins?|loses?|beats?|beating|losing)\b/.test(q)) throw new Error('Ask for a team and a target seed, such as “What is Uintah’s path to a top 16 seed?” Specific win/loss conditions are not supported in this question box yet.');
    const matches=teams.filter(t => [t.team,...(aliases[t.team]||[])].some(name => new RegExp('(?:^| )'+norm(name)+'s?(?= |$)').test(q)));
    if(matches.length!==1) throw new Error(matches.length ? 'Please name one team in your question.' : 'Please include a Utah team name, such as Uintah or North Sanpete.');
    const team=matches[0], classification=teamKey(team.team)==='enterprise'?'1A':team.classification;
    if(['grand','grandcounty','laytonchristian'].includes(teamKey(team.team))) throw new Error('This team is excluded from the current RPI postseason calculation.');
    const cap={'6A':16,'5A':16,'4A':16,'3A':13,'2A':9,'1A':9,'8P':11}[classification];
    let target;
    const m=q.match(/\btop\s*(\d+)\b/) || q.match(/\b(?:seed|rank)\s*(\d+)\b/) || q.match(/\b(\d+)(?:st|nd|rd|th)?\s+seed\b/) || q.match(/\bnumber\s*(\d+)\b/);
    if(m) target=Number(m[1]);
    else if(/\b(playoff|playoffs|postseason)\b/.test(q)) target=cap;
    else throw new Error('Include a target, such as “top 16,” “top 8,” or “make the playoffs.”');
    if(!Number.isInteger(target)||target<1||target>64) throw new Error('Please choose a target seed from 1 to 64.');
    return {team:team.team,classification,target};
  }
  function project(games, remaining, bits) {
    const chosen=new Map(remaining.map((g,i)=>[g,bits[i]]));
    return games.map(g=>final(g)?g:{...g,actualAway:chosen.get(g)?1:0,actualHome:chosen.get(g)?0:1});
  }
  function model(teams,games,oos,calculate,progress=()=>{}) {
    const remaining=games.filter(g=>!final(g)),bits=new Uint8Array(remaining.length),base=calculate(teams,{games:project(games,remaining,bits)},oos);
    const names=Object.values(base).flat().map(r=>r.team), indices=new Map(names.map((n,i)=>[n,i]));
    const values=new Float64Array(names.length), coefficients=remaining.map(()=>new Float64Array(names.length));
    const rows=new Map(Object.values(base).flat().map(r=>[r.team,r]));
    for(const [name,i] of indices) values[i]=rows.get(name).rpi;
    for(let j=0;j<remaining.length;j++) {
      bits[j]=1;
      const sample=calculate(teams,{games:project(games,remaining,bits)},oos);
      for(const list of Object.values(sample)) for(const row of list) coefficients[j][indices.get(row.team)]=row.rpi-values[indices.get(row.team)];
      bits[j]=0;
      if(j%10===0) progress(j+1,remaining.length);
    }
    progress(remaining.length,remaining.length);
    return {teams,games,oos,remaining,names,indices,values,coefficients,rows};
  }
  function search(m, request, options={}) {
    const targetIndex=m.indices.get(request.team);
    if(targetIndex===undefined) throw new Error('This team is not available in the current RPI calculation.');
    const competitors=m.names.map((name,index)=>({name,index,row:m.rows.get(name)})).filter(t=>t.row.classification===request.classification && t.index!==targetIndex);
    const relevant=m.coefficients.map((c,j)=>({c,j})).filter(({c})=>Math.abs(c[targetIndex])>1e-12 || competitors.some(t=>Math.abs(c[t.index])>1e-12)).map(x=>x.j);
    const own=m.remaining.map((g,j)=>({g,j})).filter(({g})=>[teamKey(g.awayTeam),teamKey(g.homeTeam)].includes(teamKey(request.team))).map(x=>x.j);
    const ownSet=new Set(own), free=relevant.filter(j=>!ownSet.has(j));
    const ownWinBit=j=>teamKey(m.remaining[j].awayTeam)===teamKey(request.team)?1:0;
    let state=239019;
    const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
    const eps=1e-10, witnesses=new Map(); let evaluated=0,bestRank=Infinity,worstRank=0;
    const assess=(bits,values)=> {
      evaluated++;
      const rank=1+competitors.filter(t=>values[t.index]>values[targetIndex]+eps).length;
      const safeRank=1+competitors.filter(t=>values[t.index]>=values[targetIndex]-eps).length;
      bestRank=Math.min(bestRank,rank);worstRank=Math.max(worstRank,rank);
      const other=competitors.map(t=>values[t.index]).sort((a,b)=>b-a);
      const threshold=other[request.target-1], margin=threshold===undefined?1:values[targetIndex]-threshold;
      const wins=own.filter(j=>bits[j]===ownWinBit(j)).length;
      if(safeRank<=request.target && m.rows.get(request.team).postseasonEligible) {
        const signature=own.map(j=>bits[j]).join(''),prev=witnesses.get(signature);
        if(!prev || margin>prev.margin) witnesses.set(signature,{bits:Array.from(bits),rank,safeRank,margin,wins,rpi:values[targetIndex]});
      }
      // Smooth margin helps the search cross seed boundaries without claiming probabilities.
      return {rank,safeRank,margin,wins,fitness:-safeRank+Math.max(-.49,Math.min(.49,margin))};
    };
    const valuesFor=bits=>{const v=Float64Array.from(m.values);for(let j=0;j<bits.length;j++)if(bits[j])for(let i=0;i<v.length;i++)v[i]+=m.coefficients[j][i];return v;};
    let exhaustive=false;
    if(relevant.length<=16) {
      exhaustive=true;
      const bits=new Uint8Array(m.remaining.length),values=Float64Array.from(m.values);
      own.filter(j=>!relevant.includes(j)).forEach(j=>{bits[j]=1-ownWinBit(j);});
      let previous=0;
      for(let n=0;n<2**relevant.length;n++) {
        const gray=n^(n>>>1);
        if(n){const diff=gray^previous,p=31-Math.clz32(diff),j=relevant[p],sign=(gray&diff)?1:-1;bits[j]=sign===1?1:0;for(let i=0;i<values.length;i++)values[i]+=sign*m.coefficients[j][i];}
        assess(bits,values);previous=gray;
      }
    } else {
      const patterns=own.length<=8?2**own.length:Math.min(256,options.patterns||256);
      for(let pattern=0;pattern<patterns;pattern++) {
        const bits=new Uint8Array(m.remaining.length);
        own.forEach((j,p)=>{const won=own.length<=8?Boolean(pattern&(1<<p)):random()<.5;bits[j]=won?ownWinBit(j):1-ownWinBit(j);});
        for(let trial=0;trial<(options.trials||80);trial++) {
          free.forEach(j=>{bits[j]=random()<.5?1:0;});
          let values=valuesFor(bits),current=assess(bits,values);
          if(trial>=8 && current.safeRank<=request.target) continue;
          // Coordinate search preserves this team's outcome pattern and improves its seed margin.
          for(let pass=0;pass<3;pass++) {
            let improved=false;
            const start=Math.floor(random()*Math.max(1,free.length));
            for(let p=0;p<free.length;p++) {
              const j=free[(start+p)%free.length],sign=bits[j]?-1:1;bits[j]^=1;
              for(let i=0;i<values.length;i++)values[i]+=sign*m.coefficients[j][i];
              const next=assess(bits,values);
              if(next.fitness>current.fitness+1e-12){current=next;improved=true;}
              else {bits[j]^=1;for(let i=0;i<values.length;i++)values[i]-=sign*m.coefficients[j][i];}
            }
            if(!improved)break;
          }
        }
      }
    }
    const paths=[...witnesses.values()].sort((a,b)=>a.wins-b.wins||b.margin-a.margin);
    return {request,evaluated,exhaustive,relevantGames:relevant.length,bestRank,worstRank,own,paths};
  }
  const api={parseQuestion,model,search,project,final};
  if(typeof module==='object' && module.exports)module.exports=api;else scope.RUSRpiPaths=api;
})(typeof window==='object'?window:globalThis);

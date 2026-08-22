import fs from 'node:fs';

const FILE='deseret-game-details.json';
if(!fs.existsSync(FILE)) process.exit(0);
const data=JSON.parse(fs.readFileSync(FILE,'utf8'));
const compact=v=>String(v??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');

function quarterOf(play){
  const m=String(play||'').match(/\b([1-4])Q\b/i);
  return m?Number(m[1])-1:-1;
}
function pointsOf(play){
  const s=String(play||'');
  if(/\bsafety\b/i.test(s)) return 2;
  if(/\b\d+\s*-?yard\s+FG\b|\bfield goal\b/i.test(s)) return 3;
  // Every remaining entry in Deseret's scoring summary is a scoring play.
  // Run/pass/return/recovery entries are touchdowns unless explicitly an FG/safety.
  if(!/\b(run|pass|return|recovery|touchdown|blocked punt)\b/i.test(s)) return null;
  let pts=6;
  const parens=[...s.matchAll(/\(([^)]*)\)/g)].map(m=>m[1]).join(' ');
  if(/kick\s+failed|PAT\s+failed/i.test(parens)) return pts;
  if(/\b(kick\s+(?:from|successful|good)|PAT\s+(?:good|successful))\b/i.test(parens)) pts+=1;
  else if(/\b(run|pass)\s+(?:from|successful|good)\b|2\s*-?point/i.test(parens)) pts+=2;
  return pts;
}
function rowIndexForPrefix(prefix,keyParts,rows){
  const p=compact(prefix);
  if(!p) return -1;
  const away=keyParts[1]||'',home=keyParts[2]||'';
  if((p.includes(away)||away.includes(p))&&away) return 0;
  if((p.includes(home)||home.includes(p))&&home) return 1;
  for(let i=0;i<rows.length;i++){
    const r=compact(rows[i]?.team);
    if(r&&(r.includes(p)||p.includes(r))) return i;
  }
  return -1;
}

let changed=0;
for(const [key,g] of Object.entries(data.games||{})){
  const rows=g?.boxScore?.rows;
  const plays=Array.isArray(g?.scoringPlays)?g.scoringPlays:[];
  if(!Array.isArray(rows)||rows.length!==2||!plays.length) continue;
  const periods=g?.boxScore?.periods||[];
  if(periods.length&&periods.slice(0,4).some((p,i)=>compact(p)!==`Q${i+1}`)) continue;

  const calc=[[0,0,0,0],[0,0,0,0]];
  const quarterEvidence=[false,false,false,false];
  const parts=String(key).split('|');
  for(const play of plays){
    const q=quarterOf(play),pts=pointsOf(play);
    if(q<0||pts===null) continue;
    const prefix=String(play).split(/—| - /)[0]||'';
    const ri=rowIndexForPrefix(prefix,parts,rows);
    if(ri<0) continue;
    calc[ri][q]+=pts;
    quarterEvidence[q]=true;
  }

  for(let ri=0;ri<2;ri++){
    if(!Array.isArray(rows[ri].quarters)) rows[ri].quarters=[null,null,null,null];
    while(rows[ri].quarters.length<4) rows[ri].quarters.push(null);
    for(let q=0;q<4;q++){
      if(!quarterEvidence[q]) continue;
      if(rows[ri].quarters[q]!==null&&rows[ri].quarters[q]!==undefined) continue;
      rows[ri].quarters[q]=calc[ri][q];
      changed++;
      console.log(`Filled ${key} row ${ri+1} Q${q+1}: ${calc[ri][q]}`);
    }
  }
}
if(changed){
  data.updatedAt=new Date().toISOString();
  fs.writeFileSync(FILE,JSON.stringify(data,null,2)+'\n');
}
console.log(`Scoring-play box-score fallback filled ${changed} quarter cell(s).`);

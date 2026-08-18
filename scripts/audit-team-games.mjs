import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PAGE_DIR = path.join(ROOT, 'team-page-data');
const OUT = path.join(ROOT, 'team-games-audit.json');

const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ');
const upper = value => clean(value).toUpperCase();
const aliases = new Map(Object.entries({
  'GUNNISON':'GUNNISON VALLEY',
  'MAPLE MTN':'MAPLE MOUNTAIN',
  'MONUMENT VAL':'MONUMENT VALLEY',
  'CEDAR':'CEDAR CITY',
  'SUMMIT':'SUMMIT ACADEMY',
  'WASATCH ACAD':'WASATCH ACADEMY',
  'WASATCH ACAD.':'WASATCH ACADEMY',
  'HINKLEY':'HINCKLEY',
  'BY HIGH':'BYH',
  'BRIGHAM YOUNG':'BYH',
  'FREMOND':'FREMONT'
}));
const canonical = value => {
  const key = upper(value).replace(/\.+$/, '').trim();
  if (key.startsWith('WASATCH ACAD')) return 'WASATCH ACADEMY';
  return aliases.get(key) || key;
};
const slug = value => canonical(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const dateMs = value => {
  const s = clean(value);
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return Date.UTC(Number(m[3]), Number(m[1])-1, Number(m[2]));
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return Date.UTC(Number(m[1]), Number(m[2])-1, Number(m[3]));
  return NaN;
};
const resultFromScores = (a,b) => Number(a)>Number(b)?'W':Number(a)<Number(b)?'L':'T';
const finite = v => Number.isFinite(Number(v));
const seasonYear = (season, game) => {
  const d = new Date(dateMs(game?.date));
  return Number.isFinite(d.getTime()) ? d.getUTCFullYear() : Number(season);
};

function levenshtein(a,b){
  a=canonical(a); b=canonical(b);
  const dp=Array.from({length:b.length+1},(_,j)=>j);
  for(let i=1;i<=a.length;i++){
    let prev=dp[0]; dp[0]=i;
    for(let j=1;j<=b.length;j++){
      const old=dp[j];
      dp[j]=Math.min(dp[j]+1,dp[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));
      prev=old;
    }
  }
  return dp[b.length];
}

if(!fs.existsSync(PAGE_DIR)) throw new Error('team-page-data directory not found');
const teamsData = JSON.parse(fs.readFileSync(path.join(ROOT,'teams-data.json'),'utf8'));
const teamBySlug = new Map(teamsData.map(t=>[slug(t.team), canonical(t.team)]));
const websiteTeams = new Set(teamsData.map(t=>canonical(t.team)));

const exactDuplicates=[];
const sameDateOpponentConflicts=[];
const sameDayMultipleOpponents=[];
const suspiciousRepeatGames=[];
const invalidRows=[];
const seasonSummaryMismatches=[];
const reciprocalMismatches=[];
const likelyOpponentTypos=[];
const pageRows=[];
const reciprocalIndex=new Map();
const recentIssues=[];

function pushRecent(issue){
  const year=Number(issue.season||issue.year||0);
  if(year>=2025) recentIssues.push(issue);
}

for(const file of fs.readdirSync(PAGE_DIR).filter(f=>f.endsWith('.json')).sort()){
  const full=path.join(PAGE_DIR,file);
  const data=JSON.parse(fs.readFileSync(full,'utf8'));
  const fileSlug=file.replace(/\.json$/i,'');
  const team=teamBySlug.get(fileSlug)||canonical(fileSlug.replace(/-/g,' '));
  const schedules=data.schedules||{};
  const histories=new Map((data.seasonHistory||[]).map(s=>[String(s.year),s]));
  let totalGames=0;

  for(const [season,gamesRaw] of Object.entries(schedules)){
    if(!Array.isArray(gamesRaw)) continue;
    const games=gamesRaw;
    totalGames+=games.length;
    const exact=new Map();
    const byDateOpponent=new Map();
    const byDate=new Map();
    const bySignature=new Map();
    let wins=0,losses=0,ties=0,pf=0,pa=0,scoreCount=0;

    games.forEach((game,index)=>{
      const date=clean(game?.date);
      const opponent=canonical(game?.opponent);
      const a=game?.teamScore,b=game?.opponentScore;
      const stored=upper(game?.result);
      const computed=finite(a)&&finite(b)?resultFromScores(a,b):'';
      const base={team,season:String(season),index,date,opponent,teamScore:a,opponentScore:b,result:stored,playoff:Boolean(game?.playoff),notes:clean(game?.notes)};

      if(!date || !Number.isFinite(dateMs(date)) || !opponent || !finite(a) || !finite(b) || !['W','L','T'].includes(stored) || (computed && stored!==computed)){
        const issue={type:'invalid-row',...base,reason:!date||!Number.isFinite(dateMs(date))?'invalid-date':!opponent?'missing-opponent':!finite(a)||!finite(b)?'invalid-score':!['W','L','T'].includes(stored)?'invalid-result':'result-score-mismatch'};
        invalidRows.push(issue); pushRecent(issue);
      }

      if(stored==='W')wins++; else if(stored==='L')losses++; else if(stored==='T')ties++;
      if(finite(a)&&finite(b)){pf+=Number(a);pa+=Number(b);scoreCount++;}

      const scoreSig=`${a ?? ''}|${b ?? ''}|${stored}`;
      const exactKey=`${date}|${opponent}|${scoreSig}`;
      if(exact.has(exactKey)){
        const issue={type:'exact-duplicate',...base,firstIndex:exact.get(exactKey)};
        exactDuplicates.push(issue); pushRecent(issue);
      } else exact.set(exactKey,index);

      const pairKey=`${date}|${opponent}`;
      if(byDateOpponent.has(pairKey) && byDateOpponent.get(pairKey).scoreSig!==scoreSig){
        const prior=byDateOpponent.get(pairKey);
        const issue={type:'same-date-opponent-conflict',...base,otherIndex:prior.index,otherScore:prior.scoreSig};
        sameDateOpponentConflicts.push(issue); pushRecent(issue);
      } else if(!byDateOpponent.has(pairKey)) byDateOpponent.set(pairKey,{index,scoreSig});

      if(!byDate.has(date))byDate.set(date,new Set());
      byDate.get(date).add(opponent);

      const sig=`${opponent}|${a ?? ''}|${b ?? ''}|${stored}`;
      const ms=dateMs(date);
      if(Number.isFinite(ms)){
        const prior=bySignature.get(sig);
        if(prior){
          const days=Math.abs(ms-prior.ms)/86400000;
          if(days>0 && days<=14){
            const issue={type:'suspicious-repeat',...base,otherDate:prior.date,daysApart:days};
            suspiciousRepeatGames.push(issue); pushRecent(issue);
          }
        }
        bySignature.set(sig,{ms,date,index});
      }

      if(opponent && !websiteTeams.has(opponent) && !/\([A-Z]{2}\)/.test(opponent)){
        let best=null;
        for(const candidate of websiteTeams){
          if(Math.abs(candidate.length-opponent.length)>2) continue;
          if(candidate.slice(0,3)!==opponent.slice(0,3)) continue;
          const d=levenshtein(opponent,candidate);
          if(d<=2 && (!best||d<best.distance)) best={candidate,distance:d};
        }
        if(best){
          const issue={type:'likely-opponent-typo',...base,suggested:best.candidate,distance:best.distance};
          likelyOpponentTypos.push(issue); pushRecent(issue);
        }
      }

      if(websiteTeams.has(opponent) && date && finite(a)&&finite(b)){
        const key=[team,opponent].sort().join('|')+`|${date}`;
        if(!reciprocalIndex.has(key))reciprocalIndex.set(key,[]);
        reciprocalIndex.get(key).push({team,opponent,date,teamScore:Number(a),opponentScore:Number(b),result:stored,season:String(season),index});
      }
    });

    for(const [date,opponents] of byDate){
      if(date && opponents.size>1){
        const issue={type:'same-day-multiple-opponents',team,season:String(season),date,opponents:[...opponents].sort()};
        sameDayMultipleOpponents.push(issue); pushRecent(issue);
      }
    }

    const hist=histories.get(String(season));
    if(hist){
      const expectedGames=Number(hist.games);
      const expectedWins=Number(hist.wins),expectedLosses=Number(hist.losses),expectedTies=Number(hist.ties);
      const expectedPf=Number(hist.pointsFor),expectedPa=Number(hist.pointsAgainst);
      const mismatches={};
      if(Number.isFinite(expectedGames)&&expectedGames!==games.length)mismatches.games={expected:expectedGames,actual:games.length};
      if(Number.isFinite(expectedWins)&&expectedWins!==wins)mismatches.wins={expected:expectedWins,actual:wins};
      if(Number.isFinite(expectedLosses)&&expectedLosses!==losses)mismatches.losses={expected:expectedLosses,actual:losses};
      if(Number.isFinite(expectedTies)&&expectedTies!==ties)mismatches.ties={expected:expectedTies,actual:ties};
      if(scoreCount===games.length && Number.isFinite(expectedPf)&&expectedPf!==pf)mismatches.pointsFor={expected:expectedPf,actual:pf};
      if(scoreCount===games.length && Number.isFinite(expectedPa)&&expectedPa!==pa)mismatches.pointsAgainst={expected:expectedPa,actual:pa};
      if(Object.keys(mismatches).length){
        const issue={type:'season-summary-mismatch',team,season:String(season),mismatches};
        seasonSummaryMismatches.push(issue); pushRecent(issue);
      }
    }
  }
  pageRows.push({team,file,seasons:Object.keys(schedules).length,totalGames});
}

for(const [key,rows] of reciprocalIndex){
  const [teamA,teamB,date]=key.split('|');
  const a=rows.filter(r=>r.team===teamA && r.opponent===teamB);
  const b=rows.filter(r=>r.team===teamB && r.opponent===teamA);
  let ok=a.length===b.length && a.length>0;
  if(ok){
    const sigA=a.map(r=>`${r.teamScore}-${r.opponentScore}`).sort();
    const sigB=b.map(r=>`${r.opponentScore}-${r.teamScore}`).sort();
    ok=JSON.stringify(sigA)===JSON.stringify(sigB);
  }
  if(!ok){
    const season=rows[0]?.season||'';
    const issue={type:'reciprocal-mismatch',teamA,teamB,date,season,sideA:a,sideB:b};
    reciprocalMismatches.push(issue); pushRecent(issue);
  }
}

const counts={
  teamPagesAudited:pageRows.length,
  scheduleRowsAudited:pageRows.reduce((n,x)=>n+x.totalGames,0),
  exactDuplicates:exactDuplicates.length,
  sameDateOpponentConflicts:sameDateOpponentConflicts.length,
  sameDayMultipleOpponents:sameDayMultipleOpponents.length,
  suspiciousRepeatGames:suspiciousRepeatGames.length,
  invalidRows:invalidRows.length,
  seasonSummaryMismatches:seasonSummaryMismatches.length,
  reciprocalMismatches:reciprocalMismatches.length,
  likelyOpponentTypos:likelyOpponentTypos.length,
  recent2025PlusIssues:recentIssues.length
};

const report={
  updatedAt:new Date().toISOString(),
  scope:'Every team-page-data file and every season in its Games section',
  notes:{
    suspiciousRepeatGames:'Flag only: same opponent, score and result repeated on a different date within 14 days. These are not auto-deleted because a real rematch is possible.',
    reciprocalMismatches:'For opponents that also have a team page, both pages should contain matching reversed score/date rows.',
    seasonSummaryMismatches:'Schedule totals are compared with seasonHistory wins/losses/ties/games/points.'
  },
  counts,
  recent2025PlusIssues:recentIssues,
  exactDuplicates,
  sameDateOpponentConflicts,
  sameDayMultipleOpponents,
  suspiciousRepeatGames,
  invalidRows,
  seasonSummaryMismatches,
  reciprocalMismatches,
  likelyOpponentTypos,
  pages:pageRows
};
fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(counts,null,2));

import fs from 'node:fs';

const issues=[];
const error=(code,message,context={})=>issues.push({severity:'error',code,message,context});
const warn=(code,message,context={})=>issues.push({severity:'warning',code,message,context});
const info=(code,message,context={})=>issues.push({severity:'info',code,message,context});
const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const ALIASES={'MONUMENT VAL':'MONUMENT VALLEY'};
const canonical=v=>ALIASES[norm(v)]||norm(v);
const isJuniorVarsity=v=>/(^|\s)J\.?V\.?(\s|$)|JUNIOR\s+VARSITY/i.test(norm(v));
const isOutOfState=v=>/,[ ]?[A-Z]{2}$/.test(norm(v))||/AMERICAN SAMOA|CANADA/i.test(norm(v));
const parseJSON=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch(e){error('INVALID_JSON',`${file} could not be parsed: ${e.message}`);return null}};
const exists=file=>fs.existsSync(file);
const required=['teams-data.json','weekly-simulation.json','standings-2026.json','rankings-current-2026.json','elo-summary.json','deseret-rosters-stats-2026.json'];
for(const file of required)if(!exists(file))error('MISSING_FILE',`Required data file is missing: ${file}`);

const teams=exists('teams-data.json')?parseJSON('teams-data.json'):null;
const weekly=exists('weekly-simulation.json')?parseJSON('weekly-simulation.json'):null;
const standings=exists('standings-2026.json')?parseJSON('standings-2026.json'):null;
const rankings=exists('rankings-current-2026.json')?parseJSON('rankings-current-2026.json'):null;
const elo=exists('elo-summary.json')?parseJSON('elo-summary.json'):null;
const rosters=exists('deseret-rosters-stats-2026.json')?parseJSON('deseret-rosters-stats-2026.json'):null;

const teamSet=new Set();
const teamRows=Array.isArray(teams)?teams:[];
if(teams&&!Array.isArray(teams))error('TEAMS_SCHEMA','teams-data.json must contain an array.');
for(const [i,t] of teamRows.entries()){
  const name=norm(t?.team);
  if(!name){error('TEAM_NAME_MISSING','Team row has no team name.',{index:i});continue}
  if(teamSet.has(name))error('DUPLICATE_TEAM',`Duplicate team in teams-data.json: ${name}`);
  teamSet.add(name);
  if(!String(t?.classification||'').trim())warn('TEAM_CLASS_MISSING',`${name} has no classification.`);
  const logo=String(t?.logo||t?.logoPath||t?.logoUrl||'').trim();
  if(logo&&!/^https?:/i.test(logo)&&!exists(logo.split('?')[0].replace(/^\.\//,'')))warn('TEAM_LOGO_MISSING',`${name} points to a logo file that does not exist.`,{logo});
}

const games=Array.isArray(weekly?.games)?weekly.games:[];
if(weekly&&!Array.isArray(weekly?.games))error('WEEKLY_SCHEMA','weekly-simulation.json must contain a games array.');
const exactGames=new Map(),teamDates=new Map(),completedByTeam=new Map();
const addRec=(team,r)=>{const k=norm(team);if(!teamSet.has(k))return;const x=completedByTeam.get(k)||{wins:0,losses:0,ties:0,games:0};x.games++;if(r==='W')x.wins++;else if(r==='L')x.losses++;else x.ties++;completedByTeam.set(k,x)};
for(const [i,g] of games.entries()){
  const away=norm(g?.awayTeam),home=norm(g?.homeTeam),date=String(g?.date||'').trim();
  if(!date)error('GAME_DATE_MISSING','Game is missing a date.',{index:i,away,home});
  if(!away||!home)error('GAME_TEAM_MISSING','Game is missing an away or home team.',{index:i,date,away,home});
  if(away&&home&&away===home)error('SELF_GAME',`${away} is scheduled against itself.`,{date,index:i});
  if(date&&away&&home){
    const pair=[away,home].sort().join('|'),key=`${date}|${pair}`;
    if(exactGames.has(key))error('DUPLICATE_GAME',`Duplicate matchup on ${date}: ${away} vs ${home}.`,{indexes:[exactGames.get(key),i]}); else exactGames.set(key,i);
    for(const team of [away,home])if(teamSet.has(team)){const k=`${date}|${team}`,arr=teamDates.get(k)||[];arr.push(i);teamDates.set(k,arr)}
  }
  for(const side of ['awayScore','homeScore']){const v=num(g?.[side]);if(v!==null&&(v<0||v>100))warn('SUSPICIOUS_PROJECTION',`Projected score looks unusual: ${g?.[side]}.`,{date,away,home,field:side})}
  const aa=num(g?.actualAway),ah=num(g?.actualHome),one=aa!==null||ah!==null,both=aa!==null&&ah!==null;
  if(one&&!both)error('PARTIAL_FINAL_SCORE',`Only one final score is present for ${away} vs ${home}.`,{date,actualAway:g?.actualAway,actualHome:g?.actualHome});
  if(both){
    if(aa<0||ah<0||aa>150||ah>150)warn('SUSPICIOUS_FINAL_SCORE',`Final score looks unusual: ${away} ${aa}, ${home} ${ah}.`,{date});
    const winner=aa>ah?away:ah>aa?home:'TIE';
    if(g?.actualWinner&&norm(g.actualWinner)!==winner)warn('FINAL_WINNER_MISMATCH',`actualWinner does not match the final score for ${away} vs ${home}.`,{date,stored:g.actualWinner,calculated:winner});
    addRec(away,aa===ah?'T':aa>ah?'W':'L');addRec(home,aa===ah?'T':ah>aa?'W':'L');
  }
  for(const team of [away,home])if(team&&!teamSet.has(team)&&!isOutOfState(team)&&!isJuniorVarsity(team))warn('UNKNOWN_TEAM',`Game uses a team not found in teams-data.json: ${team}`,{date});
}
for(const [key,indexes] of teamDates)if(indexes.length>1)error('MULTIPLE_GAMES_SAME_DATE',`${key.split('|').slice(1).join('|')} appears in ${indexes.length} games on ${key.split('|')[0]}.`,{indexes});

const standingRows=[];
for(const [cls,rows] of Object.entries(standings?.byClassification||{}))for(const row of Array.isArray(rows)?rows:[])standingRows.push({...row,_class:cls});
const seenStandings=new Set();
for(const s of standingRows){const team=norm(s?.team);if(!team){error('STANDING_TEAM_MISSING','A standings row is missing a team.',{classification:s._class});continue}if(seenStandings.has(team))warn('DUPLICATE_STANDING',`${team} appears more than once in current standings.`);seenStandings.add(team);for(const k of ['wins','losses','ties']){const v=num(s?.[k]);if(v!==null&&(v<0||!Number.isInteger(v)))error('INVALID_RECORD',`${team} has an invalid ${k} value.`,{value:s?.[k]})}const calc=completedByTeam.get(team),sw=num(s?.wins)||0,sl=num(s?.losses)||0,st=num(s?.ties)||0;if(calc&&calc.games===sw+sl+st&&(calc.wins!==sw||calc.losses!==sl||calc.ties!==st))warn('RECORD_MISMATCH',`${team} standings record does not match completed games in weekly-simulation.json.`,{standings:`${sw}-${sl}-${st}`,calculated:`${calc.wins}-${calc.losses}-${calc.ties}`});}

const rankedTeams=new Map();
for(const [cls,arr] of Object.entries(rankings?.classifications||{})){
  const local=new Set();
  for(const [i,item] of (Array.isArray(arr)?arr:[]).entries()){
    const team=norm(typeof item==='string'?item:item?.team);
    if(!team){error('RANKING_TEAM_MISSING',`Blank team at ${cls} ranking #${i+1}.`);continue}
    if(local.has(team))error('DUPLICATE_RANKING',`${team} appears twice in ${cls} rankings.`);local.add(team);
    if(rankedTeams.has(team)&&rankedTeams.get(team)!==cls)warn('MULTI_CLASS_RANKING',`${team} appears in both ${rankedTeams.get(team)} and ${cls} rankings.`);else rankedTeams.set(team,cls);
    if(!teamSet.has(team))warn('RANKED_TEAM_UNKNOWN',`${team} is ranked in ${cls} but is not in teams-data.json.`);
  }
}

if(elo&&typeof elo==='object')for(const team of teamSet){const key=canonical(team),row=elo[key]||elo[team];if(!row)warn('ELO_MISSING',`${team} has no ELO summary entry.`);else if(num(row.currentElo)===null)warn('ELO_INVALID',`${team} has a non-numeric current ELO.`,{value:row.currentElo})}

const rosterTeams=Array.isArray(rosters?.teams)?rosters.teams:Object.values(rosters?.teams||{});
const playerIds=new Map();
for(const rt of rosterTeams){const team=norm(rt?.team||rt?.name||rt?.teamName||rt?.school);for(const p of Array.isArray(rt?.roster)?rt.roster:[]){const id=String(p?.playerId||p?.id||'').trim();if(!id){warn('PLAYER_ID_MISSING',`Roster player has no playerId${team?` for ${team}`:''}.`,{name:p?.name});continue}if(playerIds.has(id)&&playerIds.get(id)!==team)warn('DUPLICATE_PLAYER_ID',`playerId ${id} is used by multiple teams.`,{teams:[playerIds.get(id),team]});else playerIds.set(id,team)}}

info('AUDIT_COUNTS','Audit input counts.',{teams:teamRows.length,games:games.length,standings:standingRows.length,rankedTeams:rankedTeams.size,playerIds:playerIds.size});
const errors=issues.filter(x=>x.severity==='error'),warnings=issues.filter(x=>x.severity==='warning');
const report={generatedAt:new Date().toISOString(),summary:{errors:errors.length,warnings:warnings.length,info:issues.filter(x=>x.severity==='info').length},issues};
fs.writeFileSync('data-audit-report.json',JSON.stringify(report,null,2)+'\n');
const md=['# RUS Football Data Audit','',`Generated: ${report.generatedAt}`,'',`**${errors.length} errors • ${warnings.length} warnings**`,''];
for(const sev of ['error','warning','info']){const rows=issues.filter(x=>x.severity===sev);if(!rows.length)continue;md.push(`## ${sev[0].toUpperCase()+sev.slice(1)}s (${rows.length})`,'');for(const x of rows.slice(0,150))md.push(`- **${x.code}** — ${x.message}${Object.keys(x.context||{}).length?` \`${JSON.stringify(x.context)}\``:''}`);if(rows.length>150)md.push(`- …and ${rows.length-150} more.`);md.push('')}
fs.writeFileSync('data-audit-report.md',md.join('\n')+'\n');
console.log(`RUS data audit: ${errors.length} errors, ${warnings.length} warnings.`);
if(errors.length)process.exitCode=1;

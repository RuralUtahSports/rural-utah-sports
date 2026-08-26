import fs from 'node:fs';

const SCORIGAMI_FILE = 'scorigami.json';
const TEAMS_FILE = 'teams-data.json';
const OUTPUT_FILE = 'team-single-game-records.json';
const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ');
const key = value => clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
const score = value => { if (value === null || value === undefined || clean(value) === '') return null; const number = Number(value); return Number.isFinite(number) && number >= 0 ? number : null; };
const dateValue = value => { const parsed = Date.parse(clean(value)); return Number.isFinite(parsed) ? parsed : 0; };
const aliases = new Map(Object.entries({AMERICANLEADERSHIP:'ALA',AMERICANLEADERSHIPACADEMY:'ALA',CEDAR:'CEDAR CITY',DESERETHILLS:'DESERT HILLS',GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISON VALLEY',MAPLEMTN:'MAPLE MOUNTAIN',MONUMENTVAL:'MONUMENT VAL',MONUMENTVALLEY:'MONUMENT VAL',STJOSEPH:'SAINT JOSEPH',UMACAMPWILLIAMS:'UMA-LEHI',UTAHMILITARYACADEMYCAMPWILLIAMS:'UMA-LEHI',UMAHILLFIELD:'UMA-HILLFIELD',UTAHMILITARYACADEMYHILLFIELD:'UMA-HILLFIELD',WASATCHACAD:'WASATCH ACADEMY'}));
if (!fs.existsSync(SCORIGAMI_FILE)) throw new Error(`${SCORIGAMI_FILE} not found`);
if (!fs.existsSync(TEAMS_FILE)) throw new Error(`${TEAMS_FILE} not found`);
const scorigami=JSON.parse(fs.readFileSync(SCORIGAMI_FILE,'utf8')); const teams=JSON.parse(fs.readFileSync(TEAMS_FILE,'utf8'));
const activeByKey=new Map(teams.map(team=>[key(team.team),clean(team.team)])); const records=new Map(teams.map(team=>[clean(team.team),{team:clean(team.team),classification:clean(team.classification),region:clean(team.region),mostPointsScored:null,mostPointsAllowed:null}]));
const activeTeam=rawName=>{const rawKey=key(rawName);const alias=aliases.get(rawKey);return activeByKey.get(key(alias||rawName))||null};
function resultFor(teamScore,opponentScore){return teamScore>opponentScore?'W':teamScore<opponentScore?'L':'T'}
function consider(current,points,game){if(!current||points>current.points)return{points,occurrences:1,...game};if(points!==current.points)return current;const occurrences=current.occurrences+1;if(dateValue(game.date)>dateValue(current.date))return{points,occurrences,...game};return{...current,occurrences}}
let gamesReviewed=0,activeTeamPerspectives=0;
for(const scoreGroup of scorigami.scores||[])for(const game of Array.isArray(scoreGroup.games)?scoreGroup.games:[]){const team1Score=score(game.score1),team2Score=score(game.score2),gameDate=clean(game.date);if(!gameDate||!dateValue(gameDate)||dateValue(gameDate)>Date.now()||team1Score===null||team2Score===null)continue;const team1=activeTeam(game.team1),team2=activeTeam(game.team2);gamesReviewed++;for(const perspective of [{team:team1,opponent:clean(game.team2),teamScore:team1Score,opponentScore:team2Score},{team:team2,opponent:clean(game.team1),teamScore:team2Score,opponentScore:team1Score}]){if(!perspective.team)continue;const row=records.get(perspective.team);const detail={opponent:perspective.opponent,teamScore:perspective.teamScore,opponentScore:perspective.opponentScore,result:resultFor(perspective.teamScore,perspective.opponentScore),date:gameDate,year:Number(game.year)||null};row.mostPointsScored=consider(row.mostPointsScored,perspective.teamScore,detail);row.mostPointsAllowed=consider(row.mostPointsAllowed,perspective.opponentScore,detail);activeTeamPerspectives++}}
const outputRecords=[...records.values()].filter(record=>record.mostPointsScored||record.mostPointsAllowed).sort((a,b)=>a.team.localeCompare(b.team));const payload={summary:{activePrograms:outputRecords.length,gamesReviewed,activeTeamPerspectives},records:outputRecords};fs.writeFileSync(OUTPUT_FILE,`${JSON.stringify(payload)}\n`);console.log(`Built ${OUTPUT_FILE} for ${outputRecords.length} active programs from ${gamesReviewed} completed games.`);

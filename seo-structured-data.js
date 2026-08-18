(()=>{
'use strict';
if(window.__RUS_SEO__)return;window.__RUS_SEO__=true;
const BASE='https://ruralutahsports.github.io/rural-utah-sports/';
const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
const q=new URLSearchParams(location.search);
const escJson=v=>String(v??'').trim();
const cleanTitle=v=>String(v||'').replace(/\s*\|\s*Rural Utah Sports\s*$/i,'').trim();
const setMeta=(attr,key,value)=>{if(!value)return;let el=document.head.querySelector(`meta[${attr}="${key}"]`);if(!el){el=document.createElement('meta');el.setAttribute(attr,key);document.head.appendChild(el)}el.content=value};
const canonicalParams={
 'team.html':['team','season'],'player.html':['id','season'],'game.html':['date','away','home'],'season.html':['year'],'scorigami.html':['score'],'compare.html':['team1','team2'],'player-compare.html':['player1','player2']
};
function canonical(){const url=new URL(path,BASE);for(const key of canonicalParams[path]||[]){const v=q.get(key);if(v)url.searchParams.set(key,v)}return url.href}
function setCanonical(){let l=document.head.querySelector('link[rel="canonical"]');if(!l){l=document.createElement('link');l.rel='canonical';document.head.appendChild(l)}l.href=canonical();setMeta('property','og:url',l.href);setMeta('name','robots','index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1')}
function description(text){if(!text)return;setMeta('name','description',text);setMeta('property','og:description',text);setMeta('name','twitter:description',text)}
function title(text){if(!text)return;document.title=text;setMeta('property','og:title',text);setMeta('name','twitter:title',text)}
function jsonld(id,data){let s=document.getElementById(id);if(!s){s=document.createElement('script');s.type='application/ld+json';s.id=id;document.head.appendChild(s)}s.textContent=JSON.stringify(data)}
function fmtDate(v){const t=Date.parse(String(v||''));return Number.isFinite(t)?new Date(t).toISOString().slice(0,10):''}
function breadcrumb(){const label=cleanTitle(document.title)||'Rural Utah Sports';const items=[{'@type':'ListItem',position:1,name:'Rural Utah Sports',item:BASE}];if(path!=='index.html')items.push({'@type':'ListItem',position:2,name:label,item:canonical()});return {'@type':'BreadcrumbList',itemListElement:items}}
function baseGraph(extra=[]){return {'@context':'https://schema.org','@graph':[
 {'@type':'Organization','@id':BASE+'#organization',name:'Rural Utah Sports',url:BASE,logo:{'@type':'ImageObject',url:BASE+'RUSlogoNew.png'},description:'Utah high school football history, scores, rankings, records, statistics and data.'},
 {'@type':'WebSite','@id':BASE+'#website',url:BASE,name:'Rural Utah Sports',publisher:{'@id':BASE+'#organization'},inLanguage:'en-US'},
 breadcrumb(),...extra
 ]}}
async function get(file){try{const r=await fetch(file);return r.ok?await r.json():null}catch{return null}}
function collection(name,desc){title(`${name} | Rural Utah Sports`);description(desc);jsonld('rus-page-schema',baseGraph([{'@type':'CollectionPage','@id':canonical()+'#page',url:canonical(),name,description:desc,isPartOf:{'@id':BASE+'#website'},publisher:{'@id':BASE+'#organization'}}]))}
async function teamPage(){const team=escJson(q.get('team'));if(!team)return;const season=q.get('season')||'2026';const name=`${team} Football History, Record & Stats | Rural Utah Sports`;const desc=`${team} Utah high school football history, ${season} information, records, rankings, ELO, schedules and results from Rural Utah Sports.`;title(name);description(desc);jsonld('rus-page-schema',baseGraph([{'@type':'SportsTeam','@id':canonical()+'#team',name:team,sport:'American football',url:canonical(),memberOf:{'@type':'SportsOrganization',name:'Utah High School Football'},sameAs:canonical()}]));}
async function gamePage(){const away=escJson(q.get('away')),home=escJson(q.get('home')),date=escJson(q.get('date'));if(!away||!home)return;let detail='';const weekly=await get('weekly-simulation.json');const game=(weekly?.games||[]).find(g=>String(g.awayTeam||'').toUpperCase()===away.toUpperCase()&&String(g.homeTeam||'').toUpperCase()===home.toUpperCase()&&(!date||fmtDate(g.date)===fmtDate(date)));if(game){const a=Number(game.awayScore),h=Number(game.homeScore);if(Number.isFinite(a)&&Number.isFinite(h)){const fav=a===h?'PK':`${a>h?away:home} -${Math.abs(a-h)}`;detail=` RUS projected line: ${fav}.`}}const name=`${away} vs ${home} | Rural Utah Sports Game Center`;const desc=`${away} vs ${home} Utah high school football Game Center with score, records, rankings, ELO and matchup information.${detail}`;title(name);description(desc);const start=fmtDate(date||game?.date);jsonld('rus-page-schema',baseGraph([{'@type':'SportsEvent','@id':canonical()+'#event',name:`${away} vs ${home}`,url:canonical(),sport:'American football',...(start?{startDate:start}:{}),competitor:[{'@type':'SportsTeam',name:away},{'@type':'SportsTeam',name:home}],organizer:{'@type':'Organization',name:'Utah High School Football'},description:desc}]))}
async function playerPage(){const id=escJson(q.get('id')),season=q.get('season')||'2026';if(!id)return;let found=null,team='';for(const yr of [season,'2026','2025']){const data=await get(`deseret-rosters-stats-${yr}.json`);const groups=Array.isArray(data?.teams)?data.teams:Object.values(data?.teams||{});for(const t of groups){const p=(t?.roster||[]).find(x=>String(x?.playerId||x?.id||'')===id);if(p){found=p;team=t?.team||t?.name||t?.teamName||t?.school||'';break}}if(found)break}if(!found)return;const player=found.name||[found.firstName,found.lastName].filter(Boolean).join(' ')||id;const name=`${player} Football Stats | Rural Utah Sports`;const desc=`${player}${team?` of ${team}`:''} Utah high school football profile, roster information and statistics from Rural Utah Sports.`;title(name);description(desc);jsonld('rus-page-schema',baseGraph([{'@type':'Person','@id':canonical()+'#person',name:player,url:canonical(),description:desc,...(team?{affiliation:{'@type':'SportsTeam',name:team,sport:'American football'}}:{})}]))}
function generic(){const existing=cleanTitle(document.title)||'Rural Utah Sports';jsonld('rus-page-schema',baseGraph([{'@type':'WebPage','@id':canonical()+'#page',url:canonical(),name:existing,isPartOf:{'@id':BASE+'#website'},publisher:{'@id':BASE+'#organization'}}]))}
async function run(){setCanonical();setMeta('property','og:type','website');setMeta('property','og:image',BASE+'RUSlogoNew.png');setMeta('name','twitter:card','summary_large_image');setMeta('name','twitter:image',BASE+'RUSlogoNew.png');if(path==='team.html')return teamPage();if(path==='game.html')return gamePage();if(path==='player.html')return playerPage();const collections={
 'rankings.html':['Utah High School Football Rankings','Current Rural Utah Sports Utah high school football rankings by classification.'],
 'standings.html':['Utah High School Football Standings','Current Utah high school football standings and region races.'],
 'scoreboard.html':['Utah High School Football Scoreboard','Current Utah high school football scores, finals and RUS projected lines.'],
 'games.html':['Utah High School Football Games','Search and explore Utah high school football game results and history.'],
 'teams.html':['Utah High School Football Teams','Browse Utah high school football team pages, records, schedules and history.'],
 'stat-leaders.html':['Utah High School Football Stat Leaders','Current Utah high school football individual statistical leaders.'],
 'team-stats.html':['Utah High School Football Team Stats','Current Utah high school football team statistical leaders.'],
 'records.html':['Utah High School Football Records','Utah high school football records, milestones and historical leaders.'],
 'elo.html':['Utah High School Football ELO Ratings','Rural Utah Sports ELO power ratings for Utah high school football.'],
 'scorigami.html':['Utah High School Football Scorigami','Explore unique final scores in the Rural Utah Sports Utah football database.'],
 'whats-new.html':["What's New at Rural Utah Sports",'Recent Rural Utah Sports site updates, features and data improvements.']
 };if(collections[path])return collection(...collections[path]);generic()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();

import fs from 'node:fs';
const BASE='https://ruralutahsports.github.io/rural-utah-sports/';
const esc=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const read=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return null}};
const staticPages=[
 'index.html','scoreboard.html','game-week.html','teams.html','my-teams.html','games.html','rankings.html','standings.html','storylines.html',
 'stat-leaders.html','weekly-awards.html','team-stats.html','mvp-race.html','all-utah.html','all-state-watch.html','awards-2025.html','elo.html','playoff-picture.html','upsets.html','scorigami.html','fantasy-football.html','out-of-state.html','compare.html','player-compare.html','map.html',
 'championships.html','season.html','historical-rankings.html','programs.html','streaks.html','milestones.html','rivalry.html','dynasty.html','history-lab.html','greatest-seasons.html','records.html','simulators.html','promotion-relegation.html',
 'about.html','methodology.html','media.html','corrections.html','whats-new.html'
];
const urls=new Map();
const add=(href,priority='0.6',changefreq='weekly')=>{try{const u=new URL(href,BASE);urls.set(u.href,{loc:u.href,priority,changefreq})}catch{}};
for(const p of staticPages)add(p,p==='index.html'?'1.0':['scoreboard.html','rankings.html','standings.html'].includes(p)?'0.9':'0.6',p==='scoreboard.html'?'hourly':['rankings.html','standings.html','stat-leaders.html','weekly-awards.html','team-stats.html'].includes(p)?'daily':'weekly');
const teams=read('teams-data.json');
if(Array.isArray(teams))for(const t of teams){const team=String(t?.team||'').trim();if(team)add(`team.html?team=${encodeURIComponent(team)}`,'0.8','weekly')}
const weekly=read('weekly-simulation.json');
for(const g of weekly?.games||[]){if(!g?.awayTeam||!g?.homeTeam||!g?.date)continue;const q=new URLSearchParams({date:g.date,away:g.awayTeam,home:g.homeTeam});add(`game.html?${q}`,'0.75','daily')}
const roster=read('deseret-rosters-stats-2026.json');
const groups=Array.isArray(roster?.teams)?roster.teams:Object.values(roster?.teams||{});
for(const group of groups)for(const p of group?.roster||[]){const id=String(p?.playerId||p?.id||'').trim();if(id)add(`player.html?id=${encodeURIComponent(id)}&season=2026`,'0.65','weekly')}
const body=[...urls.values()].map(x=>`  <url>\n    <loc>${esc(x.loc)}</loc>\n    <changefreq>${x.changefreq}</changefreq>\n    <priority>${x.priority}</priority>\n  </url>`).join('\n');
fs.writeFileSync('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
console.log(`Built sitemap.xml with ${urls.size} URLs.`);

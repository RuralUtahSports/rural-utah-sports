/* Compact corrected season totals. Keep original stat definitions and provenance. */
const fs=require('node:fs');
const data=JSON.parse(fs.readFileSync('deseret-rosters-stats-2026.json','utf8'));
const teams={};for(const [name,t] of Object.entries(data.teams))teams[name]={stats:t.stats,statsUrl:t.statsUrl,maxprepsStatsUrl:t.maxprepsStatsUrl,maxprepsLastUpdated:t.maxprepsLastUpdated,manualCorrections:t.manualCorrections};
fs.writeFileSync('game-center-player-totals-2026.json',JSON.stringify({season:data.season,updatedAt:data.updatedAt,source:'deseret-rosters-stats-2026.json (merged corrections and fallback)',teams}));
console.log('Compacted corrected player totals:',Object.keys(teams).length,'teams');

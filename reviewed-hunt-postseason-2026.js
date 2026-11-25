/* Source-reviewed full-season display and three partial playoff box scores.
 * Keep the independent regular-season review unchanged. */
(function(root){
 'use strict';
 const evidence={
  "team": "MOUNTAIN RIDGE",
  "id": "mountain-ridge-11-jaxon-hunt",
  "number": "11",
  "name": "Jaxon Hunt",
  "seasonSource": "https://www.maxpreps.com/ut/association/utah-high-school-activities-association/football/stat-leaders/offense/passing/yds/",
  "athleteSource": "https://www.maxpreps.com/ut/herriman/mountain-ridge-sentinels/athletes/jaxon-hunt/football/stats/?careerid=96678ijsllf11",
  "games": 13,
  "reviewedAsOf": "2026-11-24",
  "totals": {
    "Passing": {
      "YARDS": "4275",
      "COMP-ATT": "300-452",
      "COMP%": "66.37",
      "YARDS/COMP.": "14.25",
      "TD": "53",
      "Int": "13"
    },
    "Rushing": {
      "YARDS": "181",
      "TD": "4"
    },
    "Receiving": {
      "RECEPTIONS": "1",
      "YARDS": "10",
      "TD": "1"
    }
  },
  "contests": [
    {
      "date": "2026-10-30",
      "opponent": "CEDAR VALLEY",
      "teamScore": 50,
      "opponentScore": 6,
      "location": "Home",
      "url": "https://www.maxpreps.com/ut/football/game/cedar-valley-eagle-mountain-vs-mountain-ridge-herriman/10-30-2026/?c=c265ac77-8084-43a8-8ed3-dee4d1666bba",
      "source": "https://www.maxpreps.com/news/P1VbHBbcB0WfdCKxCzPRkQ/football-recap-mountain-ridge-rolls-to-its-11th-straight-win.htm",
      "lines": {
        "Passing": {
          "YARDS": "167",
          "TD": "3",
          "Int": "1"
        }
      }
    },
    {
      "date": "2026-11-06",
      "opponent": "LONE PEAK",
      "teamScore": 42,
      "opponentScore": 3,
      "location": "Home",
      "url": "https://www.maxpreps.com/ut/football/game/lone-peak-highland-vs-mountain-ridge-herriman/11-6-2026/?c=d43ca007-fa5a-41d4-a7b4-42dc10e53c86",
      "source": "https://www.maxpreps.com/news/SPnvMBg7c0GMHFL0_tbJRg/football-recap-mountain-ridge-rolls-to-its-12th-straight-win.htm",
      "lines": {
        "Passing": {
          "YARDS": "371",
          "TD": "4",
          "Int": "1"
        },
        "Rushing": {
          "TD": "1"
        }
      }
    },
    {
      "date": "2026-11-12",
      "opponent": "CORNER CANYON",
      "teamScore": 28,
      "opponentScore": 34,
      "location": "Neutral",
      "url": "https://www.maxpreps.com/ut/football/game/corner-canyon-draper-vs-mountain-ridge-herriman/11-12-2026/?c=2f1acc8e-39bd-4a5f-96eb-da00cb6c7801",
      "source": "https://www.maxpreps.com/m/news/aCXb3wx_AE6SA894lgj_HA/football-recap-jaxon-hunts-td-throws-keep-coming.htm",
      "lines": {
        "Passing": {
          "YARDS": "350",
          "TD": "2",
          "Int": "6"
        },
        "Rushing": {
          "TD": "2"
        }
      }
    }
  ]
};
 const norm=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 const matches=p=>p.playerId===evidence.id&&norm(p.name)===norm(evidence.name)&&String(p.number)===evidence.number;
 const keyFor=(v,k)=>Object.keys(v||{}).find(x=>norm(x)===norm(k))||k;
 function applyTeam(school){
  if(!school)return 0;
  const roster=(school.roster||[]).filter(matches);if(roster.length!==1)return 0;
  let n=0;
  for(const [category,fields] of Object.entries(evidence.totals)){
   const sections=(school.stats||[]).filter(s=>norm(s.category)===norm(category));if(sections.length!==1)continue;
   const hits=sections[0].rows.filter(matches);if(hits.length!==1)continue;
   const row=hits[0];row.values||={};row.statSources||={};row.statEvidence||={};
   for(const [field,value] of Object.entries(fields)){const key=keyFor(row.values,field);row.values[key]=value;row.statSources[key]='MaxPreps • full season, Nov 17';row.statEvidence[key]={scope:'reported-season-including-playoffs',games:13,source:evidence.seasonSource,reviewedAsOf:evidence.reviewedAsOf};if(!sections[0].headers.some(h=>norm(h)===norm(key)))sections[0].headers.push(key);n++;}
   // Do not display stale rushing attempts/rate beside a verified new yardage total.
   if(category==='Rushing')for(const key of Object.keys(row.values))if(['CARRIES','YARDSCARRY','YARDSATT'].includes(norm(key))){delete row.values[key];delete row.statSources[key];delete row.statEvidence[key];}
  }
  return n;
 }
 function apply(payload){if(payload?.season!==2026||!payload.teams)return 0;const hit=Object.entries(payload.teams).filter(([k])=>norm(k)===norm(evidence.team));return hit.length===1?applyTeam(hit[0][1]):0;}
 function applyGames(teamGames){
  if(!teamGames||!Array.isArray(teamGames.games))return 0;
  let fields=0;
  for(const contest of evidence.contests){
   const hits=teamGames.games.filter(g=>String(g.date)===contest.date&&norm(g.opponent)===norm(contest.opponent));if(hits.length>1)continue;
   let g=hits[0];if(!g){g={date:contest.date,opponent:contest.opponent,teamScore:contest.teamScore,opponentScore:contest.opponentScore,location:contest.location,url:contest.url,maxprepsUrl:contest.url,final:true,status:'Final',players:[],scoringPlays:[],manualPartialStats:true};teamGames.games.push(g);}
   g.players||=[];const people=g.players.filter(p=>p.playerId===evidence.id||norm(p.name)===norm(evidence.name)&&String(p.number)===evidence.number);if(people.length>1||people.length===1&&!matches(people[0]))continue;
   let p=people[0];if(!p){p={playerId:evidence.id,name:evidence.name,number:evidence.number,statLines:[],scoringPlays:[]};g.players.push(p);}
   for(const [category,values] of Object.entries(contest.lines)){
    const lines=(p.statLines||[]).filter(l=>norm(l.category)===norm(category));if(lines.length>1)continue;
    let line=lines[0];if(!line){line={category,values:{},statSources:{}};(p.statLines||=[]).push(line);}
    for(const [field,value] of Object.entries(values)){const key=keyFor(line.values,field);if(line.values[key]!==undefined&&String(line.values[key])!==''&&String(line.values[key])!==value)continue;(line.values||={})[key]=value;(line.statSources||={})[key]='Reviewed MaxPreps game recap';(line.statEvidence||={})[key]={source:contest.source,scope:'postseason'};fields++;}
   }
  }
  teamGames.games.sort((a,b)=>String(a.date).localeCompare(String(b.date)));return fields;
 }
 const api={apply,applyTeam,applyGames,evidence};if(typeof module==='object'&&module.exports)module.exports=api;else root.RUSHuntPostseason2026=api;
})(typeof globalThis!=='undefined'?globalThis:this);

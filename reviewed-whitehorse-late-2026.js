/* Selected final Whitehorse totals. Never apply to regular-season-only or individual game stats. */
(function(root){'use strict';
const players=[
  {
    "number": "12",
    "name": "Hunter Tsinigine",
    "grade": "Jr.",
    "position": "LB, HB",
    "stats": {
      "Rushing": {
        "CARRIES": 227,
        "YARDS": 2623,
        "TD": 17
      },
      "Receiving": {
        "RECEPTIONS": 4,
        "YARDS": 91,
        "TD": 1
      },
      "Defense/Special Teams": {
        "TACKLES": 141
      }
    },
    "id": "whitehorse-12-hunter-tsinigine",
    "url": "https://www.maxpreps.com/ut/montezuma-creek/whitehorse-raiders/athletes/hunter-tsinigine/football/stats/?careerid=bgls02g1n1prb"
  },
  {
    "number": "2",
    "name": "Dillion Leo",
    "grade": "Sr.",
    "position": "WR",
    "stats": {
      "Receiving": {
        "RECEPTIONS": 73,
        "YARDS": 1250,
        "TD": 7
      },
      "Defense/Special Teams": {
        "PASS INT.": 8,
        "PASS INT YDS": 222,
        "PASS INT AVG": 27.75
      }
    },
    "id": "whitehorse-2-dillion-leo",
    "url": "https://www.maxpreps.com/ut/montezuma-creek/whitehorse-raiders/athletes/dillion-leo/football/stats/?careerid=b08mbrb6lrvee"
  },
  {
    "number": "85",
    "name": "Adam Joe",
    "grade": "Sr.",
    "position": "TE, DE",
    "stats": {
      "Passing": {
        "YARDS": 18,
        "COMP-ATT": "1-1",
        "TD": 0,
        "Int": 0
      },
      "Rushing": {
        "CARRIES": 1,
        "YARDS": 25,
        "TD": 0
      },
      "Receiving": {
        "RECEPTIONS": 78,
        "YARDS": 1157,
        "TD": 13
      },
      "Defense/Special Teams": {
        "TACKLES": 138,
        "PASS INT.": 4,
        "PASS INT YDS": 42,
        "PASS INT AVG": 10.5
      }
    },
    "id": "whitehorse-85-adam-joe",
    "url": "https://www.maxpreps.com/ut/montezuma-creek/whitehorse-raiders/athletes/adam-joe/football/stats/?careerid=5clg0f7ihhcn7"
  },
  {
    "number": "8",
    "name": "Tyrell Black",
    "grade": "Jr.",
    "position": "QB, S",
    "stats": {
      "Passing": {
        "YARDS": 2095,
        "COMP-ATT": "119-204",
        "TD": 21,
        "Int": 9
      },
      "Rushing": {
        "CARRIES": 44,
        "YARDS": 356,
        "TD": 0
      }
    },
    "id": "whitehorse-8-tyrell-black",
    "url": "https://www.maxpreps.com/ut/montezuma-creek/whitehorse-raiders/athletes/tyrell-black/football/stats/?careerid=rff4hft3p17sc"
  }
],teamURL="https://www.maxpreps.com/ut/montezuma-creek/whitehorse-raiders/football/stats/",defenseURL="https://www.maxpreps.com/football/stat-leaders/defense/tackles/tot-tcks/?teamsize=23",note="Selected Whitehorse cumulative stats reflect MaxPreps' November 18 coach update (11 games, playoffs included). Other fields may be incomplete. Ten game logs are available; no missing game lines were inferred.";
const norm=v=>String(v??"").toUpperCase().replace(/[^A-Z0-9]/g,"");
function applyTeam(school){
 if(!school||!Array.isArray(school.stats))return 0;
 let n=0;school.roster ||= [];
 for(const p of players){
  const match=r=>r.playerId===p.id||norm(r.name)===norm(p.name)&&String(r.number)===p.number;
  const rr=school.roster.filter(match);if(rr.length>1)throw Error("Ambiguous roster "+p.name);
  let r=rr[0];if(!r){r={playerId:p.id,number:p.number,name:p.name,maxprepsOnly:true};school.roster.push(r);}
  r.class ||=p.grade;r.position ||=p.position;
  for(const [cat,values] of Object.entries(p.stats)){
   let s=school.stats.find(s=>norm(s.category)===norm(cat));
   if(!s){s={category:cat,headers:[],rows:[]};school.stats.push(s);}
   const hits=s.rows.filter(match);if(hits.length>1)throw Error("Ambiguous stat "+p.name);
   let row=hits[0];if(!row){row={playerId:r.playerId,number:p.number,name:p.name,rosterMatched:true,values:{}};s.rows.push(row);}
   row.values ||= {};row.statSources ||= {};row.statEvidence ||= {};
   for(const [k,v] of Object.entries(values)){
    const key=Object.keys(row.values).find(x=>norm(x)===norm(k))||k;
    row.values[key]=String(v);
    row.statSources[key]="MaxPreps · Nov 18, 2026";
    row.statEvidence[key]={scope:"reported-season-including-playoffs",games:11,source:k==="TACKLES"?defenseURL:k==="PASS INT."?teamURL:p.url,reviewedAsOf:"2026-11-24"};
    if(!s.headers.some(h=>norm(h)===norm(key)))s.headers.push(key);n++;
   }
  }
 }
 school.lateMaxPrepsNote=note;return n;
}
function apply(payload){if(payload?.season!==2026||!payload.teams)return 0;const hits=Object.entries(payload.teams).filter(([key])=>norm(key)==='WHITEHORSE');return hits.length===1?applyTeam(hits[0][1]):0;}
const api={apply,applyTeam,players};if(typeof module==='object'&&module.exports)module.exports=api;else root.RUSWhitehorseLate2026=api;
})(typeof globalThis!=='undefined'?globalThis:this);

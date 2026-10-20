(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const state = { ratings: null, games: [], venue: "neutral", home: 2.5, logos: {}, format: "11P", historyIndex: null, historyProblem: false, historyFor: "", historyShown: 5 };
  const safeColor = value => /^#[\da-f]{6}$/i.test(String(value || "")) ? value : "#f14d07";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const validScore = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;
  const pretty = n => Number.isInteger(n) ? String(n) : n.toFixed(1);
  const todaySuffix = iso => iso ? iso.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$2/$3/$1") : "date unavailable";
  const parseGameDate = value => {
    const m = /^(\d{1,2})\/(\d{1,2})\/(2026)$/.exec(String(value || ""));
    return m ? Date.UTC(+m[3], +m[1] - 1, +m[2]) : NaN;
  };
  const initials = name => String(name || "?").split(/[\s-]+/).map(x => x[0] || "").slice(0,3).join("").toUpperCase();

  function finals(rows) {
    const keys = new Set();
    const out = [];
    for (const game of Array.isArray(rows) ? rows : []) {
      if (!game || !game.awayTeam || !game.homeTeam || !Number.isFinite(parseGameDate(game.date))) continue;
      if (!validScore(game.actualAway) || !validScore(game.actualHome)) continue;
      const away = Number(game.actualAway), home = Number(game.actualHome);
      if (away + home === 0) continue;
      const declared = String(game.actualWinner || "").trim().toUpperCase();
      if (!declared) continue; // A projected score alone must never look like a final.
      const actual = away > home ? String(game.awayTeam).toUpperCase() : home > away ? String(game.homeTeam).toUpperCase() : "TIE";
      if (declared !== actual) continue; // Skip any inconsistent game until the feed is corrected.
      const date = parseGameDate(game.date);
      const a = String(game.awayTeam).toUpperCase(), h = String(game.homeTeam).toUpperCase();
      const key = date + "|" + [a,h].sort().join("|");
      if (keys.has(key)) continue;
      keys.add(key);
      out.push({...game, awayTeam:a, homeTeam:h, away, home, stamp:date });
    }
    return out.sort((a,b) => b.stamp - a.stamp || a.awayTeam.localeCompare(b.awayTeam));
  }

  function teamsForFormat() {
    return state.ratings?.[state.format]?.teams || [];
  }
  function rating(name) {
    return teamsForFormat().find(row => row.name === name) || null;
  }
  function readQuery() {
    const p = new URLSearchParams(window.location.search);
    return {
      format: p.get("format") === "8P" ? "8P" : "11P",
      a: (p.get("a") || "").toUpperCase(),
      b: (p.get("b") || "").toUpperCase(),
      venue: ["neutral","a","b"].includes(p.get("venue")) ? p.get("venue") : "neutral",
      home: /^(\d+)(?:\.(\d+))?$/.test(p.get("hfa") || "") ? Math.min(6,Math.max(0,Math.round(Number(p.get("hfa")) * 2) / 2)) : 2.5
    };
  }

  function populate(preferA,preferB) {
    const rows = teamsForFormat().slice().sort((a,b) => a.name.localeCompare(b.name));
    const options = rows.map(row => '<option value="' + esc(row.name) + '">' + esc(row.name) + ' · ' + esc(row.classification) + '</option>').join("");
    $("teamA").innerHTML = options;
    $("teamB").innerHTML = options;
    const preferred = state.format === "8P" ? ["RICH","MILFORD"] : ["MORGAN","GRANTSVILLE"];
    const names = new Set(rows.map(row=>row.name));
    let first = names.has(preferA) ? preferA : (names.has(preferred[0]) ? preferred[0] : rows[0]?.name);
    let second = names.has(preferB) && preferB !== first ? preferB : (names.has(preferred[1]) && preferred[1] !== first ? preferred[1] : rows.find(x=>x.name!==first)?.name);
    $("teamA").value = first || "";
    $("teamB").value = second || "";
    $("teamA").disabled = rows.length < 2;
    $("teamB").disabled = rows.length < 2;
    $("format").value = state.format;
  }

  function venueControls() {
    document.querySelectorAll("[data-venue]").forEach(el => el.setAttribute("aria-pressed",String(el.dataset.venue === state.venue)));
    $("homePoints").value = String(state.home);
    $("homeOutput").textContent = pretty(state.home) + " pts";
  }
  function updateUrl() {
    const p = new URLSearchParams();
    p.set("format",state.format);p.set("a",$("teamA").value);p.set("b",$("teamB").value);
    p.set("venue",state.venue);
    if (state.home !== 2.5) p.set("hfa",String(state.home));
    window.history.replaceState(null,"",window.location.pathname + "?" + p.toString());
  }

  function renderLogo(container, team, color) {
    const path = state.logos[team];
    if (!path) return '<div class="initials" style="color:' + color + '">' + esc(initials(team)) + '</div>';
    return '<img src="' + esc(path) + '" alt="" loading="lazy" data-fallback="' + esc(initials(team)) + '">';
  }
  function renderCard(id,row) {
    const element = $(id), name = row.name, color = safeColor(row.backgroundColor);
    element.style.setProperty("--team-color",color);
    element.innerHTML = renderLogo(element,name,color) +
      '<h3>' + esc(name) + '</h3><div class="meta">' + esc(row.classification) + ' · ' + esc(row.region || "Utah") + '</div><div class="rating">' + row.rating + '<span>RUS POWER</span></div>';
    element.querySelectorAll("img").forEach(img => {
      img.addEventListener("error", () => {
        img.replaceWith(Object.assign(document.createElement("div"),{className:"initials",textContent:initials(name)}));
      }, {once:true});
    });
  }
  function recent(team, target) {
    const rows = state.games.filter(g => g.awayTeam === team || g.homeTeam === team).slice(0,5);
    if (!rows.length) {$(target).innerHTML = '<div class="empty">No verified 2026 finals available for this team in the current feed.</div>';return;}
    $(target).innerHTML = rows.map(g => {
      const isAway = g.awayTeam === team, other = isAway ? g.homeTeam : g.awayTeam;
      const us = isAway ? g.away : g.home, them = isAway ? g.home : g.away;
      const kind = us > them ? "win" : us < them ? "loss" : "tie";
      const flag = kind==="win"?"W":kind==="loss"?"L":"T";
      return '<div class="result-row"><span class="date">'+esc(g.date)+'</span><span class="opponent"><span class="wl '+kind+'">'+flag+'</span>'+ (isAway?"@ ":"vs ") +esc(other)+'</span><span class="score">'+us+'–'+them+'</span></div>';
    }).join("");
  }

  // Historic rivalry records are loaded from the same Clean Games/Scorigami
  // database as the public RUS Rivalry Hub. The verified weekly feed can
  // supersede a conflicting historical entry for the same 2026 meeting.
  const HISTORIC_ALIASES = {
    "CEDAR":"CEDAR CITY", "CEDAR HIGH":"CEDAR CITY",
    "GRAND COUNTY":"GRAND", "GUNNISON":"GUNNISON VALLEY",
    "MONUMENT VAL":"MONUMENT VALLEY", "WASATCH ACAD":"WASATCH ACADEMY",
    "AMERICAN LEADERSHIP ACADEMY":"ALA", "ST. JOSEPH":"SAINT JOSEPH",
    "ST JOSEPH":"SAINT JOSEPH", "LAYTON CHRISTIAN ACADEMY":"LAYTON CHRISTIAN"
  };
  const canonical = name => {
    let n = String(name ?? "").trim().toUpperCase().replace(/\s+/g," ").replace(/\.+$/,"");
    if (n.startsWith("WASATCH ACAD")) return "WASATCH ACADEMY";
    return HISTORIC_ALIASES[n] || n;
  };
  const pairKey = (a,b) => [canonical(a),canonical(b)].sort().join("|");
  const historicalDate = value => {
    const s=String(value ?? "").trim();
    let m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (m) return {stamp:Date.UTC(+m[3],+m[1]-1,+m[2]),key:[+m[3],+m[1],+m[2]].join("-")};
    m=/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|T)/.exec(s);
    if (m) return {stamp:Date.UTC(+m[1],+m[2]-1,+m[3]),key:[+m[1],+m[2],+m[3]].join("-")};
    m=/\b(18\d{2}|19\d{2}|20\d{2})\b/.exec(s);
    return m?{stamp:Date.UTC(+m[1],0,1),key:m[1]+"-year"}:null;
  };
  function historicRecord(g) {
    if (!g || !g.date) return null;
    const a=canonical(g.tie?g.team1:g.winner), b=canonical(g.tie?g.team2:g.loser);
    const s1=g.tie?g.score1:g.winnerScore, s2=g.tie?g.score2:g.loserScore;
    if (!a || !b || a===b || !validScore(s1) || !validScore(s2)) return null;
    const date=historicalDate(g.date);
    if (!date || !Number.isFinite(date.stamp) || date.stamp>Date.now()) return null;
    const first=Number(s1),second=Number(s2);
    if (!g.tie && first<=second) return null;
    if (g.tie && first!==second) return null;
    return {date:String(g.date),stamp:date.stamp,dateKey:date.key,team1:a,team2:b,score1:first,score2:second};
  }
  function buildHistoryIndex(data) {
    const index=new Map(), seen=new Set();
    for (const block of (Array.isArray(data?.scores)?data.scores:[])) {
      for (const entry of (Array.isArray(block.games)?block.games:[])) {
        const game=historicRecord(entry);
        if (!game) continue;
        const key=pairKey(game.team1,game.team2);
        const dedup=key+"|"+game.dateKey+"|"+[
          [game.team1,game.score1],[game.team2,game.score2]
        ].sort((x,y)=>x[0].localeCompare(y[0])).map(x=>x.join(":")).join("|");
        if (seen.has(dedup)) continue;
        seen.add(dedup);
        if(!index.has(key))index.set(key,[]);
        index.get(key).push(game);
      }
    }
    for (const list of index.values()) list.sort((x,y)=>y.stamp-x.stamp);
    return index;
  }
  function currentMeetings(a,b) {
    return state.games.filter(g=>pairKey(g.awayTeam,g.homeTeam)===pairKey(a,b)).map(g=>{
      const date=historicalDate(g.date);
      return {date:g.date,stamp:g.stamp,dateKey:date?.key||g.date,team1:g.awayTeam,team2:g.homeTeam,score1:g.away,score2:g.home};
    });
  }
  function recordedMeetings(a,b) {
    const current=currentMeetings(a,b);
    if (!state.historyIndex) return current;
    // If a final has since been verified in the weekly feed, prefer it
    // to an older score for the same date/pair in the history snapshot.
    const currentDates=new Set(current.map(g=>g.dateKey));
    const historic=(state.historyIndex.get(pairKey(a,b))||[]).filter(g=>
      !(new Date(g.stamp).getUTCFullYear()===2026 && currentDates.has(g.dateKey))
    );
    const seen=new Set(), result=[];
    for(const g of [...historic,...current]){
      const match=pairKey(g.team1,g.team2);
      const scoreKey=match+"|"+g.dateKey+"|"+[
        [g.team1,g.score1],[g.team2,g.score2]
      ].sort((x,y)=>x[0].localeCompare(y[0])).map(x=>x.join(":")).join("|");
      if(seen.has(scoreKey)) continue;
      seen.add(scoreKey); result.push(g);
    }
    return result.sort((x,y)=>y.stamp-x.stamp || x.date.localeCompare(y.date));
  }
  function headToHead(a,b) {
    const key=pairKey(a,b);
    if (state.historyFor!==key) {state.historyFor=key;state.historyShown=5;}
    const matches=recordedMeetings(a,b);
    const loaded=!!state.historyIndex;
    const label=loaded?"recorded all-time meetings":"verified 2026 meetings";
    if(!matches.length && !loaded && !state.historyProblem){
      $("h2h").innerHTML='<div class="empty" role="status">Loading the complete historical matchup archive…</div>';
      return;
    }
    if(!matches.length){
      $("h2h").innerHTML='<div class="empty">'+(state.historyProblem
        ?"Historical matchup records could not be loaded. Try refreshing the page."
        :"No recorded meetings between these teams were found in RUS’s historical database.")+'</div>';
      return;
    }
    const winsA=matches.filter(g=>(g.team1===canonical(a)?g.score1:g.score2)>(g.team1===canonical(a)?g.score2:g.score1)).length;
    const winsB=matches.filter(g=>(g.team1===canonical(b)?g.score1:g.score2)>(g.team1===canonical(b)?g.score2:g.score1)).length;
    const ties=matches.length-winsA-winsB;
    const count=Math.min(state.historyShown,matches.length);
    const summary='<div class="series-summary"><strong>'+matches.length+' '+label+'</strong><span>'+esc(a)+' '+winsA+' – '+winsB+(ties?' – '+ties:'')+' '+esc(b)+'</span><small>Showing '+count+' of '+matches.length+' · newest first</small></div>';
    const note=(!loaded?'<p class="note">'+(state.historyProblem
      ?"Historical archive temporarily unavailable; showing verified 2026 results only."
      :"Loading historical games; 2026 results shown for now…")+'</p>':'');
    const rows=matches.slice(0,count).map(g=>{
      const aScore=g.team1===canonical(a)?g.score1:g.score2;
      const bScore=g.team1===canonical(b)?g.score1:g.score2;
      const result=aScore>bScore?'W':aScore<bScore?'L':'T';
      const winner=aScore>bScore?a:bScore>aScore?b:"Tie";
      return '<div class="result-row historic-row"><span class="date">'+esc(g.date)+'</span><span class="opponent">'+
        '<span class="wl '+(result==='W'?'win':result==='L'?'loss':'tie')+'">'+result+'</span>'+
        esc(a)+' '+aScore+'–'+bScore+' '+esc(b)+'</span><span class="score">'+esc(winner)+'</span></div>';
    }).join("");
    const remaining=matches.length-count;
    const more=(loaded && remaining>0)?'<button type="button" id="h2hMore" class="history-more">See More · '+remaining+' older '+(remaining===1?'game':'games')+'</button>':'';
    const less=(loaded&&count>5)?'<button type="button" id="h2hLess" class="history-less">Show fewer</button>':'';
    $("h2h").innerHTML=summary+note+rows+(more||less?'<div class="history-buttons">'+more+less+'</div>':'');
    const rivalry=$("rivalryLink");
    if(rivalry)rivalry.href="rivalry.html?"+new URLSearchParams({team1:a,team2:b}).toString();
  }
  async function loadHistory() {
    try {
      const response=await fetch("scorigami.json",{cache:"default"});
      if(!response.ok)throw new Error("Scorigami HTTP "+response.status);
      const data=await response.json();
      state.historyIndex=buildHistoryIndex(data);
    }catch(error){
      state.historyProblem=true;
      console.warn("Game Center: historical archive could not be loaded",error);
    }
    if(state.ratings && $("teamA").value && $("teamB").value){
      headToHead($("teamA").value,$("teamB").value);
      window.dispatchEvent(new Event("rus:game-center-history-ready"));
    }
  }


  function matchup() {
    const a = rating($("teamA").value), b = rating($("teamB").value);
    if (!a || !b || a.name === b.name) return null;
    const neutral = a.rating - b.rating;
    const adjustment = state.venue === "a" ? state.home : state.venue === "b" ? -state.home : 0;
    const difference = neutral + adjustment;
    return {a,b,neutral,adjustment,difference, favorite:difference>0?a.name:difference<0?b.name:null,spread:Math.abs(difference), baseline: state.home===window.RUSPowerRatings.HOME_FIELD};
  }

  function render() {
    const m = matchup(), error = $("matchupError");
    if (!m) {
      error.textContent = "Choose two different teams from the same football format.";
      error.hidden = false;
      $("spread").textContent = "—";
      $("saveGraphic").disabled = true;$("copyLink").disabled = true;
      return;
    }
    error.hidden = true;
    const {a,b,neutral,adjustment,difference} = m;
    renderCard("cardA",a);renderCard("cardB",b);
    const result = m.favorite ? m.favorite + " by " + pretty(m.spread) : "Even matchup";
    $("spread").textContent = result;
    $("locationNote").textContent = state.venue==="neutral"?"Neutral field":(state.venue==="a"?a.name:b.name)+" home";
    $("projectionType").textContent = m.baseline?"RUS MODEL BASELINE":"CUSTOM WHAT-IF";
    $("ratingDiff").textContent = pretty(Math.abs(neutral)) + (neutral>0?" · "+a.name:neutral<0?" · "+b.name:" · even");
    $("venueAdjustment").textContent = adjustment===0?"0 points":(adjustment>0?"+":"")+pretty(adjustment)+" to A";
    $("gamesAnalyzed").textContent = state.ratings[state.format].games;
    $("modelDate").textContent = "Ratings updated through " + todaySuffix(state.ratings[state.format].updatedThrough);
    const width = Math.max(5,Math.min(95,50+(a.rating-b.rating)/2));
    $("barA").style.width=width+"%";$("barB").style.width=(100-width)+"%";
    $("barA").style.background=safeColor(a.backgroundColor);
    $("barB").style.background=safeColor(b.backgroundColor);
    $("barLabelA").textContent=a.name;$("barLabelB").textContent=b.name;
    $("formTitleA").textContent=a.name+" · Recent results";$("formTitleB").textContent=b.name+" · Recent results";
    recent(a.name,"recentA");recent(b.name,"recentB");headToHead(a.name,b.name);
    $("saveGraphic").disabled=false;$("copyLink").disabled=false;
    updateUrl();
    window.dispatchEvent(new Event("rus:game-center-update"));
  }

  function exportCard() {
    const m = matchup();
    if (!m) return;
    const canvas=document.createElement("canvas");
    canvas.width=1080;canvas.height=1350;
    const c=canvas.getContext("2d");
    const paint=(fill,x,y,w,h)=>{c.fillStyle=fill;c.fillRect(x,y,w,h);};
    const write=(text,x,y,size,color,align="left",weight="900")=>{c.fillStyle=color;c.font=weight+" "+size+"px Arial,Helvetica,sans-serif";c.textAlign=align;c.fillText(text,x,y);};
    const fit=(text,maxWidth,startSize)=>{let size=startSize;while(size>25){c.font="900 "+size+"px Arial,Helvetica,sans-serif";if(c.measureText(text).width<=maxWidth)break;size-=2;}return size;};
    paint("#0b0b0b",0,0,1080,1350);paint("#f14d07",0,0,1080,16);
    write("RURAL UTAH SPORTS",65,91,44,"#ffffff");
    write("2026 GAME CENTER  /  WHAT-IF MATCHUP",65,138,23,"#fa8b54");
    paint("#202020",64,194,952,696);
    paint(safeColor(m.a.backgroundColor),64,194,470,14);
    paint(safeColor(m.b.backgroundColor),546,194,470,14);
    write("TEAM A",89,258,21,"#aaaaaa");
    write("TEAM B",571,258,21,"#aaaaaa");
    write(m.a.name,89,331,fit(m.a.name,407,51),"#ffffff");
    write(m.b.name,571,331,fit(m.b.name,408,51),"#ffffff");
    write(m.a.classification+" · RUS POWER",89,380,22,"#bebebe");
    write(m.b.classification+" · RUS POWER",571,380,22,"#bebebe");
    write(String(m.a.rating),89,537,127,"#ffffff");
    write(String(m.b.rating),571,537,127,"#ffffff");
    paint("#484848",89,594,902,2);
    write("PROJECTED POINT SPREAD",540,677,25,"#c1c1c1","center");
    const label = m.favorite ? m.favorite+" BY "+pretty(m.spread) : "EVEN MATCHUP";
    write(label,540,750,fit(label,890,69),"#ff874d","center");
    write(state.venue==="neutral"?"NEUTRAL FIELD":(state.venue==="a"?m.a.name:m.b.name)+" HOME",540,807,24,"#eeeeee","center");
    write(m.baseline?"RUS BASELINE · 2.5-POINT HOME FIELD":"CUSTOM HOME FIELD · "+pretty(state.home)+" POINTS",540,856,18,"#aaaaaa","center");
    write("NEUTRAL SPREAD",80,965,22,"#aaaaaa");
    write(pretty(Math.abs(m.neutral))+" POINTS",80,1022,44,"#ffffff");
    write("DATA THROUGH",600,965,22,"#aaaaaa");
    write(todaySuffix(state.ratings[state.format].updatedThrough),600,1022,38,"#ffffff");
    paint("#f14d07",64,1104,952,5);
    write("Fan-created scenario · RUS 2026 Power Ratings",64,1181,25,"#dddddd");
    write("Not a final score, guaranteed outcome, or betting line.",64,1226,22,"#999999","left","400");
    write("ruralutahsports.com",64,1291,25,"#f14d07");
    const link=document.createElement("a");
    link.download="rus-game-center-"+m.a.name.toLowerCase().replace(/[^a-z0-9]+/g,"-")+"-vs-"+m.b.name.toLowerCase().replace(/[^a-z0-9]+/g,"-")+".png";
    link.href=canvas.toDataURL("image/png");
    document.body.appendChild(link);link.click();link.remove();
  }

  async function copyLink() {
    const url=window.location.href;
    try {await navigator.clipboard.writeText(url);$("copyLink").textContent="Link copied!";}
    catch(_error){window.prompt("Copy matchup link:",url);}
    setTimeout(()=>$("copyLink").textContent="Copy matchup link",1800);
  }

  async function loadLogos() {
    try {
      const assets=window.RUSSchoolAssets;
      if (!assets) return;
      await assets.load();
      const logos={};
      const every=[...state.ratings["11P"].teams,...state.ratings["8P"].teams];
      for (const row of every) {
        const found=assets.get(row.name);
        // Only use explicit school-directory or original repository assets; never synthesize a logo.
        const url=assets.customLogo(row.name)||(found && found.logoUrl)||"";
        if (url && (/^https:\/\/www\.uhsaa\.org\/Logos\//i.test(url)||/^school-logos\/[a-z0-9./?=_-]+$/i.test(url))) logos[row.name]=url;
      }
      state.logos=logos;
      render();
    } catch (error) {console.warn("School logos unavailable; showing names only",error);}
  }

  async function load() {
    try {
      const files=["weekly-simulation.json","teams-data.json","elo-summary.json"];
      const data=await Promise.all(files.map(async path=>{
        const response=await fetch(path+"?v=20261020-gamecenter1",{cache:"no-store"});
        if(!response.ok)throw new Error("Failed to load "+path+" ("+response.status+")");
        return response.json();
      }));
      if (!window.RUSPowerRatings) throw new Error("RUS ratings engine not loaded");
      state.ratings=window.RUSPowerRatings.build(data[0],data[1],data[2]);
      state.games=finals(data[0].games);
      const params=readQuery();
      state.format=params.format;state.venue=params.venue;state.home=params.home;
      populate(params.a,params.b);
      venueControls();render();
      void loadHistory();
      $("modelStatus").textContent="Ratings loaded · "+state.ratings[state.format].teams.length+" teams";
      void loadLogos();
    } catch(error) {
      console.error("Game Center load failed",error);
      $("modelStatus").textContent="Data unavailable";
      $("matchupError").hidden=false;
      $("matchupError").textContent="Game Center could not load verified RUS data. Please refresh to retry. No predicted values will be shown until the source data loads.";
      $("spread").textContent="Data unavailable";
      $("recentA").textContent="Recent results unavailable";$("recentB").textContent="Recent results unavailable";
      $("h2h").textContent="Head-to-head results unavailable";
    }
  }

  $("format").addEventListener("change",event=>{
    const previousA=$("teamA").value,previousB=$("teamB").value;
    state.format=event.target.value;populate(previousA,previousB);render();
  });
  $("teamA").addEventListener("change",render);
  $("teamB").addEventListener("change",render);
  document.querySelectorAll("[data-venue]").forEach(button=>button.addEventListener("click",()=>{
    state.venue=button.dataset.venue;venueControls();render();
  }));
  $("homePoints").addEventListener("input",event=>{
    state.home=Number(event.target.value);venueControls();render();
  });
  $("resetVenue").addEventListener("click",()=>{state.home=2.5;venueControls();render();});
  $("h2h").addEventListener("click",event=>{
    if(event.target?.id==="h2hMore"){
      state.historyShown+=10;
      headToHead($("teamA").value,$("teamB").value);
    }else if(event.target?.id==="h2hLess"){
      state.historyShown=5;
      headToHead($("teamA").value,$("teamB").value);
    }
  });
  $("saveGraphic").addEventListener("click",exportCard);
  $("copyLink").addEventListener("click",copyLink);

  window.RUSGameCenter=Object.freeze({
    snapshot:()=>{
      const m=matchup();
      if(!m)return null;
      return {...m,venue:state.venue,home:state.home,format:state.format,ratings:state.ratings,games:state.games,history:state.historyIndex?recordedMeetings(m.a.name,m.b.name):null};
    }
  });
  void load();
})();
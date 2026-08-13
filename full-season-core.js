(()=>{
  const F=window.RUSFullSeason=window.RUSFullSeason||{};
  F.h=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');
  F.norm=v=>String(v??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  const aliases={'FREMOND':'FREMONT','PINE':'PINE VIEW','MOUTNAIN CREST':'MOUNTAIN CREST','UMA-CW':'UMA-LEHI','HIGH':'HIGHLAND'};
  const fix=v=>aliases[String(v??'').trim().toUpperCase()]||String(v??'').trim().toUpperCase();
  const gameSig=g=>{const a=fix(g.teamA),b=fix(g.teamB),sa=Number(g.actualScoreA),sb=Number(g.actualScoreB);return a<b?`${a}|${b}|${sa}|${sb}`:`${b}|${a}|${sb}|${sa}`};
  const cleanSeason=season=>{const cutoff=Date.parse(`${Number(season?.season)||2025}-10-24T00:00:00`),seenDate=new Set(),lastSig=new Map(),out=[];for(const raw of [...(season.games||[])].sort((a,b)=>Date.parse(a.date)-Date.parse(b.date))){const t=Date.parse(raw.date);if(!Number.isFinite(t)||t>=cutoff)continue;const g={...raw,teamA:fix(raw.teamA),teamB:fix(raw.teamB)},pair=[g.teamA,g.teamB].sort().join('|'),dateKey=`${g.date}|${pair}`;if(seenDate.has(dateKey))continue;seenDate.add(dateKey);const sig=gameSig(g),prev=lastSig.get(sig);if(prev!=null&&t-prev<=8*86400000)continue;lastSig.set(sig,t);out.push(g)}return{...season,games:out}};

  const buildStartElos=(history,seasonYear)=>{
    const starts=new Map();
    for(const [team,rowsRaw] of Object.entries(history||{})){
      const rows=Array.isArray(rowsRaw)?rowsRaw:[];
      let value=null;
      const first=rows.find(r=>Number(r?.season)===seasonYear&&Number.isFinite(Number(r?.eloBefore)));
      if(first)value=Number(first.eloBefore);
      if(value==null){for(const r of rows){if(Number(r?.season)>=seasonYear)break;if(Number.isFinite(Number(r?.eloAfter)))value=Number(r.eloAfter)}}
      if(Number.isFinite(value))starts.set(F.norm(team),value);
    }
    return starts;
  };

  F.load=async()=>{
    if(F.data)return F.data;
    let[season,alignment,overrides,eloHistory]=await Promise.all([
      fetch('full-season-2025.json?v=20260813b').then(r=>r.json()),
      fetch('full-season-alignment-2025.json?v=20260813a').then(r=>r.json()),
      fetch('full-season-alignment-2025-overrides.json?v=20260813a').then(r=>r.ok?r.json():{}),
      fetch('team-elo-history.json?v=20260813a').then(r=>r.ok?r.json():{})
    ]);
    season=cleanSeason(season);
    const meta=new Map();
    for(const r of alignment.regions)for(const team of r.teams)meta.set(F.norm(team),{team,classification:r.classification,region:String(r.region)});
    for(const[team,m]of Object.entries(overrides))meta.set(F.norm(team),{team,classification:m.classification,region:String(m.region)});
    const seasonYear=Number(season.season)||2025,startElos=buildStartElos(eloHistory,seasonYear);
    F.data={season,alignment,overrides,meta,startElos,seasonYear};
    return F.data;
  };
  F.resolve=name=>{const S=window.RUSSeasonSim,map=S?.teamMap?.();return S?.resolve?.(fix(name),map)||fix(name)};
  F.initialElo=team=>{const historical=F.data?.startElos?.get(F.norm(fix(team)));return Number.isFinite(Number(historical))?Number(historical):1500};
  F.info=team=>{const sim=typeof simulator!=='undefined'?simulator:window.simulator;return sim?.teams?.[F.resolve(team)]||null};
})();
(()=>{
  if(window.RUSSchoolAssets)return;
  const A=window.RUSSchoolAssets={};
  const ALIASES={
    'ALA':'American Leadership Academy',
    'CEDAR CITY':'Cedar',
    'GRAND':'Grand County',
    'GUNNISON VALLEY':'Gunnison Valley',
    'MONUMENT VAL':'Monument Valley',
    'MONUMENT VALLEY':'Monument Valley',
    'SAINT JOSEPH':'Saint Joseph',
    'UMA-LEHI':'Utah Military Academy - Camp Williams',
    'UMA-HILLFIELD':'Utah Military Academy - Hill Field',
    'WASATCH ACADEMY':'Wasatch Academy',
    'WEST FIELD':'West Field',
    'DESERET PEAK':'Deseret Peak',
    'LAYTON CHRISTIAN':'Layton Christian Academy'
  };
  const BAD=new Set(['ESCALANTE','USDB','UTAH SCH DEAF']);
  const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
  const title=v=>String(v??'').trim().toLowerCase().replace(/(^|[\s-])([a-z])/g,(_,a,b)=>a+b.toUpperCase());
  A.norm=norm;
  A.isFootballTeam=team=>!BAD.has(norm(team));
  A.uhsaaName=team=>ALIASES[norm(team)]||title(team);
  A.fallbackLogo=team=>`https://www.uhsaa.org/Logos/portfolio150/${encodeURIComponent(A.uhsaaName(team))}.png`;
  let directory=null,promise=null;
  A.load=async()=>{
    if(directory)return directory;
    if(promise)return promise;
    promise=fetch(`school-directory.json?v=${Date.now()}`).then(r=>r.ok?r.json():{}).catch(()=>({})).then(data=>{
      directory=data&&typeof data==='object'?data:{};
      return directory;
    });
    return promise;
  };
  A.get=(team)=>directory?.[norm(team)]||null;
  A.logoUrl=(team,entry)=>entry?.logoUrl||A.get(team)?.logoUrl||A.fallbackLogo(team);
  A.address=(team,entry)=>entry?.address||A.get(team)?.address||'';
})();
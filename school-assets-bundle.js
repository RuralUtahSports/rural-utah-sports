(()=>{
'use strict';
if(!window.RUSSchoolAssets){
  const A=window.RUSSchoolAssets={};
  const ALIASES={
    'ALA':'American Leadership Academy','CEDAR CITY':'Cedar','GRAND':'Grand County','GUNNISON VALLEY':'Gunnison Valley','MONUMENT VAL':'Monument Valley','MONUMENT VALLEY':'Monument Valley','SAINT JOSEPH':'Saint Joseph','UMA-LEHI':'Utah Military Academy - Camp Williams','UMA-HILLFIELD':'Utah Military Academy - Hill Field','WASATCH ACADEMY':'Wasatch Academy','WEST FIELD':'West Field','DESERET PEAK':'Deseret Peak','LAYTON CHRISTIAN':'Layton Christian Academy'
  };
  const CUSTOM_LOGOS={
    'ALTA':'school-logos/alta.webp','BEAVER':'school-logos/beaver.webp','EMERY':'school-logos/emery.webp','GRANTSVILLE':'school-logos/grantsville.webp','GREEN CANYON':'school-logos/green-canyon.svg','HILLCREST':'school-logos/hillcrest.svg','KEARNS':'school-logos/kearns.svg','LAYTON CHRISTIAN':'school-logos/layton-christian.svg','LAYTON CHRISTIAN ACADEMY':'school-logos/layton-christian.svg','LONE PEAK':'school-logos/lone-peak.svg','MAPLE MOUNTAIN':'school-logos/maple-mountain.svg','MILFORD':'school-logos/milford.svg','MILLARD':'school-logos/millard.svg','MORGAN':'school-logos/morgan.svg','OREM':'school-logos/orem.svg','PROVIDENCE HALL':'school-logos/providence-hall.svg','RICH':'school-logos/rich-user.svg','SAN JUAN':'school-logos/san-juan.svg','VIEWMONT':'school-logos/viewmont.svg'
  };
  const BAD=new Set(['ESCALANTE','USDB','UTAH SCH DEAF']);
  const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
  const title=v=>String(v??'').trim().toLowerCase().replace(/(^|[\s-])([a-z])/g,(_,a,b)=>a+b.toUpperCase());
  A.norm=norm;A.isFootballTeam=team=>!BAD.has(norm(team));A.uhsaaName=team=>ALIASES[norm(team)]||title(team);A.fallbackLogo=team=>`https://www.uhsaa.org/Logos/portfolio150/${encodeURIComponent(A.uhsaaName(team))}.png`;
  let directory=null,promise=null;
  A.load=async()=>{if(directory)return directory;if(promise)return promise;promise=fetch(`school-directory.json?v=${Date.now()}`).then(r=>r.ok?r.json():{}).catch(()=>({})).then(data=>{directory=data&&typeof data==='object'?data:{};return directory});return promise};
  A.get=team=>directory?.[norm(team)]||null;A.logoUrl=(team,entry)=>CUSTOM_LOGOS[norm(team)]||entry?.logoUrl||A.get(team)?.logoUrl||A.fallbackLogo(team);A.address=(team,entry)=>entry?.address||A.get(team)?.address||'';
}
if(/(?:^|\/)scoreboard\.html$/i.test(location.pathname)&&!document.querySelector('script[data-rus-scoreboard-school-assets]')){
  const s=document.createElement('script');s.src='school-assets-scoreboard.js?v=20260818-perf3';s.async=true;s.dataset.rusScoreboardSchoolAssets='1';document.body.appendChild(s);
}
})();

(()=>{
'use strict';
if(window.RUSSchoolAssets)return;
const A=window.RUSSchoolAssets={};
const ALIASES={
  'ALA':'American Leadership Academy','CEDAR CITY':'Cedar','GRAND':'Grand County','GUNNISON VALLEY':'Gunnison Valley',
  'MONUMENT VAL':'Monument Valley','MONUMENT VALLEY':'Monument Valley','SAINT JOSEPH':'Saint Joseph',
  'UMA-LEHI':'Utah Military Academy - Camp Williams','UMA-HILLFIELD':'Utah Military Academy - Hill Field',
  'WASATCH ACADEMY':'Wasatch Academy','WEST FIELD':'West Field','DESERET PEAK':'Deseret Peak','LAYTON CHRISTIAN':'Layton Christian Academy'
};
const CUSTOM_LOGOS={
  'ALTA':'school-logos/alta.webp','BEAVER':'school-logos/beaver.webp','EAST':'school-logos/east-user.svg?v=20260817-1',
  'EMERY':'school-logos/emery-exact.png?v=20260821-5','GRAND':'school-logos/grand.webp?v=20260817-1','GRAND COUNTY':'school-logos/grand.webp?v=20260817-1',
  'GRANTSVILLE':'school-logos/grantsville.webp','GREEN CANYON':'school-logos/green-canyon.svg','HILLCREST':'school-logos/hillcrest.svg',
  'KEARNS':'school-logos/kearns.svg','LAYTON CHRISTIAN':'school-logos/layton-christian.svg','LAYTON CHRISTIAN ACADEMY':'school-logos/layton-christian.svg',
  'LONE PEAK':'school-logos/lone-peak.svg','MAPLE MOUNTAIN':'school-logos/maple-mountain.svg','MILFORD':'school-logos/milford.svg',
  'MILLARD':'school-logos/millard.svg','MORGAN':'school-logos/morgan.svg','OREM':'school-logos/orem.svg','PROVIDENCE HALL':'school-logos/providence-hall.svg',
  'RICH':'school-logos/rich-user.svg','RIDGELINE':'school-logos/ridgeline-card.png?v=20260817-7','SAN JUAN':'school-logos/san-juan.svg',
  'SOUTH SUMMIT':'school-logos/south-summit.webp?v=20260817-1','VIEWMONT':'school-logos/viewmont.svg'
};
const BAD=new Set(['ESCALANTE','USDB','UTAH SCH DEAF']);
const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
const title=v=>String(v??'').trim().toLowerCase().replace(/(^|[\s-])([a-z])/g,(_,a,b)=>a+b.toUpperCase());
A.norm=norm;A.isFootballTeam=team=>!BAD.has(norm(team));A.uhsaaName=team=>ALIASES[norm(team)]||title(team);
A.fallbackLogo=team=>`https://www.uhsaa.org/Logos/portfolio150/${encodeURIComponent(A.uhsaaName(team))}.png`;
A.customLogo=team=>CUSTOM_LOGOS[norm(team)]||'';A.hasCustomLogo=team=>!!A.customLogo(team);
let directory=null,promise=null;
A.load=async()=>{if(directory)return directory;if(promise)return promise;promise=fetch(`school-directory.json?v=${Date.now()}`).then(r=>r.ok?r.json():{}).catch(()=>({})).then(data=>{directory=data&&typeof data==='object'?data:{};return directory});return promise};
A.get=team=>directory?.[norm(team)]||null;A.logoUrl=(team,entry)=>A.customLogo(team)||entry?.logoUrl||A.get(team)?.logoUrl||A.fallbackLogo(team);A.address=(team,entry)=>entry?.address||A.get(team)?.address||'';
window.dispatchEvent(new CustomEvent('rus:school-assets-ready'));
})();

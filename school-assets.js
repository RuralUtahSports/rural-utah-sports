(()=>{
  const here=document.currentScript?.src||location.href;
  const core=new URL('school-assets-core.js',here).href;
  try{
    const req=new XMLHttpRequest();
    req.open('GET',`${core}?v=20260821-emery-2`,false);
    req.send(null);
    if(req.status && (req.status<200||req.status>=300))throw new Error(`HTTP ${req.status}`);
    (0,eval)(req.responseText);
  }catch(err){
    console.error('RUS school assets failed to load',err);
    return;
  }
  const A=window.RUSSchoolAssets;
  if(!A)return;
  const original=A.logoUrl.bind(A);
  const norm=A.norm||((v)=>String(v??'').trim().toUpperCase().replace(/\s+/g,' '));
  const asset=(path)=>new URL(path,here).href;
  const replacements={
    'ALTA':asset('school-logos/alta.webp?v=20260817-1'),
    'BEAVER':asset('school-logos/beaver.webp?v=20260817-1'),
    'EMERY':asset('school-logos/emery-user.svg?v=20260821-2'),
    'GRANTSVILLE':asset('school-logos/grantsville.webp?v=20260817-1')
  };
  A.logoUrl=(team,entry)=>replacements[norm(team)]||original(team,entry);
})();

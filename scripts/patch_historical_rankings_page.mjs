import fs from 'node:fs';

const file='historical-rankings.html';
let html=fs.readFileSync(file,'utf8');
const start=html.indexOf('async function load(){');
const end=html.indexOf('\nload();',start);
if(start<0||end<0)throw new Error('Historical rankings load function was not found');

const replacement=`async function load(){
  try{
    const stamp=Date.now();
    let usedPrebuilt=false;
    try{
      const fast=await fetch('historical-rankings-data.json?v='+stamp,{cache:'no-store'});
      if(fast.ok){
        const built=await fast.json();
        for(const [yearText,rows] of Object.entries(built.seasons||{})){
          const year=Number(yearText);
          if(!Number.isFinite(year)||year>=CURRENT_SEASON||!Array.isArray(rows)||!rows.length)continue;
          const cleaned=rows.map(x=>({...x,year:Number(x.year||year)}));
          seasonIndex.set(year,cleaned);
          for(const x of cleaned)if(!teamBrand.has(x.team))teamBrand.set(x.team,{team:x.team,backgroundColor:x.backgroundColor||'',textColor:x.textColor||''});
        }
        usedPrebuilt=seasonIndex.size>0;
      }
    }catch(e){console.warn('Prebuilt historical rankings unavailable; using compatibility loader.',e)}
    if(!usedPrebuilt){
      const r=await fetch('teams-data.json?v='+stamp,{cache:'no-store'});
      if(!r.ok)throw new Error('Unable to load teams');
      const teams=await r.json();
      for(const team of teams)teamBrand.set(team.team,team);
      try{await window.RUSSchoolAssets?.load?.()}catch{}
      await mapLimit(teams,10,async team=>{
        const rr=await fetch('team-page-data/'+slug(team.team)+'.json?v='+stamp,{cache:'no-store'});
        if(!rr.ok)return;
        const data=await rr.json();
        for(const s of Array.isArray(data.seasonHistory)?data.seasonHistory:[]){
          const year=Number(s.year),games=Number(s.games||0);
          if(!Number.isFinite(year)||year>=CURRENT_SEASON||games<1)continue;
          if(!seasonIndex.has(year))seasonIndex.set(year,[]);
          seasonIndex.get(year).push({...s,team:team.team,year});
        }
      });
    }else{
      status.textContent='Historical rankings loaded.';
      try{await window.RUSSchoolAssets?.load?.()}catch{}
    }
    const years=[...seasonIndex.keys()].sort((a,b)=>b-a);
    if(!years.length)throw new Error('No historical seasons found');
    seasonSelect.innerHTML=years.map(y=>'<option value="'+y+'">'+y+'</option>').join('');
    const requested=Number(new URLSearchParams(location.search).get('season'));
    activeYear=seasonIndex.has(requested)?requested:years[0];
    seasonSelect.value=String(activeYear);
    seasonSelect.disabled=false;
    search.disabled=false;
    seasonSelect.addEventListener('change',()=>{
      activeYear=Number(seasonSelect.value);
      history.replaceState(null,'','historical-rankings.html?season='+activeYear);
      search.value='';
      render();
    });
    search.addEventListener('input',render);
    render();
  }catch(e){
    console.error(e);
    status.textContent='Historical rankings could not be loaded. Please refresh and try again.';
  }
}`;

html=html.slice(0,start)+replacement+html.slice(end);
fs.writeFileSync(file,html);
console.log('Historical rankings page now prefers historical-rankings-data.json with a legacy fallback.');

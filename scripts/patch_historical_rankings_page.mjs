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
        dataSource=String(built.source||'Clean Games');
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
      dataSource='Team history fallback';
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
      try{await window.RUSSchoolAssets?.load?.()}catch{}
    }
    years=[...seasonIndex.keys()].sort((a,b)=>b-a);
    if(!years.length)throw new Error('No historical seasons found');
    seasonSelect.innerHTML=years.map(y=>'<option value="'+y+'">'+y+'</option>').join('');
    const params=new URLSearchParams(location.search),requested=Number(params.get('season'));
    activeYear=seasonIndex.has(requested)?requested:years[0];
    seasonSelect.value=String(activeYear);
    seasonSelect.disabled=false;search.disabled=false;
    const initialQ=params.get('q');if(initialQ)search.value=initialQ;
    seasonSelect.addEventListener('change',()=>setSeason(seasonSelect.value));
    olderBtn.addEventListener('click',()=>olderBtn.dataset.year&&setSeason(olderBtn.dataset.year));
    newerBtn.addEventListener('click',()=>newerBtn.dataset.year&&setSeason(newerBtn.dataset.year));
    search.addEventListener('input',()=>{const p=new URLSearchParams(location.search);p.set('season',activeYear);if(search.value.trim())p.set('q',search.value.trim());else p.delete('q');history.replaceState(null,'','historical-rankings.html?'+p.toString());render()});
    updateYearButtons();render();
  }catch(e){
    console.error(e);
    status.textContent='Historical rankings could not be loaded. Please refresh and try again.';
  }
}`;

html=html.slice(0,start)+replacement+html.slice(end);
fs.writeFileSync(file,html);
console.log('Historical rankings page is synced to the polished Clean Games loader.');

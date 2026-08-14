(()=>{
const D=window.RUSDynastySim;
if(!D||window.__RUSDynastyColorAliases)return;
window.__RUSDynastyColorAliases=true;
const norm=D.norm||((v)=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,''));
let monumentStyle=null;
const findTeam=(U,key)=>Object.keys(U?.teams||{}).find(n=>norm(n)===key);
const readSource=data=>{
  const meta=data?.meta;
  if(!meta?.get)return;
  const src=meta.get('MONUMENTVAL')||[...meta.values()].find(x=>norm(x?.team)==='MONUMENTVAL');
  if(src?.backgroundColor)monumentStyle={backgroundColor:src.backgroundColor,textColor:src.textColor||'#FFFFFF'};
};
const apply=U=>{
  if(!U?.teams||!monumentStyle)return U;
  const key=findTeam(U,'MONUMENTVALLEY');
  if(!key)return U;
  U.teams[key].backgroundColor=monumentStyle.backgroundColor;
  U.teams[key].textColor=monumentStyle.textColor;
  return U;
};
const baseLoad=D.load,baseLoadSave=D.loadSave,baseNew=D.newUniverse;
D.load=async(...a)=>{
  const data=await baseLoad(...a);
  readSource(data);
  const saved=apply(baseLoadSave?.());
  if(saved)D.save(saved);
  return data;
};
D.loadSave=()=>apply(baseLoadSave?.());
D.newUniverse=async(...a)=>{const U=apply(await baseNew(...a));D.save(U);return U};
})();

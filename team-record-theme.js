(()=>{
'use strict';
// The same published school colors power both Player Records and Team Records.
// No color is inferred from a generated logo or approximated from a school name.
if(window.RUSTeamRecordTheme)return;
const ORANGE='#F14D07';
const normalize=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const aliases={
 CEDAR:'CEDARCITY',GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISONVALLEY',
 MONUMENTVAL:'MONUMENTVALLEY',MAPLEMTN:'MAPLEMOUNTAIN',
 AMERICANLEADERSHIPACADEMY:'ALA',AMERICANLEADERSHIP:'ALA',
 SAINTJOSEPH:'STJOSEPH',STJOSEPHS:'STJOSEPH',
 JUANDIEGOCATHOLIC:'JUANDIEGO',LAYTONCHRISTIANACADEMY:'LAYTONCHRISTIAN'
};
const key=v=>aliases[normalize(v)]||normalize(v);
const hex=v=>/^#[0-9a-f]{6}$/i.test(String(v||''))?String(v).toUpperCase():null;
function rgb(h){return[1,3,5].map(i=>parseInt(h.slice(i,i+2),16))}
function mix(a,b,f){const ar=rgb(a),br=rgb(b);return '#'+ar.map((c,i)=>Math.round(c+(br[i]-c)*f).toString(16).padStart(2,'0')).join('').toUpperCase()}
function luminance(h){
 const channels=rgb(h).map(n=>{const v=n/255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4});
 return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
}
function contrast(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)}
function readableOnDark(primary){
 if(contrast(primary,'#080808')>=4.5)return primary;
 for(let i=1;i<=20;i++){const value=mix(primary,'#FFFFFF',i/20);if(contrast(value,'#080808')>=4.5)return value}
 return'#FFFFFF';
}
function chooseForeground(primary,secondary){
 const black='#000000',white='#FFFFFF',best=contrast(primary,black)>contrast(primary,white)?black:white;
 return contrast(primary,secondary)>=4.5?secondary:best;
}
function themeFor(team,entries){
 const info=entries.get(key(team))||{};
 const primary=hex(info.backgroundColor)||ORANGE;
 const secondary=hex(info.textColor)||'#FFFFFF';
 return{primary,secondary,accent:readableOnDark(primary),onPrimary:chooseForeground(primary,secondary)};
}
let palettePromise;
async function readPalette(){
 if(!palettePromise)palettePromise=(async()=>{
  const entries=new Map();
  // Canonical exact school colors take precedence. The existing team metadata
  // is only a fallback where the exact color file has no school.
  for(const path of ['team-colors-exact.json','teams-data.json']){
   try{
    const response=await fetch(path+'?v=20261020-record-tab-colors1',{cache:'no-store'});
    if(!response.ok)continue;
    const data=await response.json();
    if(!Array.isArray(data))continue;
    for(const row of data){
     if(!row||!row.team)continue;
     const k=key(row.team);
     if(!entries.has(k))entries.set(k,{backgroundColor:row.backgroundColor,textColor:row.textColor});
    }
   }catch(e){console.warn('RUS team record palette:',path,e)}
  }
  return entries;
 })();
 return palettePromise;
}
function installStyles(){
 if(document.getElementById('rus-record-team-colors-style'))return;
 const s=document.createElement('style');s.id='rus-record-team-colors-style';
 s.textContent=[
  '.rus-player-records-section,.rus-team-stat-records-section{--rus-record-primary:#F14D07;--rus-record-secondary:#FFFFFF;--rus-record-accent:#F14D07;--rus-record-on-primary:#000000}',
  '.rus-player-records-section .rus-player-records-head h2,.rus-team-stat-records-section .rus-team-stat-records-head h2{border-left-color:var(--rus-record-primary)!important}',
  '.rus-player-records-section .rus-player-records-subhead{border-left-color:var(--rus-record-secondary)!important}',
  '.rus-player-records-section .rus-player-record-card,.rus-team-stat-records-section .rus-team-stat-record-card{border-top:3px solid var(--rus-record-primary)!important;box-shadow:inset 4px 0 var(--rus-record-secondary)}',
  '.rus-player-records-section .rus-player-record-card h3,.rus-team-stat-records-section .rus-team-stat-record-card h3{background:var(--rus-record-primary)!important;color:var(--rus-record-on-primary)!important;border-bottom:3px solid var(--rus-record-secondary)!important}',
  '.rus-player-records-section .rus-player-record-wrap thead th,.rus-team-stat-records-section .rus-team-stat-record-wrap thead th{background:var(--rus-record-primary)!important;color:var(--rus-record-on-primary)!important;border-color:var(--rus-record-secondary)!important}',
  '.rus-player-records-section .rus-player-record-value,.rus-team-stat-records-section .rus-team-stat-record-value{color:var(--rus-record-accent)!important}',
  '.rus-player-records-section .rus-player-record-game a:hover,.rus-team-stat-records-section .rus-team-stat-record-game a:hover{color:var(--rus-record-accent)!important}',
  '.rus-player-records-section .rus-player-records-source,.rus-team-stat-records-section .rus-team-stat-records-source{border-left:4px solid var(--rus-record-secondary)!important}',
  '.rus-player-records-section .rus-player-records-source a{color:var(--rus-record-accent)!important}',
  '.rus-player-records-section .rus-player-records-grid,.rus-team-stat-records-section .rus-team-stat-records-grid{min-width:0}',
  '@media(max-width:650px){.rus-player-records-section .rus-player-record-card,.rus-team-stat-records-section .rus-team-stat-record-card{min-width:0}.rus-player-records-section .rus-player-record-wrap,.rus-team-stat-records-section .rus-team-stat-record-wrap{-webkit-overflow-scrolling:touch}}'
 ].join('\n');
 document.head.appendChild(s);
}
async function apply(section,team){
 if(!section||!team)return;
 installStyles();
 const entries=await readPalette();
 const t=themeFor(team,entries);
 section.style.setProperty('--rus-record-primary',t.primary);
 section.style.setProperty('--rus-record-secondary',t.secondary);
 section.style.setProperty('--rus-record-accent',t.accent);
 section.style.setProperty('--rus-record-on-primary',t.onPrimary);
 section.dataset.rusSchoolColors='1';
}
window.RUSTeamRecordTheme={apply,themeFor,contrast,readPalette};
})();

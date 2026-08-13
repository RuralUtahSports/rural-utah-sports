(()=>{
'use strict';
const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
if(path!=='elo.html'&&path!=='team.html')return;
function addStyles(){
  if(document.getElementById('rus-elo-explainer-style'))return;
  const s=document.createElement('style');
  s.id='rus-elo-explainer-style';
  s.textContent=`
.rus-elo-info{background:#0b0b0b;border:1px solid #333;border-left:5px solid #F14D07;border-radius:8px;padding:17px 18px;margin:0 0 20px;line-height:1.5}.rus-elo-info-title{font-size:18px;font-weight:900;text-transform:uppercase;margin-bottom:5px}.rus-elo-info-lead{color:#bbb;font-size:13px;max-width:1050px}.rus-elo-info-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:13px}.rus-elo-info-item{background:#171717;border:1px solid #2d2d2d;border-radius:6px;padding:11px}.rus-elo-info-item strong{display:block;color:#F14D07;font-size:12px;text-transform:uppercase;margin-bottom:3px}.rus-elo-info-item span{color:#aaa;font-size:11px}.rus-elo-formula{margin-top:11px;color:#777;font-size:11px}.rus-elo-formula b{color:#aaa}@media(max-width:800px){.rus-elo-info-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:480px){.rus-elo-info-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(s);
}
function markup(){return `<section class="rus-elo-info" aria-label="What is ELO?">
  <div class="rus-elo-info-title">What is ELO?</div>
  <p class="rus-elo-info-lead"><strong>ELO is a running strength rating, not a poll.</strong> Every program begins at 1500 in the RUS model, then its rating moves after each recorded game based on the result and the opponent's rating. Higher ELO means stronger results relative to the competition faced.</p>
  <div class="rus-elo-info-grid">
    <div class="rus-elo-info-item"><strong>1500 Starting Point</strong><span>A program enters the system at 1500 and its rating carries forward from game to game and season to season.</span></div>
    <div class="rus-elo-info-item"><strong>Upsets Matter More</strong><span>Beating a higher-rated opponent earns more points. Beating a much lower-rated opponent earns fewer.</span></div>
    <div class="rus-elo-info-item"><strong>Losses Work the Same Way</strong><span>Losing to a lower-rated opponent costs more. Losing to a much stronger opponent costs less.</span></div>
    <div class="rus-elo-info-item"><strong>No Margin Bonus</strong><span>RUS uses the game result only. Winning by 1 or 50 counts as the same win for ELO.</span></div>
  </div>
  <p class="rus-elo-formula"><b>RUS settings:</b> K-factor 32 • Win = 1 • Tie = 0.5 • Loss = 0 • ratings are generated from the deduplicated master game database.</p>
</section>`}
function insertMain(){
  const subtitle=document.querySelector('main .subtitle');
  if(!subtitle||document.querySelector('.rus-elo-info'))return false;
  subtitle.insertAdjacentHTML('afterend',markup());
  return true;
}
function insertTeam(){
  if(document.querySelector('.rus-elo-info'))return true;
  const title=[...document.querySelectorAll('#page .section-title')].find(x=>x.textContent.trim().toLowerCase()==='elo history');
  if(!title)return false;
  title.insertAdjacentHTML('afterend',markup());
  return true;
}
function setup(){
  addStyles();
  if(path==='elo.html'){insertMain();return;}
  let tries=0;
  const wait=()=>{if(insertTeam()||++tries>=120)return;setTimeout(wait,100)};
  wait();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();

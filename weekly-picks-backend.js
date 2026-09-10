const WPE_API='https://pleggeciqvaoyxtuvczd.supabase.co/functions/v1/weekly-picks';
const WPE_COUNT_API='https://pleggeciqvaoyxtuvczd.supabase.co/functions/v1/weekly-pick-count';
let wpeBackendTimer=null;
function wpeTokenKey(k){return`rus-weekly-entry-token-${k}`}
function wpeEntryToken(k){let t='';try{t=localStorage.getItem(wpeTokenKey(k))||''}catch{}if(t.length>=24)return t;const bytes=new Uint8Array(24);crypto.getRandomValues(bytes);t=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');try{localStorage.setItem(wpeTokenKey(k),t)}catch{}return t}
function wpeBackendStatus(message,isError=false){const el=document.querySelector('.wpe-user>span');if(!el)return;if(message){el.textContent=message;el.style.color=isError?'#ff7777':'#777'}}
async function wpeApi(payload){const r=await fetch(WPE_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});let data={};try{data=await r.json()}catch{}if(!r.ok){const e=new Error(data.error||`Leaderboard request failed (${r.status})`);e.status=r.status;throw e}return data}
async function wpeParticipantCount(weekKey){const r=await fetch(WPE_COUNT_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({weekKey})});let data={};try{data=await r.json()}catch{}if(!r.ok)throw new Error(data.error||'Participant count unavailable');return Number(data.count)||0}
function wpeEnsureCounter(){let el=document.getElementById('wpeParticipantCounter');if(el)return el;const lock=document.getElementById('wpRelease');if(!lock)return null;el=document.createElement('div');el.id='wpeParticipantCounter';el.style.cssText='margin:10px 0 16px;padding:11px 14px;background:#151515;border:1px solid #333;border-left:4px solid #F14D07;border-radius:6px;color:#ddd;font-weight:800;font-size:13px';el.innerHTML='👥 <strong>—</strong> players have made picks this week';lock.insertAdjacentElement('afterend',el);return el}
async function wpeRefreshParticipantCount(){try{const w=typeof wpCurrentWeek==='function'?wpCurrentWeek():null;if(!w)return;const el=wpeEnsureCounter();if(!el)return;const count=await wpeParticipantCount(w.key);el.innerHTML=`👥 <strong>${count.toLocaleString()}</strong> ${count===1?'player has':'players have'} made picks this week`}catch(e){console.error(e)}}
async function wpeSubmitCurrent(){const w=wpCurrentWeek();if(!w||wpReleased(w))return;const name=wpeUser(w.key);if(!name)return;const picks=wpLoadPicks(w.key);try{await wpeApi({action:'submit',weekKey:w.key,username:name,token:wpeEntryToken(w.key),picks,scores:{}});wpeBackendStatus('Saved to the weekly leaderboard');wpeRefreshParticipantCount()}catch(e){console.error(e);wpeBackendStatus(e.message||'Could not save leaderboard entry',true)}}
function wpeBackendQueue(){clearTimeout(wpeBackendTimer);wpeBackendTimer=setTimeout(wpeSubmitCurrent,350)}
window.RUS_WEEKLY_PICKS_SUBMIT=async function(weekKey,entry,w){if(!w||wpReleased(w)||!wpeUsername(entry?.username))return null;const result=await wpeApi({action:'submit',weekKey,username:wpeUsername(entry.username),token:wpeEntryToken(weekKey),picks:entry.picks||{},scores:{}});wpeRefreshParticipantCount();return result}
window.RUS_WEEKLY_PICKS_FETCH=async function(weekKey){const data=await wpeApi({action:'leaderboard',weekKey});return Array.isArray(data.rows)?data.rows:[]}
if(typeof wpeSetUsername==='function'){const old=wpeSetUsername;window.wpeSetUsername=function(v){old(v);wpeBackendQueue()}}
if(typeof wpBindPickButtons==='function'){const old=wpBindPickButtons;window.wpBindPickButtons=function(){old();document.querySelectorAll('.wp-team[data-key]').forEach(b=>{const prev=b.onclick;b.onclick=()=>{if(prev)prev();wpeBackendQueue()}})}}
window.wpReset=function(){const w=wpCurrentWeek();if(!w||wpReleased(w))return;if(!confirm('Clear your username and all picks for this week?'))return;try{localStorage.removeItem(wpStorageKey(w.key));localStorage.removeItem(wpeUserKey(w.key));localStorage.removeItem(wpeScoreKey(w.key))}catch{}wpRenderBody();wpeBackendQueue()}
document.addEventListener('change',e=>{if(e.target?.id==='wpWeek')setTimeout(wpeRefreshParticipantCount,0)});
(function wpeBackendInitialSync(){let tries=0;const timer=setInterval(()=>{tries++;if(typeof wpCurrentWeek==='function'&&wpCurrentWeek()){clearInterval(timer);wpeBackendQueue();wpeRefreshParticipantCount();setInterval(wpeRefreshParticipantCount,60000)}else if(tries>100)clearInterval(timer)},150)})();

// H2H margin calibration: keep genuinely close matchups close, but stop elite-vs-bottom
// matchups from being compressed into one-score projections. This runs after the main
// simulator model, so winner probability still comes from the full ELO/SOS/current-season blend.
(function rusH2HMarginCalibration(){
  if(typeof calculate!=='function'||typeof clamp!=='function')return;
  const baseCalculate=calculate;
  calculate=function(t1,t2){
    const r=baseCalculate(t1,t2);
    if(!r)return r;

    const c1=r.current1||null,c2=r.current2||null;
    const n=v=>Number.isFinite(Number(v))?Number(v):0;
    const seasonDiff1=c1?n(c1.adjustedDiff):n(r.a?.recent10Diff||r.a?.avgDiff);
    const seasonDiff2=c2?n(c2.adjustedDiff):n(r.b?.recent10Diff||r.b?.avgDiff);
    const rawDiff1=c1?n(c1.avgDiff):n(r.a?.avgDiff);
    const rawDiff2=c2?n(c2.avgDiff):n(r.b?.avgDiff);
    const elo1=c1?n(c1.elo):n(r.a?.elo)||1500;
    const elo2=c2?n(c2.elo):n(r.b?.elo)||1500;

    const prob=clamp(n(r.prob1)/100,.01,.99);
    const probabilityMargin=clamp(Math.log(prob/(1-prob))*13.5,-52,52);
    const seasonGap=clamp(seasonDiff1-seasonDiff2,-70,70);
    const rawGap=clamp(rawDiff1-rawDiff2,-80,80);
    const eloMargin=clamp((elo1-elo2)/12,-42,42);

    // Blend independent measures instead of letting preseason regression flatten the score.
    let targetMargin=probabilityMargin*.40+seasonGap*.35+rawGap*.15+eloMargin*.10;
    const evidenceMargin=seasonGap*.55+rawGap*.25+eloMargin*.20;

    // When multiple current-strength signals agree on a large mismatch, require the score
    // to reflect it. This is deliberately a floor, not an automatic blowout multiplier.
    if(Math.abs(evidenceMargin)>=16&&Math.sign(evidenceMargin)===Math.sign(targetMargin||evidenceMargin)){
      targetMargin=Math.sign(evidenceMargin)*Math.max(Math.abs(targetMargin),Math.min(52,Math.abs(evidenceMargin)*.85));
    }
    targetMargin=clamp(targetMargin,-55,55);

    const oldTotal=Math.max(24,n(r.p1)+n(r.p2));
    const total=clamp(Math.max(oldTotal,Math.abs(targetMargin)+14),24,98);
    r.p1=Math.max(0,Math.round((total+targetMargin)/2));
    r.p2=Math.max(0,Math.round((total-targetMargin)/2));
    if(r.p1===1)r.p1=3;
    if(r.p2===1)r.p2=3;
    if(r.winner===t1&&r.p1<=r.p2)r.p1=r.p2+3;
    if(r.winner===t2&&r.p2<=r.p1)r.p2=r.p1+3;
    return r;
  };
})();
const WPE_API='https://pleggeciqvaoyxtuvczd.supabase.co/functions/v1/weekly-picks';
let wpeBackendTimer=null;
function wpeTokenKey(k){return`rus-weekly-entry-token-${k}`}
function wpeEntryToken(k){
  let t='';try{t=localStorage.getItem(wpeTokenKey(k))||''}catch{}
  if(t.length>=24)return t;
  const bytes=new Uint8Array(24);crypto.getRandomValues(bytes);t=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  try{localStorage.setItem(wpeTokenKey(k),t)}catch{}
  return t;
}
function wpeBackendStatus(message,isError=false){
  const el=document.querySelector('.wpe-user>span');if(!el)return;
  if(message){el.textContent=message;el.style.color=isError?'#ff7777':'#777';}
}
async function wpeApi(payload){
  const r=await fetch(WPE_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  let data={};try{data=await r.json()}catch{}
  if(!r.ok){const e=new Error(data.error||`Leaderboard request failed (${r.status})`);e.status=r.status;throw e}
  return data;
}
async function wpeSubmitCurrent(){
  const w=wpCurrentWeek();if(!w||wpReleased(w))return;
  const name=wpeUser(w.key);if(!name)return;
  const entry={username:name,picks:wpLoadPicks(w.key),scores:wpeScores(w.key)};
  try{
    await wpeApi({action:'submit',weekKey:w.key,username:name,token:wpeEntryToken(w.key),picks:entry.picks,scores:entry.scores});
    wpeBackendStatus('Saved to the weekly leaderboard');
  }catch(e){
    console.error(e);wpeBackendStatus(e.message||'Could not save leaderboard entry',true);
  }
}
function wpeBackendQueue(){clearTimeout(wpeBackendTimer);wpeBackendTimer=setTimeout(wpeSubmitCurrent,350)}
window.RUS_WEEKLY_PICKS_SUBMIT=async function(weekKey,entry,w){
  if(!w||wpReleased(w)||!wpeUsername(entry?.username))return null;
  return wpeApi({action:'submit',weekKey,username:wpeUsername(entry.username),token:wpeEntryToken(weekKey),picks:entry.picks||{},scores:entry.scores||{}});
};
window.RUS_WEEKLY_PICKS_FETCH=async function(weekKey){
  const data=await wpeApi({action:'leaderboard',weekKey});return Array.isArray(data.rows)?data.rows:[];
};
if(typeof wpeSetUsername==='function'){
  const old=wpeSetUsername;window.wpeSetUsername=function(v){old(v);wpeBackendQueue()};
}
if(typeof wpeSetScore==='function'){
  const old=wpeSetScore;window.wpeSetScore=function(key,side,v){old(key,side,v);wpeBackendQueue()};
}
if(typeof wpBindPickButtons==='function'){
  const old=wpBindPickButtons;window.wpBindPickButtons=function(){
    old();
    document.querySelectorAll('.wp-team[data-key]').forEach(b=>{
      const prev=b.onclick;b.onclick=()=>{if(prev)prev();wpeBackendQueue()};
    });
  };
}
(function wpeBackendInitialSync(){
  let tries=0;const timer=setInterval(()=>{tries++;if(typeof wpCurrentWeek==='function'&&wpCurrentWeek()){clearInterval(timer);wpeBackendQueue()}else if(tries>100)clearInterval(timer)},150);
})();

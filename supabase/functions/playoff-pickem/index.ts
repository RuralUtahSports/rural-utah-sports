const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const SECRET=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BRACKET_URL='https://raw.githubusercontent.com/RuralUtahSports/rural-utah-sports/main/official-brackets-2026.json';
const SIM_URL='https://raw.githubusercontent.com/RuralUtahSports/rural-utah-sports/main/weekly-simulation.json';
const ORDER=['8-Player','1A','2A','3A','4A','5A','6A'];
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
const respond=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:cors});
const clean=(v:unknown)=>String(v??'').trim();
const norm=(v:unknown)=>{const x=clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
 const aliases:Record<string,string>={UTAHMILITARYACADEMYCAMPWILLIAMS:'UMALEHI',UMACAMPWILLIAMS:'UMALEHI',UTAHMILITARYACADEMYHILLFIELD:'UMAHILLFIELD',UMAHILLFIELD:'UMAHILLFIELD',CEDAR:'CEDARCITY',GUNNISON:'GUNNISONVALLEY',JUDGEMEMORIALCATHOLIC:'JUDGEMEMORIAL',AMERICANLEADERSHIPACADEMY:'ALA',MONUMENTVALLEY:'MONUMENTVAL',STJOSEPH:'SAINTJOSEPH'};
 return aliases[x]||x;};
const isBye=(v:any)=>/^bye$/i.test(v?.name||'');
const isPlaceholder=(v:any)=>/^(Winner of|Semifinal|Quarterfinal|TBD)/i.test(v?.name||'');
const team=(v:any)=>v&&!isBye(v)&&!isPlaceholder(v)&&v.name?{id:String(v.seed||v.name),name:clean(v.name),seed:v.seed||null}:null;
const entry=(v:any)=>isBye(v)?{type:'bye'}:team(v)?{type:'team',value:team(v)}:{type:'unresolved'};
function firstSource(v:any,first:any[]){
 if(!v?.name||!isPlaceholder(v))return entry(v);
 const opening=v.name.match(/opening matchup\s*(\d+)/i);
 if(opening&&first[Number(opening[1])-1])return{type:'game',id:first[Number(opening[1])-1].id};
 const numbers=[...v.name.matchAll(/#(\d+)/g)].map((m:any)=>String(Number(m[1])));
 if(numbers.length>=2){
  const found=first.find(g=>[g.a,g.b].every((s:any)=>s.type==='team')&&[g.a.value.seed,g.b.value.seed].map(String).sort().join(':')===numbers.slice(0,2).sort().join(':'));
  if(found)return{type:'game',id:found.id};
 }
 return{type:'unresolved'};
}
function build(raw:any){
 const rounds=raw?.rounds||[];
 if(rounds.length!==4)throw new Error('Bracket structure missing');
 const first=rounds[0].games.map((g:any,i:number)=>({id:'R0-'+i,round:0,source:g,a:entry(g.a),b:entry(g.b),auto:isBye(g.a)||isBye(g.b)}));
 const qf=rounds[1].games.map((g:any,i:number)=>({id:'QF-'+i,round:1,source:g,a:firstSource(g.a,first),b:firstSource(g.b,first),auto:false}));
 const sf=rounds[2].games.map((g:any,i:number)=>({id:'SF-'+i,round:2,source:g,a:{type:'game',id:qf[2*i]?.id},b:{type:'game',id:qf[2*i+1]?.id},auto:false}));
 const fin=rounds[3].games.map((g:any,i:number)=>({id:'F-'+i,round:3,source:g,a:{type:'game',id:sf[2*i]?.id},b:{type:'game',id:sf[2*i+1]?.id},auto:false}));
 return [...first,...qf,...sf,...fin];
}
const resolve=(s:any,w:any)=>s?.type==='team'?s.value:s?.type==='game'?w[s.id]||null:null;
const dateKey=(str:any)=>{
 const x=clean(str),iso=x.match(/^(\d{4})-(\d{2})-(\d{2})/);if(iso)return iso[1]+'-'+iso[2]+'-'+iso[3];
 const slash=x.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(slash)return slash[3]+'-'+slash[1].padStart(2,'0')+'-'+slash[2].padStart(2,'0');
 const d=x.match(/^([a-z]{3})\s+(\d{1,2}),?\s+(\d{4})/i);
 if(d){const m=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(d[1].toLowerCase());if(m>=0)return d[3]+'-'+String(m+1).padStart(2,'0')+'-'+d[2].padStart(2,'0');}
 return'';
};
function mountainKey(){
 const x:any={};for(const p of new Intl.DateTimeFormat('en-US',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()))x[p.type]=p.value;
 return Number(x.year+x.month+x.day+x.hour+x.minute);
}
function locked(raw:any){
 const kickoffs=(raw.rounds?.[0]?.games||[]).filter((g:any)=>!isBye(g.a)&&!isBye(g.b)).map((g:any)=>{
  const date=dateKey(g.date);if(!date)return null;
  const m=clean(g.time).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  let hour=0,min=0;
  if(m){hour=Number(m[1])%12+(m[3].toUpperCase()==='PM'?12:0);min=Number(m[2]);}
  return{key:Number(date.replaceAll('-','')+String(hour).padStart(2,'0')+String(min).padStart(2,'0')),date,time:m?clean(g.time):'Start of opening game day'};
 }).filter(Boolean).sort((a:any,b:any)=>a.key-b.key);
 const first=kickoffs[0]||{key:202610230000,date:'2026-10-23',time:'Start of opening day'};
 return{locked:mountainKey()>=first.key,lockDate:first.date,lockTime:first.time,lockKey:first.key};
}
function projected(defs:any[],submitted:any){
 const winners:any={},normalized:any={};
 for(const g of defs){
  const a=resolve(g.a,winners),b=resolve(g.b,winners),chosen=clean(submitted?.[g.id]);
  if(g.auto){winners[g.id]=a||b;continue;}
  if(!a||!b){if(chosen)throw new Error('Pick depends on an unchosen earlier game');winners[g.id]=null;continue;}
  if(chosen&&chosen!==a.id&&chosen!==b.id)throw new Error('Pick does not match the bracket');
  winners[g.id]=chosen?(chosen===a.id?a:b):null;
  if(chosen)normalized[g.id]=chosen;
 }
 return normalized;
}
async function hash(token:string){
 const bytes=new TextEncoder().encode(token),digest=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function db(path:string,options:RequestInit={}):Promise<any>{
 const r=await fetch(SUPABASE_URL+'/rest/v1/'+path,{...options,headers:{apikey:SECRET,Authorization:'Bearer '+SECRET,'Content-Type':'application/json',Prefer:'return=representation',...(options.headers||{})}});
 const s=await r.text();
 if(!r.ok)throw new Error('DB '+r.status+' '+s.slice(0,200));
 return s?JSON.parse(s):null;
}
let cache:any=null,cacheAt=0;
async function sources(){
 if(cache&&Date.now()-cacheAt<45_000)return cache;
 const [b,s]=await Promise.all([
  fetch(BRACKET_URL+'?v='+Date.now(),{headers:{'User-Agent':'RUS-playoff-pickem'}}),
  fetch(SIM_URL+'?v='+Date.now(),{headers:{'User-Agent':'RUS-playoff-pickem'}}).catch(()=>null)
 ]);
 if(!b.ok)throw new Error('Official bracket data unavailable');
 const official=await b.json();
 if(official.season!==2026)throw new Error('Unexpected bracket season');
 const games=s?.ok?(await s.json()).games||[]:[];
 cache={official,scoreboard:Array.isArray(games)?games:[]};cacheAt=Date.now();return cache;
}
function resultWinner(game:any,a:any,b:any,schedule:any[]){
 if(!a||!b)return null;
 const g=game||{},winner=clean(g.winner);
 if(g.a?.winner===true||norm(winner)===norm(a.name)||winner===String(a.seed))return a;
 if(g.b?.winner===true||norm(winner)===norm(b.name)||winner===String(b.seed))return b;
 if(g.final===true||/^(final|completed|finished)$/i.test(clean(g.status))){
  const sa=g.a?.score,sb=g.b?.score;
  if(sa!==null&&sa!==undefined&&sb!==null&&sb!==undefined&&clean(sa)!==''&&clean(sb)!==''){
   if(Number.isFinite(Number(sa))&&Number.isFinite(Number(sb))&&Number(sa)!==Number(sb))return Number(sa)>Number(sb)?a:b;
  }
 }
 const day=dateKey(g.date);
 const match=schedule.find((x:any)=>dateKey(x.date)===day&&
  ((norm(x.homeTeam)===norm(a.name)&&norm(x.awayTeam)===norm(b.name))||(norm(x.awayTeam)===norm(a.name)&&norm(x.homeTeam)===norm(b.name))));
 if(match){
  const winnerName=clean(match.actualWinner);
  if(winnerName&&norm(winnerName)===norm(a.name))return a;
  if(winnerName&&norm(winnerName)===norm(b.name))return b;
 }
 return null;
}
function scoreClass(defs:any[], submitted:any,scoreboard:any[]){
 const actual:any={},points=[1,2,4,8];
 let score=0,correct=0,graded=0,picked=0;
 for(const game of defs){
  const a=resolve(game.a,actual),b=resolve(game.b,actual);
  if(game.auto){actual[game.id]=a||b;continue;}
  const pick=clean(submitted?.[game.id]);if(pick)picked++;
  const actualWinner=resultWinner(game.source,a,b,scoreboard);
  actual[game.id]=actualWinner;
  if(actualWinner){graded++;if(pick===actualWinner.id){score+=points[game.round];correct++;}}
 }
 return{score,correct,graded,picked};
}
function grade(row:any,classes:any,scoreboard:any[]){
 let points=0,correct=0,graded=0,picked=0,champions=0;
 for(const c of ORDER){
  const b=classes[c];const defs=build(b);
  const p:any={};for(const g of defs)p[g.id]=row.picks?.[c+'|'+g.id];
  const summary=scoreClass(defs,p,scoreboard);points+=summary.score;correct+=summary.correct;graded+=summary.graded;picked+=summary.picked;
  const title=defs.at(-1);if(title){
   const actual:any={},project:any={};
   for(const g of defs){const a=resolve(g.a,actual),b=resolve(g.b,actual);actual[g.id]=g.auto?(a||b):resultWinner(g.source,a,b,scoreboard);
   const aa=resolve(g.a,project),bb=resolve(g.b,project),pick=clean(row.picks?.[c+'|'+g.id]);project[g.id]=g.auto?(aa||bb):aa&&bb?(aa.id===pick?aa:bb.id===pick?bb:null):null;
   }
   if(actual[title.id]&&project[title.id]?.id===actual[title.id].id)champions++;
  }
 }
 return{username:row.username,points,correct,graded,picked,champions};
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return respond({error:'POST required'},405);
 try{
  if(Number(req.headers.get('content-length')||0)>45000)return respond({error:'Request too large'},413);
  const body=await req.json();
  const action=clean(body?.action);
  const {official,scoreboard}=await sources();
  const classes=official.classifications;
  if(!ORDER.every(c=>classes?.[c]?.status==='official'))return respond({error:'Official bracket data not ready'},503);
  const deadlines=Object.fromEntries(ORDER.map(c=>[c,locked(classes[c])]));
  if(action==='leaderboard'){
   const entries=await db('playoff_pick_entries?season=eq.2026&select=username,picks,updated_at&limit=3000');
   const rows=(entries||[]).map((r:any)=>grade(r,classes,scoreboard));
   rows.sort((a:any,b:any)=>b.points-a.points||b.correct-a.correct||b.champions-a.champions||b.picked-a.picked||a.username.localeCompare(b.username));
   return respond({rows:rows.slice(0,100).map((r:any,i:number)=>({rank:i+1,...r})),totalEntries:rows.length,deadlines,season:2026});
  }
  if(action!=='submit')return respond({error:'Unknown action'},400);
  const username=clean(body?.username).replace(/[^a-zA-Z0-9 _.-]/g,'').replace(/\s+/g,' ').slice(0,24).trim();
  if(username.length<2)return respond({error:'Enter a fan name (2–24 letters or numbers).'},400);
  const token=clean(body?.token);
  if(!/^[a-f0-9]{64}$/i.test(token))return respond({error:'Invalid entry token'},400);
  const tokenHash=await hash(token),nameKey=username.toLowerCase();
  const lookup=encodeURIComponent('(entry_token_hash.eq.'+tokenHash+',username_key.eq.'+nameKey+')');
  const existing=await db('playoff_pick_entries?season=eq.2026&or='+lookup+'&select=id,entry_token_hash,username_key,picks');
  const own=(existing||[]).find((r:any)=>r.entry_token_hash===tokenHash);
  const taken=(existing||[]).find((r:any)=>r.username_key===nameKey&&r.entry_token_hash!==tokenHash);
  if(taken)return respond({error:'That fan name has already been registered. Pick another.'},409);
  const submitted=body?.picks;
  if(!submitted||typeof submitted!=='object'||Array.isArray(submitted)||Object.keys(submitted).length>100)return respond({error:'Invalid bracket selections'},400);
  const merged:any={};let open=0;
  for(const c of ORDER){
   const defs=build(classes[c]);
   if(deadlines[c].locked){
    for(const g of defs){const key=c+'|'+g.id;if(own?.picks?.[key])merged[key]=own.picks[key];}
   }else{
    open++;
    const local:any={};for(const g of defs)local[g.id]=submitted[c+'|'+g.id];
    let valid:any;
    try{valid=projected(defs,local)}catch(e){return respond({error:c+': '+String((e as Error).message)},400)}
    for(const [id,pick] of Object.entries(valid))merged[c+'|'+id]=pick;
   }
  }
  if(!own&&!open)return respond({error:'Entries are closed for all classifications'},423);
  if(!Object.keys(merged).length)return respond({error:'Choose at least one winner before submitting.'},400);
  const row={season:2026,entry_token_hash:tokenHash,username,username_key:nameKey,picks:merged,updated_at:new Date().toISOString()};
  if(own){
   await db('playoff_pick_entries?id=eq.'+own.id,{method:'PATCH',body:JSON.stringify(row)});
  }else{
   await db('playoff_pick_entries',{method:'POST',body:JSON.stringify(row)});
  }
  return respond({ok:true,username,picked:Object.keys(merged).length,deadlines});
 }catch(err){console.error('playoff-pickem error',err);return respond({error:'Playoff submission service unavailable. Please retry.'},500);}
});
import fs from 'node:fs';

const base='https://sports.deseret.com';
const jsonUrl=base+'/_next/data/v2.89.2/high-school/school/kanab/boys-basketball/scores-schedule/2003.json';
const r=await fetch(jsonUrl,{headers:{'user-agent':'Mozilla/5.0 (compatible; RuralUtahSports/1.0; +https://ruralutahsports.com/)','accept':'application/json,text/plain,*/*','referer':base+'/high-school/school/kanab/boys-basketball/scores-schedule/2003'},redirect:'follow'});
const body=await r.text();
let parsed=null;try{parsed=JSON.parse(body)}catch{}
const pageProps=parsed?.pageProps||parsed?.props?.pageProps||null;
const games=Array.isArray(pageProps?.previousMatchupGames)?pageProps.previousMatchupGames:[];
const out={checkedAt:new Date().toISOString(),jsonUrl,status:r.status,ok:r.ok,bodyLength:body.length,bodyPrefix:body.slice(0,500),pagePropsKeys:pageProps?Object.keys(pageProps):[],previousMatchupCount:games.length,previousMatchupGames:games.slice(0,2)};
fs.writeFileSync('deseret-basketball-team-probe.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:r.status,bodyLength:body.length,previousMatchupCount:games.length,pagePropsKeys:out.pagePropsKeys}));

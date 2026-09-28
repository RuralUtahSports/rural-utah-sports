import fs from 'node:fs';

const url='https://sports.deseret.com/high-school/school/kanab/boys-basketball/scores-schedule/2003';
const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; RuralUtahSports/1.0; +https://ruralutahsports.com/)'},redirect:'follow'});
const html=await r.text();
const marker='<script id="__NEXT_DATA__" type="application/json">';
let data=null;
const start=html.indexOf(marker);
if(start>=0){
  const from=start+marker.length;
  const end=html.indexOf('</script>',from);
  if(end>from){try{data=JSON.parse(html.slice(from,end))}catch(error){data={parseError:error.message}}}
}
const pageProps=data?.props?.pageProps||null;
const games=Array.isArray(pageProps?.previousMatchupGames)?pageProps.previousMatchupGames:[];
const out={checkedAt:new Date().toISOString(),url,status:r.status,ok:r.ok,htmlLength:html.length,hasNextData:!!data,buildId:data?.buildId||null,page:data?.page||null,query:data?.query||null,pagePropsKeys:pageProps?Object.keys(pageProps):[],team:pageProps?.team||null,previousMatchupCount:games.length,previousMatchupGames:games.slice(0,5)};
fs.writeFileSync('deseret-basketball-team-probe.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:r.status,htmlLength:html.length,hasNextData:!!data,pagePropsKeys:out.pagePropsKeys,previousMatchupCount:out.previousMatchupCount}));

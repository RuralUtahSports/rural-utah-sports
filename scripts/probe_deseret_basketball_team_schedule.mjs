import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const url='https://sports.deseret.com/high-school/school/kanab/boys-basketball/scores-schedule/2003';
const browser=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(p=>fs.existsSync(p));
if(!browser) throw new Error('No Chrome/Chromium found');
const u=new URL(url);
u.searchParams.set('_rus_probe',Date.now().toString());
const result=spawnSync(browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--virtual-time-budget=12000','--dump-dom',u.toString()],{encoding:'utf8',timeout:40000,maxBuffer:20*1024*1024});
const html=result.stdout||'';
const marker='<script id="__NEXT_DATA__" type="application/json">';
let data=null;
const start=html.indexOf(marker);
if(start>=0){const from=start+marker.length;const end=html.indexOf('</script>',from);if(end>from){try{data=JSON.parse(html.slice(from,end))}catch(error){data={parseError:error.message}}}}
const pageProps=data?.props?.pageProps||null;
const games=Array.isArray(pageProps?.previousMatchupGames)?pageProps.previousMatchupGames:[];
const out={checkedAt:new Date().toISOString(),url,browser,exitStatus:result.status,stderr:String(result.stderr||'').slice(0,5000),htmlLength:html.length,hasAccess:html.includes('Kanab Boys Basketball'),hasBlockedMessage:html.includes('Please contact the site owner for access'),hasNextData:!!data,buildId:data?.buildId||null,pagePropsKeys:pageProps?Object.keys(pageProps):[],team:pageProps?.team||null,previousMatchupCount:games.length,previousMatchupGames:games.slice(0,5),textPreview:html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,3000)};
fs.writeFileSync('deseret-basketball-team-probe.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({exitStatus:result.status,htmlLength:html.length,hasAccess:out.hasAccess,blocked:out.hasBlockedMessage,hasNextData:!!data,previousMatchupCount:out.previousMatchupCount}));

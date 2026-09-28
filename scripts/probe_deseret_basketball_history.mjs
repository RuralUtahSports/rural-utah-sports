import fs from 'node:fs';

const url='https://sports.deseret.com/high-school/boys-basketball/scores-schedule/2000-02-09?region=all';
const res=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; RuralUtahSports/1.0; +https://ruralutahsports.com/)','accept':'text/html,application/xhtml+xml'},redirect:'follow'});
const html=await res.text();

function excerpt(term, radius=1200){
  const lower=html.toLowerCase();
  const i=lower.indexOf(term.toLowerCase());
  if(i<0)return null;
  return html.slice(Math.max(0,i-radius),Math.min(html.length,i+radius));
}
const stripped=html
  .replace(/<script[\s\S]*?<\/script>/gi,' ')
  .replace(/<style[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]+>/g,' ')
  .replace(/&nbsp;/g,' ')
  .replace(/&amp;/g,'&')
  .replace(/&#39;|&apos;/g,"'")
  .replace(/&quot;/g,'"')
  .replace(/\s+/g,' ')
  .trim();

const nextMatch=html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
let nextInfo=null;
if(nextMatch){
  try{
    const parsed=JSON.parse(nextMatch[1]);
    nextInfo={keys:Object.keys(parsed),page:parsed.page||null,query:parsed.query||null,buildId:parsed.buildId||null,propsKeys:Object.keys(parsed.props||{})};
  }catch(error){nextInfo={error:error.message,rawPrefix:nextMatch[1].slice(0,1000)}}
}
const output={
  checkedAt:new Date().toISOString(),
  url,
  status:res.status,
  ok:res.ok,
  finalUrl:res.url,
  htmlLength:html.length,
  hasNextData:!!nextMatch,
  hasNextFlight:html.includes('self.__next_f.push'),
  nextInfo,
  terms:{
    brighton:html.toLowerCase().includes('brighton'),
    kanab:html.toLowerCase().includes('kanab'),
    northSevier:html.toLowerCase().includes('north sevier'),
    final:html.toLowerCase().includes('final')
  },
  excerpts:{
    brighton:excerpt('Brighton'),
    kanab:excerpt('Kanab'),
    northSevier:excerpt('North Sevier'),
    final:excerpt('Final')
  },
  textPreview:stripped.slice(0,30000)
};
fs.writeFileSync('deseret-basketball-probe-2000-02-09.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({status:res.status,htmlLength:html.length,hasNextData:!!nextMatch,hasNextFlight:html.includes('self.__next_f.push'),terms:output.terms}));

import json,re,subprocess,concurrent.futures,pathlib,html,time,sys
root=pathlib.Path(__file__).resolve().parents[1];out=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/rus-position-fetch-2026');out.mkdir(parents=True,exist_ok=True)
mp={k:v['sourceUrl'].replace('/stats/','/roster/') for k,v in json.load(open(root/'maxpreps-stats-fallback-2026.json'))['teams'].items() if v.get('sourceUrl')}
mp.update({'SAINT JOSEPH':'https://www.maxpreps.com/ut/ogden/st-joseph-jayhawks/football/roster/','JUDGE MEMORIAL':'https://www.maxpreps.com/ut/salt-lake-city/judge-memorial-catholic-bulldogs/football/roster/','UMA-LEHI':'https://www.maxpreps.com/ut/lehi/utah-military-academy-camp-williams-marauders/football/roster/','UMA-HILLFIELD':'https://www.maxpreps.com/ut/riverdale/utah-military-academy-hill-field-thunderbirds/football/roster/','MONUMENT VAL':'https://www.maxpreps.com/ut/monument-valley/monument-valley-cougars/football/roster/'})
des=json.load(open(root/'deseret-rosters-stats-2026.json'))['teams']
def slug(s):return re.sub('[^a-z0-9]+','-',s.lower()).strip('-')
def task(team,provider,url):
 f=out/(slug(team)+'-'+provider+'.html');result={'team':team,'provider':provider,'url':url}
 try:
  if not f.exists():
   r=subprocess.run(['curl','-L','--fail','--max-time','25','--retry','1','--retry-max-time','40','-sS',url,'-o',str(f)],capture_output=True,text=True)
   if r.returncode:raise Exception(r.stderr.strip()[:150])
  text=f.read_text();m=re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',text,re.S)
  if not m:raise Exception('No structured roster data')
  p=json.loads(m[1])['props']['pageProps']
  if provider=='maxpreps':
   ctx=p['teamContext']['data'];result['season']=ctx['year'];result['school']=ctx['schoolName'];result['state']=ctx['stateCode']
   if ctx['year']!='26-27' or ctx['stateCode']!='UT' or ctx['sport']!='Football' or ctx['level']!='Varsity':raise Exception('Wrong season/state/sport/level')
  else:
   result['season']=p.get('selectedYear')
   if str(p.get('selectedYear'))!='2027':raise Exception('Wrong Deseret season: '+str(p.get('selectedYear')))
  rows=[]
  for table in re.findall(r'<table\b[^>]*>(.*?)</table>',text,re.S):
   for tr in re.findall(r'<tr\b[^>]*>(.*?)</tr>',table,re.S):
    cells=[html.unescape(re.sub('<[^>]+>','',x)).strip() for x in re.findall(r'<(?:td|th)\b[^>]*>(.*?)</(?:td|th)>',tr,re.S)]
    if len(cells)>=4 and re.fullmatch(r'\d+[A-Z]?',cells[0]):rows.append({'number':cells[0],'name':cells[1],'grade':cells[2],'position':cells[3]})
  result['players']=rows;result['status']='ok' if rows else 'empty'
 except Exception as e:result['status']='error';result['error']=str(e)
 (out/(slug(team)+'-'+provider+'.json')).write_text(json.dumps(result,indent=2));return result
jobs=[]
for team in json.load(open(root/'region-awards-2026.lock.json'))['data']['teams']:
 if team in mp:jobs.append((team,'maxpreps',mp[team]))
 url=des.get(team,{}).get('rosterUrl','');
 if url:
  url=re.sub(r'/roster(?:/\d+)?/?$', '/roster/2027',url);jobs.append((team,'deseret',url))
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
 for i,r in enumerate(pool.map(lambda x:task(*x),jobs),1):
  if i%20==0 or r['status']!='ok':print(i,len(jobs),r['team'],r['provider'],r['status'],r.get('error',''),flush=True)
print('DONE',len(jobs),flush=True)

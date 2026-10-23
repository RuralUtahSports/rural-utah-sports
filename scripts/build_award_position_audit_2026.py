import json,re,pathlib,collections,datetime,sys
root=pathlib.Path(__file__).resolve().parents[1];cache=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/rus-position-fetch-2026');out=root
snapshot=json.load(open(root/'region-awards-2026.lock.json'))
def slug(s):return re.sub('[^a-z0-9]+','-',s.lower()).strip('-')
def norm(s):return re.sub('[^A-Z0-9]','',str(s or '').upper())
def cleanname(s):return re.sub(r'^[A-Za-z]\.', '',s).strip()
def pos(s):
 tokens=[x for x in re.split('[^A-Z0-9]+',str(s or '').upper()) if x and x not in ['NA','NONE','UNKNOWN']]
 return '/'.join(dict.fromkeys(tokens))
def match(row,players):
 same=[p for p in players if norm(cleanname(p['name']))==norm(row['name'])];exact=[p for p in same if str(p['number'])==str(row['number'])]
 if len(exact)==1:return exact[0],'exact'
 if same:return None,'number_or_duplicate_review'
 return None,'not_found'
report={'season':2026,'checkedDate':'2026-10-23','policy':'Exact normalized name and jersey matches only. Deseret positions take priority when sources differ; disagreements remain flagged. No position inferred from statistics. Locked statistics unchanged.','teams':{}}
counts=collections.Counter();updates={};sources={}
for team,t in snapshot['data']['teams'].items():
 fetched={}
 for provider in ['deseret','maxpreps']:
  f=cache/(slug(team)+'-'+provider+'.json');fetched[provider]=json.load(open(f)) if f.exists() else {'status':'unavailable','players':[]}
 sources[team]={k:{n:v.get(n) for n in ['url','status','season','error'] if v.get(n) is not None} for k,v in fetched.items()}
 teamreport={'sources':sources[team],'sourceRosterCounts':{k:len(v.get('players',[])) for k,v in fetched.items()},'players':[]}
 roster={p['playerId']:p for p in t.get('roster',[])}
 for section in t.get('stats',[]):
  for row in section.get('rows',[]):
   if row.get('playerId') and row['playerId'] not in roster:roster[row['playerId']]={**row,'position':''}
 for row in roster.values():
  d,dm=match(row,fetched['deseret'].get('players',[]));m,mm=match(row,fetched['maxpreps'].get('players',[]));dp=pos(d.get('position')) if d else '';mp=pos(m.get('position')) if m else '';old=pos(row.get('position'))
  selected=dp or old or mp
  if dp and mp:status='both_agree' if set(dp.split('/'))==set(mp.split('/')) else 'source_difference'
  elif dp:status='deseret_only'
  elif mp:status='maxpreps_only' if not old or set(old.split('/'))==set(mp.split('/')) else 'source_difference'
  elif old:status='snapshot_only'
  else:status='unverified'
  if dm=='number_or_duplicate_review' or mm=='number_or_duplicate_review':status='identity_review'
  grade=(d or {}).get('grade','')
  if not grade or grade=='-':grade=(m or {}).get('grade','')
  entry={'id':row['playerId'],'name':row['name'],'number':row['number'],'snapshotPosition':old,'deseretPosition':dp,'maxprepsPosition':mp,'position':selected,'status':status,'deseretMatch':dm,'maxprepsMatch':mm,'grade':grade}
  teamreport['players'].append(entry);counts[status]+=1
  # Runtime data remains compact; full evidence and matches are in the audit JSON.
  updates[row['playerId']]=[selected,status,dp,mp,grade]
 teamreport['counts']=dict(collections.Counter(p['status'] for p in teamreport['players']));report['teams'][team]=teamreport
report['summary']={'teams':len(report['teams']),'players':sum(counts.values()),'statuses':dict(counts),'newPositions':sum(bool(p['position']) and not p['snapshotPosition'] for t in report['teams'].values() for p in t['players']),'sourcePages':dict(collections.Counter(k+':'+v['status'] for t in report['teams'].values() for k,v in t['sources'].items()))}
(out/'region-position-audit-2026.json').write_text(json.dumps(report,separators=(',',':'))+'\n')
(out/'award-position-verification-2026.js').write_text('// Roster evidence only; generated from region-position-audit-2026.json. Statistics are unchanged.\n// Tuple: resolved position, verification status, Deseret position, MaxPreps position, grade.\nwindow.RUSAwardPositionAudit2026='+json.dumps(updates,separators=(',',':'))+';\nwindow.RUSAwardPositionSources2026='+json.dumps(sources,separators=(',',':'))+';\n')
print(json.dumps(report['summary'],indent=2))

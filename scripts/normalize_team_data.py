#!/usr/bin/env python3
import json
from pathlib import Path

ALIASES={
    'GUNNISON':'GUNNISON VALLEY','MAPLE MTN':'MAPLE MOUNTAIN','MONUMENT VAL':'MONUMENT VALLEY',
    'CEDAR':'CEDAR CITY','SUMMIT':'SUMMIT ACADEMY','WASATCH ACAD':'WASATCH ACADEMY','WASATCH ACAD.':'WASATCH ACADEMY'
}
def canonical(v):
    n=' '.join(str(v or '').strip().upper().split()).rstrip('.').strip()
    if n.startswith('WASATCH ACAD'):
        return 'WASATCH ACADEMY'
    return ALIASES.get(n,n)

def slug(v):
    import re
    return re.sub(r'^-+|-+$','',re.sub(r'[^a-z0-9]+','-',canonical(v).lower()))

def empty(): return {'wins':0,'losses':0,'ties':0,'games':0}
def add(r,result):
    r['games']+=1
    if result=='W': r['wins']+=1
    elif result=='L': r['losses']+=1
    else: r['ties']+=1

def date_year(date):
    try: return int(str(date).strip().split('/')[-1])
    except: return 0

def normalize_schedules(raw):
    out={}; removed=0; conflicts=0
    for team,years in (raw or {}).items():
        t=canonical(team); out.setdefault(t,{})
        for year,games in (years or {}).items():
            seen={}; cleaned=[]
            for g in games or []:
                x=dict(g); x['opponent']=canonical(x.get('opponent'))
                key=(str(x.get('date','')).strip(),x['opponent'])
                score=(x.get('teamScore'),x.get('opponentScore'),x.get('result'))
                if key in seen:
                    removed+=1
                    if seen[key]!=score: conflicts+=1
                    continue
                seen[key]=score; cleaned.append(x)
            out[t][str(year)]=cleaned
    return out,removed,conflicts

def build_breakdowns(schedules):
    out={}
    for team,years in schedules.items():
        b={'decades':{},'opponents':{}}
        for year,games in years.items():
            for g in games:
                y=date_year(g.get('date')) or int(year or 0); decade=str((y//10)*10) if y else '0'
                opp=canonical(g.get('opponent')); result=str(g.get('result','T')).upper()
                b['decades'].setdefault(decade,empty()); b['opponents'].setdefault(opp,empty())
                add(b['decades'][decade],result); add(b['opponents'][opp],result)
        out[team]=b
    return out

def normalize_elo(raw):
    out={}; removed=0; conflicts=0
    for team,rows in (raw or {}).items():
        t=canonical(team); out.setdefault(t,[]); seen={}
        for r in rows or []:
            x=dict(r); x['opponent']=canonical(x.get('opponent'))
            key=(str(x.get('date','')).strip(),x['opponent'])
            sig=(x.get('eloBefore'),x.get('change'),x.get('eloAfter'),x.get('result'))
            if key in seen:
                removed+=1
                if seen[key]!=sig: conflicts+=1
                continue
            seen[key]=sig; out[t].append(x)
    return out,removed,conflicts

schedules_path=Path('team-schedules.json'); elo_path=Path('team-elo-history.json')
if not schedules_path.exists() or not elo_path.exists(): raise SystemExit('Required team data missing')
schedules,game_removed,game_conflicts=normalize_schedules(json.loads(schedules_path.read_text()))
breakdowns=build_breakdowns(schedules)
elo,elo_removed,elo_conflicts=normalize_elo(json.loads(elo_path.read_text()))
schedules_path.write_text(json.dumps(schedules,separators=(',',':')))
Path('team-record-breakdowns.json').write_text(json.dumps(breakdowns,separators=(',',':')))
elo_path.write_text(json.dumps(elo,separators=(',',':')))

# Rewrite the corresponding pieces inside each per-team page payload.
page_dir=Path('team-page-data')
for team in set(schedules)|set(elo):
    p=page_dir/f'{slug(team)}.json'
    if not p.exists():
        # Some historical naming uses a non-canonical filename; locate by schedule content only when unambiguous.
        continue
    data=json.loads(p.read_text())
    data['schedules']=schedules.get(team,{})
    data['breakdown']=breakdowns.get(team,{'decades':{},'opponents':{}})
    data['eloHistory']=elo.get(team,[])
    p.write_text(json.dumps(data,separators=(',',':')))

Path('duplicate-cleanup-report.json').write_text(json.dumps({
    'scheduleDuplicatesRemoved':game_removed,'scheduleConflictingDuplicates':game_conflicts,
    'eloDuplicatesRemoved':elo_removed,'eloConflictingDuplicates':elo_conflicts,
    'wasatchAcademyCanonicalName':'WASATCH ACADEMY'
},indent=2)+'\n')
print(f'Schedule duplicates removed: {game_removed}; conflicts: {game_conflicts}')
print(f'ELO duplicates removed: {elo_removed}; conflicts: {elo_conflicts}')

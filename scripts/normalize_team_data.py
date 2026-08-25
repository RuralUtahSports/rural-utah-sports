#!/usr/bin/env python3
import json
from datetime import datetime
from pathlib import Path

ALIASES={
    'GUNNISON':'GUNNISON VALLEY','MAPLE MTN':'MAPLE MOUNTAIN','MONUMENT VAL':'MONUMENT VALLEY',
    'CEDAR':'CEDAR CITY','SUMMIT':'SUMMIT ACADEMY','WASATCH ACAD':'WASATCH ACADEMY','WASATCH ACAD.':'WASATCH ACADEMY',
    'HINKLEY':'HINCKLEY','BY HIGH':'BYH','BRIGHAM YOUNG':'BYH'
}
def canonical(v):
    n=' '.join(str(v or '').strip().upper().split()).rstrip('.').strip()
    if n.startswith('WASATCH ACAD'):
        return 'WASATCH ACADEMY'
    return ALIASES.get(n,n)

def slug(v):
    import re
    return re.sub(r'^-+|-+$','',re.sub(r'[^a-z0-9]+','-',canonical(v).lower()))

def parse_date(v):
    try: return datetime.strptime(str(v).strip(),'%m/%d/%Y')
    except: return None

def empty(): return {'wins':0,'losses':0,'ties':0,'games':0}
def add(r,result):
    r['games']+=1
    if result=='W': r['wins']+=1
    elif result=='L': r['losses']+=1
    else: r['ties']+=1

def date_year(date):
    d=parse_date(date)
    return d.year if d else 0

def normalize_schedules(raw):
    grouped={}
    for team,years in (raw or {}).items():
        t=canonical(team); grouped.setdefault(t,{})
        for year,games in (years or {}).items():
            bucket=grouped[t].setdefault(str(year),[])
            for g in games or []:
                x=dict(g); x['opponent']=canonical(x.get('opponent')); bucket.append(x)

    out={}; exact_removed=0; near_removed=0; conflicts=0
    for team,years in grouped.items():
        out[team]={}
        for year,games in years.items():
            # First remove same-date/same-opponent duplicates.
            exact_seen={}; first_pass=[]
            for x in games:
                key=(str(x.get('date','')).strip(),x['opponent'])
                score=(x.get('teamScore'),x.get('opponentScore'),x.get('result'))
                if key in exact_seen:
                    exact_removed+=1
                    if exact_seen[key]!=score: conflicts+=1
                    continue
                exact_seen[key]=score; first_pass.append(x)

            # Then remove the same matchup and exact score repeated within three days.
            # This catches systematic date-shift copies (Thursday/Friday, Friday/Saturday, etc.)
            # while retaining games with different scores.
            chronological=sorted(enumerate(first_pass),key=lambda z:(parse_date(z[1].get('date')) or datetime.max,z[0]))
            drop=set(); last_by_sig={}
            for idx,x in chronological:
                d=parse_date(x.get('date'))
                if not d: continue
                sig=(x['opponent'],x.get('teamScore'),x.get('opponentScore'),x.get('result'))
                prior=last_by_sig.get(sig)
                if prior:
                    days=(d-prior[0]).days
                    if 0<days<=3:
                        drop.add(idx); near_removed+=1; continue
                last_by_sig[sig]=(d,idx)
            out[team][year]=[x for i,x in enumerate(first_pass) if i not in drop]
    return out,exact_removed,near_removed,conflicts

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

# Schedule normalization owns schedule-derived data only. Verified ELO is owned by
# scripts/build_verified_elo_2026.mjs / Build Clean Live ELO and must not be rewritten here.
schedules_path=Path('team-schedules.json')
if not schedules_path.exists(): raise SystemExit('Required team schedule data missing')
schedules,game_exact_removed,game_near_removed,game_conflicts=normalize_schedules(json.loads(schedules_path.read_text()))
breakdowns=build_breakdowns(schedules)
schedules_path.write_text(json.dumps(schedules,separators=(',',':')))
Path('team-record-breakdowns.json').write_text(json.dumps(breakdowns,separators=(',',':')))

page_dir=Path('team-page-data')
for team in schedules:
    p=page_dir/f'{slug(team)}.json'
    if not p.exists(): continue
    data=json.loads(p.read_text())
    data['schedules']=schedules.get(team,{})
    data['breakdown']=breakdowns.get(team,{'decades':{},'opponents':{}})
    p.write_text(json.dumps(data,separators=(',',':')))

Path('duplicate-cleanup-report.json').write_text(json.dumps({
    'scheduleDuplicatesRemoved':game_exact_removed+game_near_removed,
    'scheduleExactDuplicatesRemoved':game_exact_removed,
    'scheduleNearDateDuplicatesRemoved':game_near_removed,
    'scheduleConflictingDuplicates':game_conflicts,
    'eloDuplicatesRemoved':0,
    'eloConflictingDuplicates':0,
    'eloOwner':'Build Clean Live ELO',
    'canonicalAliases':{'WASATCH ACAD':'WASATCH ACADEMY','HINKLEY':'HINCKLEY','BY HIGH':'BYH'}
},indent=2)+'\n')
print(f'Schedule duplicates removed: {game_exact_removed+game_near_removed} ({game_exact_removed} exact, {game_near_removed} near-date); conflicts: {game_conflicts}')
print('ELO normalization skipped: verified ELO is owned by Build Clean Live ELO')

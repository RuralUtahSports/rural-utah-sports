import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
teams = json.loads((root/'teams-data.json').read_text())
standings = json.loads((root/'standings-2026.json').read_text())['byClassification']
state = json.loads((root/'state-top25-history-2026.json').read_text())['snapshots'][-1]['teams']
small = json.loads((root/'small-school-rankings-history-2026.json').read_text())['snapshots'][-1]['teams']
classes = json.loads((root/'rankings-history-2026.json').read_text())['snapshots'][-1]['classifications']

record = {}
for rows in standings.values():
    for x in rows:
        record[x['team']] = x
all_teams = {x['team']: x for x in teams}
order = []
def add(name, why):
    if name in all_teams and name not in order:
        order.append(name)

for x in state: add(x['team'], 'State Top 25 anchor')
for x in small: add(x['team'], '3A–1A anchor')
for name in classes.get('8-PLAYER', []): add(name, '8-player anchor')

class_weight = {'6A': 6, '5A': 5, '4A': 4, '3A': 3, '2A': 2, '1A': 1, '8P': 0}
def score(name):
    x = record.get(name, {})
    w, l = x.get('wins', 0), x.get('losses', 0)
    pct = w / max(1, w+l)
    return (pct*100 + min(20, (w-l)*2) + class_weight.get(all_teams[name].get('classification'), 0), w, -l)

for name in sorted(all_teams, key=score, reverse=True): add(name, 'Record and available résumé data')

rows=[]
for i,name in enumerate(order,1):
    t=all_teams[name]; r=record.get(name,{})
    rows.append({'rank':i,'team':name,'classification':t.get('classification',''),'wins':r.get('wins',0),'losses':r.get('losses',0),'reason':'Provisional all-state placement anchored by the existing class and statewide rankings, current record and available résumé data.'})
(root/'all-state-rankings-2026.json').write_text(json.dumps({'season':2026,'label':'Provisional All-State Power Rankings','date':'2026-09-07','provisional':True,'teams':rows}, indent=2, ensure_ascii=False)+'\n')
print(f'Built {len(rows)} teams')


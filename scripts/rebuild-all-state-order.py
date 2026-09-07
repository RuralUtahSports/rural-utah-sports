import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
p = root / 'all-state-rankings-2026.json'
d = json.loads(p.read_text())
rows = {x['team']: x for x in d['teams'] if x.get('classification') != '8P'}
anchors = ['MOUNTAIN RIDGE','CORNER CANYON','AMERICAN FORK','HERRIMAN','SKYRIDGE','LONE PEAK','WEST','OREM','RIDGELINE','DAVIS','TIMPVIEW','STANSBURY','CRIMSON CLIFFS','BOX ELDER','MORGAN','ALTA','COPPER HILLS','HURRICANE','PLEASANT GROVE','SPRINGVILLE','FREMONT','LAYTON CHRISTIAN','WESTLAKE','WEBER','PINE VIEW']
blend = ['GRANTSVILLE','CEDAR CITY','RICHFIELD','SAN JUAN','JUAB','RICH','CANYON VIEW','SOUTH SUMMIT','KANAB','MONTICELLO','LOGAN','WHITEHORSE','DUCHESNE','SAINT JOSEPH','MANTI','BEAVER','SUMMIT ACADEMY','OGDEN','NORTH SANPETE','NORTH SUMMIT','DELTA','ENTERPRISE','MILLARD','EMERY','ALA','PANGUITCH','GUNNISON VALLEY','UNION','UMA-LEHI','SOUTH SEVIER','CARBON','BEN LOMOND','NORTH SEVIER','MILFORD','ALTAMONT','JUDGE MEMORIAL','PROVIDENCE HALL','PAROWAN','WATER CANYON','UMA-HILLFIELD']
order = []
for name in anchors + blend:
    if name in rows and name not in order:
        order.append(name)
for x in d['teams']:
    if x.get('classification') != '8P' and x['team'] not in order:
        order.append(x['team'])
for i, name in enumerate(order, 1):
    rows[name]['rank'] = i
    rows[name]['reason'] = ('State Top 25 anchor based on statewide résumé, schedule strength and current results.' if i <= 25 else 'Provisional placement blended from class rankings, cross-class results, head-to-head context and current résumé.')
d['teams'] = [rows[name] for name in order if rows[name].get('classification') != '8P']
p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + '\n')
print('rebuilt', len(order), 'teams')


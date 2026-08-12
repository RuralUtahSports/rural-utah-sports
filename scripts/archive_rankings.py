#!/usr/bin/env python3
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
CURRENT=ROOT/'rankings-current-2026.json'
HISTORY=ROOT/'rankings-history-2026.json'

def main():
    current=json.loads(CURRENT.read_text(encoding='utf-8'))
    history=json.loads(HISTORY.read_text(encoding='utf-8')) if HISTORY.exists() else {'season':current.get('season'),'snapshots':[]}
    key=current.get('key')
    if not key:
        raise SystemExit('Current rankings snapshot needs a key')
    snapshots=history.setdefault('snapshots',[])
    for i,row in enumerate(snapshots):
        if row.get('key')==key:
            snapshots[i]=current
            break
    else:
        snapshots.append(current)
    snapshots.sort(key=lambda r:(str(r.get('date','')),str(r.get('key',''))))
    history['season']=current.get('season',history.get('season'))
    HISTORY.write_text(json.dumps(history,indent=2)+'\n',encoding='utf-8')
    print('Archived',key,'snapshots:',len(snapshots))

if __name__=='__main__':main()

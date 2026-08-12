#!/usr/bin/env python3
import json
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEAM_DIR = ROOT / 'team-page-data'
TEAMS_FILE = ROOT / 'teams-data.json'
OUT_FILE = ROOT / 'streak-records.json'


def slug(value):
    import re
    return re.sub(r'(^-+|-+$)', '', re.sub(r'[^a-z0-9]+', '-', str(value).strip().lower()))


def date_key(value, fallback_year, index):
    text = str(value or '').strip()
    for fmt in ('%m/%d/%Y', '%Y-%m-%d'):
        try:
            d = datetime.strptime(text, fmt)
            return (d.year, d.month, d.day, index)
        except ValueError:
            pass
    return (int(fallback_year), 1, 1, index)


def longest(events, target):
    best = []
    current = []
    for event in events:
        if event['result'] == target:
            current.append(event)
            if len(current) > len(best):
                best = list(current)
        else:
            current = []
    if not best:
        return {'length': 0, 'startDate': '', 'endDate': '', 'startOpponent': '', 'endOpponent': ''}
    return {
        'length': len(best),
        'startDate': best[0]['date'],
        'endDate': best[-1]['date'],
        'startOpponent': best[0]['opponent'],
        'endOpponent': best[-1]['opponent'],
    }


def main():
    teams = json.loads(TEAMS_FILE.read_text(encoding='utf-8'))
    output = {}
    for team in teams:
        name = str(team.get('team', '')).strip()
        if not name:
            continue
        path = TEAM_DIR / f'{slug(name)}.json'
        if not path.exists():
            continue
        data = json.loads(path.read_text(encoding='utf-8'))
        schedules = data.get('schedules') or {}
        events = []
        index = 0
        for year in sorted(schedules, key=lambda x: int(x) if str(x).isdigit() else 0):
            games = schedules.get(year) or []
            for game in games:
                result = str(game.get('result', '')).strip().upper()
                if result not in {'W', 'L', 'T'}:
                    continue
                index += 1
                events.append({
                    'sort': date_key(game.get('date'), year, index),
                    'date': str(game.get('date', '')).strip(),
                    'opponent': str(game.get('opponent', '')).strip(),
                    'result': result,
                })
        events.sort(key=lambda x: x['sort'])
        output[name] = {
            'longestWinStreak': longest(events, 'W'),
            'longestLossStreak': longest(events, 'L'),
        }
    OUT_FILE.write_text(json.dumps(output, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print(f'Wrote {len(output)} teams to {OUT_FILE.name}')


if __name__ == '__main__':
    main()

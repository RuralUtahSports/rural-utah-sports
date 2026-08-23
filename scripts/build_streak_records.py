#!/usr/bin/env python3
import json
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEAM_DIR = ROOT / 'team-page-data'
TEAMS_FILE = ROOT / 'teams-data.json'
STREAK_OUT_FILE = ROOT / 'streak-records.json'
SEASON_OUT_FILE = ROOT / 'season-records.json'


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


def streak_summary(run):
    if not run:
        return {'length': 0, 'startDate': '', 'endDate': '', 'startOpponent': '', 'endOpponent': ''}
    return {
        'length': len(run),
        'startDate': run[0]['date'],
        'endDate': run[-1]['date'],
        'startOpponent': run[0]['opponent'],
        'endOpponent': run[-1]['opponent'],
    }


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
    return streak_summary(best)


def current(events, target):
    run = []
    for event in reversed(events):
        if event['result'] != target:
            break
        run.append(event)
    run.reverse()
    return streak_summary(run)


def longest_scoring(events):
    best = []
    run = []
    for event in events:
        if event.get('teamScore', 0) > 0:
            run.append(event)
            if len(run) > len(best):
                best = list(run)
        else:
            run = []
    return streak_summary(best)


def current_scoring(events):
    run = []
    for event in reversed(events):
        if event.get('teamScore', 0) <= 0:
            break
        run.append(event)
    run.reverse()
    return streak_summary(run)


def number(value, default=0):
    try:
        if value is None or value == '':
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def whole(value, default=0):
    return int(round(number(value, default)))


def main():
    teams = json.loads(TEAMS_FILE.read_text(encoding='utf-8'))
    streak_output = {}
    seasons = {}

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
                    'teamScore': whole(game.get('teamScore')),
                })
        events.sort(key=lambda x: x['sort'])
        streak_output[name] = {
            'longestWinStreak': longest(events, 'W'),
            'longestLossStreak': longest(events, 'L'),
            'currentWinStreak': current(events, 'W'),
            'currentLossStreak': current(events, 'L'),
            'longestScoringStreak': longest_scoring(events),
            'currentScoringStreak': current_scoring(events),
        }

        for row in data.get('seasonHistory') or []:
            year = whole(row.get('year'), 0)
            if not year:
                continue
            wins = whole(row.get('wins'))
            losses = whole(row.get('losses'))
            ties = whole(row.get('ties'))
            games = whole(row.get('games'), wins + losses + ties)
            pf = whole(row.get('pointsFor'))
            pa = whole(row.get('pointsAgainst'))
            win_pct = number(row.get('winPct'), ((wins + ties * 0.5) / games if games else 0))
            avg_margin = number(row.get('avgMargin'), ((pf - pa) / games if games else 0))
            seasons.setdefault(str(year), []).append({
                'team': name,
                'wins': wins,
                'losses': losses,
                'ties': ties,
                'games': games,
                'pointsFor': pf,
                'pointsAgainst': pa,
                'winPct': round(win_pct, 6),
                'avgMargin': round(avg_margin, 3),
            })

    for rows in seasons.values():
        rows.sort(key=lambda r: (-r['winPct'], -r['wins'], -r['avgMargin'], r['team']))

    STREAK_OUT_FILE.write_text(json.dumps(streak_output, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    SEASON_OUT_FILE.write_text(json.dumps({'seasons': seasons}, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'Wrote {len(streak_output)} teams to {STREAK_OUT_FILE.name}')
    print(f'Wrote {sum(len(v) for v in seasons.values())} team-seasons to {SEASON_OUT_FILE.name}')


if __name__ == '__main__':
    main()

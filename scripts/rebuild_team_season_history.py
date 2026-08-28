#!/usr/bin/env python3
"""Expand every team page's season history from its full schedule data.

Existing season-history rows are preserved exactly (including rating/SOS/rank
fields). Any schedule-backed season that is missing from seasonHistory gets a
new factual summary built from completed W/L/T games. This avoids inventing
seasons or advanced metrics while making every real season already present in
the repository visible on team pages.
"""

# Rebuild version 2: schedule-backed seasons plus verified missing 2025 fixes.

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEAM_DIR = ROOT / "team-page-data"

# Verified from the Deseret News 2025 football score/schedule pages. Keeping
# these here makes the correction durable: if another generator recreates a
# team-page file without 2025, this rebuild puts the season back automatically.
VERIFIED_SCHEDULE_FIXES = {
    "copper-hills.json": {
        "2025": [
            {"date": "8/15/2025", "opponent": "NORTHRIDGE", "teamScore": 21, "opponentScore": 14, "result": "W", "playoff": False, "notes": ""},
            {"date": "8/22/2025", "opponent": "WEST JORDAN", "teamScore": 27, "opponentScore": 29, "result": "L", "playoff": False, "notes": ""},
            {"date": "8/29/2025", "opponent": "HUNTER", "teamScore": 43, "opponentScore": 13, "result": "W", "playoff": False, "notes": ""},
            {"date": "9/5/2025", "opponent": "LAYTON", "teamScore": 29, "opponentScore": 22, "result": "W", "playoff": False, "notes": ""},
            {"date": "9/12/2025", "opponent": "MOUNTAIN RIDGE", "teamScore": 15, "opponentScore": 49, "result": "L", "playoff": False, "notes": ""},
            {"date": "9/19/2025", "opponent": "CEDAR VALLEY", "teamScore": 24, "opponentScore": 27, "result": "L", "playoff": False, "notes": ""},
            {"date": "9/26/2025", "opponent": "WESTLAKE", "teamScore": 21, "opponentScore": 35, "result": "L", "playoff": False, "notes": ""},
            {"date": "10/3/2025", "opponent": "BINGHAM", "teamScore": 10, "opponentScore": 34, "result": "L", "playoff": False, "notes": ""},
            {"date": "10/10/2025", "opponent": "HERRIMAN", "teamScore": 13, "opponentScore": 42, "result": "L", "playoff": False, "notes": ""},
            {"date": "10/17/2025", "opponent": "RIVERTON", "teamScore": 14, "opponentScore": 47, "result": "L", "playoff": False, "notes": ""},
            {"date": "10/31/2025", "opponent": "SKYRIDGE", "teamScore": 3, "opponentScore": 63, "result": "L", "playoff": True, "notes": "6A SECOND ROUND"},
        ]
    },
    "clearfield.json": {
        "2025": [
            {"date": "8/15/2025", "opponent": "CYPRUS", "teamScore": 6, "opponentScore": 9, "result": "L", "playoff": False, "notes": ""},
            {"date": "8/22/2025", "opponent": "KEARNS", "teamScore": 34, "opponentScore": 7, "result": "W", "playoff": False, "notes": ""},
            {"date": "8/29/2025", "opponent": "JORDAN", "teamScore": 23, "opponentScore": 7, "result": "W", "playoff": False, "notes": ""},
            {"date": "9/5/2025", "opponent": "OGDEN", "teamScore": 7, "opponentScore": 24, "result": "L", "playoff": False, "notes": ""},
            {"date": "9/12/2025", "opponent": "FREMONT", "teamScore": 6, "opponentScore": 63, "result": "L", "playoff": False, "notes": ""},
            {"date": "9/19/2025", "opponent": "WEST FIELD", "teamScore": 7, "opponentScore": 34, "result": "L", "playoff": False, "notes": ""},
            {"date": "9/26/2025", "opponent": "ROY", "teamScore": 21, "opponentScore": 28, "result": "L", "playoff": False, "notes": ""},
            {"date": "10/4/2025", "opponent": "BONNEVILLE", "teamScore": 35, "opponentScore": 19, "result": "W", "playoff": False, "notes": ""},
            {"date": "10/9/2025", "opponent": "BOX ELDER", "teamScore": 7, "opponentScore": 24, "result": "L", "playoff": False, "notes": ""},
            {"date": "10/15/2025", "opponent": "NORTHRIDGE", "teamScore": 20, "opponentScore": 24, "result": "L", "playoff": False, "notes": ""},
            {"date": "10/24/2025", "opponent": "BOUNTIFUL", "teamScore": 6, "opponentScore": 56, "result": "L", "playoff": True, "notes": "5A FIRST ROUND"},
        ]
    },
}


def number(value):
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def score_value(value):
    n = number(value)
    if n is None:
        return None
    return int(round(n))


def completed_games(games):
    """Return unique completed games usable for a season summary."""
    rows = []
    seen = set()
    for game in games if isinstance(games, list) else []:
        result = str(game.get("result", "")).strip().upper()
        if result not in {"W", "L", "T"}:
            continue
        team_score = score_value(game.get("teamScore"))
        opponent_score = score_value(game.get("opponentScore"))
        if team_score is None or opponent_score is None:
            continue
        key = (
            str(game.get("date", "")).strip(),
            str(game.get("opponent", "")).strip().upper(),
            result,
            team_score,
            opponent_score,
        )
        if key in seen:
            continue
        seen.add(key)
        rows.append((result, team_score, opponent_score))
    return rows


def season_summary(year, games):
    rows = completed_games(games)
    if not rows:
        return None

    wins = sum(1 for result, _, _ in rows if result == "W")
    losses = sum(1 for result, _, _ in rows if result == "L")
    ties = sum(1 for result, _, _ in rows if result == "T")
    game_count = len(rows)
    points_for = sum(team_score for _, team_score, _ in rows)
    points_against = sum(opponent_score for _, _, opponent_score in rows)

    return {
        "year": int(year),
        "wins": wins,
        "losses": losses,
        "ties": ties,
        "winPct": (wins + ties * 0.5) / game_count,
        "games": game_count,
        "pointsFor": points_for,
        "pointsAgainst": points_against,
        "ppg": points_for / game_count,
        "papg": points_against / game_count,
        "avgMargin": (points_for - points_against) / game_count,
    }


def valid_year(value):
    try:
        year = int(value)
        return year if 1800 <= year <= 2200 else None
    except (TypeError, ValueError):
        return None


def rebuild_file(path):
    data = json.loads(path.read_text(encoding="utf-8"))
    schedules = data.get("schedules") or {}
    existing = data.get("seasonHistory") or []
    schedule_changed = False

    for year, games in VERIFIED_SCHEDULE_FIXES.get(path.name, {}).items():
        if schedules.get(year) != games:
            schedules[year] = games
            schedule_changed = True
    if schedule_changed:
        data["schedules"] = schedules

    # Preserve every existing row so advanced metrics are never lost.
    rows_by_year = {}
    passthrough = []
    for row in existing if isinstance(existing, list) else []:
        year = valid_year(row.get("year") if isinstance(row, dict) else None)
        if year is None:
            passthrough.append(row)
            continue
        rows_by_year[year] = row

    added_years = []
    for raw_year, games in schedules.items():
        year = valid_year(raw_year)
        if year is None or year in rows_by_year:
            continue
        summary = season_summary(year, games)
        if summary is None:
            continue
        rows_by_year[year] = summary
        added_years.append(year)

    rebuilt = [rows_by_year[year] for year in sorted(rows_by_year, reverse=True)]
    rebuilt.extend(passthrough)

    if rebuilt == existing and not schedule_changed:
        return False, added_years, len(rebuilt)

    data["seasonHistory"] = rebuilt
    path.write_text(json.dumps(data, separators=(",", ":")) + "\n", encoding="utf-8")
    return True, added_years, len(rebuilt)


def main():
    changed = 0
    total_added = 0
    north_sanpete_count = None

    for path in sorted(TEAM_DIR.glob("*.json")):
        did_change, added_years, count = rebuild_file(path)
        if did_change:
            changed += 1
            total_added += len(added_years)
            if added_years:
                print(f"{path.name}: added {len(added_years)} season(s), earliest {min(added_years)}")
        if path.name == "north-sanpete.json":
            north_sanpete_count = count

    print(f"Updated {changed} team files; added {total_added} schedule-backed season rows.")
    if north_sanpete_count is not None:
        print(f"North Sanpete now has {north_sanpete_count} season-history rows.")


if __name__ == "__main__":
    main()

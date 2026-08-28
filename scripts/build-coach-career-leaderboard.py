#!/usr/bin/env python3
"""Build the all-time coaching leaderboard from verified coach tenures and team pages."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def slug(value: str) -> str:
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", value.lower()))


def coach_key(value: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", value.upper())


def result_totals(games):
    totals = {"wins": 0, "losses": 0, "ties": 0}
    for game in games:
        result = str(game.get("result", "")).strip().upper()
        if result == "W":
            totals["wins"] += 1
        elif result == "L":
            totals["losses"] += 1
        elif result == "T":
            totals["ties"] += 1
    return totals


def main() -> None:
    index = load(ROOT / "coach-history-index.json")
    rows = []
    for shard in index.get("shards", []):
        rows.extend(load(ROOT / shard).get("rows", []))

    coaches = defaultdict(lambda: {
        "name": "", "wins": 0, "losses": 0, "ties": 0,
        "playoffWins": 0, "playoffLosses": 0, "playoffTies": 0,
        "championships": 0, "appearances": 0, "seasons": 0, "schools": set(),
    })

    for row in rows:
        team, _, _, school, _, _, tenures, *_ = row
        page_path = ROOT / "team-page-data" / f"{slug(team)}.json"
        if not page_path.exists():
            continue
        page = load(page_path)
        schedules = page.get("schedules", {})
        history = {int(x.get("year")): x for x in page.get("seasonHistory", []) if x.get("year") is not None}
        titles_by_year = defaultdict(list)
        for title in page.get("championshipHistory", []):
            if title.get("year") is not None:
                titles_by_year[int(title["year"])].append(title)

        for name, start, end, *_ in tenures:
            key = coach_key(name)
            coach = coaches[key]
            coach["name"] = coach["name"] or name
            coach["schools"].add(school or team)
            for year in range(int(start), int(end) + 1):
                coach["seasons"] += 1
                games = schedules.get(str(year), [])
                if games:
                    totals = result_totals(games)
                    coach["wins"] += totals["wins"]
                    coach["losses"] += totals["losses"]
                    coach["ties"] += totals["ties"]
                    playoff = result_totals(g for g in games if g.get("playoff") is True)
                    coach["playoffWins"] += playoff["wins"]
                    coach["playoffLosses"] += playoff["losses"]
                    coach["playoffTies"] += playoff["ties"]
                elif year in history:
                    season = history[year]
                    coach["wins"] += int(season.get("wins", 0) or 0)
                    coach["losses"] += int(season.get("losses", 0) or 0)
                    coach["ties"] += int(season.get("ties", 0) or 0)

                for title in titles_by_year[year]:
                    coach["appearances"] += 1
                    if str(title.get("role", "")).strip().lower() in {"champion", "co-champion"}:
                        coach["championships"] += 1

    output = []
    for coach in coaches.values():
        coach["schools"] = sorted(coach["schools"])
        coach["games"] = coach["wins"] + coach["losses"] + coach["ties"]
        output.append(coach)
    output.sort(key=lambda x: (-x["wins"], -x["games"], x["name"]))

    payload = {
        "source": "RUS verified coach assignments and team-page game records",
        "coaches": output,
    }
    (ROOT / "coach-career-leaderboard.json").write_text(
        json.dumps(payload, separators=(",", ":"), ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Built {len(output)} coach career rows")


if __name__ == "__main__":
    main()

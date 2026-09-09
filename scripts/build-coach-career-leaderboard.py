#!/usr/bin/env python3
"""Build coach career totals and derive postseason records from RUS brackets."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

# Bracket files use a few display names that differ from the team keys used by
# the coaching-history index. Keep the normalization here so every consumer
# uses the same team-season playoff totals.
TEAM_ALIASES = {
    "AMERICANLEADERSHIP": "ALA",
    "AMERICANLEADERSHIPACADEMY": "ALA",
    "AMERLEAD": "ALA",
    "CEDAR": "CEDARCITY",
    "GUNNISON": "GUNNISONVALLEY",
    "JUDGE": "JUDGEMEMORIAL",
    "LAYTONCHRISTIANACADEMY": "LAYTONCHRISTIAN",
    "MONUMENTVALLEY": "MONUMENTVAL",
    "PANGUTICH": "PANGUITCH",
    "SAINTJOSEPH": "SAINTJOSEPH",
    "STJOSEPH": "SAINTJOSEPH",
    "SUMMITACAD": "SUMMITACADEMY",
    "UMACAMPWILLIAMS": "UMALEHI",
    "UMAHILLFIELD": "UMAHILLFIELD",
    "UTAHMILITARYACADEMYCAMPWILLIAMS": "UMALEHI",
    "UTAHMILITARYACADEMYHILLFIELD": "UMAHILLFIELD",
    "WASATCHACADEMY": "WASATCHACAD",
}


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def slug(value: str) -> str:
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", value.lower()))


def team_key(value: str) -> str:
    value = str(value or "").strip().upper()
    value = re.sub(r"^\s*(?:#|NO\.?\s*)\d+\s*", "", value)
    normalized = re.sub(r"[^A-Z0-9]", "", value)
    return TEAM_ALIASES.get(normalized, normalized)


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


def parse_score(value):
    """Return a numeric bracket score, or None for forfeits/placeholders."""
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value or "").strip().upper()
    if text in {"", "F", "—", "-", "CHAMPION", "CO-CHAMP"}:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def build_playoff_records(rows):
    """Derive team-season postseason records from the historical brackets."""
    known_teams = {team_key(row[0]) for row in rows}
    records = defaultdict(lambda: defaultdict(lambda: {
        "wins": 0, "losses": 0, "ties": 0, "games": 0
    }))
    bracket_years = []
    parsed_games = 0
    skipped_entries = 0

    for bracket_path in sorted(ROOT.glob("brackets-*.json")):
        match = re.search(r"brackets-(\d{4})\.json$", bracket_path.name)
        if not match:
            continue
        year = int(match.group(1))
        bracket_years.append(year)
        bracket = load(bracket_path)
        for rounds in bracket.values():
            for _, games in rounds or []:
                for game in games or []:
                    if not isinstance(game, list) or len(game) < 4:
                        skipped_entries += 1
                        continue
                    team_a, score_a_raw, team_b, score_b_raw = game[:4]
                    score_a = parse_score(score_a_raw)
                    score_b = parse_score(score_b_raw)
                    if score_a is None and score_b is None:
                        skipped_entries += 1
                        continue

                    key_a = team_key(team_a)
                    key_b = team_key(team_b)
                    if score_a is None:
                        outcome_a, outcome_b = "losses", "wins"
                    elif score_b is None:
                        outcome_a, outcome_b = "wins", "losses"
                    elif score_a > score_b:
                        outcome_a, outcome_b = "wins", "losses"
                    elif score_a < score_b:
                        outcome_a, outcome_b = "losses", "wins"
                    else:
                        outcome_a = outcome_b = "ties"

                    for key, outcome in ((key_a, outcome_a), (key_b, outcome_b)):
                        if key not in known_teams:
                            continue
                        record = records[key][str(year)]
                        record[outcome] += 1
                        record["games"] += 1
                    parsed_games += 1

    normalized = {
        team: {year: dict(sorted(totals.items())) for year, totals in sorted(seasons.items())}
        for team, seasons in sorted(records.items())
    }
    return {
        "format": "coach-playoff-records-v1",
        "source": "Historical RUS state-playoff bracket files",
        "bracketYears": sorted(set(bracket_years)),
        "postseasonGames": parsed_games,
        "skippedBracketEntries": skipped_entries,
        "teamSeasons": sum(len(seasons) for seasons in normalized.values()),
        "records": normalized,
    }


def main() -> None:
    index = load(ROOT / "coach-history-index.json")
    rows = []
    for shard in index.get("shards", []):
        rows.extend(load(ROOT / shard).get("rows", []))
    all_schedules = {
        team_key(team): schedules
        for team, schedules in load(ROOT / "team-schedules.json").items()
    }
    playoff_payload = build_playoff_records(rows)
    playoff_records = playoff_payload["records"]
    (ROOT / "coach-playoff-records.json").write_text(
        json.dumps(playoff_payload, separators=(",", ":"), ensure_ascii=False, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    coaches = defaultdict(lambda: {
        "name": "", "wins": 0, "losses": 0, "ties": 0,
        "playoffWins": 0, "playoffLosses": 0, "playoffTies": 0,
        "championships": 0, "appearances": 0, "seasons": 0, "schools": set(),
    })

    for row in rows:
        team, _, _, school, _, _, tenures, *_ = row
        page_path = ROOT / "team-page-data" / f"{slug(team)}.json"
        page = load(page_path) if page_path.exists() else {}
        schedules = page.get("schedules") or all_schedules.get(team_key(team), {})
        history = {int(x.get("year")): x for x in page.get("seasonHistory", []) if x.get("year") is not None}
        playoff_by_year = playoff_records.get(team_key(team), {})
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
                elif year in history:
                    season = history[year]
                    coach["wins"] += int(season.get("wins", 0) or 0)
                    coach["losses"] += int(season.get("losses", 0) or 0)
                    coach["ties"] += int(season.get("ties", 0) or 0)

                playoff = playoff_by_year.get(str(year), {})
                coach["playoffWins"] += int(playoff.get("wins", 0) or 0)
                coach["playoffLosses"] += int(playoff.get("losses", 0) or 0)
                coach["playoffTies"] += int(playoff.get("ties", 0) or 0)

                for title in titles_by_year[year]:
                    coach["appearances"] += 1
                    if str(title.get("role", "")).strip().lower() in {"champion", "co-champion"}:
                        coach["championships"] += 1

    output = []
    for key, coach in coaches.items():
        coach["schools"] = sorted(coach["schools"])
        coach["games"] = coach["wins"] + coach["losses"] + coach["ties"]
        output.append(coach)
    output.sort(key=lambda x: (-x["wins"], -x["games"], x["name"]))

    payload = {
        "source": (
            "RUS historical bracket-derived postseason games joined to verified "
            "coach assignments"
        ),
        "coaches": output,
    }
    (ROOT / "coach-career-leaderboard.json").write_text(
        json.dumps(payload, separators=(",", ":"), ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Built {len(output)} coach career rows")
    print(
        "Derived "
        f"{playoff_payload['postseasonGames']} postseason games across "
        f"{playoff_payload['teamSeasons']} team-seasons"
    )


if __name__ == "__main__":
    main()

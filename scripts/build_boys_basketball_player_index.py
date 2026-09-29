#!/usr/bin/env python3
"""Build a compact player directory from the boys basketball roster archive."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROSTER_DIR = ROOT / "boys-basketball-rosters"
INDEX_FILE = ROSTER_DIR / "index.json"
OUTPUT_FILE = ROOT / "boys-basketball-player-index.json"
SEASONS_DIR = ROOT / "boys-basketball-player-seasons"


def clean(value):
    return str(value or "").strip()


def norm(value):
    return re.sub(r"[^A-Z0-9]", "", clean(value).upper())


def stable_id(key):
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]


archive = json.loads(INDEX_FILE.read_text(encoding="utf-8"))
players = {}
by_year = {}
roster_entries = 0

for team_key, meta in archive.get("teams", {}).items():
    path = ROOT / meta["file"]
    if not path.exists():
        continue
    team_data = json.loads(path.read_text(encoding="utf-8"))
    team = clean(team_data.get("team") or meta.get("team") or team_key)
    canonical_team = norm(team_key)
    for season in team_data.get("seasons", []):
        year = int(season.get("year") or 0)
        season_label = clean(season.get("season"))
        for row in season.get("players", []):
            name = clean(row.get("name"))
            if not name or len(norm(name)) < 2:
                continue
            roster_entries += 1
            class_year = clean(row.get("class"))
            # Graduation year links a player across seasons. When it is missing,
            # keep that appearance season-scoped to avoid merging namesakes.
            identity_suffix = class_year or f"unknown-{year}-{clean(row.get('number'))}"
            identity = "|".join((canonical_team, norm(name), identity_suffix))
            player_id = stable_id(identity)
            players[player_id] = True
            by_year.setdefault(year, {})[player_id] = {
                "id": player_id,
                "name": name,
                "team": team,
                "teamKey": team_key,
                "classYear": class_year,
                "season": season_label,
                "number": clean(row.get("number")),
                "position": clean(row.get("position")),
                "height": clean(row.get("height")),
                "weight": clean(row.get("weight")),
                "sourceUrl": clean(season.get("sourceUrl")),
                "rosterFile": meta["file"],
            }

SEASONS_DIR.mkdir(parents=True, exist_ok=True)
season_manifest = []
for year in sorted(by_year, reverse=True):
    ordered = sorted(by_year[year].values(), key=lambda row: (norm(row["name"]), norm(row["team"]), row["id"]))
    season_file = SEASONS_DIR / f"{year}.json"
    season_file.write_text(json.dumps({"year": year, "season": ordered[0]["season"], "players": ordered}, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    season_manifest.append({"year": year, "season": ordered[0]["season"], "file": f"boys-basketball-player-seasons/{year}.json", "players": len(ordered)})

payload = {
    "schemaVersion": 1,
    "updatedAt": archive.get("updatedAt"),
    "coverage": archive.get("coverage", {}),
    "source": archive.get("source", "Deseret News boys basketball roster pages"),
    "summary": {"players": len(players), "rosterEntries": roster_entries},
    "seasons": season_manifest,
}
OUTPUT_FILE.write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps({"players": len(players), "rosterEntries": roster_entries, "seasonFiles": len(season_manifest), "bytes": OUTPUT_FILE.stat().st_size}, indent=2))

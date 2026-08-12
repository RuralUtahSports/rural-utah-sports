import io
import json
import os
import re
import urllib.request
from datetime import date, datetime
from pathlib import Path

from openpyxl import load_workbook

SHEET_ID = os.environ["SHEET_ID"]
EXPORT_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=xlsx"
ROOT = Path(__file__).resolve().parents[1]
PAGE_DATA_DIR = ROOT / "team-page-data"


def clean(value):
    return str(value or "").strip()


def canonical_team(value):
    key = clean(value).upper()
    aliases = {
        "GUNNISON": "GUNNISON VALLEY",
        "MAPLE MTN": "MAPLE MOUNTAIN",
        "MONUMENT VAL": "MONUMENT VALLEY",
    }
    return aliases.get(key, key)


def slug(value):
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", canonical_team(value).lower()))


def format_date(value):
    if isinstance(value, (datetime, date)):
        return f"{value.month}/{value.day}/{value.year}"
    text = clean(value)
    # Keep the spreadsheet's familiar M/D/YYYY format when possible.
    for fmt in ("%m/%d/%Y", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            parsed = datetime.strptime(text, fmt)
            return f"{parsed.month}/{parsed.day}/{parsed.year}"
        except ValueError:
            pass
    return text


def number(value):
    if value is None or value == "":
        return None
    try:
        n = float(value)
        return int(n) if n.is_integer() else n
    except (TypeError, ValueError):
        return None


def is_playoff_note(note):
    text = clean(note).upper()
    if not text:
        return False
    # Covers the notation already used in the team tabs, including examples
    # such as "4A-IR PO", "4A-QF", "4A-SF", "4A FINAL", "3A 1ST",
    # and abbreviated round notes such as "5A SEC RD".
    return bool(re.search(
        r"\b(?:PO|PLAYOFF|QF|QUARTERFINAL|QUARTERFINALS|SF|SEMIFINAL|SEMIFINALS|FINAL|FINALS|CHAMPIONSHIP|CHAMPIONSHIPS|RND|ROUND|RD|1ST|2ND|3RD)\b",
        text,
    ))


def result_from_row(value, team_score, opponent_score):
    result = clean(value).upper()
    if result in {"W", "L", "T"}:
        return result
    if team_score is None or opponent_score is None:
        return ""
    if team_score > opponent_score:
        return "W"
    if team_score < opponent_score:
        return "L"
    return "T"


def main():
    req = urllib.request.Request(EXPORT_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as response:
        workbook_bytes = response.read()

    wb = load_workbook(io.BytesIO(workbook_bytes), read_only=True, data_only=True)
    sheet_lookup = {canonical_team(name): name for name in wb.sheetnames}

    with open(ROOT / "teams-data.json", encoding="utf-8") as f:
        teams = json.load(f)

    enriched_teams = 0
    enriched_games = 0
    playoff_games = 0

    for team_obj in teams:
        team = canonical_team(team_obj.get("team"))
        sheet_name = sheet_lookup.get(team)
        page_path = PAGE_DATA_DIR / f"{slug(team)}.json"
        if not sheet_name or not page_path.exists():
            continue

        ws = wb[sheet_name]
        schedules = {}

        # Team tabs use B:H as Date, Pts, Opponent, Opp Pts, Other/Notes, W/L, Year.
        # Rows without a date/opponent are ignored, which also skips titles and summaries.
        for row in ws.iter_rows(min_row=1, min_col=2, max_col=8, values_only=True):
            raw_date, raw_team_score, raw_opponent, raw_opponent_score, raw_notes, raw_result, raw_year = row
            game_date = format_date(raw_date)
            opponent = canonical_team(raw_opponent)
            team_score = number(raw_team_score)
            opponent_score = number(raw_opponent_score)
            notes = clean(raw_notes)

            if not game_date or not opponent or opponent in {"OPPONENT", "NONE"}:
                continue
            if team_score is None or opponent_score is None:
                continue

            year = number(raw_year)
            if year is None:
                match = re.search(r"(\d{4})$", game_date)
                year = int(match.group(1)) if match else None
            if year is None:
                continue
            year = int(year)

            result = result_from_row(raw_result, team_score, opponent_score)
            playoff = is_playoff_note(notes)
            schedules.setdefault(str(year), []).append({
                "date": game_date,
                "opponent": opponent,
                "teamScore": team_score,
                "opponentScore": opponent_score,
                "result": result,
                "playoff": playoff,
                "notes": notes,
            })
            enriched_games += 1
            if playoff:
                playoff_games += 1

        if not schedules:
            continue

        with open(page_path, encoding="utf-8") as f:
            payload = json.load(f)
        payload["schedules"] = schedules
        with open(page_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, separators=(",", ":"))
        enriched_teams += 1

    print(f"Team schedule files enriched: {enriched_teams}")
    print(f"Schedule games enriched: {enriched_games}")
    print(f"Playoff games identified: {playoff_games}")

    if enriched_teams == 0 or enriched_games == 0 or playoff_games == 0:
        raise RuntimeError("Playoff-note enrichment produced empty data; refusing to commit.")


if __name__ == "__main__":
    main()

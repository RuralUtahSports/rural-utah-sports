#!/usr/bin/env python3
"""Import 2025-26 boys basketball player season totals from Deseret News."""
import json
import re
import shutil
import subprocess
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://sports.deseret.com"
YEAR = 2026
SEASON = "2025-26"
OUTPUT_DIR = ROOT / "boys-basketball-player-stats"
OUTPUT_FILE = OUTPUT_DIR / f"{YEAR}.json"
REPORT_FILE = OUTPUT_DIR / "build-report.json"
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

SLUG_OVERRIDES = {
    "ALA": "american-leadership",
    "AMERICANLEADERSHIPACADEMY": "american-leadership",
    "GRANDCOUNTY": "grand",
    "GUNNISONVALLEY": "gunnison-valley",
    "JUANDIEGO": "juan-diego",
    "LAYTONCHRISTIANACADEMY": "layton-christian",
    "MAESERPREPACADEMY": "maeser-prep",
    "MONUMENTVALLEY": "monument-valley",
    "SAINTJOSEPH": "st-joseph",
    "AMERICANPREPWV": "apa-west-valley",
    "UMAHILLFIELD": "utah-military-hillfield",
    "UMALEHI": "utah-military-camp-williams",
    "UMACAMPWILLIAMS": "utah-military-camp-williams",
    "MERITPREP": "merit-academy",
    "SALTLAKEACADEMY": "rsl-academy",
    "VANGUARDACADEMY": "vanguard",
}
TEAM_KEY_ALIASES = {
    "GRAND": "GRANDCOUNTY",
    "CEDARCITY": "CEDAR",
    "GUNNISON": "GUNNISONVALLEY",
    "STJOSEPH": "SAINTJOSEPH",
    "AMERICANLEADERSHIP": "ALA",
    "AMERICANLEADERSHIPACADEMY": "ALA",
    "LAYTONCHRISTIAN": "LAYTONCHRISTIANACADEMY",
    "AMERICANPREPARATORYACADEMYWESTVALLEY": "AMERICANPREPWV",
    "JUANDIEGOCATHOLIC": "JUANDIEGO",
    "UTAHSCHOOLFORTHEDEAFBLIND": "USDB",
    "UTAHMILITARYACADEMYCAMPWILLIAMS": "UMALEHI",
    "UMACAMPWILLIAMS": "UMALEHI",
    "UTAHMILITARYACADEMYHILLFIELD": "UMAHILLFIELD",
    "MAESERPREPARATORYACADEMY": "MAESERPREPACADEMY",
    "MERITPREPARATORYACADEMY": "MERITPREP",
    "SALTLAKEACADEMY": "SALTLAKEACADEMY",
    "WASATCHACAD": "WASATCHACADEMY",
}

STAT_FIELDS = {
    "GAMES": "games", "GP": "games",
    "PTS": "points", "POINTS": "points",
    "PPG": "pointsPerGame",
    "3PT": "threePointers", "3PM": "threePointers", "3PTS": "threePointers",
    "3PG": "threePointersPerGame",
    "RBS": "rebounds", "REB": "rebounds", "REBOUNDS": "rebounds",
    "RPG": "reboundsPerGame",
    "AST": "assists", "ASSISTS": "assists",
    "APG": "assistsPerGame",
    "STL": "steals", "STEALS": "steals",
    "SPG": "stealsPerGame",
    "BLK": "blocks", "BLOCKS": "blocks",
    "BPG": "blocksPerGame",
}

def clean(value):
    return str(value or "").strip()

def norm(value):
    return re.sub(r"[^A-Z0-9]", "", clean(value).upper())

def slugify(value):
    text = clean(value).lower().replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")

def team_key(value):
    key = norm(value)
    return TEAM_KEY_ALIASES.get(key, key)

def team_slug(value):
    key = norm(value)
    return SLUG_OVERRIDES.get(key, slugify(value))

def browser_binary():
    for path in ("/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"):
        if Path(path).exists():
            return path
    return None

BROWSER = browser_binary()

def browser_html(url):
    if not BROWSER:
        raise RuntimeError("Chrome/Chromium not found")
    profile = tempfile.mkdtemp(prefix="rus-bb-player-stats-")
    try:
        command = [
            BROWSER, "--headless=new", "--no-sandbox", "--disable-gpu",
            "--disable-dev-shm-usage", "--disable-background-networking",
            "--disable-extensions", "--no-first-run", "--disable-default-apps",
            "--mute-audio", "--window-size=1280,1000",
            f"--user-data-dir={profile}", "--virtual-time-budget=2500",
            "--dump-dom", url,
        ]
        result = subprocess.run(command, capture_output=True, text=True, timeout=30)
        if result.returncode or not result.stdout.strip():
            raise RuntimeError((result.stderr or "Empty browser response")[-800:])
        return result.stdout
    finally:
        shutil.rmtree(profile, ignore_errors=True)

def fetch_html(url):
    response = requests.get(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        },
        timeout=25,
    )
    response.raise_for_status()
    return response.text

def number(value):
    text = clean(value).replace(",", "").replace("%", "")
    if not text or text in {"-", "—", "–", "N/A"}:
        return None
    try:
        numeric = float(text)
    except ValueError:
        return None
    return int(numeric) if numeric.is_integer() else numeric

def player_name(cell):
    link = cell.find("a", href=True)
    if link:
        desktop_first = next((el for el in link.select(".d-none.d-md-inline") if clean(el.get_text(" ", strip=True))), None)
        mobile_initial = next((el for el in link.select(".d-inline.d-md-none") if clean(el.get_text(" ", strip=True))), None)
        text = clean(link.get_text(" ", strip=True))
        if desktop_first and mobile_initial:
            first = clean(desktop_first.get_text(" ", strip=True))
            initial = clean(mobile_initial.get_text(" ", strip=True)).rstrip(".")
            if first and initial and first[0].casefold() == initial[0].casefold():
                text = re.sub(r"^[A-Z]\s*\.\s+", "", text, count=1)
    else:
        text = clean(cell.get_text(" ", strip=True))
    return re.sub(r"\s+([.,])", r"\1", text)

def table_with_stats(soup):
    for table in soup.find_all("table"):
        for header_row in table.find_all("tr"):
            headings = [clean(cell.get_text(" ", strip=True)).upper() for cell in header_row.find_all(["th", "td"])]
            normalized = [re.sub(r"[^A-Z0-9#]", "", value) for value in headings]
            name_index = next((i for i, value in enumerate(normalized) if value in {"PLAYER", "PLAYERNAME", "NAME"}), None)
            if name_index is None:
                continue
            if not ({"GAMES", "GP"} & set(normalized)):
                continue
            if not ({"PTS", "POINTS", "PPG"} & set(normalized)):
                continue
            return table, header_row, normalized
    return None, None, []

def parse_table(soup):
    table, header_row, headings = table_with_stats(soup)
    if table is None:
        return []
    indexes = {}
    for index, heading in enumerate(headings):
        key = "number" if heading in {"NO", "#", "NUMBER"} else STAT_FIELDS.get(heading)
        if heading in {"PLAYER", "PLAYERNAME", "NAME"}:
            key = "name"
        if key and key not in indexes:
            indexes[key] = index

    output = []
    for row in table.find_all("tr"):
        if row is header_row:
            continue
        cells = row.find_all("td")
        if not cells:
            continue
        name_index = indexes.get("name")
        if name_index is None or name_index >= len(cells):
            continue
        name = player_name(cells[name_index])
        if not name or name.lower() in {"player", "team totals", "total"}:
            continue
        values = {}
        for field, index in indexes.items():
            if field == "name" or index >= len(cells):
                continue
            values[field] = number(cells[index].get_text(" ", strip=True))
        games = values.get("games")
        points = values.get("points")
        for total, average in (
            ("points", "pointsPerGame"),
            ("threePointers", "threePointersPerGame"),
            ("rebounds", "reboundsPerGame"),
            ("assists", "assistsPerGame"),
            ("steals", "stealsPerGame"),
            ("blocks", "blocksPerGame"),
        ):
            if values.get(average) is None and values.get(total) is not None and games:
                values[average] = round(values[total] / games, 2)
        output.append({
            "name": name,
            "number": cells[indexes["number"]].get_text(" ", strip=True) if indexes.get("number") is not None and indexes["number"] < len(cells) else "",
            **values,
        })
    return output

def parse_team(team):
    url = f"{BASE}/high-school/school/{team_slug(team['team'])}/boys-basketball/stats/{YEAR}"
    method = "requests"
    try:
        html = fetch_html(url)
    except Exception as request_error:
        if not BROWSER:
            return {"team": team["team"], "teamKey": team_key(team["team"]), "classification": team.get("classification", ""), "region": team.get("region", ""), "sourceUrl": url, "players": [], "status": "error", "error": str(request_error), "method": method}
        try:
            html = browser_html(url)
            method = "chrome"
        except Exception as browser_error:
            return {"team": team["team"], "teamKey": team_key(team["team"]), "classification": team.get("classification", ""), "region": team.get("region", ""), "sourceUrl": url, "players": [], "status": "error", "error": str(browser_error), "method": method}
    soup = BeautifulSoup(html, "html.parser")
    players = parse_table(soup)
    if not players and BROWSER and method == "requests":
        try:
            html = browser_html(url)
            method = "chrome"
            players = parse_table(BeautifulSoup(html, "html.parser"))
        except Exception:
            pass
    return {
        "team": team["team"],
        "teamKey": team_key(team["team"]),
        "classification": team.get("classification", ""),
        "region": team.get("region", ""),
        "sourceUrl": url,
        "players": players,
        "status": "ok" if players else "no_stats",
        "method": method,
    }

teams = json.loads((ROOT / "boys-basketball-teams.json").read_text(encoding="utf-8"))
target = [team for team in teams if team.get("association") == "UHSAA" or team.get("team") == "Utah Prep"]
results = []
with ThreadPoolExecutor(max_workers=8) as pool:
    futures = {pool.submit(parse_team, team): team for team in target}
    for future in as_completed(futures):
        try:
            results.append(future.result())
        except Exception as error:
            team = futures[future]
            results.append({
                "team": team.get("team", ""),
                "teamKey": team_key(team.get("team", "")),
                "classification": team.get("classification", ""),
                "region": team.get("region", ""),
                "sourceUrl": f"{BASE}/high-school/school/{team_slug(team.get('team', ''))}/boys-basketball/stats/{YEAR}",
                "players": [],
                "status": "error",
                "error": str(error),
                "method": "exception",
            })

results.sort(key=lambda team: (norm(team.get("team")), team.get("team", "")))
all_players = []
for team in results:
    for row in team.get("players", []):
        all_players.append({
            **row,
            "team": team["team"],
            "teamKey": team["teamKey"],
            "classification": team.get("classification", ""),
            "region": team.get("region", ""),
        })

summary = {
    "teamsChecked": len(target),
    "teamsWithStats": sum(bool(team.get("players")) for team in results),
    "players": len(all_players),
    "errors": sum(team.get("status") == "error" for team in results),
    "teamsWithoutStats": sum(team.get("status") == "no_stats" for team in results),
}
payload = {
    "schemaVersion": 1,
    "year": YEAR,
    "season": SEASON,
    "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "source": "Deseret News boys basketball school stats pages",
    "summary": summary,
    "teams": results,
    "players": all_players,
}
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE.write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
REPORT_FILE.write_text(json.dumps({"summary": summary, "teams": results}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps(summary, indent=2))

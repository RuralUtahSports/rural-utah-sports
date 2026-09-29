#!/usr/bin/env python3
import json,re,subprocess,tempfile,time,shutil
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
BASE="https://sports.deseret.com"
YEARS=range(2020,2027)  # 2019-20 through 2025-26
OUT_DIR=ROOT/"boys-basketball-rosters"
INDEX_FILE=OUT_DIR/"index.json"
REPORT_FILE=OUT_DIR/"import-report.json"

def clean(v): return str(v or "").strip()
def norm(v): return re.sub(r"[^A-Z0-9]","",clean(v).upper())
def safe(v): return re.sub(r"[^a-z0-9]+","-",clean(v).lower()).strip("-")
def slugify(v):
    s=clean(v).lower().replace("&"," and ")
    return re.sub(r"[^a-z0-9]+","-",s).strip("-")

SLUG_OVERRIDES={
 "ALA":"american-leadership","AMERICANLEADERSHIPACADEMY":"american-leadership",
 "GRANDCOUNTY":"grand","GUNNISONVALLEY":"gunnison-valley","JUANDIEGO":"juan-diego",
 "LAYTONCHRISTIANACADEMY":"layton-christian","MAESERPREPACADEMY":"maeser-prep",
 "MONUMENTVALLEY":"monument-valley","SAINTJOSEPH":"st-joseph",
 "AMERICANPREPWV":"american-prep-west-valley","UMAHILLFIELD":"utah-military-hillfield",
 "UMACAMPWILLIAMS":"utah-military-camp-williams","MERITPREP":"merit-prep",
}
def team_slug(name): return SLUG_OVERRIDES.get(norm(name),slugify(name))

def browser():
    for p in ["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium","/usr/bin/chromium-browser"]:
        if Path(p).exists(): return p
    raise RuntimeError("Chrome/Chromium not found")
BROWSER=browser()

def dump(url):
    td=tempfile.mkdtemp(prefix="rus-bb-roster-")
    try:
        cmd=[BROWSER,"--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
             "--disable-background-networking","--disable-extensions","--no-first-run","--disable-default-apps",
             "--mute-audio","--window-size=1280,1000",f"--user-data-dir={td}",
             "--virtual-time-budget=3000","--dump-dom",url]
        r=subprocess.run(cmd,capture_output=True,text=True,timeout=35)
        if r.returncode!=0 or not r.stdout.strip():
            raise RuntimeError((r.stderr or "empty browser output")[-900:])
        return r.stdout
    finally:
        shutil.rmtree(td,ignore_errors=True)

def text_or_link(cell):
    txt=clean(cell.get_text(" ",strip=True))
    if txt:return txt
    a=cell.find("a",href=True)
    if not a:return ""
    for attr in ["aria-label","title"]:
        if clean(a.get(attr)):return clean(a.get(attr))
    href=clean(a.get("href"))
    parts=[p for p in href.split("/") if p]
    if parts:
        return " ".join(w.capitalize() for w in re.split(r"[-_]+",parts[-1]) if w)
    return ""

def parse_int(v):
    s=clean(v)
    return int(s) if re.fullmatch(r"-?\d+",s) else None

def season_label(year): return f"{year-1}-{str(year)[-2:]}"

def parse_roster(team,year):
    slug=team_slug(team)
    url=f"{BASE}/high-school/school/{slug}/boys-basketball/roster/{year}"
    html=dump(url)
    soup=BeautifulSoup(html,"html.parser")
    players=[]
    coaches=[]
    found_player_table=False

    for table in soup.find_all("table"):
        headers=[clean(th.get_text(" ",strip=True)).upper() for th in table.find_all("th")]
        joined=" | ".join(headers)
        rows=table.find_all("tr")

        if "PLAYER NAME" in joined and "CLASS" in joined:
            found_player_table=True
            for tr in rows:
                cells=tr.find_all("td")
                if len(cells)<2:continue
                vals=[clean(c.get_text(" ",strip=True)) for c in cells]
                number=vals[0] if len(vals)>0 else ""
                name=text_or_link(cells[1])
                if not name:continue
                class_year=parse_int(vals[2]) if len(vals)>2 else None
                position=vals[3] if len(vals)>3 else ""
                height=vals[4] if len(vals)>4 else ""
                weight=vals[5] if len(vals)>5 else ""
                a=cells[1].find("a",href=True)
                profile_url=""
                if a and clean(a.get("href")):
                    href=clean(a.get("href"))
                    profile_url=href if href.startswith("http") else BASE+href
                players.append({
                    "number":number,
                    "name":name,
                    "classYear":class_year,
                    "position":position if position!="-" else "",
                    "height":height if height!="-" else "",
                    "weight":weight if weight!="-" else "",
                    "profileUrl":profile_url
                })

        if "COACH NAME" in joined and "YEARS" in joined:
            for tr in rows:
                cells=tr.find_all("td")
                if len(cells)<2:continue
                vals=[clean(c.get_text(" ",strip=True)) for c in cells]
                name=text_or_link(cells[0])
                years=parse_int(vals[1]) if len(vals)>1 else None
                wins=parse_int(vals[2]) if len(vals)>2 else None
                losses=parse_int(vals[3]) if len(vals)>3 else None
                if name or years is not None:
                    coaches.append({
                        "name":name,
                        "years":years,
                        "careerWins":wins,
                        "careerLosses":losses
                    })

    if not found_player_table:
        raise RuntimeError("player roster table not parsed")
    return {
        "season":season_label(year),
        "endingYear":year,
        "sourceUrl":url,
        "players":players,
        "coaches":coaches
    }

teams=json.loads((ROOT/"boys-basketball-teams.json").read_text())
target=[r["team"] for r in teams if r.get("association")=="UHSAA"]
jobs=[(team,year) for team in target for year in YEARS]
results={}
failures=[]

with ThreadPoolExecutor(max_workers=6) as ex:
    futs={ex.submit(parse_roster,team,year):(team,year) for team,year in jobs}
    for i,fut in enumerate(as_completed(futs),1):
        team,year=futs[fut]
        try:
            row=fut.result()
            results.setdefault(team,[]).append(row)
            print(f"[{i}/{len(jobs)}] {team} {year}: {len(row['players'])} players")
        except Exception as e:
            failures.append({
                "team":team,"year":year,"season":season_label(year),
                "url":f"{BASE}/high-school/school/{team_slug(team)}/boys-basketball/roster/{year}",
                "error":str(e)
            })
            print(f"[{i}/{len(jobs)}] ERROR {team} {year}: {e}")

OUT_DIR.mkdir(parents=True,exist_ok=True)
updated=time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())
index={
    "schemaVersion":1,
    "updatedAt":updated,
    "coverage":{"firstSeason":"2019-20","lastSeason":"2025-26","endingYears":[2020,2021,2022,2023,2024,2025,2026]},
    "source":"Deseret News boys basketball roster pages",
    "teams":{}
}
total_rosters=0
total_players=0

for team in target:
    seasons=sorted(results.get(team,[]),key=lambda r:r["endingYear"],reverse=True)
    total_rosters+=len(seasons)
    total_players+=sum(len(r["players"]) for r in seasons)
    payload={
        "schemaVersion":1,
        "updatedAt":updated,
        "team":team,
        "coverage":index["coverage"],
        "seasons":seasons
    }
    file=OUT_DIR/(safe(team)+".json")
    file.write_text(json.dumps(payload,indent=2)+"\n")
    index["teams"][norm(team)]={
        "team":team,
        "file":str(file.relative_to(ROOT)).replace("\\","/"),
        "seasonsAvailable":[r["season"] for r in seasons],
        "rosterCount":len(seasons),
        "playerRows":sum(len(r["players"]) for r in seasons)
    }

index["summary"]={
    "teams":len(target),
    "requestedRosterPages":len(jobs),
    "rostersImported":total_rosters,
    "playerRows":total_players,
    "failures":len(failures)
}
INDEX_FILE.write_text(json.dumps(index,indent=2)+"\n")
REPORT_FILE.write_text(json.dumps({"summary":index["summary"],"failures":failures},indent=2)+"\n")
print(json.dumps(index["summary"],indent=2))

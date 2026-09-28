#!/usr/bin/env python3
import json,re,subprocess,tempfile,time,shutil
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
BASE="https://sports.deseret.com"
END_YEAR=2026
OUT=ROOT/"boys-basketball-coaching-history.json"
REPORT=ROOT/"boys-basketball-coaching-history-report.json"

def clean(v): return str(v or "").strip()
def norm(v): return re.sub(r"[^A-Z0-9]","",clean(v).upper())
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
    td=tempfile.mkdtemp(prefix="rus-bb-coach-")
    try:
        cmd=[BROWSER,"--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
             "--disable-background-networking","--disable-extensions","--no-first-run","--disable-default-apps",
             "--mute-audio","--window-size=1280,1000",f"--user-data-dir={td}",
             "--virtual-time-budget=3500","--dump-dom",url]
        r=subprocess.run(cmd,capture_output=True,text=True,timeout=35)
        if r.returncode!=0 or not r.stdout.strip(): raise RuntimeError((r.stderr or "empty browser output")[-800:])
        return r.stdout
    finally:
        shutil.rmtree(td,ignore_errors=True)

def title_name(s):
    return " ".join(w.capitalize() for w in re.split(r"[-_]+",s) if w)

def coach_name_from_cell(cell):
    txt=clean(cell.get_text(" ",strip=True))
    if txt:return txt
    a=cell.find("a",href=True)
    if not a:return ""
    for attr in ["aria-label","title"]:
        if clean(a.get(attr)): return clean(a.get(attr))
    href=a.get("href","")
    parts=[p for p in href.split("/") if p]
    for marker in ["coach","coaches"]:
        if marker in parts:
            i=parts.index(marker)
            if i+1<len(parts): return title_name(parts[i+1])
    if parts:return title_name(parts[-1])
    return ""

def parse_team(team):
    slug=team_slug(team)
    url=f"{BASE}/high-school/school/{slug}/boys-basketball/roster/{END_YEAR}"
    html=dump(url)
    soup=BeautifulSoup(html,"html.parser")
    for table in soup.find_all("table"):
        headers=[clean(th.get_text(" ",strip=True)).upper() for th in table.find_all("th")]
        joined=" | ".join(headers)
        if "COACH NAME" not in joined or "YEARS" not in joined: continue
        for tr in table.find_all("tr"):
            cells=tr.find_all("td")
            if len(cells)<2: continue
            name=coach_name_from_cell(cells[0])
            vals=[clean(c.get_text(" ",strip=True)) for c in cells]
            years=next((int(x) for x in vals[1:2] if re.fullmatch(r"\d+",x)),0)
            nums=[int(x) for x in vals[2:4] if re.fullmatch(r"\d+",x)]
            wins=nums[0] if len(nums)>0 else None
            losses=nums[1] if len(nums)>1 else None
            if name or years:
                return {"team":team,"coach":name,"years":years,"careerWins":wins,"careerLosses":losses,"sourceUrl":url}
    return {"team":team,"coach":"","years":0,"careerWins":None,"careerLosses":None,"sourceUrl":url,"error":"coaching table not parsed"}

teams=json.loads((ROOT/"boys-basketball-teams.json").read_text())
target=[r["team"] for r in teams if r.get("association")=="UHSAA"]
rows=[];errors=[]
with ThreadPoolExecutor(max_workers=4) as ex:
    futs={ex.submit(parse_team,t):t for t in target}
    for fut in as_completed(futs):
        team=futs[fut]
        try:r=fut.result()
        except Exception as e:r={"team":team,"coach":"","years":0,"careerWins":None,"careerLosses":None,"sourceUrl":f"{BASE}/high-school/school/{team_slug(team)}/boys-basketball/roster/{END_YEAR}","error":str(e)}
        rows.append(r)
        if r.get("error") or not r.get("coach"): errors.append(r)
        print(team,":",r.get("coach") or "(unknown)",r.get("years") or "")
rows.sort(key=lambda r:r["team"])

season_history=json.loads((ROOT/"boys-basketball-season-history-2002-26.json").read_text())
champ=json.loads((ROOT/"boys-basketball-championships.json").read_text())
champ_by={norm(k):v for k,v in champ.get("teams",{}).items()}
ALIASES={"CEDAR":"CEDARCITY","GRANDCOUNTY":"GRAND","GUNNISONVALLEY":"GUNNISON","LAYTONCHRISTIANACADEMY":"LAYTONCHRISTIAN","SAINTJOSEPH":"STJOSEPH"}
def samekey(v): return ALIASES.get(norm(v),norm(v))

def season_rows(team):
    for name,v in season_history.get("teams",{}).items():
        if samekey(name)==samekey(team):
            return v if isinstance(v,list) else v.get("seasons",[])
    return []

def ending_year(season):
    s=clean(season)
    if re.fullmatch(r"\d{4}-\d{2}",s): return 2000+int(s[-2:])
    return None

def known_for(team,current):
    known={}
    current_name=clean(current.get("coach"))
    yrs=int(current.get("years") or 0)
    if current_name and yrs:
        start=END_YEAR-yrs+1
        for y in range(start,END_YEAR+1):
            known.setdefault(y,[]).append({"coach":current_name,"source":"Deseret roster tenure","inferredTenure":True})
    cdata=None
    for name,v in champ.get("teams",{}).items():
        if samekey(name)==samekey(team): cdata=v;break
    for title in (cdata or {}).get("championships",[]):
        coach=clean(title.get("coach"))
        year=int(title.get("year") or 0)
        if coach and year:
            arr=known.setdefault(year,[])
            if not any(norm(x["coach"])==norm(coach) for x in arr):
                arr.append({"coach":coach,"source":"UHSAA championship record","inferredTenure":False})
    return known

out_teams={}
for current in rows:
    team=current["team"]; known=known_for(team,current); srows=season_rows(team)
    seasons_by_year={ending_year(r.get("season")):r for r in srows if ending_year(r.get("season"))}
    coach_map={}
    for year,entries in sorted(known.items()):
        for entry in entries:
            name=entry["coach"]
            p=coach_map.setdefault(name,{"coach":name,"knownYears":[],"titles":[],"sources":set(),"recordWins":0,"recordLosses":0,"recordGames":0,"bestSeason":None})
            p["knownYears"].append(year);p["sources"].add(entry["source"])
            sr=seasons_by_year.get(year)
            if sr and entry["source"]=="Deseret roster tenure":
                w=int(sr.get("wins") or 0);l=int(sr.get("losses") or 0);g=int(sr.get("games") or w+l)
                p["recordWins"]+=w;p["recordLosses"]+=l;p["recordGames"]+=g
                candidate={"season":sr.get("season"),"wins":w,"losses":l,"winPct":float(sr.get("winPct") or 0),"avgMargin":float(sr.get("avgMargin") or 0)}
                b=p["bestSeason"]
                if not b or (candidate["winPct"],candidate["wins"],candidate["avgMargin"])>(b["winPct"],b["wins"],b["avgMargin"]):p["bestSeason"]=candidate
    cdata=None
    for name,v in champ.get("teams",{}).items():
        if samekey(name)==samekey(team): cdata=v;break
    for title in (cdata or {}).get("championships",[]):
        coach=clean(title.get("coach"));year=int(title.get("year") or 0)
        if coach:
            p=coach_map.setdefault(coach,{"coach":coach,"knownYears":[],"titles":[],"sources":set(),"recordWins":0,"recordLosses":0,"recordGames":0,"bestSeason":None})
            p["titles"].append(year);p["sources"].add("UHSAA championship record")
    coaches=[]
    for p in coach_map.values():
        p["knownYears"]=sorted(set(p["knownYears"]))
        p["titles"]=sorted(set(p["titles"]))
        p["sources"]=sorted(p["sources"])
        p["knownFrom"]=min(p["knownYears"]) if p["knownYears"] else None
        p["knownThrough"]=max(p["knownYears"]) if p["knownYears"] else None
        coaches.append(p)
    coaches.sort(key=lambda p:(-(p["knownThrough"] or 0),p["coach"]))
    out_teams[team]={
      "currentCoach":current if current.get("coach") else None,
      "coaches":coaches,
      "coverageNote":"Known history combines the current coach tenure reported by Deseret for 2025-26 with UHSAA championship-coach records. Non-title historical seasons may still have unidentified coaches."
    }

payload={
 "schemaVersion":1,"updatedAt":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),
 "coverage":{"currentRosterSeason":"2025-26","championshipCoaches":"all years in UHSAA title data"},
 "source":["Deseret News boys basketball roster pages","UHSAA Sports Records Book championship coaches"],
 "summary":{"teamsChecked":len(target),"currentCoachesResolved":sum(bool(r.get("coach")) for r in rows),"teamsWithKnownHistory":sum(bool(v["coaches"]) for v in out_teams.values()),"errors":len(errors)},
 "teams":out_teams
}
OUT.write_text(json.dumps(payload,indent=2)+"\n")
REPORT.write_text(json.dumps({"rows":rows,"errors":errors,"summary":payload["summary"]},indent=2)+"\n")
print(json.dumps(payload["summary"],indent=2))

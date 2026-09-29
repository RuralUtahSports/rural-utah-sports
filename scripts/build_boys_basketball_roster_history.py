#!/usr/bin/env python3
import json,re,time,subprocess,tempfile,shutil
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
BASE="https://sports.deseret.com"
START_YEAR=2010
END_YEAR=2027
OUT_DIR=ROOT/"boys-basketball-rosters"
INDEX_FILE=OUT_DIR/"index.json"
REPORT_FILE=OUT_DIR/"build-report.json"

def clean(v): return str(v or "").strip()
def norm(v): return re.sub(r"[^A-Z0-9]","",clean(v).upper())
def slugify(v):
    s=clean(v).lower().replace("&"," and ")
    return re.sub(r"[^a-z0-9]+","-",s).strip("-")

SLUG_OVERRIDES={
 "ALA":"american-leadership",
 "AMERICANLEADERSHIPACADEMY":"american-leadership",
 "GRANDCOUNTY":"grand",
 "GUNNISONVALLEY":"gunnison-valley",
 "JUANDIEGO":"juan-diego",
 "LAYTONCHRISTIANACADEMY":"layton-christian",
 "MAESERPREPACADEMY":"maeser-prep",
 "MONUMENTVALLEY":"monument-valley",
 "SAINTJOSEPH":"st-joseph",
 "AMERICANPREPWV":"apa-west-valley",
 "UMAHILLFIELD":"utah-military-hillfield",
 "UMALEHI":"utah-military-camp-williams",
 "UMACAMPWILLIAMS":"utah-military-camp-williams",
 "MERITPREP":"merit-academy",
 "SALTLAKEACADEMY":"rsl-academy",
 "VANGUARDACADEMY":"vanguard",
}
def team_slug(name): return SLUG_OVERRIDES.get(norm(name),slugify(name))

TEAM_KEY_ALIASES={
 "UTAHMILITARYACADEMYCAMPWILLIAMS":"UMALEHI","UMACAMPWILLIAMS":"UMALEHI",
 "UTAHMILITARYACADEMYHILLFIELD":"UMAHILLFIELD","STJOSEPH":"SAINTJOSEPH",
 "GRAND":"GRANDCOUNTY","MERITPREPARATORYACADEMY":"MERITPREP",
 "AMERICANLEADERSHIPACADEMY":"ALA","AMERICANPREPARATORYACADEMYWESTVALLEY":"AMERICANPREPWV",
 "MAESERPREPARATORYACADEMY":"MAESERPREPACADEMY","JUANDIEGOCATHOLIC":"JUANDIEGO",
 "JUDGEMEMORIALCATHOLIC":"JUDGEMEMORIAL","UTAHSCHOOLFORTHEDEAFBLIND":"USDB",
 "CEDARCITY":"CEDAR","GUNNISON":"GUNNISONVALLEY","LAYTONCHRISTIAN":"LAYTONCHRISTIANACADEMY",
 "WASATCHACAD":"WASATCHACADEMY"
}
def team_key(name): return TEAM_KEY_ALIASES.get(norm(name),norm(name))

def browser():
    for p in ["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium","/usr/bin/chromium-browser"]:
        if Path(p).exists(): return p
    return None
BROWSER=browser()

def http_html(url):
    headers={
        "User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language":"en-US,en;q=0.9"
    }
    last_error=None
    for attempt in range(3):
        try:
            r=requests.get(url,headers=headers,timeout=25)
            if r.status_code in (403,404):
                r.raise_for_status()
            r.raise_for_status()
            return r.text
        except Exception as e:
            last_error=e
            if getattr(getattr(e,"response",None),"status_code",None) in (403,404):
                break
            if attempt<2:time.sleep(.5*(attempt+1))
    raise last_error

def browser_html(url):
    if not BROWSER: raise RuntimeError("Chrome/Chromium not found")
    td=tempfile.mkdtemp(prefix="rus-bb-roster-")
    try:
        cmd=[BROWSER,"--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
             "--disable-background-networking","--disable-extensions","--no-first-run","--disable-default-apps",
             "--mute-audio","--window-size=1280,1000",f"--user-data-dir={td}",
             "--virtual-time-budget=2500","--dump-dom",url]
        r=subprocess.run(cmd,capture_output=True,text=True,timeout=30)
        if r.returncode!=0 or not r.stdout.strip(): raise RuntimeError((r.stderr or "empty browser output")[-800:])
        return r.stdout
    finally:
        shutil.rmtree(td,ignore_errors=True)

def find_table(soup,required):
    required=[x.upper() for x in required]
    for table in soup.find_all("table"):
        headers=[clean(th.get_text(" ",strip=True)).upper() for th in table.find_all("th")]
        joined=" | ".join(headers)
        if all(x in joined for x in required):
            return table
    return None

def title_name(s):
    return " ".join(w.capitalize() for w in re.split(r"[-_]+",s) if w)

def linked_name(cell):
    a=cell.find("a",href=True)
    if a:
        txt=clean(a.get_text(" ",strip=True))
        desktop_first=next((el for el in a.select(".d-none.d-md-inline") if clean(el.get_text(" ",strip=True))),None)
        mobile_initial=next((el for el in a.select(".d-inline.d-md-none") if clean(el.get_text(" ",strip=True))),None)
        if desktop_first and mobile_initial:
            first=clean(desktop_first.get_text(" ",strip=True))
            initial=clean(mobile_initial.get_text(" ",strip=True)).rstrip(".")
            if first and initial and first[0].casefold()==initial[0].casefold():
                txt=re.sub(r"^[A-Z]\s*\.\s+", "", txt, count=1)
        if txt:return re.sub(r"\s+([.,])",r"\1",txt)
    txt=clean(cell.get_text(" ",strip=True))
    if txt:return re.sub(r"\s+([.,])",r"\1",txt)
    if not a:return ""
    for attr in ["aria-label","title"]:
        if clean(a.get(attr)): return clean(a.get(attr))
    href=clean(a.get("href"))
    parts=[p for p in href.split("/") if p]
    if parts:return title_name(parts[-1])
    return ""

def parse_coach(table):
    if not table:return None
    for tr in table.find_all("tr"):
        cells=tr.find_all("td")
        if len(cells)<2:continue
        name=linked_name(cells[0])
        vals=[clean(c.get_text(" ",strip=True)) for c in cells]
        def intval(v):
            try:return int(v.replace(",",""))
            except:return None
        years=intval(vals[1]) if len(vals)>1 else None
        wins=intval(vals[2]) if len(vals)>2 else None
        losses=intval(vals[3]) if len(vals)>3 else None
        if name or years is not None or wins is not None or losses is not None:
            return {"name":name,"years":years,"careerWins":wins,"careerLosses":losses}
    return None

def parse_players(table):
    if not table:return []
    header_row=next((tr for tr in table.find_all("tr") if len(tr.find_all("th"))>=3),None)
    if not header_row:return []
    headers=[clean(th.get_text(" ",strip=True)).upper() for th in header_row.find_all("th")]
    # normalize expected header names to indexes
    indexes={}
    for i,h in enumerate(headers):
        if h in ["NO","#","NUMBER"]:indexes["number"]=i
        elif "PLAYER" in h and "NAME" in h:indexes["name"]=i
        elif h=="CLASS":indexes["class"]=i
        elif "POSITION" in h:indexes["position"]=i
        elif "HEIGHT" in h:indexes["height"]=i
        elif "WEIGHT" in h:indexes["weight"]=i
    out=[]
    for tr in table.find_all("tr"):
        cells=tr.find_all("td")
        if not cells:continue
        def val(k):
            i=indexes.get(k)
            if i is None or i>=len(cells):return ""
            return linked_name(cells[i]) if k=="name" else clean(cells[i].get_text(" ",strip=True))
        name=val("name")
        if not name:continue
        out.append({
          "number":val("number"),
          "name":name,
          "class":val("class"),
          "position":val("position"),
          "height":val("height"),
          "weight":val("weight")
        })
    return out

def parse_page(team,year):
    slug=team_slug(team)
    url=f"{BASE}/high-school/school/{slug}/boys-basketball/roster/{year}"
    html=None;method="requests";fetch_error=None
    try: html=http_html(url)
    except Exception as e:fetch_error=e
    soup=BeautifulSoup(html or "","html.parser")
    players_table=find_table(soup,["PLAYER NAME","CLASS","POSITION"])
    coach_table=find_table(soup,["COACH NAME","YEARS"])
    if not players_table and BROWSER:
        try:
            html=browser_html(url);method="chrome"
            soup=BeautifulSoup(html,"html.parser")
            players_table=find_table(soup,["PLAYER NAME","CLASS","POSITION"])
            coach_table=find_table(soup,["COACH NAME","YEARS"])
        except Exception as e:
            return {"year":year,"season":f"{year-1}-{str(year)[-2:]}","sourceUrl":url,"players":[],"coach":None,"status":"error","error":str(e),"method":method}
    if not players_table and fetch_error:
        return {"year":year,"season":f"{year-1}-{str(year)[-2:]}","sourceUrl":url,"players":[],"coach":None,"status":"error","error":str(fetch_error),"method":method}
    players=parse_players(players_table)
    coach=parse_coach(coach_table)
    status="ok" if players else "no_roster"
    return {
      "year":year,"season":f"{year-1}-{str(year)[-2:]}","sourceUrl":url,
      "players":players,"coach":coach,"status":status,"method":method
    }

teams=json.loads((ROOT/"boys-basketball-teams.json").read_text())
target=[r["team"] for r in teams if r.get("association")=="UHSAA" or r.get("team")=="Utah Prep"]
OUT_DIR.mkdir(parents=True,exist_ok=True)

work=[(team,year) for team in target for year in range(START_YEAR,END_YEAR+1)]
results={}
errors=[]
with ThreadPoolExecutor(max_workers=10) as ex:
    futs={ex.submit(parse_page,team,year):(team,year) for team,year in work}
    done=0
    for fut in as_completed(futs):
        team,year=futs[fut]
        try:r=fut.result()
        except Exception as e:
            r={"year":year,"season":f"{year-1}-{str(year)[-2:]}","sourceUrl":f"{BASE}/high-school/school/{team_slug(team)}/boys-basketball/roster/{year}","players":[],"coach":None,"status":"error","error":str(e),"method":"exception"}
        results.setdefault(team,[]).append(r)
        if r.get("status")=="error":errors.append({"team":team,**r})
        done+=1
        if done%50==0:print("processed",done,"of",len(work))

updated=time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())
index={"schemaVersion":1,"updatedAt":updated,"coverage":{"startYear":START_YEAR,"endYear":END_YEAR,"firstSeason":f"{START_YEAR-1}-{str(START_YEAR)[-2:]}","lastSeason":f"{END_YEAR-1}-{str(END_YEAR)[-2:]}"},"source":"Deseret News boys basketball roster pages","teams":{}}
summary={"teamsChecked":len(target),"pagesChecked":len(work),"pagesWithRosters":0,"players":0,"errors":len(errors),"teamsWithAnyRoster":0}

for team in target:
    seasons=sorted(results.get(team,[]),key=lambda x:x["year"],reverse=True)
    for s in seasons:
        if s["players"]:
            summary["pagesWithRosters"]+=1
            summary["players"]+=len(s["players"])
    if any(s["players"] for s in seasons):summary["teamsWithAnyRoster"]+=1
    payload={
      "schemaVersion":1,"updatedAt":updated,"team":team,
      "coverage":index["coverage"],"source":"Deseret News boys basketball roster pages",
      "seasons":seasons
    }
    # Match canonicalTeamKey() and rosterFileKey() in boys-basketball-team.html.
    key=team_key(team)
    filename=key.lower()+".json"
    (OUT_DIR/filename).write_text(json.dumps(payload,indent=2)+"\n")
    index["teams"][key]={"team":team,"file":f"boys-basketball-rosters/{filename}","seasonsWithRosters":sum(bool(s["players"]) for s in seasons),"players":sum(len(s["players"]) for s in seasons)}

INDEX_FILE.write_text(json.dumps({**index,"summary":summary},indent=2)+"\n")
REPORT_FILE.write_text(json.dumps({"summary":summary,"errors":errors},indent=2)+"\n")
print(json.dumps(summary,indent=2))

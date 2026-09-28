#!/usr/bin/env python3
import json,re,subprocess,tempfile,time
from pathlib import Path
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
TEAM_FILE=ROOT/"boys-basketball-teams.json"
OUT=ROOT/"boys-basketball-region-championships.json"
REPORT=ROOT/"boys-basketball-region-championships-report.json"
BASE="https://sports.deseret.com"
YEARS=range(2003,2027)

def clean(v): return str(v or "").strip()
def norm(v): return re.sub(r"[^A-Z0-9]","",clean(v).upper())
def slugify(v):
    s=clean(v).lower().replace("&"," and ")
    s=re.sub(r"[^a-z0-9]+","-",s).strip("-")
    return s
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
 "AMERICANPREPWV":"american-prep-west-valley",
 "UMAHILLFIELD":"utah-military-hillfield",
 "UMACAMPWILLIAMS":"utah-military-camp-williams",
 "MERITPREP":"merit-prep",
}
ALIASES={
 "american-leadership-academy":"american-leadership",
 "grand-county":"grand",
 "cedar-city":"cedar",
 "st-joseph-catholic":"st-joseph",
}
def team_slug(name): return SLUG_OVERRIDES.get(norm(name),slugify(name))
teams=json.loads(TEAM_FILE.read_text())
slug_to_team={team_slug(r["team"]):r["team"] for r in teams}
for a,b in ALIASES.items():
    if b in slug_to_team: slug_to_team[a]=slug_to_team[b]

def browser():
    for p in ["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium","/usr/bin/chromium-browser"]:
        if Path(p).exists(): return p
    raise RuntimeError("Chrome/Chromium not found")

def dump(url):
    b=browser()
    td=tempfile.mkdtemp(prefix="rus-basketball-region-")
    cmd=[b,"--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
         "--disable-background-networking","--disable-extensions","--no-first-run","--disable-default-apps",
         "--mute-audio","--window-size=1440,1200",f"--user-data-dir={td}","--virtual-time-budget=4500","--dump-dom",url]
    r=subprocess.run(cmd,capture_output=True,text=True,timeout=40)
    if r.returncode!=0 or not r.stdout.strip(): raise RuntimeError((r.stderr or "empty browser output")[-1000:])
    return r.stdout

def preceding_region(table):
    node=table
    for _ in range(40):
        node=node.previous_element
        if node is None: break
        txt=clean(getattr(node,"get_text",lambda *a,**k: str(node))(" ",strip=True) if hasattr(node,"get_text") else node)
        m=re.search(r"\b([1-6]A)\s*-\s*Region\s+(\d+)\b",txt,re.I)
        if m:return m.group(1).upper(),int(m.group(2))
    # fallback search limited previous text
    txt=" ".join(clean(x) for x in list(table.stripped_strings)[:3])
    m=re.search(r"\b([1-6]A)\s*-\s*Region\s+(\d+)\b",txt,re.I)
    return (m.group(1).upper(),int(m.group(2))) if m else (None,None)

def school_slug_from_row(tr):
    for a in tr.find_all("a",href=True):
        href=a["href"]
        m=re.search(r"/high-school/school/([^/]+)(?:/|$)",href)
        if m:return m.group(1).lower(),clean(a.get_text(" ",strip=True))
    return None,None

def nums(cells):
    vals=[]
    for td in cells:
        t=clean(td.get_text(" ",strip=True))
        try: vals.append(float(t))
        except: vals.append(None)
    return vals

results=[]
failures=[]
for year in YEARS:
    url=f"{BASE}/high-school/boys-basketball/standings/{year}"
    try:
        html=dump(url)
        soup=BeautifulSoup(html,"html.parser")
        year_regions=0
        for table in soup.find_all("table"):
            cls,region=preceding_region(table)
            if not cls or not region: continue
            rows=[]
            for tr in table.find_all("tr"):
                cells=tr.find_all("td")
                if len(cells)<3: continue
                slug,label=school_slug_from_row(tr)
                if not slug: continue
                values=nums(cells[1:])
                if len(values)<2 or values[0] is None or values[1] is None: continue
                w,l=int(values[0]),int(values[1])
                pct=(w/(w+l)) if w+l else 0
                rows.append({"slug":slug,"label":label,"wins":w,"losses":l,"pct":pct})
            if not rows: continue
            best=max(r["pct"] for r in rows)
            champs=[r for r in rows if abs(r["pct"]-best)<1e-9]
            if not champs: continue
            year_regions+=1
            for row in champs:
                mapped=slug_to_team.get(row["slug"]) or slug_to_team.get(ALIASES.get(row["slug"],""))
                results.append({
                    "year":year,"classification":cls,"region":region,
                    "team":mapped or row["label"],"teamSlug":row["slug"],
                    "regionWins":row["wins"],"regionLosses":row["losses"],"regionPct":round(row["pct"],6),
                    "shared":len(champs)>1,"sourceUrl":url,"matchedCurrentTeam":bool(mapped)
                })
        if year_regions==0: failures.append({"year":year,"reason":"no region tables parsed","url":url})
        print(year,"regions",year_regions)
    except Exception as e:
        failures.append({"year":year,"reason":str(e),"url":url})
        print("ERROR",year,e)
    time.sleep(.05)

by_team={}
for row in results:
    if not row["matchedCurrentTeam"]: continue
    p=by_team.setdefault(row["team"],{"titles":0,"years":[],"championships":[]})
    p["titles"]+=1;p["years"].append(row["year"]);p["championships"].append({k:v for k,v in row.items() if k not in ["matchedCurrentTeam","team","teamSlug"]})
for p in by_team.values():
    p["years"].sort()
    p["championships"].sort(key=lambda r:r["year"],reverse=True)

payload={
 "schemaVersion":1,"updatedAt":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),
 "coverage":{"firstYear":2003,"lastYear":2026},
 "source":"Deseret News archived boys basketball standings",
 "method":"Region champion = team(s) with the best published region winning percentage. Ties are counted as shared titles.",
 "summary":{"championshipRows":len(results),"matchedRows":sum(r["matchedCurrentTeam"] for r in results),"teams":len(by_team),"failures":len(failures)},
 "teams":dict(sorted(by_team.items()))
}
OUT.write_text(json.dumps(payload,indent=2)+"\n")
REPORT.write_text(json.dumps({"failures":failures,"unmatched":[r for r in results if not r["matchedCurrentTeam"]],"summary":payload["summary"]},indent=2)+"\n")
print(json.dumps(payload["summary"],indent=2))

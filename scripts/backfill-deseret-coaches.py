#!/usr/bin/env python3
import json,re,time
from difflib import SequenceMatcher
from pathlib import Path
from urllib.parse import urljoin,urlparse
import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
BASE="https://sports.deseret.com"
SEASONS={2023:2024,2024:2025,2025:2026}
ALIASES={
 "AMERICANLEADERSHIP":"ALA","AMERICANLEADERSHIPACADEMY":"ALA",
 "MONUMENTVALLEY":"MONUMENTVAL","STJOSEPH":"SAINTJOSEPH",
 "UTAHMILITARYCAMPWILLIAMS":"UMALEHI","UTAHMILITARYACADEMYCAMPWILLIAMS":"UMALEHI",
 "UTAHMILITARYHILLFIELD":"UMAHILLFIELD","UTAHMILITARYACADEMYHILLFIELD":"UMAHILLFIELD",
 "GRANDCOUNTY":"GRAND","CEDAR":"CEDARCITY","GUNNISON":"GUNNISONVALLEY","JUDGE":"JUDGEMEMORIAL",
}
S=requests.Session()
S.headers["User-Agent"]="Mozilla/5.0 (compatible; RuralUtahSportsCoachHistory/1.0; +https://ruralutahsports.com/)"

def norm(v): return re.sub(r"[^A-Z0-9]","",str(v or "").upper())
def fetch(url):
    for n in range(3):
        try:
            r=S.get(url,timeout=30)
            if r.ok:return r
        except Exception:pass
        time.sleep(1+n)
    raise RuntimeError(f"Unable to fetch {url}")

def expand(ts):
    out={}
    for coach,a,b,codes in ts or []:
        for y in range(int(a),int(b)+1):out[y]={"coach":str(coach).strip(),"codes":str(codes or "")}
    return out

def compact(seasons):
    ys=sorted(y for y,v in seasons.items() if v.get("coach"))
    if not ys:return []
    out=[]; a=p=ys[0]; coach=seasons[a]["coach"]; codes=set(seasons[a].get("codes",""))
    def emit():
        out.append([coach,a,p,"".join(c for c in "hnd" if c in codes)])
    for y in ys[1:]:
        v=seasons[y]
        if y==p+1 and v["coach"]==coach:
            p=y;codes.update(v.get("codes",""));continue
        emit();a=p=y;coach=v["coach"];codes=set(v.get("codes",""))
    emit();return out

def roster_links(end_year):
    soup=BeautifulSoup(fetch(f"{BASE}/high-school/football/teams/{end_year}/all").text,"html.parser")
    links=[];seen=set()
    for a in soup.find_all("a",href=True):
        path=urlparse(a["href"]).path.rstrip("/")
        if re.fullmatch(r"/high-school/school/[^/]+/football",path):
            u=urljoin(BASE,path)
            if u not in seen:seen.add(u);links.append(u)
    return links

def coach_from_roster(team_url,end_year):
    url=f"{team_url}/roster/{end_year}"
    soup=BeautifulSoup(fetch(url).text,"html.parser")
    h1=soup.find("h1")
    if not h1:return None
    school=re.sub(r"\s+Football\s*$","",h1.get_text(" ",strip=True),flags=re.I).strip()
    for table in soup.find_all("table"):
        txt=" ".join(table.stripped_strings).upper()
        if "COACH NAME" not in txt or "CAREER WINS" not in txt:continue
        for tr in table.find_all("tr"):
            # Deseret places a header row inside the coaching table body. Only
            # accept a real data row with td cells and a linked coach name.
            cells=tr.find_all("td")
            if not cells:continue
            link=tr.find("a",href=True)
            if not link:continue
            coach=link.get_text(" ",strip=True).strip()
            if not coach or norm(coach) in {"COACHNAME","YEARS","CAREERWINS","CAREERLOSSES"}:continue
            vals=[c.get_text(" ",strip=True) for c in cells]
            return {"school":school,"coach":coach,"years":vals[1] if len(vals)>1 else "",
                    "careerWins":vals[2] if len(vals)>2 else "","careerLosses":vals[3] if len(vals)>3 else "",
                    "url":url}
    return None

def match_team(name,teams):
    key=ALIASES.get(norm(name),norm(name)); exact={norm(t):t for t in teams}
    if key in exact:return exact[key],"exact"
    for k,t in exact.items():
        if ALIASES.get(k,k)==key:return t,"alias"
    best=max(((SequenceMatcher(None,key,ALIASES.get(k,k)).ratio(),t) for k,t in exact.items()),default=(0,None))
    return (best[1],f"fuzzy:{best[0]:.3f}") if best[0]>=.88 else (None,f"unmatched:{best[0]:.3f}")

def main():
    index_path=ROOT/"coach-history-index.json"
    index=json.loads(index_path.read_text())
    teams={}; shard_names=index["shards"]
    for shard in shard_names:
        data=json.loads((ROOT/shard).read_text())
        for row in data["rows"]:teams[row[0]]={"row":row,"seasons":expand(row[6])}
    audit={"generated":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"rows":[],"unmatched":[],"errors":[]}
    overlays={}
    for fall,end in SEASONS.items():
        try:links=roster_links(end)
        except Exception as e:
            audit["errors"].append({"season":fall,"error":str(e)});continue
        print(f"{fall}: {len(links)} Deseret teams")
        for i,u in enumerate(links,1):
            try:info=coach_from_roster(u,end)
            except Exception as e:
                audit["errors"].append({"season":fall,"url":f"{u}/roster/{end}","error":str(e)});continue
            if not info:continue
            team,method=match_team(info["school"],teams)
            rec={"season":fall,**info,"rusTeam":team,"match":method};audit["rows"].append(rec)
            if team:overlays.setdefault(team,{})[fall]={"coach":info["coach"],"codes":"n"}
            else:audit["unmatched"].append(rec)
            if i%25==0:print(f"  {i}/{len(links)}")
            time.sleep(.08)
    changed=0
    for team,years in overlays.items():
        seasons=teams[team]["seasons"]
        for y,v in years.items():
            if seasons.get(y)!=v:changed+=1
            seasons[y]=v
        teams[team]["row"][6]=compact(seasons)
    for shard in shard_names:
        p=ROOT/shard;data=json.loads(p.read_text())
        data["rows"]=[teams[r[0]]["row"] for r in data["rows"]]
        p.write_text(json.dumps(data,separators=(",",":"),ensure_ascii=False))
    index.setdefault("coverage",{})["modernGap"]="2023-2025 backfilled from Deseret News season-specific roster pages; unmatched/missing pages remain unresolved."
    index.setdefault("sourceLabels",{})["deseret-news"]="Deseret News roster"
    index_path.write_text(json.dumps(index,separators=(",",":"),ensure_ascii=False))
    (ROOT/"coach-history-deseret-2023-2025.json").write_text(json.dumps(audit,indent=2,ensure_ascii=False)+"\n")
    page=ROOT/"coaches.html"
    text=page.read_text()
    text=text.replace("<th>Known Seasons</th><th>Earliest</th><th>Latest</th>","<th>School Seasons Tracked</th><th>Coverage Start</th><th>Coverage End</th>")
    text=text.replace("<th>Seasons Tracked</th><th>Coverage Start</th><th>Coverage End</th>","<th>School Seasons Tracked</th><th>Coverage Start</th><th>Coverage End</th>")
    text=text.replace("Seasons Tracked is the number of school seasons with a known head coach, not the current coach's tenure.","School Seasons Tracked is the number of seasons with a known head coach for that program, not the current coach's tenure.")
    text=text.replace("Coverage is intentionally conservative. The historical workbook is strong through 2022, partial in 2023–24, and 2025 is being backfilled from Deseret News and other reliable sources. Conflicting seasons are left unresolved.","School Seasons Tracked is the number of seasons with a known head coach for that program, not the current coach's tenure. 2023–25 coaching rows are backfilled from Deseret News season-specific roster pages; unresolved seasons stay blank.")
    page.write_text(text)
    print(f"matched {sum(bool(r['rusTeam']) for r in audit['rows'])}, unmatched {len(audit['unmatched'])}, errors {len(audit['errors'])}, changed {changed}")

if __name__=="__main__":main()

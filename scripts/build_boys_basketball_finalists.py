#!/usr/bin/env python3
import json, re, subprocess, tempfile, urllib.request
from pathlib import Path

START_END_YEAR=1989
END_YEAR=2026
OUT=Path("boys-basketball-finalists-1989-2026.json")
REPORT=Path("boys-basketball-finalists-import-report.json")

def norm(s):
    return re.sub(r"[^A-Z0-9]","",str(s or "").upper())

teams=json.loads(Path("boys-basketball-teams.json").read_text())
site_names=[r["team"] for r in teams if r.get("association")=="UHSAA" or r.get("team")=="Utah Prep"]

ALIASES={
    "Cedar":["Cedar City"],
    "Gunnison Valley":["Gunnison"],
    "Grand County":["Grand"],
    "Layton Christian Academy":["Layton Christian"],
    "Wasatch Academy":["Wasatch Acad.","Wasatch Acad"],
    "Saint Joseph":["St. Joseph","St Joseph"],
    "Juan Diego":["Juan Diego Catholic"],
    "Judge Memorial":["Judge Memorial Catholic"],
    "American Prep WV":["APA West Valley","American Preparatory Academy-West Valley"],
    "ALA":["American Leadership","American Leadership Academy"],
    "UMA-Camp Williams":["Utah Military Academy Camp Williams","Utah Military Academy - Camp Williams"],
    "UMA-Hillfield":["Utah Military Academy Hill Field","Utah Military Academy - Hill Field"],
}
variant_to_site={}
for name in site_names:
    variant_to_site[norm(name)]=name
    for a in ALIASES.get(name,[]):
        variant_to_site[norm(a)]=name

# Historical/non-current finalists are preserved under their historical names if needed.
HISTORICAL_NAMES=[
    "B.Y. High","BY High","LDSU","BAC","North Cache","South","Granite","Hinckley",
    "Minersville","Park City","Diamond Ranch Academy","West Ridge","Liahona",
    "Christian Heritage","East Carbon","Oakley"
]
for name in HISTORICAL_NAMES:
    variant_to_site.setdefault(norm(name),name)

champ_data=json.loads(Path("boys-basketball-championships.json").read_text())
champ_by_year_class={}
for school,item in champ_data.get("teams",{}).items():
    for ch in item.get("championships",[]):
        y=int(ch["year"])
        cls=ch.get("classification")
        if y>=START_END_YEAR and cls:
            champ_by_year_class[(y,cls.upper())]=school

# Manual official results for the newest season, used because the 2025-26 PDF
# uses a newer bracket layout that does not label second place in extractable text.
MANUAL_RUNNERS={
    (2026,"6A"):"Bingham",
    (2026,"5A"):"Bountiful",
    (2026,"4A"):"Hurricane",
    (2026,"3A"):"American Heritage",
    (2026,"2A"):"South Summit",
    (2026,"1A"):"Bryce Valley",
}

def season_url(end_year):
    start=end_year-1
    return f"https://www.uhsaa.org/Publications/YearlyResults/YearlyResults{start}{end_year}.pdf"

def classes_for(year):
    if year>=2018: return ["6A","5A","4A","3A","2A","1A"]
    if year>=1994: return ["5A","4A","3A","2A","1A"]
    return ["4A","3A","2A","1A"]

def canonical_from_text(s):
    ns=norm(s)
    if ns in variant_to_site:
        return variant_to_site[ns]
    # exact contained alias, longest-first
    choices=sorted(variant_to_site.items(),key=lambda kv:len(kv[0]),reverse=True)
    for key,name in choices:
        if len(key)>=4 and key in ns:
            return name
    return None

def extract_runner_from_lines(lines):
    # Prefer the line carrying the explicit UHSAA "2nd Place" label.
    for i,line in enumerate(lines):
        if re.search(r"\b2nd\s+Place\b",line,re.I):
            window=" ".join(lines[max(0,i-1):i+1])
            prefix=re.split(r"2nd\s+Place",window,flags=re.I)[0]
            # Strip scores/times/seeds but retain school words.
            chunks=re.split(r"\b\d{1,3}\s*[-–]\s*\d{1,3}\b|\b\d{1,2}:\d{2}\s*(?:am|pm)?\b",prefix,flags=re.I)
            # Work backward through textual chunks and try known school names.
            for chunk in reversed(chunks):
                chunk=re.sub(r"\b(?:Region|Reg\.?|game|Saturday|Friday|Thursday|Wednesday|Tuesday|Monday|Sunday)\b.*$","",chunk,flags=re.I)
                hit=canonical_from_text(chunk)
                if hit: return hit
            # Fallback: try the full nearby window.
            hit=canonical_from_text(prefix)
            if hit: return hit
    return None

def extract_from_summary(text, cls):
    # Annual PDFs commonly include an all-sports results summary with:
    # CLASS / 1ST PLACE / 2ND PLACE. Find the BOYS BASKETBALL occurrence
    # that is actually near those labels (not the table of contents).
    upper=text.upper()
    starts=[m.start() for m in re.finditer(r"BOYS\s+BASKETBALL",upper)]
    sections=[]
    for idx in starts:
        chunk=text[idx:idx+18000]
        up=chunk.upper()
        if "1ST PLACE" in up and "2ND PLACE" in up:
            stop_candidates=[]
            for marker in ["GIRLS BASKETBALL","BOYS CROSS COUNTRY","CROSS COUNTRY - BOYS","WRESTLING"]:
                pos=up.find(marker,200)
                if pos>0: stop_candidates.append(pos)
            if stop_candidates: chunk=chunk[:min(stop_candidates)]
            sections.append(chunk)

    for section in sections:
        # Search for this class and inspect the text until the next class heading.
        matches=list(re.finditer(rf"(?im)^\s*{re.escape(cls)}\s*$",section))
        for m in matches:
            block=section[m.end():m.end()+1200]
            # Stop before next classification heading when possible.
            nxt=re.search(r"(?im)^\s*[1-6]A\s*$",block)
            if nxt: block=block[:nxt.start()]
            m2=re.search(r"(?im)2ND\s+PLACE\s*[-—:]?\s*([^\n\r]+)",block)
            if m2:
                hit=canonical_from_text(m2.group(1))
                if hit: return hit

        # Layout extraction can put class and placing on one line/column.
        # Search a wider class-local slice and then the first 2ND PLACE after it.
        m=re.search(rf"\b{re.escape(cls)}\b",section,re.I)
        if m:
            block=section[m.start():m.start()+2200]
            m2=re.search(r"2ND\s+PLACE\s*[-—:]?\s*([^\n\r]+)",block,re.I)
            if m2:
                hit=canonical_from_text(m2.group(1))
                if hit: return hit

    # Last fallback: some PDFs extract as '2ND PLACE TEAM' without clean class lines.
    # Pair class occurrences with the nearest following placing labels.
    for section in sections:
        lines=section.splitlines()
        for i,line in enumerate(lines):
            if re.search(rf"(^|\s){re.escape(cls)}(\s|$)",line,re.I):
                window="\n".join(lines[i:i+12])
                m2=re.search(r"2ND\s+PLACE\s*[-—:]?\s*([^\n\r]+)",window,re.I)
                if m2:
                    hit=canonical_from_text(m2.group(1))
                    if hit: return hit
    return None

entries=[]
unresolved=[]
downloads=[]
with tempfile.TemporaryDirectory() as td:
    td=Path(td)
    for year in range(START_END_YEAR,END_YEAR+1):
        url=season_url(year)
        pdf=td/f"{year}.pdf"
        txt=td/f"{year}.txt"
        try:
            urllib.request.urlretrieve(url,pdf)
            subprocess.run(["pdftotext","-layout",str(pdf),str(txt)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            text=txt.read_text(errors="ignore")
            if year==2001:
                up=text.upper()
                print("DEBUG 2001 BOYS BASKETBALL occurrences:", [m.start() for m in re.finditer(r"BOYS\\s+BASKETBALL",up)][:20])
                print("DEBUG 2001 1ST PLACE occurrences:", [m.start() for m in re.finditer(r"1ST\\s+PLACE",up)][:20])
                for m in list(re.finditer(r"BOYS\\s+BASKETBALL",up))[:5]:
                    print("DEBUG 2001 SNIP", repr(text[m.start():m.start()+2500]))
            downloads.append({"year":year,"url":url,"ok":True,"bytes":pdf.stat().st_size})
        except Exception as e:
            downloads.append({"year":year,"url":url,"ok":False,"error":str(e)})
            for cls in classes_for(year):
                unresolved.append({"year":year,"classification":cls,"reason":"download/extract failed"})
            continue

        pages=text.split("\f")
        for cls in classes_for(year):
            champion=champ_by_year_class.get((year,cls))
            if not champion:
                unresolved.append({"year":year,"classification":cls,"reason":"champion missing from title dataset"})
                continue
            runner=MANUAL_RUNNERS.get((year,cls))
            source_method="manual-official-2026" if runner else None

            if not runner:
                # Find the bracket page for this class/year.
                candidates=[]
                for page in pages:
                    pnorm=re.sub(r"\s+"," ",page)
                    if "Boys Basketball" not in pnorm: continue
                    markers=[
                        rf"\b{year}\s+{re.escape(cls)}\s+State Boys Basketball",
                        rf"\b{re.escape(cls)}\s+Boys Basketball State Championship",
                        rf"\b{re.escape(cls)}\s+BOYS STATE BASKETBALL",
                    ]
                    if any(re.search(m,pnorm,re.I) for m in markers):
                        candidates.append(page)
                for page in candidates:
                    runner=extract_runner_from_lines(page.splitlines())
                    if runner and norm(runner)!=norm(champion):
                        source_method="uhsaa-bracket-2nd-place"
                        break
                    runner=None

            if not runner:
                runner=extract_from_summary(text,cls)
                if runner and norm(runner)!=norm(champion):
                    source_method="uhsaa-results-summary"
                else:
                    runner=None

            if runner:
                entries.append({
                    "year":year,
                    "classification":cls,
                    "champion":champion,
                    "runnerUp":runner,
                    "sourceUrl":url,
                    "sourceMethod":source_method
                })
            else:
                unresolved.append({"year":year,"classification":cls,"champion":champion,"reason":"runner-up not parsed"})

# Build per-program counts from resolved finals.
programs={}
for e in entries:
    for role,key in [("champion","championships"),("runnerUp","runnerUps")]:
        team=e[role]
        p=programs.setdefault(team,{"appearances":0,"championships":0,"runnerUps":0,"finals":[]})
        p["appearances"]+=1
        p[key]+=1
        p["finals"].append({
            "year":e["year"],
            "classification":e["classification"],
            "result":"Champion" if role=="champion" else "Runner-Up",
            "opponent":e["runnerUp"] if role=="champion" else e["champion"],
            "sourceUrl":e["sourceUrl"]
        })
for p in programs.values():
    p["finals"].sort(key=lambda r:(-r["year"],r["classification"]))

payload={
    "schemaVersion":1,
    "updatedAt":__import__("datetime").datetime.utcnow().replace(microsecond=0).isoformat()+"Z",
    "coverage":{"firstSeason":"1988-89","firstChampionshipYear":1989,"lastChampionshipYear":END_YEAR},
    "source":"UHSAA Annual Results PDFs; second-place labels and official bracket results",
    "note":"UHSAA's online Annual Results archive currently begins with 1988-89. Appearance totals in this file cover championship games from 1989 forward.",
    "summary":{"resolvedFinals":len(entries),"unresolvedFinals":len(unresolved),"programs":len(programs)},
    "finals":sorted(entries,key=lambda e:(-e["year"],e["classification"])),
    "teams":dict(sorted(programs.items()))
}
OUT.write_text(json.dumps(payload,indent=2)+"\n")
REPORT.write_text(json.dumps({"summary":payload["summary"],"unresolved":unresolved,"downloads":downloads},indent=2)+"\n")
print(json.dumps(payload["summary"],indent=2))
if unresolved:
    print("UNRESOLVED:")
    for row in unresolved:
        print(row)

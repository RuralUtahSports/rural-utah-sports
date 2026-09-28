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

def ocr_results_summary(pdf, workdir, year):
    prefix=workdir/f"summary-{year}"
    try:
        subprocess.run(
            ["pdftoppm","-f","3","-l","5","-r","170","-jpeg","-jpegopt","quality=72",str(pdf),str(prefix)],
            check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL
        )
    except Exception:
        return ""
    parts=[]
    for image in sorted(workdir.glob(f"summary-{year}-*.jpg")):
        try:
            out=subprocess.run(
                ["tesseract",str(image),"stdout","--psm","3"],
                check=True,capture_output=True,text=True
            ).stdout
            parts.append(out)
        except Exception:
            pass
    return "\n".join(parts)

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
    upper=text.upper()
    starts=[m.start() for m in re.finditer(r"BOYS\s+BASKETBALL",upper)]
    for idx in starts:
        chunk=text[idx:idx+14000]
        up=chunk.upper()
        if not re.search(r"[1I]ST\s+PLACE",up) or not re.search(r"2ND\s+PLACE",up):
            continue
        # End at the next major sport heading when it is clearly present.
        stops=[]
        for marker in ["GIRLS BASKETBALL","BOYS CROSS COUNTRY","CROSS COUNTRY - BOYS","WRESTLING"]:
            pos=up.find(marker,200)
            if pos>0: stops.append(pos)
        if stops: chunk=chunk[:min(stops)]

        # Most UHSAA summaries read:
        # 2A / 1ST PLACE - SCHOOL / 2ND PLACE - SCHOOL
        patterns=[
            rf"(?is)\b{re.escape(cls)}\b.{{0,900}}?2ND\s+PLACE\s*[-—:]?\s*([^\n\r]+)",
            rf"(?im)^\s*{re.escape(cls)}\s*$[\s\S]{{0,900}}?^\s*2ND\s+PLACE\s*[-—:]?\s*([^\n\r]+)",
        ]
        for pat in patterns:
            m=re.search(pat,chunk)
            if not m: continue
            raw=m.group(1)
            raw=re.split(r"\s{2,}|\b(?:1A|2A|3A|4A|5A|6A)\b",raw)[0]
            hit=canonical_from_text(raw)
            if hit: return hit

        # OCR can put the placing label and school on adjacent lines.
        lines=[ln.strip() for ln in chunk.splitlines() if ln.strip()]
        class_positions=[i for i,ln in enumerate(lines) if re.fullmatch(re.escape(cls),ln,re.I)]
        for pos in class_positions:
            for j in range(pos+1,min(len(lines),pos+12)):
                if re.search(r"2ND\s+PLACE",lines[j],re.I):
                    tail=re.sub(r"^.*?2ND\s+PLACE\s*[-—:]?\s*","",lines[j],flags=re.I)
                    if not tail and j+1<len(lines): tail=lines[j+1]
                    hit=canonical_from_text(tail)
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
            summary_text=text
            up=text.upper()
            if "BOYS BASKETBALL" not in up or "2ND PLACE" not in up:
                ocr=ocr_results_summary(pdf,td,year)
                if ocr:
                    summary_text=text+"\n"+ocr
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
                runner=extract_from_summary(summary_text,cls)
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

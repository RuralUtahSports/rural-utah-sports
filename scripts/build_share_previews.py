#!/usr/bin/env python3
import argparse, io, json, os, re, shutil, urllib.parse, urllib.request
from html import escape as h
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT=Path(__file__).resolve().parents[1]
BASE="https://ruralutahsports.github.io/rural-utah-sports"
ORANGE="#F14D07"; W,H=1200,630
ALIASES={"CEDAR CITY":"CEDAR","GRAND COUNTY":"GRAND","MONUMENT VAL":"MONUMENT VALLEY","LAYTON CHRISTIAN ACADEMY":"LAYTON CHRISTIAN","AMERICAN LEADERSHIP ACADEMY":"ALA"}
CUSTOM={"GREEN CANYON":"school-logos/green-canyon.svg","HILLCREST":"school-logos/hillcrest.svg","KEARNS":"school-logos/kearns.svg","LAYTON CHRISTIAN":"school-logos/layton-christian.svg","LAYTON CHRISTIAN ACADEMY":"school-logos/layton-christian.svg","LONE PEAK":"school-logos/lone-peak.svg","MAPLE MOUNTAIN":"school-logos/maple-mountain.svg","MILFORD":"school-logos/milford.svg","MILLARD":"school-logos/millard.svg","MORGAN":"school-logos/morgan.svg","OREM":"school-logos/orem.svg","PROVIDENCE HALL":"school-logos/providence-hall.svg","RICH":"school-logos/rich-user.svg","SAN JUAN":"school-logos/san-juan.svg","VIEWMONT":"school-logos/viewmont.svg","EAST":"school-logos/east-user.svg","GRAND":"school-logos/grand.webp","GRAND COUNTY":"school-logos/grand.webp","RIDGELINE":"school-logos/ridgeline-card.png","SOUTH SUMMIT":"school-logos/south-summit.webp"}
LOGO_CACHE={}

def data(name, fallback):
    p=ROOT/name
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else fallback
def norm(v): return re.sub(r"\s+"," ",str(v or "").strip()).upper()
def key(v): return ALIASES.get(norm(v),norm(v))
def compact(v): return re.sub(r"[^A-Z0-9]","",key(v))
def slug(v): return re.sub(r"[^a-z0-9]+","-",str(v or "").lower()).strip("-") or "unknown"
def safe(v): return urllib.parse.quote(str(v or "").strip(),safe="-_.~")
def color(v,default="#333333"):
    s=str(v or ""); return s if re.fullmatch(r"#[0-9A-Fa-f]{6}",s) else default
def number(v):
    try: return None if v is None or v=="" else float(str(v).replace(",",""))
    except: return None
def shown(v):
    n=number(v)
    if n is None:return "—"
    return f"{int(n):,}" if n.is_integer() else f"{n:,.1f}".rstrip("0").rstrip(".")
def font(sz,bold=False):
    choices=[
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for p in choices:
        if os.path.exists(p): return ImageFont.truetype(p,sz)
    return ImageFont.load_default()
def width(d,t,f): return d.textbbox((0,0),str(t),font=f)[2]
def fit(d,t,maxw,start,minimum=24):
    for s in range(start,minimum-1,-2):
        f=font(s,True)
        if width(d,t,f)<=maxw:return f
    return font(minimum,True)

def records(standings):
    out={}
    for rows in (standings.get("byClassification") or {}).values():
        for r in rows or []:
            w,l,t=int(r.get("wins") or 0),int(r.get("losses") or 0),int(r.get("ties") or 0)
            out[key(r.get("team"))]=f"{w}-{l}-{t}" if t else f"{w}-{l}"
    return out
def ranks(rankings):
    out={}
    for cls,rows in (rankings.get("classifications") or {}).items():
        for i,r in enumerate(rows or [],1):
            team=r if isinstance(r,str) else r.get("team")
            if team:out[key(team)]=(i,str(cls))
    return out
def team_index(rows): return {key(x.get("team")):x for x in rows if isinstance(x,dict) and x.get("team")}
def meta(team,teams,rec,rank):
    t=teams.get(key(team),{}); rr=rank.get(key(team))
    return t,rec.get(key(team),"0-0"),rr,str(t.get("classification") or (rr[1] if rr else "")),str(t.get("mascot") or ""),color(t.get("backgroundColor"))

def logo(team,directory):
    k=key(team)
    if k in LOGO_CACHE:return LOGO_CACHE[k].copy()
    sources=[]
    local=CUSTOM.get(norm(team)) or CUSTOM.get(k)
    if local and (ROOT/local).exists():sources.append(str(ROOT/local))
    info=directory.get(norm(team)) or directory.get(k) or {}
    if info.get("logoUrl"):sources.append(info["logoUrl"])
    sources.append(str(ROOT/"RUSlogoNew.png"))
    for src in sources:
        try:
            if src.startswith("http"):
                req=urllib.request.Request(src,headers={"User-Agent":"RuralUtahSports/1.0"})
                raw=urllib.request.urlopen(req,timeout=10).read(); ext=urllib.parse.urlparse(src).path.lower()
            else:
                raw=Path(src).read_bytes(); ext=src.lower()
            if ext.endswith(".svg"):
                import cairosvg
                raw=cairosvg.svg2png(bytestring=raw,output_width=500,output_height=500)
            im=Image.open(io.BytesIO(raw)).convert("RGBA")
            LOGO_CACHE[k]=im
            return im.copy()
        except Exception:
            pass
    im=Image.new("RGBA",(1,1),(0,0,0,0)); LOGO_CACHE[k]=im
    return im.copy()
def paste(canvas,im,box):
    x0,y0,x1,y1=box; im=ImageOps.contain(im,(x1-x0,y1-y0),Image.Resampling.LANCZOS)
    canvas.alpha_composite(im,(x0+(x1-x0-im.width)//2,y0+(y1-y0-im.height)//2))
def canvas():
    im=Image.new("RGBA",(W,H),"#090909"); d=ImageDraw.Draw(im)
    d.rectangle((0,0,W,8),fill=ORANGE); d.text((58,36),"RURAL UTAH SPORTS",font=font(27,True),fill="white"); d.text((58,73),"UTAH HIGH SCHOOL FOOTBALL",font=font(15,True),fill=ORANGE)
    return im,d
def save(im,p):
    p.parent.mkdir(parents=True,exist_ok=True); im.convert("RGB").save(p,"PNG",optimize=True,compress_level=9)

def team_image(team,teams,rec,rank,directory,out):
    _,record,r,cls,mascot,c=meta(team,teams,rec,rank); im,d=canvas()
    d.rectangle((0,118,W,H),fill="#101010"); d.rectangle((0,118,32,H),fill=c); d.rounded_rectangle((68,155,390,544),24,fill="#171717",outline="#333333",width=2)
    paste(im,logo(team,directory),(105,190,353,438)); d.text((109,464),f"{cls or 'UTAH'} FOOTBALL",font=font(18,True),fill="#aaa")
    name=str(team).upper(); f=fit(d,name,700,66,34); d.text((445,174),name,font=f,fill="white")
    if mascot:d.text((449,258),mascot.upper(),font=font(27,True),fill=c)
    d.text((449,341),record,font=font(68,True),fill="white"); d.text((452,414),"2026 RECORD",font=font(17,True),fill="#888")
    if r:d.rounded_rectangle((448,465,710,520),14,fill=c); d.text((468,478),f"#{r[0]} {r[1]} RUS",font=font(23,True),fill="white")
    d.text((890,560),"ruralutahsports.github.io",font=font(15,True),fill="#666"); save(im,out)
def game_id(date,away,home): return f"{str(date or '').strip()}|{compact(away)}|{compact(home)}"
def game_slug(date,away,home): return slug(f"{re.sub(r'[^0-9]+','-',str(date or '')).strip('-')}-{away}-at-{home}")
def game_image(g,teams,rec,rank,directory,out):
    a,hme=g["awayTeam"],g["homeTeam"]; _,ar,_,_,_,ac=meta(a,teams,rec,rank); _,hr,_,_,_,hc=meta(hme,teams,rec,rank); im,d=canvas()
    d.rectangle((0,118,W,H),fill="#101010"); d.rectangle((0,118,18,H),fill=ac); d.rectangle((W-18,118,W,H),fill=hc); d.rectangle((594,140,606,545),fill="#2b2b2b")
    paste(im,logo(a,directory),(120,165,395,390)); paste(im,logo(hme,directory),(805,165,1080,390))
    for team,x in ((a,0),(hme,600)):
        f=fit(d,str(team).upper(),510,42,25); tw=width(d,str(team).upper(),f); d.text((x+(600-tw)//2,405),str(team).upper(),font=f,fill="white")
    d.text((300-width(d,ar,font(29,True))//2,463),ar,font=font(29,True),fill=ac); d.text((900-width(d,hr,font(29,True))//2,463),hr,font=font(29,True),fill=hc)
    aa,hh=number(g.get("actualAway")),number(g.get("actualHome")); center=f"FINAL  {shown(aa)} – {shown(hh)}" if aa is not None and hh is not None else "GAME PREVIEW"
    f=font(24,True); tw=width(d,center,f); d.rounded_rectangle((600-tw//2-24,523,600+tw//2+24,568),12,fill=ORANGE); d.text((600-tw//2,531),center,font=f,fill="black")
    dt=str(g.get("date") or "2026"); f=font(17,True); d.text((600-width(d,dt,f)//2,579),dt,font=f,fill="#888"); save(im,out)

def page(title,desc,share,image,target):
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{h(title)}</title><meta name="description" content="{h(desc)}"><meta name="robots" content="noindex,follow"><link rel="canonical" href="{h(target)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Rural Utah Sports"><meta property="og:title" content="{h(title)}"><meta property="og:description" content="{h(desc)}"><meta property="og:url" content="{h(share)}"><meta property="og:image" content="{h(image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{h(title)}"><meta name="twitter:description" content="{h(desc)}"><meta name="twitter:image" content="{h(image)}"><meta http-equiv="refresh" content="0;url={h(target)}">
<style>body{{margin:0;background:#111;color:#fff;font:16px Arial,sans-serif;display:grid;place-items:center;min-height:100vh}}a{{color:#F14D07;font-weight:800}}</style></head><body><p>Opening <a href="{h(target)}">{h(title)}</a>…</p><script>location.replace({json.dumps(target)});</script></body></html>'''
def write(p,s): p.parent.mkdir(parents=True,exist_ok=True); p.write_text(s,encoding="utf-8")
def stat_summary(td,p):
    pid=str(p.get("playerId") or ""); bits=[]
    for sec in td.get("stats",[]) or []:
        for row in sec.get("rows",[]) or []:
            if str(row.get("playerId") or "")!=pid:continue
            vals=row.get("values") or {}
            for k in ("Yards","TD","Touchdowns","Tackles","Sacks","Interceptions","Catches"):
                if k in vals and str(vals[k]).strip():bits.append(f"{k} {vals[k]}");break
            if len(bits)>=2:return " • ".join(bits)
    return "2026 player profile and reported statistics"

def build(check=False):
    team_rows=data("teams-data.json",[]); standings=data("standings-2026.json",{}); ranking=data("rankings-current-2026.json",{}); directory=data("school-directory.json",{}); rosters=data("deseret-rosters-stats-2026.json",{}); weekly=data("weekly-simulation.json",{})
    teams=team_index(team_rows); rec=records(standings); rank=ranks(ranking); roster_teams=rosters.get("teams") or {}; games=[g for g in (weekly.get("games") or []) if g.get("awayTeam") and g.get("homeTeam")]
    current=sorted({key(x) for x in roster_teams}|{key(g["awayTeam"]) for g in games}|{key(g["homeTeam"]) for g in games}); players=[]
    for t,td in roster_teams.items():
        seen=set()
        for p in td.get("roster",[]) or []:
            pid=str(p.get("playerId") or "").strip()
            if pid and p.get("name") and pid not in seen:seen.add(pid); players.append((t,td,p))
    if check:
        if len(current)<100 or len(players)<1000 or not games:raise SystemExit(f"Insufficient share data: teams={len(current)} players={len(players)} games={len(games)}")
        tmp=ROOT/".share-preview-check.png"; team_image(current[0],teams,rec,rank,directory,tmp)
        if not tmp.exists() or tmp.stat().st_size<5000:raise SystemExit("Preview render failed")
        tmp.unlink(missing_ok=True); print(f"Share preview check passed: {len(current)} teams, {len(players)} players, {len(games)} games."); return
    for p in (ROOT/"share",ROOT/"share-images"):
        if p.exists():shutil.rmtree(p)
    manifest={"generatedFor":"2026","team":{},"player":{},"game":{}}
    for t in current:
        _,record,r,cls,mascot,_=meta(t,teams,rec,rank); s=slug(t); image=f"share-images/teams/{s}.png"; team_image(t,teams,rec,rank,directory,ROOT/image)
        target=f"{BASE}/team.html?team={urllib.parse.quote(t)}"; share=f"{BASE}/share/team/{s}/"; rtxt=f" • #{r[0]} {r[1]} RUS" if r else ""
        title=f"{t.title()} {mascot} Football | Rural Utah Sports".replace("  "," "); desc=f"2026 {cls or 'Utah'} football • {record}{rtxt}. Team history, games, rankings, ELO and stats."
        write(ROOT/f"share/team/{s}/index.html",page(title,desc,share,f"{BASE}/{image}",target)); manifest["team"][key(t)]=f"share/team/{s}/"
    for t,td,p in players:
        pid=str(p["playerId"]); sid=safe(pid); _,_,_,cls,_,_=meta(t,teams,rec,rank); bits=[x for x in (str(p.get("position") or "").strip(),str(p.get("class") or "").strip(),cls) if x]; num=f"#{p.get('number')} " if str(p.get("number") or "").strip() else ""
        title=f"{p.get('name')} | {t} Football | Rural Utah Sports"; desc=f"{num}{' • '.join(bits)} • {t}. {stat_summary(td,p)}."; image=f"share-images/teams/{slug(key(t))}.png"
        if not (ROOT/image).exists():image="RUSlogoNew.png"
        target=f"{BASE}/player.html?id={urllib.parse.quote(pid)}"; share=f"{BASE}/share/player/{sid}/"; write(ROOT/f"share/player/{sid}/index.html",page(title,desc,share,f"{BASE}/{image}",target)); manifest["player"][pid]=f"share/player/{sid}/"
    for g in games:
        a,hme,dt=g["awayTeam"],g["homeTeam"],g.get("date",""); gs=game_slug(dt,a,hme); image=f"share-images/games/{gs}.png"; game_image(g,teams,rec,rank,directory,ROOT/image); aa,hh=number(g.get("actualAway")),number(g.get("actualHome"))
        status=f"Final: {shown(aa)}-{shown(hh)}" if aa is not None and hh is not None else "2026 matchup preview"; title=f"{a} at {hme} | Rural Utah Sports"; desc=f"{status} • {dt}. Scores, team records, rankings, ELO and game information."; q=urllib.parse.urlencode({"date":dt,"away":a,"home":hme}); target=f"{BASE}/game.html?{q}"; share=f"{BASE}/share/game/{gs}/"
        write(ROOT/f"share/game/{gs}/index.html",page(title,desc,share,f"{BASE}/{image}",target)); manifest["game"][game_id(dt,a,hme)]=f"share/game/{gs}/"
    write(ROOT/"share-preview-map.json",json.dumps(manifest,indent=2,ensure_ascii=False)+"\n"); print(f"Built {len(manifest['team'])} team, {len(manifest['player'])} player and {len(manifest['game'])} game share previews.")

if __name__=="__main__":
    ap=argparse.ArgumentParser(); ap.add_argument("--check",action="store_true"); build(ap.parse_args().check)

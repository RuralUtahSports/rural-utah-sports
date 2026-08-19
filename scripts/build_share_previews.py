#!/usr/bin/env python3
import argparse, io, json, os, re, shutil, urllib.parse, urllib.request
from pathlib import Path
from html import escape as html_escape

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
BASE_URL = "https://ruralutahsports.github.io/rural-utah-sports"
ORANGE = "#F14D07"
CUSTOM_LOGOS = {
    "GREEN CANYON":"school-logos/green-canyon.svg","HILLCREST":"school-logos/hillcrest.svg",
    "KEARNS":"school-logos/kearns.svg","LAYTON CHRISTIAN":"school-logos/layton-christian.svg",
    "LAYTON CHRISTIAN ACADEMY":"school-logos/layton-christian.svg","LONE PEAK":"school-logos/lone-peak.svg",
    "MAPLE MOUNTAIN":"school-logos/maple-mountain.svg","MILFORD":"school-logos/milford.svg",
    "MILLARD":"school-logos/millard.svg","MORGAN":"school-logos/morgan.svg","OREM":"school-logos/orem.svg",
    "PROVIDENCE HALL":"school-logos/providence-hall.svg","RICH":"school-logos/rich-user.svg",
    "SAN JUAN":"school-logos/san-juan.svg","VIEWMONT":"school-logos/viewmont.svg",
    "EAST":"school-logos/east-user.svg?v=20260817-1","GRAND":"school-logos/grand.webp?v=20260817-1",
    "GRAND COUNTY":"school-logos/grand.webp?v=20260817-1","RIDGELINE":"school-logos/ridgeline-card.png?v=20260817-7",
    "SOUTH SUMMIT":"school-logos/south-summit.webp?v=20260817-1",
}
ALIASES = {
    "CEDAR CITY":"CEDAR","GRAND COUNTY":"GRAND","MONUMENT VAL":"MONUMENT VALLEY",
    "LAYTON CHRISTIAN ACADEMY":"LAYTON CHRISTIAN","AMERICAN LEADERSHIP ACADEMY":"ALA",
}
W, H = 1200, 630

def read_json(name, default):
    p = ROOT / name
    if not p.exists(): return default
    with p.open(encoding="utf-8") as f: return json.load(f)

def norm(v):
    return re.sub(r"\s+", " ", str(v or "").strip()).upper()

def rank_key(v):
    n = norm(v)
    return ALIASES.get(n, n)

def compact(v):
    return re.sub(r"[^A-Z0-9]", "", rank_key(v))

def slug(v):
    s = re.sub(r"[^a-z0-9]+", "-", str(v or "").strip().lower()).strip("-")
    return s or "unknown"

def safe_id(v):
    return urllib.parse.quote(str(v or "").strip(), safe="-_.~")

def valid_hex(v, fallback="#333333"):
    s = str(v or "")
    return s if re.fullmatch(r"#[0-9a-fA-F]{6}", s) else fallback

def as_num(v):
    try:
        if v is None or v == "": return None
        return float(str(v).replace(",", ""))
    except Exception:
        return None

def fmt_num(v):
    n = as_num(v)
    if n is None: return "—"
    return f"{int(n):,}" if n.is_integer() else f"{n:,.1f}".rstrip("0").rstrip(".")

def record_maps(standings):
    out = {}
    groups = standings.get("byClassification", {}) if isinstance(standings, dict) else {}
    for rows in groups.values():
        for r in rows or []:
            t = rank_key(r.get("team"))
            if not t: continue
            w, l, ties = int(r.get("wins") or 0), int(r.get("losses") or 0), int(r.get("ties") or 0)
            out[t] = f"{w}-{l}-{ties}" if ties else f"{w}-{l}"
    return out

def ranking_maps(rankings):
    out = {}
    groups = rankings.get("classifications", {}) if isinstance(rankings, dict) else {}
    for cls, rows in groups.items():
        for i, r in enumerate(rows or [], 1):
            team = r if isinstance(r, str) else r.get("team")
            if team: out[rank_key(team)] = (i, str(cls))
    return out

def team_index(teams):
    return {rank_key(t.get("team")): t for t in teams if isinstance(t, dict) and t.get("team")}

def font(size, bold=False):
    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for p in paths:
        if os.path.exists(p): return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def text_width(draw, text, fnt):
    return draw.textbbox((0,0), str(text), font=fnt)[2]

def fit_text(draw, text, max_width, start_size, min_size=24, bold=True):
    for size in range(start_size, min_size-1, -2):
        f = font(size, bold)
        if text_width(draw, text, f) <= max_width: return f
    return font(min_size, bold)

def local_custom_logo(team):
    raw = CUSTOM_LOGOS.get(norm(team))
    if not raw: return None
    return ROOT / raw.split("?", 1)[0]

def load_logo(team, directory):
    sources = []
    p = local_custom_logo(team)
    if p and p.exists(): sources.append(str(p))
    d = directory.get(norm(team)) or directory.get(rank_key(team)) or {}
    if d.get("logoUrl"): sources.append(d["logoUrl"])
    sources.append(str(ROOT / "RUSlogoNew.png"))
    for src in sources:
        try:
            if src.startswith("http"):
                req = urllib.request.Request(src, headers={"User-Agent":"RuralUtahSports/1.0"})
                with urllib.request.urlopen(req, timeout=10) as r: data = r.read()
                suffix = urllib.parse.urlparse(src).path.lower()
            else:
                data = Path(src).read_bytes()
                suffix = str(src).lower()
            if suffix.endswith(".svg"):
                import cairosvg
                data = cairosvg.svg2png(bytestring=data, output_width=500, output_height=500)
            img = Image.open(io.BytesIO(data)).convert("RGBA")
            if img.width and img.height: return img
        except Exception:
            continue
    return Image.new("RGBA", (1,1), (0,0,0,0))

def paste_contain(canvas, logo, box):
    x0,y0,x1,y1 = box
    fitted = ImageOps.contain(logo, (x1-x0, y1-y0), Image.Resampling.LANCZOS)
    x = x0 + (x1-x0-fitted.width)//2
    y = y0 + (y1-y0-fitted.height)//2
    canvas.alpha_composite(fitted, (x,y))

def base_canvas():
    img = Image.new("RGBA", (W,H), "#090909")
    d = ImageDraw.Draw(img)
    d.rectangle((0,0,W,8), fill=ORANGE)
    d.text((58,36), "RURAL UTAH SPORTS", font=font(27, True), fill="#FFFFFF")
    d.text((58,73), "UTAH HIGH SCHOOL FOOTBALL", font=font(15, True), fill=ORANGE)
    return img, d

def save_png(img, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(path, "PNG", optimize=True, compress_level=9)

def team_meta(team, teams_by_name, records, ranks):
    t = teams_by_name.get(rank_key(team), {})
    rec = records.get(rank_key(team), "0-0")
    rank = ranks.get(rank_key(team))
    cls = str(t.get("classification") or (rank[1] if rank else ""))
    mascot = str(t.get("mascot") or "")
    bg = valid_hex(t.get("backgroundColor"), "#333333")
    return t, rec, rank, cls, mascot, bg

def draw_team_image(team, teams_by_name, records, ranks, directory, out):
    t, rec, rank, cls, mascot, bg = team_meta(team, teams_by_name, records, ranks)
    img,d = base_canvas()
    d.rectangle((0,118,W,H), fill="#101010")
    d.rectangle((0,118,32,H), fill=bg)
    d.rounded_rectangle((68,155,390,544), radius=24, fill="#171717", outline="#333333", width=2)
    logo = load_logo(team, directory)
    paste_contain(img, logo, (105,190,353,438))
    d.text((109,464), f"{cls or 'UTAH'} FOOTBALL", font=font(18, True), fill="#AAAAAA")
    name = norm(team).title() if norm(team).isupper() else str(team)
    nf = fit_text(d, name.upper(), 700, 66, 34, True)
    d.text((445,174), name.upper(), font=nf, fill="#FFFFFF")
    if mascot:
        d.text((449,258), mascot.upper(), font=font(27, True), fill=bg)
    d.text((449,341), rec, font=font(68, True), fill="#FFFFFF")
    d.text((452,414), "2026 RECORD", font=font(17, True), fill="#888888")
    if rank:
        d.rounded_rectangle((448,465,700,520), radius=14, fill=bg)
        d.text((468,478), f"#{rank[0]} {rank[1]} RUS", font=font(23, True), fill="#FFFFFF")
    d.text((920,560), "ruralutahsports.com", font=font(15, True), fill="#666666")
    save_png(img, out)

def game_key(date, away, home):
    return f"{str(date or '').strip()}|{compact(away)}|{compact(home)}"

def game_slug(date, away, home):
    date_s = re.sub(r"[^0-9]+", "-", str(date or "")).strip("-")
    return slug(f"{date_s}-{away}-at-{home}")

def draw_game_image(g, teams_by_name, records, ranks, directory, out):
    away, home = g.get("awayTeam",""), g.get("homeTeam","")
    _, arec, arank, acls, _, acolor = team_meta(away, teams_by_name, records, ranks)
    _, hrec, hrank, hcls, _, hcolor = team_meta(home, teams_by_name, records, ranks)
    img,d = base_canvas()
    d.rectangle((0,118,600,H), fill="#101010")
    d.rectangle((600,118,W,H), fill="#101010")
    d.rectangle((0,118,18,H), fill=acolor); d.rectangle((W-18,118,W,H), fill=hcolor)
    d.rectangle((594,140,606,545), fill="#2b2b2b")
    alogo, hlogo = load_logo(away,directory), load_logo(home,directory)
    paste_contain(img, alogo, (120,165,395,390))
    paste_contain(img, hlogo, (805,165,1080,390))
    af = fit_text(d, str(away).upper(), 510, 42, 25, True)
    hf = fit_text(d, str(home).upper(), 510, 42, 25, True)
    aw = text_width(d, str(away).upper(), af); hw = text_width(d, str(home).upper(), hf)
    d.text(((600-aw)//2,405), str(away).upper(), font=af, fill="#FFFFFF")
    d.text((600+(600-hw)//2,405), str(home).upper(), font=hf, fill="#FFFFFF")
    d.text((300-text_width(d,arec,font(29,True))//2,463), arec, font=font(29,True), fill=acolor)
    d.text((900-text_width(d,hrec,font(29,True))//2,463), hrec, font=font(29,True), fill=hcolor)
    actual_a, actual_h = as_num(g.get("actualAway")), as_num(g.get("actualHome"))
    if actual_a is not None and actual_h is not None:
        center = f"FINAL  {fmt_num(actual_a)} – {fmt_num(actual_h)}"
    else:
        center = "GAME PREVIEW"
    cf = font(24, True)
    cw=text_width(d,center,cf)
    d.rounded_rectangle((600-cw//2-24,523,600+cw//2+24,568), radius=12, fill=ORANGE)
    d.text((600-cw//2,531),center,font=cf,fill="#000000")
    date=str(g.get("date") or "2026")
    df=font(17,True); dw=text_width(d,date,df); d.text((600-dw//2,579),date,font=df,fill="#888888")
    save_png(img, out)

def html_page(title, description, share_url, image_url, target_url):
    e = html_escape
    return f"""<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)}</title><meta name="description" content="{e(description)}">
<meta name="robots" content="noindex,follow"><link rel="canonical" href="{e(target_url)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Rural Utah Sports">
<meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(description)}">
<meta property="og:url" content="{e(share_url)}"><meta property="og:image" content="{e(image_url)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(description)}"><meta name="twitter:image" content="{e(image_url)}">
<meta http-equiv="refresh" content="0;url={e(target_url)}">
<style>body{{margin:0;background:#111;color:#fff;font:16px Arial,sans-serif;display:grid;place-items:center;min-height:100vh}}a{{color:#F14D07;font-weight:800}}</style>
</head><body><p>Opening <a href="{e(target_url)}">{e(title)}</a>…</p>
<script>location.replace({json.dumps(target_url)});</script></body></html>"""

def write_text(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")

def player_stat_summary(team_data, player):
    pid = str(player.get("playerId") or "")
    items=[]
    for section in team_data.get("stats",[]) or []:
        for row in section.get("rows",[]) or []:
            if str(row.get("playerId") or "") != pid: continue
            vals=row.get("values") or {}
            for key in ("Yards","TD","Touchdowns","Tackles","Sacks","Interceptions","Catches"):
                if key in vals and str(vals[key]).strip():
                    items.append(f"{key} {vals[key]}")
                    break
            if len(items)>=2: return " • ".join(items)
    return "2026 player profile and reported statistics"

def build(check=False):
    teams = read_json("teams-data.json", [])
    standings = read_json("standings-2026.json", {})
    rankings = read_json("rankings-current-2026.json", {})
    directory = read_json("school-directory.json", {})
    rosters = read_json("deseret-rosters-stats-2026.json", {})
    weekly = read_json("weekly-simulation.json", {})
    teams_by_name = team_index(teams)
    records = record_maps(standings)
    ranks = ranking_maps(rankings)
    current_teams = sorted({rank_key(k) for k in (rosters.get("teams") or {}).keys()} | set(teams_by_name.keys()))
    current_teams = [t for t in current_teams if t]
    players = []
    for team, data in (rosters.get("teams") or {}).items():
        seen=set()
        for p in data.get("roster",[]) or []:
            pid=str(p.get("playerId") or "").strip()
            if pid and p.get("name") and pid not in seen:
                seen.add(pid); players.append((team,data,p))
    games = [g for g in (weekly.get("games") or []) if g.get("awayTeam") and g.get("homeTeam")]
    if check:
        if len(current_teams) < 100: raise SystemExit(f"share preview check: only {len(current_teams)} teams")
        if len(players) < 1000: raise SystemExit(f"share preview check: only {len(players)} players")
        if not games: raise SystemExit("share preview check: no weekly games")
        tmp = ROOT / ".share-preview-check.png"
        draw_team_image(current_teams[0], teams_by_name, records, ranks, directory, tmp)
        if not tmp.exists() or tmp.stat().st_size < 5000: raise SystemExit("team preview render failed")
        tmp.unlink(missing_ok=True)
        print(f"Share preview check passed: {len(current_teams)} teams, {len(players)} players, {len(games)} games.")
        return

    share_root, image_root = ROOT/"share", ROOT/"share-images"
    if share_root.exists(): shutil.rmtree(share_root)
    if image_root.exists(): shutil.rmtree(image_root)
    manifest={"generatedFor":"2026","team":{},"player":{},"game":{}}
    for team in current_teams:
        key=rank_key(team); s=slug(team)
        t, rec, rank, cls, mascot, _ = team_meta(team, teams_by_name, records, ranks)
        image_rel=f"share-images/teams/{s}.png"
        draw_team_image(team, teams_by_name, records, ranks, directory, ROOT/image_rel)
        target=f"{BASE_URL}/team.html?team={urllib.parse.quote(str(team))}"
        share=f"{BASE_URL}/share/team/{s}/"
        rank_text=f" • #{rank[0]} {rank[1]} RUS" if rank else ""
        title=f"{str(team).title()} {mascot} Football | Rural Utah Sports".replace("  "," ")
        desc=f"2026 {cls or 'Utah'} football • {rec}{rank_text}. Team history, games, rankings, ELO and stats."
        write_text(ROOT/f"share/team/{s}/index.html", html_page(title,desc,share,f"{BASE_URL}/{image_rel}",target))
        manifest["team"][key]=f"share/team/{s}/"
    for team,data,p in players:
        pid=str(p["playerId"]); sid=safe_id(pid)
        t, rec, rank, cls, mascot, _=team_meta(team,teams_by_name,records,ranks)
        number=f"#{p.get('number')} " if str(p.get("number") or "").strip() else ""
        pos=str(p.get("position") or "").strip()
        klass=str(p.get("class") or "").strip()
        bits=[x for x in (pos,klass,cls) if x]
        title=f"{p.get('name')} | {team} Football | Rural Utah Sports"
        desc=f"{number}{' • '.join(bits)} • {team}. {player_stat_summary(data,p)}."
        image_rel=f"share-images/teams/{slug(rank_key(team))}.png"
        if not (ROOT/image_rel).exists(): image_rel="RUSlogoNew.png"
        target=f"{BASE_URL}/player.html?id={urllib.parse.quote(pid)}"
        share=f"{BASE_URL}/share/player/{sid}/"
        write_text(ROOT/f"share/player/{sid}/index.html", html_page(title,desc,share,f"{BASE_URL}/{image_rel}",target))
        manifest["player"][pid]=f"share/player/{sid}/"
    for g in games:
        away,home,date=g["awayTeam"],g["homeTeam"],g.get("date","")
        gs=game_slug(date,away,home); k=game_key(date,away,home)
        image_rel=f"share-images/games/{gs}.png"
        draw_game_image(g,teams_by_name,records,ranks,directory,ROOT/image_rel)
        actual_a,actual_h=as_num(g.get("actualAway")),as_num(g.get("actualHome"))
        status=f"Final: {fmt_num(actual_a)}-{fmt_num(actual_h)}" if actual_a is not None and actual_h is not None else "2026 matchup preview"
        title=f"{away} at {home} | Rural Utah Sports"
        desc=f"{status} • {date}. Scores, team records, rankings, ELO and game information."
        q=urllib.parse.urlencode({"date":date,"away":away,"home":home})
        target=f"{BASE_URL}/game.html?{q}"; share=f"{BASE_URL}/share/game/{gs}/"
        write_text(ROOT/f"share/game/{gs}/index.html", html_page(title,desc,share,f"{BASE_URL}/{image_rel}",target))
        manifest["game"][k]=f"share/game/{gs}/"
    write_text(ROOT/"share-preview-map.json", json.dumps(manifest,indent=2,ensure_ascii=False)+"\n")
    print(f"Built {len(manifest['team'])} team, {len(manifest['player'])} player and {len(manifest['game'])} game share previews.")

if __name__ == "__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args=ap.parse_args()
    build(check=args.check)

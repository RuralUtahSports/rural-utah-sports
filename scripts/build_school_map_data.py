#!/usr/bin/env python3
import json
import re
import time
from pathlib import Path
from urllib.parse import parse_qs, quote, urljoin, urlparse

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY_URL = "https://uhsaa.org/school-directory-new/"
OUT = ROOT / "school-directory.json"
UA = "RuralUtahSportsSchoolMap/1.0 (+https://github.com/RuralUtahSports/rural-utah-sports)"

ALIASES = {
    "ALA": "American Leadership Academy",
    "CEDAR CITY": "Cedar",
    "GRAND": "Grand County",
    "GUNNISON VALLEY": "Gunnison Valley",
    "MONUMENT VAL": "Monument Valley",
    "MONUMENT VALLEY": "Monument Valley",
    "SAINT JOSEPH": "Saint Joseph",
    "UMA-LEHI": "Utah Military Academy - Camp Williams",
    "UMA-HILLFIELD": "Utah Military Academy - Hill Field",
    "WASATCH ACADEMY": "Wasatch Academy",
    "WEST FIELD": "West Field",
    "DESERET PEAK": "Deseret Peak",
    "LAYTON CHRISTIAN": "Layton Christian Academy",
}
BLOCKED = {"ESCALANTE", "USDB", "UTAH SCH DEAF"}


def norm(value):
    return re.sub(r"[^A-Z0-9]", "", str(value or "").upper())


def title_name(value):
    return " ".join(part.capitalize() for part in str(value or "").lower().split())


def uhsaa_name(team):
    key = str(team or "").strip().upper()
    return ALIASES.get(key, title_name(team))


def official_logo_url(school_name):
    return f"https://www.uhsaa.org/Logos/portfolio150/{quote(school_name)}.png"


def get_json(url, **params):
    response = requests.get(url, params=params, headers={"User-Agent": UA}, timeout=30)
    response.raise_for_status()
    return response.json()


def clean_address(address):
    text = " ".join(str(address or "").split())
    text = re.sub(r"\bP\.?\s*O\.?\s*Box\s+\d+\s*[-,]?\s*", "", text, flags=re.I)
    text = re.sub(r"\bPO Box\s+\d+\s*[-,]?\s*", "", text, flags=re.I)
    text = re.sub(r"\s+,", ",", text)
    return text.strip(" ,")


def address_city(address):
    match = re.search(r",\s*([^,]+?)(?:,\s*|\s+)UT\s+\d{5}(?:-\d{4})?\b", str(address or ""), re.I)
    return match.group(1).strip() if match else ""


def address_zip(address):
    match = re.search(r"\bUT\s+(\d{5})(?:-\d{4})?\b", str(address or ""), re.I)
    return match.group(1) if match else ""


def census_geocode(query):
    try:
        data = get_json(
            "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress",
            address=query,
            benchmark="Public_AR_Current",
            format="json",
        )
        matches = data.get("result", {}).get("addressMatches", [])
        if matches:
            coords = matches[0].get("coordinates", {})
            return float(coords["y"]), float(coords["x"]), "US Census", "address"
    except Exception as exc:
        print(f"Census geocoder failed for {query}: {exc}")
    return None


def nominatim_geocode(query, label, precision):
    try:
        time.sleep(1.05)
        data = get_json(
            "https://nominatim.openstreetmap.org/search",
            q=query,
            format="jsonv2",
            limit=1,
            countrycodes="us",
        )
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"]), label, precision
    except Exception as exc:
        print(f"Nominatim failed for {query}: {exc}")
    return None


def geocode(address, school_name):
    cleaned = clean_address(address)
    city = address_city(address)
    zipcode = address_zip(address)

    if cleaned:
        result = census_geocode(cleaned)
        if result:
            return result
        result = nominatim_geocode(cleaned, "OpenStreetMap Nominatim", "address")
        if result:
            return result

    queries = []
    if city:
        queries.extend([
            (f"{school_name} High School, {city}, Utah", "OpenStreetMap school-name fallback", "school"),
            (f"{school_name}, {city}, Utah", "OpenStreetMap school-name fallback", "school"),
        ])
    else:
        queries.append((f"{school_name} High School, Utah", "OpenStreetMap school-name fallback", "school"))

    for query, label, precision in queries:
        result = nominatim_geocode(query, label, precision)
        if result:
            return result

    # Last resort: keep the program on the statewide map in the correct town
    # even when a new/rural campus is not yet indexed by either geocoder.
    if city:
        city_query = f"{city}, Utah{(' ' + zipcode) if zipcode else ''}"
        result = nominatim_geocode(city_query, "OpenStreetMap city fallback", "city")
        if result:
            return result
    return None


def first_address_after_heading(soup):
    heading = soup.find("h1")
    candidates = heading.find_all_next(["li", "p", "div"], limit=45) if heading else []
    for node in candidates:
        text = " ".join(node.stripped_strings)
        if "About The UHSAA" in text:
            continue
        if len(text) <= 220 and re.search(r"\bUT\s+\d{5}(?:-\d{4})?\b", text, re.I):
            return text
    return ""


def page_field(soup, label):
    pattern = re.compile(rf"^{re.escape(label)}\s*:\s*(.+)$", re.I)
    for text in soup.stripped_strings:
        match = pattern.match(text.strip())
        if match:
            return match.group(1).strip()
    return ""


def directory_links(session):
    response = session.get(DIRECTORY_URL, timeout=45)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    links = {}
    for a in soup.find_all("a", href=True):
        href = urljoin(DIRECTORY_URL, a["href"])
        parsed = urlparse(href)
        if "school-directory" not in parsed.path:
            continue
        school_id = parse_qs(parsed.query).get("id", [""])[0].strip()
        if school_id:
            links[norm(school_id)] = href
    return links


def main():
    teams = json.loads((ROOT / "teams-data.json").read_text(encoding="utf-8"))
    football = [
        t for t in teams
        if re.fullmatch(r"(?:6A|5A|4A|3A|2A|1A|8P|8-PLAYER)", str(t.get("classification") or ""), re.I)
        and str(t.get("team") or "").strip().upper() not in BLOCKED
    ]

    old = {}
    if OUT.exists():
        try:
            old = json.loads(OUT.read_text(encoding="utf-8"))
        except Exception:
            old = {}

    session = requests.Session()
    session.headers.update({"User-Agent": UA})
    links = directory_links(session)
    result = {}
    unmatched = []
    geocode_failures = []

    for index, team_obj in enumerate(football, 1):
        team = str(team_obj.get("team") or "").strip().upper()
        school_name = uhsaa_name(team)
        page_url = links.get(norm(school_name))
        if not page_url:
            unmatched.append(team)
            print(f"[{index}/{len(football)}] no UHSAA page match: {team} -> {school_name}")
            continue

        response = session.get(page_url, timeout=45)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        address = first_address_after_heading(soup)
        classification = page_field(soup, "Classification")
        region = page_field(soup, "Region")
        logo = official_logo_url(school_name)
        city = address_city(address)

        cached = old.get(team, {}) if isinstance(old, dict) else {}
        lat = cached.get("lat") if cached.get("address") == address and cached.get("lat") is not None else None
        lon = cached.get("lon") if cached.get("address") == address and cached.get("lon") is not None else None
        geocoder = cached.get("geocoder", "cached") if lat is not None and lon is not None else ""
        precision = cached.get("precision", "address") if lat is not None and lon is not None else ""
        if address and (lat is None or lon is None):
            geo = geocode(address, school_name)
            if geo:
                lat, lon, geocoder, precision = geo
            else:
                geocode_failures.append((team, address))

        result[team] = {
            "name": school_name,
            "address": address,
            "city": city,
            "lat": lat,
            "lon": lon,
            "logoUrl": logo,
            "uhsaaClassification": classification,
            "uhsaaRegion": region,
            "sourceUrl": page_url,
            "geocoder": geocoder,
            "precision": precision,
        }
        print(f"[{index}/{len(football)}] {team}: {address or 'NO ADDRESS'}")

    located = sum(1 for item in result.values() if item.get("lat") is not None and item.get("lon") is not None)
    OUT.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"Football programs: {len(football)}")
    print(f"UHSAA directory matches: {len(result)}")
    print(f"Located schools: {located}")
    if unmatched:
        print("Unmatched teams:", ", ".join(unmatched))
    if geocode_failures:
        print("Geocode failures:", "; ".join(f"{team}: {address}" for team, address in geocode_failures))

    if len(result) < len(football):
        raise RuntimeError("At least one football program failed UHSAA directory matching; refusing to publish an incomplete statewide map.")
    if located < len(football):
        raise RuntimeError("At least one football program could not be located; refusing to publish an incomplete statewide map.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Pobiera dane MPZP (przeznaczenie terenu) z REST API m.st. Warszawy
i zapisuje wynik jako layers/overlays/data/mpzpGeoJSON.js.

Kroki:
  1. Oracle MapViewer → lista planów obowiązujących w bbox (PLANY_ZAKRESY_OBOWIAZUJACE)
  2. REST API findByCoordinates → odkrycie nazw planów w formacie API
  3. REST API findByPlanName → strefy dla każdego planu
  4. Zapis

Użycie:
  python fetch_mpzp.py [--bbox "minLng,minLat,maxLng,maxLat"] [--dry-run]
"""

import argparse
import json
import logging
import re
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

OM_BASE      = "https://mapa.um.warszawa.pl"
API_BASE     = f"{OM_BASE}/WebServices/PrzeznaczenieTerenow/wgs84"
DEFAULT_BBOX = "21.0214376449585,52.174166602946094,21.047401428222656,52.19216606894107"
DEFAULT_OUT  = Path(__file__).parent.parent.parent / "layers/overlays/data/mpzpGeoJSON.js"

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger("fetch_mpzp")


# ── Oracle MapViewer ──────────────────────────────────────────────────────────

def info_request(session: requests.Session, sql: str) -> ET.Element:
    xml_req = f"""<?xml version="1.0" standalone="yes"?>
<info_request datasource="dane_wawa" format="strict">
{sql}
</info_request>"""
    r = session.post(f"{OM_BASE}/mapviewer/omserver",
                     data={"xml_request": xml_req}, timeout=60)
    r.raise_for_status()
    text = re.sub(r'&(?!(?:amp|lt|gt|apos|quot|#\d+|#x[\da-fA-F]+);)', '&amp;', r.text)
    root = ET.fromstring(text)
    if root.tag == "oms_error":
        raise RuntimeError(f"info_request error: {root.text}")
    return root


def fetch_plan_centroids(session: requests.Session, bbox: str) -> list[dict]:
    """Pobiera centra planów obowiązujących w bbox z Oracle MapViewer."""
    minx, miny, maxx, maxy = bbox.split(",")
    bbox_geom = (
        f"SDO_GEOMETRY(2003,4326,NULL,SDO_ELEM_INFO_ARRAY(1,1003,3),"
        f"SDO_ORDINATE_ARRAY({minx},{miny},{maxx},{maxy}))"
    )
    sql = f"""SELECT OBJECTID, NAZWA_KR,
  SDO_CS.TRANSFORM(SDO_GEOM.SDO_CENTROID(SHAPE,0.005),4326).SDO_POINT.X AS CX,
  SDO_CS.TRANSFORM(SDO_GEOM.SDO_CENTROID(SHAPE,0.005),4326).SDO_POINT.Y AS CY
FROM PLANY_ZAKRESY_OBOWIAZUJACE
WHERE SDO_FILTER(SHAPE, {bbox_geom}, 'querytype=WINDOW') = 'TRUE'"""

    rowset = info_request(session, sql)
    plans = []
    for row in rowset.findall("ROW"):
        cx_el = row.find("CX")
        cy_el = row.find("CY")
        if cx_el is None or cy_el is None or not cx_el.text or not cy_el.text:
            continue
        nazwa_el = row.find("NAZWA_KR")
        plans.append({
            "nazwa_kr": nazwa_el.text.strip() if nazwa_el is not None and nazwa_el.text else "",
            "cx": float(cx_el.text),
            "cy": float(cy_el.text),
        })
    log.info("  Znaleziono %d planów obowiązujących w bbox.", len(plans))
    return plans


# ── REST API PrzeznaczenieTerenow ─────────────────────────────────────────────

def discover_api_name(session: requests.Session, cx: float, cy: float) -> str | None:
    """Zwraca API-format nazwy planu dla punktu (cx, cy), lub None jeśli brak strefy."""
    r = session.get(f"{API_BASE}/findByCoordinates/{cx}/{cy}", timeout=30)
    if not r.ok:
        return None
    data = r.json()
    if "error" in data:
        return None
    props = data.get("properties", data)
    return props.get("nazwa_plan")


def fetch_plan_features(session: requests.Session, api_name: str) -> list[dict]:
    """Pobiera wszystkie strefy planu z API."""
    encoded = urllib.parse.quote(api_name)
    r = session.get(f"{API_BASE}/findByPlanName/{encoded}", timeout=60)
    if not r.ok:
        log.warning("  HTTP %d dla planu %r", r.status_code, api_name)
        return []
    data = r.json()
    if "error" in data:
        log.warning("  Brak danych dla planu %r: %s", api_name, data.get("message", ""))
        return []
    features = data.get("features", [])
    log.info("  %r → %d stref", api_name, len(features))
    return features


# ── Główna logika ─────────────────────────────────────────────────────────────

def fetch_mpzp(session: requests.Session, bbox: str) -> list[dict]:
    log.info("Krok 1 – pobieranie planów z Oracle MapViewer…")
    plans = fetch_plan_centroids(session, bbox)

    log.info("Krok 2 – odkrywanie nazw API (findByCoordinates)…")
    api_names: dict[str, str] = {}   # api_name → nazwa_kr
    for p in plans:
        name = discover_api_name(session, p["cx"], p["cy"])
        if name:
            if name not in api_names:
                api_names[name] = p["nazwa_kr"]
                log.info("  %r → %r", p["nazwa_kr"], name)
        else:
            log.warning("  %r → centroid poza strefą MPZP (pominięto)", p["nazwa_kr"])

    log.info("Krok 3 – pobieranie stref dla %d planów API…", len(api_names))
    all_features: list[dict] = []
    seen_ids: set[str] = set()
    for api_name in api_names:
        for f in fetch_plan_features(session, api_name):
            oid = f.get("properties", {}).get("objectid")
            if oid not in seen_ids:
                seen_ids.add(oid)
                # Normalize: add fid, rename fields for overlay consistency
                props = f.get("properties", {})
                props["fid"] = oid
                all_features.append(f)

    log.info("Łącznie %d unikalnych stref.", len(all_features))

    # Log unique zone type codes for reference
    codes = {}
    for f in all_features:
        symb = f.get("properties", {}).get("fun_symb", "")
        parts = symb.split()
        code = parts[-1] if len(parts) >= 2 else symb
        codes[code] = codes.get(code, 0) + 1
    log.info("Kody stref (%d unikalnych): %s",
             len(codes), ", ".join(sorted(codes)[:30]))

    return all_features


def write_js(path: Path, features: list[dict], dry_run: bool) -> None:
    lines = [
        "const mpzpGeoJSON = {",
        '  "type": "FeatureCollection",',
        '  "name": "mpzp",',
        '  "features": [',
    ]
    for i, f in enumerate(features):
        comma = "," if i < len(features) - 1 else ""
        lines.append("    " + json.dumps(f, ensure_ascii=False, separators=(",", ":")) + comma)
    lines += ["  ]", "}", "", "export { mpzpGeoJSON }"]
    content = "\n".join(lines)
    size_kb = len(content.encode("utf-8")) // 1024
    if dry_run:
        log.info("[dry-run] %s: %d stref, %d KB", path.name, len(features), size_kb)
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        log.info("Zapisano %s (%d stref, %d KB)", path, len(features), size_kb)


def main():
    ap = argparse.ArgumentParser(description="Pobiera dane MPZP z REST API m.st. Warszawy")
    ap.add_argument("--bbox", default=DEFAULT_BBOX)
    ap.add_argument("--out", default=str(DEFAULT_OUT))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    session = requests.Session()
    session.headers["User-Agent"] = "fetch-mpzp/1.0 (mapaPodSkocznia)"

    features = fetch_mpzp(session, args.bbox)
    write_js(Path(args.out), features, args.dry_run)
    log.info("Gotowe.")


if __name__ == "__main__":
    main()

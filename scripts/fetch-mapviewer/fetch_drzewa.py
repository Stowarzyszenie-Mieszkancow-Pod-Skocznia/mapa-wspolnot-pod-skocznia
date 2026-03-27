#!/usr/bin/env python3
"""
Pobiera inwentarz drzew z bazy Oracle MapViewer (dane_wawa) i zapisuje
wynik jako layers/overlays/data/drzewaGeoJSON.js.

Użycie:
  python fetch_drzewa.py [--bbox "minLng,minLat,maxLng,maxLat"] [--dry-run]
  python fetch_drzewa.py --out ../../layers/overlays/data/drzewaGeoJSON.js
"""

import argparse
import json
import logging
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

OM_BASE      = "https://mapa.um.warszawa.pl"
DEFAULT_BBOX = "21.0214376449585,52.174166602946094,21.047401428222656,52.19216606894107"
DEFAULT_OUT  = Path(__file__).parent.parent.parent / "layers/overlays/data/drzewaGeoJSON.js"

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger("fetch_drzewa")


def info_request(session: requests.Session, sql: str) -> ET.Element:
    xml_req = f"""<?xml version="1.0" standalone="yes"?>
<info_request datasource="dane_wawa" format="strict">
{sql}
</info_request>"""
    r = session.post(f"{OM_BASE}/mapviewer/omserver",
                     data={"xml_request": xml_req}, timeout=120)
    r.raise_for_status()
    # Escape bare & that are not valid XML entity references (common in tree species names)
    text = re.sub(r'&(?!(?:amp|lt|gt|apos|quot|#\d+|#x[\da-fA-F]+);)', '&amp;', r.text)
    root = ET.fromstring(text)
    if root.tag == "oms_error":
        raise RuntimeError(f"info_request error: {root.text}")
    return root  # <ROWSET>


_EMPTY = {"null", "** brak danych **", "** brak danych**", ""}

def _text(row: ET.Element, tag: str) -> str | None:
    el = row.find(tag)
    if el is None or el.text is None:
        return None
    t = el.text.strip()
    if t in _EMPTY or t.replace("** brak danych **", "").replace("** brak danych**", "").strip() == "":
        return None
    return t


def _num(row: ET.Element, tag: str) -> float | None:
    v = _text(row, tag)
    if v is None:
        return None
    try:
        f = float(v)
        return None if f == 0 else f
    except ValueError:
        return None


def fetch_trees(session: requests.Session, bbox: str) -> list[dict]:
    minx, miny, maxx, maxy = bbox.split(",")
    bbox_geom = (
        f"SDO_GEOMETRY(2003,4326,NULL,SDO_ELEM_INFO_ARRAY(1,1003,3),"
        f"SDO_ORDINATE_ARRAY({minx},{miny},{maxx},{maxy}))"
    )
    sql = f"""SELECT
  NUMER_INW, DZIELNICA, LOKALIZACJA,
  GATUNEK_NAZWA_POLSKA, GATUNEK_NAZWA_LACINSKA,
  WYSOKOSC, PNIE_OBWODY_W_CM, SREDNICA_KORONY,
  STAN_ZDROWOTNY, OCENA, WETERAN, MLODE, MILION_DRZEW,
  DEC_WYCINKA, JEDNOSTKA_ZARZADZAJACA,
  TO_CHAR(DATA_OBOWIAZYWANIA_DANYCH, 'YYYY-MM-DD') AS DATA,
  SDO_CS.TRANSFORM(SHAPE, 4326).SDO_POINT.X AS LNG,
  SDO_CS.TRANSFORM(SHAPE, 4326).SDO_POINT.Y AS LAT
FROM BOS_ZIELEN_DRZEWA
WHERE SDO_FILTER(SHAPE, {bbox_geom}, 'querytype=WINDOW') = 'TRUE'"""

    log.info("Pobieranie drzew z bbox %s…", bbox)
    rowset = info_request(session, sql)
    rows = rowset.findall("ROW")
    log.info("  Pobrano %d drzew.", len(rows))

    features = []
    skipped = 0
    for row in rows:
        lng = _num(row, "LNG")
        lat = _num(row, "LAT")
        if lng is None or lat is None:
            skipped += 1
            continue

        props = {
            "fid":           _text(row, "NUMER_INW"),
            "dzielnica":     _text(row, "DZIELNICA"),
            "lokalizacja":   _text(row, "LOKALIZACJA"),
            "gatunek_pl":    _text(row, "GATUNEK_NAZWA_POLSKA"),
            "gatunek_lat":   _text(row, "GATUNEK_NAZWA_LACINSKA"),
            "wysokosc":      _num(row, "WYSOKOSC"),
            "pnie_obwody":   _text(row, "PNIE_OBWODY_W_CM"),
            "srednica_korony": _num(row, "SREDNICA_KORONY"),
            "stan_zdrowotny": _text(row, "STAN_ZDROWOTNY"),
            "ocena":         _text(row, "OCENA"),
            "weteran":       _text(row, "WETERAN"),
            "mlode":         1 if _text(row, "MLODE") == "1" else None,
            "milion_drzew":  1 if _text(row, "MILION_DRZEW") == "1" else None,
            "dec_wycinka":   _text(row, "DEC_WYCINKA"),
            "jednostka":     _text(row, "JEDNOSTKA_ZARZADZAJACA"),
            "data":          _text(row, "DATA"),
        }
        # Remove None values to keep file compact
        props = {k: v for k, v in props.items() if v is not None}

        features.append({
            "type": "Feature",
            "properties": props,
            "geometry": {
                "type": "Point",
                "coordinates": [round(lng, 7), round(lat, 7)],
            },
        })

    if skipped:
        log.warning("  Pominięto %d drzew bez koordynat.", skipped)
    return features


def fetch_pomniki(session: requests.Session, bbox: str) -> list[dict]:
    """
    Pobiera pomniki przyrody będące drzewami (z nazwą łacińską).
    Głazy i inne obiekty niebędące drzewami są pomijane.
    """
    minx, miny, maxx, maxy = bbox.split(",")
    bbox_geom = (
        f"SDO_GEOMETRY(2003,4326,NULL,SDO_ELEM_INFO_ARRAY(1,1003,3),"
        f"SDO_ORDINATE_ARRAY({minx},{miny},{maxx},{maxy}))"
    )
    sql = f"""SELECT NR_REJ_WOJ, NAZWA_PL, NAZWA_LAC, OBWOD, OBIEKT, PODSTAWAPR,
  SDO_CS.TRANSFORM(SHAPE,4326).SDO_POINT.X AS LNG,
  SDO_CS.TRANSFORM(SHAPE,4326).SDO_POINT.Y AS LAT
FROM BOS_ZIELEN_POMNIKI_PRZYRODY
WHERE SDO_FILTER(SHAPE, {bbox_geom}, 'querytype=WINDOW') = 'TRUE'"""

    log.info("Pobieranie pomników przyrody…")
    rowset = info_request(session, sql)
    pomniki = []
    for row in rowset.findall("ROW"):
        lng = _num(row, "LNG")
        lat = _num(row, "LAT")
        if lng is None or lat is None:
            continue
        if _text(row, "NAZWA_LAC") is None:  # głaz lub inny obiekt niebędący drzewem
            continue
        nr_rej = _num(row, "NR_REJ_WOJ")
        pomniki.append({
            "lng": lng, "lat": lat,
            "nr_rej": int(nr_rej) if nr_rej else None,
            "nazwa_pl": _text(row, "NAZWA_PL"),
            "obiekt":   _text(row, "OBIEKT"),
            "podstawa": _text(row, "PODSTAWAPR"),
        })
    log.info("  Pomniki przyrody (drzewa): %d", len(pomniki))
    return pomniki


def match_pomniki(features: list[dict], pomniki: list[dict],
                  threshold_deg: float = 0.0007) -> list[dict]:
    """
    Dopasowuje pomniki przyrody do najbliższego drzewa w inwentarzu.
    threshold_deg ≈ 20 m. Niezidentyfikowane pomniki są logowane jako ostrzeżenie.
    """
    threshold_sq = threshold_deg ** 2
    for p in pomniki:
        best_f, best_d = None, float("inf")
        for f in features:
            lng, lat = f["geometry"]["coordinates"]
            d = (lng - p["lng"]) ** 2 + (lat - p["lat"]) ** 2
            if d < best_d:
                best_d, best_f = d, f
        dist_m = (best_d ** 0.5) * 111_000
        if best_f is not None and best_d < threshold_sq:
            props = best_f["properties"]
            if p["nr_rej"]:
                props["pomnik_nr"] = p["nr_rej"]
            props["pomnik_obiekt"] = p["obiekt"] or "drzewo"
            if p["podstawa"]:
                props["pomnik_podstawa"] = p["podstawa"]
            log.info("  Pomnik nr %s (%s) → drzewo %s (%.0f m)",
                     p["nr_rej"], p["nazwa_pl"], props.get("fid", "?"), dist_m)
        else:
            log.warning("  Brak dopasowania dla pomnika nr %s (%s) – %.0f m od najbliższego drzewa",
                        p["nr_rej"], p["nazwa_pl"], dist_m)
    return features


def write_js(path: Path, features: list[dict], dry_run: bool) -> None:
    lines = [
        "const drzewaGeoJSON = {",
        '  "type": "FeatureCollection",',
        '  "name": "drzewa",',
        '  "features": [',
    ]
    for i, f in enumerate(features):
        comma = "," if i < len(features) - 1 else ""
        lines.append("    " + json.dumps(f, ensure_ascii=False, separators=(",", ":")) + comma)
    lines += ["  ]", "}", "", "export { drzewaGeoJSON }"]
    content = "\n".join(lines)
    size_kb = len(content.encode("utf-8")) // 1024
    if dry_run:
        log.info("[dry-run] %s: %d drzew, %d KB", path.name, len(features), size_kb)
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        log.info("Zapisano %s (%d drzew, %d KB)", path, len(features), size_kb)


def main():
    ap = argparse.ArgumentParser(description="Pobiera inwentarz drzew z Oracle MapViewer")
    ap.add_argument("--bbox", default=DEFAULT_BBOX)
    ap.add_argument("--out", default=str(DEFAULT_OUT))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    session = requests.Session()
    session.headers["User-Agent"] = "fetch-drzewa/1.0 (mapaPodSkocznia)"

    features = fetch_trees(session, args.bbox)
    pomniki = fetch_pomniki(session, args.bbox)
    match_pomniki(features, pomniki)
    write_js(Path(args.out), features, args.dry_run)
    log.info("Gotowe.")


if __name__ == "__main__":
    main()

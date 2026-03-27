#!/usr/bin/env python3
"""
Pobiera decyzje o warunkach zabudowy z bazy Oracle MapViewer (dane_wawa) i zapisuje
wynik jako layers/overlays/data/decyzjeWzGeoJSON.js.

Użycie:
  python fetch_decyzje_wz.py [--bbox "minLng,minLat,maxLng,maxLat"] [--dry-run]
"""

import argparse
import json
import logging
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

OM_BASE      = "https://mapa.um.warszawa.pl"
DEFAULT_BBOX = "21.019,52.171,21.052,52.197"
DEFAULT_OUT  = Path(__file__).parent.parent.parent / "layers/overlays/data/decyzjeWzGeoJSON.js"

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger("fetch_decyzje_wz")


def info_request(session: requests.Session, sql: str) -> ET.Element:
    xml_req = f"""<?xml version="1.0" standalone="yes"?>
<info_request datasource="dane_wawa" format="strict">
{sql}
</info_request>"""
    r = session.post(f"{OM_BASE}/mapviewer/omserver",
                     data={"xml_request": xml_req}, timeout=60)
    r.raise_for_status()
    root = ET.fromstring(r.text)
    if root.tag == "oms_error":
        raise RuntimeError(f"info_request error: {root.text}")
    return root


def _text(row: ET.Element, tag: str) -> str | None:
    el = row.find(tag)
    if el is None or el.text is None:
        return None
    t = el.text.strip()
    return t if t else None


def _num(row: ET.Element, tag: str) -> float | None:
    v = _text(row, tag)
    if v is None:
        return None
    try:
        f = float(v)
        return f if f != 0 else None
    except ValueError:
        return None


def fetch_decyzje(session: requests.Session, bbox: str) -> list[dict]:
    minx, miny, maxx, maxy = bbox.split(",")
    bbox_geom = (
        f"SDO_GEOMETRY(2003,4326,NULL,SDO_ELEM_INFO_ARRAY(1,1003,3),"
        f"SDO_ORDINATE_ARRAY({minx},{miny},{maxx},{maxy}))"
    )
    sql = f"""SELECT
  ID_WZ, DEC_WZ, NR_DEC,
  DATA_WZ,
  RODZAJ_SPRAWY, NAZWA_INW, OPIS_RODZ_,
  NAZWA_UL, NR_P, NAZWA_WN,
  POW_TER, POW_ZAB, KOND, WYSOKOSC, LICZBA_MIE, LICZBA_PAR,
  UWAGI_WZ,
  TO_CHAR(DBMS_LOB.SUBSTR(GEOMETRY_JSON_WGS, 3500, 1)) AS GEOM_JSON
FROM DECYZJE_WZ_POW
WHERE ID_WZ > 0
AND SDO_FILTER(SHAPE, {bbox_geom}, 'querytype=WINDOW') = 'TRUE'"""

    log.info("Pobieranie decyzji WZ z bbox %s…", bbox)
    rowset = info_request(session, sql)
    rows = rowset.findall("ROW")
    log.info("  Pobrano %d decyzji.", len(rows))

    features = []
    skipped = 0
    for row in rows:
        geom_json_str = _text(row, "GEOM_JSON")
        if not geom_json_str:
            skipped += 1
            continue
        try:
            geometry = json.loads(geom_json_str)
        except json.JSONDecodeError:
            log.warning("  Pominięto ID_WZ=%s: błąd parsowania geometrii", _text(row, "ID_WZ"))
            skipped += 1
            continue

        props = {
            "fid":          _text(row, "ID_WZ"),
            "dec_wz":       _text(row, "DEC_WZ"),
            "nr_dec":       _text(row, "NR_DEC"),
            "data":         _text(row, "DATA_WZ"),
            "rodzaj":       _text(row, "RODZAJ_SPRAWY"),
            "nazwa":        _text(row, "NAZWA_INW"),
            "typ":          _text(row, "OPIS_RODZ_"),
            "ulica":        _text(row, "NAZWA_UL"),
            "nr":           _text(row, "NR_P"),
            "inwestor":     _text(row, "NAZWA_WN"),
            "pow_ter":      _num(row, "POW_TER"),
            "pow_zab":      _num(row, "POW_ZAB"),
            "kondygnacje":  _num(row, "KOND"),
            "wysokosc":     _num(row, "WYSOKOSC"),
            "mieszkania":   _num(row, "LICZBA_MIE"),
            "parkingi":     _num(row, "LICZBA_PAR"),
            "uwagi":        _text(row, "UWAGI_WZ"),
        }
        props = {k: v for k, v in props.items() if v is not None}

        features.append({
            "type": "Feature",
            "properties": props,
            "geometry": geometry,
        })

    if skipped:
        log.warning("  Pominięto %d decyzji (brak geometrii).", skipped)
    return features


def write_js(path: Path, features: list[dict], dry_run: bool) -> None:
    lines = [
        "const decyzjeWzGeoJSON = {",
        '  "type": "FeatureCollection",',
        '  "name": "decyzjeWz",',
        '  "features": [',
    ]
    for i, f in enumerate(features):
        comma = "," if i < len(features) - 1 else ""
        lines.append("    " + json.dumps(f, ensure_ascii=False, separators=(",", ":")) + comma)
    lines += ["  ]", "}", "", "export { decyzjeWzGeoJSON }"]
    content = "\n".join(lines)
    size_kb = len(content.encode("utf-8")) // 1024
    if dry_run:
        log.info("[dry-run] %s: %d decyzji, %d KB", path.name, len(features), size_kb)
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        log.info("Zapisano %s (%d decyzji, %d KB)", path, len(features), size_kb)


def main():
    ap = argparse.ArgumentParser(description="Pobiera decyzje WZ z Oracle MapViewer")
    ap.add_argument("--bbox", default=DEFAULT_BBOX)
    ap.add_argument("--out", default=str(DEFAULT_OUT))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    session = requests.Session()
    session.headers["User-Agent"] = "fetch-decyzje-wz/1.0 (mapaPodSkocznia)"

    features = fetch_decyzje(session, args.bbox)
    write_js(Path(args.out), features, args.dry_run)
    log.info("Gotowe.")


if __name__ == "__main__":
    main()

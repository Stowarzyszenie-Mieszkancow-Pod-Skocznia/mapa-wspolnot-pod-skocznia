#!/usr/bin/env python3
"""
Aktualizuje wlasnoscGeoJSON.js i wlasnoscData.js na podstawie WFS EGIB m.st. Warszawy.

Kroki:
  1. Pobranie wszystkich działek z podanego bounding boxu (WFS EGIB)
  2. Klasyfikacja własności przez zapytanie SQL do bazy Oracle MapViewer (info_request)
     – MIASTO STOŁECZNE WARSZAWA  → miejska
     – SKARB PAŃSTWA              → skarbu_panstwa
     – pozostałe                  → prywatna
  3. Scalenie z istniejącymi plikami – dane z bazy nadpisują istniejące wpisy

Użycie:
  python updater.py [--bbox "minLng,minLat,maxLng,maxLat"] [--dry-run]

Docker:
  docker build -t wlasnosc-updater .
  docker run --rm -v /ścieżka/do/layers/overlays/data:/data wlasnosc-updater
  docker run --rm -v /ścieżka/do/layers/overlays/data:/data wlasnosc-updater \\
      --bbox "21.025,52.175,21.045,52.190" --dry-run
"""

import argparse
import json
import logging
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

# ── Konfiguracja ─────────────────────────────────────────────────────────────

WFS_URL      = "https://wms2.um.warszawa.pl/geoserver/wfs/wfs"
OM_BASE      = "https://mapa.um.warszawa.pl"
DEFAULT_BBOX = "21.019,52.171,21.052,52.197"   # MAX_BOUNDS z mapConfig.js
# Serwer odrzuca startIndex > 0 (HTTP 400), ale obsługuje duże count.
MAX_COUNT    = 5000

# Wartości OPIS_PODMIOTU w tabeli WLASNOSC_DZIALKI_MIASTO (Oracle MapViewer)
_OWNER_MIEJSKA        = "MIASTO STOŁECZNE WARSZAWA"
_OWNER_SKARBU_PANSTWA = "SKARB PAŃSTWA"

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger("updater")


# ── WFS ──────────────────────────────────────────────────────────────────────

def _wfs(session: requests.Session, **params) -> dict:
    defaults = dict(
        SERVICE="WFS", VERSION="2.0.0",
        SRSNAME="EPSG:4326", outputFormat="application/json",
    )
    r = session.get(WFS_URL, params={**defaults, **params}, timeout=60)
    r.raise_for_status()
    return r.json()


def get_parcels_in_bbox(
    session: requests.Session, minx, miny, maxx, maxy
) -> tuple[list[dict], list[str]]:
    """
    Pobiera wszystkie działki z EGiB mieszczące się w bounding boxie.

    Zwraca (features, obreby_sorted) – listę surowych obiektów WFS
    i posortowaną listę identyfikatorów obrębów w tym obszarze.
    """
    log.info("Krok 1 – pobieranie działek w bbox (%.4f,%.4f – %.4f,%.4f)…",
             minx, miny, maxx, maxy)
    data = _wfs(
        session,
        REQUEST="GetFeature", TYPENAMES="wfs:dzialki",
        BBOX=f"{minx},{miny},{maxx},{maxy},EPSG:4326",
        count=MAX_COUNT,
    )
    matched  = data.get("numberMatched", 0)
    features = data["features"]
    returned = len(features)

    if matched > returned:
        log.warning(
            "  Uwaga: serwer zwrócił %d z %d działek (limit count=%d). "
            "Podziel bbox na mniejsze części i uruchom skrypt wielokrotnie.",
            returned, matched, MAX_COUNT,
        )
    else:
        log.info("  Pobrano %d działek.", returned)

    obreby = sorted({
        f["properties"]["NUMER_OBREBU"]
        for f in features
        if f["properties"].get("NUMER_OBREBU")
    })
    log.info("  Obręby (%d): %s", len(obreby), obreby)
    return features, obreby


# ── Własność przez Oracle MapViewer info_request ──────────────────────────────

_INFO_TMPL = """\
<?xml version="1.0" standalone="yes"?>
<info_request datasource="dane_wawa" format="non-strict">
SELECT ID_EGIB_DZIALKI, OPIS_PODMIOTU FROM WLASNOSC_DZIALKI_MIASTO
WHERE RODZAJ_WLS_WLD='W\u0141A\u015aCICIEL'
AND OPIS_PODMIOTU IN ('{owner_miejska}', '{owner_skarbu}')
AND ({like_clause})
</info_request>"""

_COOWNED_TMPL = """\
<?xml version="1.0" standalone="yes"?>
<info_request datasource="dane_wawa" format="strict">
SELECT DISTINCT a.ID_EGIB_DZIALKI
FROM WLASNOSC_DZIALKI_MIASTO a
WHERE a.RODZAJ_WLS_WLD='W\u0141A\u015aCICIEL'
AND a.OPIS_PODMIOTU IN ('{owner_miejska}', '{owner_skarbu}')
AND EXISTS (
  SELECT 1 FROM WLASNOSC_DZIALKI_MIASTO b
  WHERE b.IDDZIALKI = a.IDDZIALKI
  AND b.RODZAJ_WLS_WLD='W\u0141A\u015aCICIEL'
  AND b.OPIS_PODMIOTU NOT IN ('{owner_miejska}', '{owner_skarbu}')
)
AND ({like_clause})
</info_request>"""


def _fetch_ownership_db(
    session: requests.Session, prefixes: list[str]
) -> dict[str, str]:
    """
    Wysyła info_request do Oracle MapViewer i zwraca słownik {ID_EGIB_DZIALKI: kategoria}.
    Kategoria to 'miejska' lub 'skarbu_panstwa'; pominięte ID traktujemy jako 'prywatna'.
    """
    like_clause = " OR ".join(
        f"ID_EGIB_DZIALKI LIKE '{p}.%'" for p in sorted(prefixes)
    )
    xml = _INFO_TMPL.format(
        owner_miejska=_OWNER_MIEJSKA,
        owner_skarbu=_OWNER_SKARBU_PANSTWA,
        like_clause=like_clause,
    )

    r = session.post(
        f"{OM_BASE}/mapviewer/omserver",
        data={"xml_request": xml},
        timeout=60,
    )
    r.raise_for_status()

    # Format non-strict: "COL1 COL2 ,\nVAL1 VAL2 ,\n..."
    # ID_EGIB_DZIALKI nie zawiera spacji; reszta linii to OPIS_PODMIOTU.
    result: dict[str, str] = {}
    lines = r.text.strip().splitlines()
    for line in lines[1:]:   # pomiń nagłówek
        line = line.strip()
        if not line:
            continue
        if line.endswith(" ,"):
            line = line[:-2]
        elif line.endswith(","):
            line = line[:-1]
        parts = line.split(" ", 1)
        if len(parts) < 2:
            continue
        fid, podmiot = parts[0].strip(), parts[1].strip()
        if podmiot == _OWNER_MIEJSKA:
            result[fid] = "miejska"
        elif podmiot == _OWNER_SKARBU_PANSTWA:
            result[fid] = "skarbu_panstwa"

    return result


def _fetch_coowned_parcels(
    session: requests.Session, prefixes: list[str]
) -> set[str]:
    """
    Zwraca zbiór ID_EGIB_DZIALKI dla działek będących we współwłasności
    publiczno-prywatnej (mają właściciela publicznego ORAZ innego).
    """
    like_clause = " OR ".join(
        f"a.ID_EGIB_DZIALKI LIKE '{p}.%'" for p in sorted(prefixes)
    )
    xml = _COOWNED_TMPL.format(
        owner_miejska=_OWNER_MIEJSKA,
        owner_skarbu=_OWNER_SKARBU_PANSTWA,
        like_clause=like_clause,
    )
    r = session.post(
        f"{OM_BASE}/mapviewer/omserver",
        data={"xml_request": xml},
        timeout=60,
    )
    r.raise_for_status()
    text = re.sub(r'&(?!(?:amp|lt|gt|apos|quot|#\d+|#x[\da-fA-F]+);)', '&amp;', r.text)
    root = ET.fromstring(text)
    if root.tag == "oms_error":
        log.warning("  Błąd zapytania współwłasności: %s", root.text)
        return set()
    return {
        el.text for row in root.findall("ROW")
        if (el := row.find("ID_EGIB_DZIALKI")) is not None and el.text
    }


def try_ownership(
    session: requests.Session,
    features: dict[str, dict],
) -> dict[str, dict]:
    """
    Klasyfikuje własność działek przez zapytanie SQL do bazy Oracle MapViewer.

    Zwraca słownik {ID_DZIALKI: {"grupaRejestrowa": ..., "wspolna": True?}}.
    Działki nieznalezione w bazie → 'prywatna'.
    """
    log.info("Krok 2 – klasyfikacja własności przez Oracle MapViewer info_request…")

    prefixes = sorted({fid.split(".")[0] for fid in features})
    log.info("  Prefiksy dzielnic: %s", prefixes)

    db_ownership = _fetch_ownership_db(session, prefixes)
    log.info("  Baza zwróciła %d wpisów publicznych dla prefiksów %s.", len(db_ownership), prefixes)

    coowned = _fetch_coowned_parcels(session, prefixes)
    log.info("  Współwłasność publiczno-prywatna: %d działek.", len(coowned))

    result: dict[str, dict] = {}
    for fid in features:
        entry: dict = {"grupaRejestrowa": db_ownership.get(fid, "prywatna")}
        if fid in coowned:
            entry["wspolna"] = True
        result[fid] = entry

    miejska  = sum(1 for v in result.values() if v["grupaRejestrowa"] == "miejska")
    skarbu   = sum(1 for v in result.values() if v["grupaRejestrowa"] == "skarbu_panstwa")
    prywatna = sum(1 for v in result.values() if v["grupaRejestrowa"] == "prywatna")
    wspolna  = sum(1 for v in result.values() if v.get("wspolna"))
    log.info(
        "  Sklasyfikowano %d działek: %d miejska, %d skarbu_panstwa, %d prywatna, %d współwłasność.",
        len(result), miejska, skarbu, prywatna, wspolna,
    )
    return result


# ── Parsowanie i zapis plików JS ──────────────────────────────────────────────

def _extract_js_object(text: str, var_name: str) -> str:
    """Wyodrębnia JSON-obiekt przypisany do zmiennej JS metodą liczenia nawiasów."""
    prefix = f"const {var_name} ="
    idx = text.find(prefix)
    if idx < 0:
        return ""
    try:
        start = text.index("{", idx + len(prefix))
    except ValueError:
        return ""

    depth, i = 0, start
    in_str, esc = False, False
    while i < len(text):
        c = text[i]
        if esc:
            esc = False
        elif c == "\\" and in_str:
            esc = True
        elif c == '"':
            in_str = not in_str
        elif not in_str:
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    return text[start:i + 1]
        i += 1
    return ""


def read_geojson_js(path: Path) -> dict:
    empty = {"type": "FeatureCollection", "name": "wlasnosc", "features": []}
    if not path.exists():
        return empty
    text = path.read_text("utf-8")
    json_str = _extract_js_object(text, "wlasnoscGeoJSON")
    if json_str:
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            log.warning("Nie udało się sparsować %s: %s", path.name, e)
    return empty


def read_data_js(path: Path) -> dict:
    if not path.exists():
        return {}
    text = path.read_text("utf-8")
    # Usuń komentarze JS
    no_comments = re.sub(r"//[^\n]*", "", text)
    json_str = _extract_js_object(no_comments, "wlasnoscData")
    if json_str:
        # Usuń trailing commas (dozwolone w JS, niedozwolone w JSON)
        clean = re.sub(r",(\s*[}\]])", r"\1", json_str)
        try:
            return json.loads(clean)
        except json.JSONDecodeError as e:
            log.warning("Nie udało się sparsować %s: %s", path.name, e)
    return {}


def _round_coords(coords, d: int = 7):
    if coords and isinstance(coords[0], (int, float)):
        return [round(c, d) for c in coords]
    return [_round_coords(c, d) for c in coords]


def write_geojson_js(path: Path, geojson: dict, dry_run: bool) -> None:
    feats = geojson["features"]
    lines = [
        "const wlasnoscGeoJSON = {",
        '  "type": "FeatureCollection",',
        '  "name": "wlasnosc",',
        '  "features": [',
    ]
    for i, f in enumerate(feats):
        comma = "," if i < len(feats) - 1 else ""
        lines.append("    " + json.dumps(f, ensure_ascii=False, separators=(",", ":")) + comma)
    lines += ["  ]", "}", "", "export { wlasnoscGeoJSON }"]
    content = "\n".join(lines)
    _emit(path, content, dry_run, f"{len(feats)} działek, {len(content) // 1024} KB")


_DATA_HEADER = """\
// Własność działek – dane uzupełniające
//
// Klucz: ID_DZIALKI z EGiB (np. "146505_8.0231.14/14")
// Wartości grupaRejestrowa:
//   "miejska"        – Gmina / m.st. Warszawa (grupy rejestrowe 4, 15)
//   "skarbu_panstwa" – Skarb Państwa / państwowa osoba prawna (grupy 3, 6)
//   "prywatna"       – Własność prywatna / inne
// Flaga wspolna: true – współwłasność publiczno-prywatna (podmiot publiczny + inna osoba)
//
// Źródło: WLASNOSC_DZIALKI_MIASTO (Oracle MapViewer, dane_wawa) – dane autorytatywne, nie edytować ręcznie.

const wlasnoscData = {"""


def write_data_js(path: Path, data: dict, dry_run: bool) -> None:
    entries = [
        f"  {json.dumps(k, ensure_ascii=False)}: "
        f"{json.dumps(v, ensure_ascii=False, separators=(',', ':'))},"
        for k, v in sorted(data.items())
    ]
    body = ("\n" + "\n".join(entries) + "\n") if entries else "\n"
    content = _DATA_HEADER + body + "}\n\nexport { wlasnoscData }\n"
    _emit(path, content, dry_run, f"{len(data)} wpisów")


def _emit(path: Path, content: str, dry_run: bool, note: str) -> None:
    if dry_run:
        log.info("[dry-run] %s: %s", path.name, note)
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        log.info("Zapisano %s (%s)", path, note)


# ── Główna logika ─────────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(
        description="Aktualizuje dane o własności działek dla mapy Pod Skocznią",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    ap.add_argument(
        "--bbox", default=DEFAULT_BBOX,
        metavar='"minLng,minLat,maxLng,maxLat"',
        help="Bounding box w EPSG:4326 (domyślnie: cały zasięg mapy)",
    )
    ap.add_argument("--geojson", default="/data/wlasnoscGeoJSON.js",
                    help="Ścieżka do wlasnoscGeoJSON.js")
    ap.add_argument("--data",    default="/data/wlasnoscData.js",
                    help="Ścieżka do wlasnoscData.js")
    ap.add_argument("--dry-run", action="store_true",
                    help="Tylko pokaż co zostałoby zrobione, nie zapisuj plików")
    args = ap.parse_args()

    try:
        minx, miny, maxx, maxy = map(float, args.bbox.split(","))
    except ValueError:
        log.error("Nieprawidłowy format bbox: %r  (oczekiwano: minLng,minLat,maxLng,maxLat)", args.bbox)
        sys.exit(1)

    geojson_path = Path(args.geojson)
    data_path    = Path(args.data)

    session = requests.Session()
    session.headers["User-Agent"] = "wlasnosc-updater/2.0 (mapaPodSkocznia)"

    # ── 1. Działki i obręby ────────────────────────────────────────────────────
    wfs_features, obreby = get_parcels_in_bbox(session, minx, miny, maxx, maxy)
    if not wfs_features:
        log.error("Nie pobrano żadnych działek. Sprawdź poprawność bbox.")
        sys.exit(1)

    new_by_id: dict[str, dict] = {
        f["properties"]["ID_DZIALKI"]: {
            "type": "Feature",
            "properties": {
                "fid":          f["properties"]["ID_DZIALKI"],
                "nr_dzialki":   f["properties"]["NUMER_DZIALKI"],
                "nr_obrebu":    f["properties"]["NUMER_OBREBU"],
                "nazwa_obrebu": f["properties"]["NAZWA_OBREBU"],
            },
            "geometry": {
                "type":        f["geometry"]["type"],
                "coordinates": _round_coords(f["geometry"]["coordinates"]),
            },
        }
        for f in wfs_features
    }

    # Scal z istniejącym GeoJSON – zachowaj działki spoza pobranego bbox
    existing_geojson = read_geojson_js(geojson_path)
    preserved = [
        feat for feat in existing_geojson["features"]
        if feat["properties"].get("fid") not in new_by_id
    ]
    merged = sorted(
        preserved + list(new_by_id.values()),
        key=lambda f: f["properties"]["fid"],
    )
    existing_geojson["features"] = merged
    log.info(
        "  GeoJSON: %d zaktualizowanych + %d zachowanych = %d łącznie",
        len(new_by_id), len(preserved), len(merged),
    )

    # ── 2. Własność ────────────────────────────────────────────────────────────
    ownership = try_ownership(session, new_by_id)

    existing_data = read_data_js(data_path)
    # Zachowaj wpisy spoza aktualnego bbox; nadpisz wszystko w zasięgu zapytania
    new_data = {fid: v for fid, v in existing_data.items() if fid not in ownership}
    new_data.update(ownership)
    log.info(
        "  wlasnoscData: %d w bbox (nadpisane) + %d poza bbox (zachowane) = %d łącznie",
        len(ownership), len(new_data) - len(ownership), len(new_data),
    )

    # ── 3. Zapis ───────────────────────────────────────────────────────────────
    write_geojson_js(geojson_path, existing_geojson, args.dry_run)
    write_data_js(data_path, new_data, args.dry_run)
    log.info("Gotowe.")


if __name__ == "__main__":
    main()

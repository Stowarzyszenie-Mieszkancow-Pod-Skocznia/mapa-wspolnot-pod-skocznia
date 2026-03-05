#!/usr/bin/env python3
"""
Aktualizuje wlasnoscGeoJSON.js i wlasnoscData.js na podstawie WFS EGIB m.st. Warszawy.

Kroki:
  1. Identyfikacja obrębów przecinających podany bounding box
  2. Pobranie wszystkich działek z tych obrębów (paginacja WFS)
  3. Klasyfikacja własności przez analizę kolorów kafelków Oracle MapViewer (WLASNOSC_MAPA)
  4. Scalenie z istniejącymi plikami – ręcznie wpisane wpisy NIE są nadpisywane

Użycie:
  python updater.py [--bbox "minLng,minLat,maxLng,maxLat"] [--dry-run]

Docker:
  docker build -t wlasnosc-updater .
  docker run --rm -v /ścieżka/do/layers/overlays/data:/data wlasnosc-updater
  docker run --rm -v /ścieżka/do/layers/overlays/data:/data wlasnosc-updater \\
      --bbox "21.025,52.175,21.045,52.190" --dry-run
"""

import argparse
import io
import json
import logging
import math
import re
import sys
from pathlib import Path

import requests
from PIL import Image

# ── Konfiguracja ─────────────────────────────────────────────────────────────

WFS_URL      = "https://wms2.um.warszawa.pl/geoserver/wfs/wfs"
OM_BASE      = "https://mapa.um.warszawa.pl"
DEFAULT_BBOX = "21.019,52.171,21.052,52.197"   # MAX_BOUNDS z mapConfig.js
# Serwer odrzuca startIndex > 0 (HTTP 400), ale obsługuje duże count.
# Używamy jednego żądania z dużym limitem zamiast paginacji.
MAX_COUNT    = 5000

# Kolory własności w serwisie Oracle MapViewer (WLASNOSC_MAPA) – próbkowanie PNG.
# Wartości RGB ustalone empirycznie przez renderowanie kafelka testowego.
_OWNERSHIP_COLORS: dict[tuple[int, int, int], str] = {
    (231, 229, 229): "prywatna",        # szary  – pozostałe / prywatna
    (247, 245, 161): "miejska",         # żółty  – Gmina m.st. Warszawa
    (255, 173, 173): "skarbu_panstwa",  # różowy – Skarb Państwa
}
_COLOR_TOL = 25     # maks. odległość euklidesowa RGB, żeby uznać dopasowanie
_TILE_DEG  = 0.010  # rozmiar kafelka w stopniach (≈ 1.1 km × 0.7 km)
_TILE_PX   = 512    # rozdzielczość kafelka w pikselach
_SAMPLE_R  = 2      # promień uśredniania koloru: kwadrat (2r+1)×(2r+1) = 5×5 px

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

    Krok 1 i 2 w jednym zapytaniu: najpierw identyfikujemy obręby,
    a następnie pobieramy pełną geometrię działek z podanego bbox.
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


# ── Własność przez analizę kolorów kafelków ───────────────────────────────────

_XMLI_TMPL = """\
<?xml version="1.0" standalone="yes"?>
<map_request version="1.0.0" datasource="dane_wawa" basemap=""
             antialiasing="false" width="{px}" height="{px}"
             bgcolor="#FFFFFF" format="PNG_STREAM">
  <center size="{deg}">
    <geoFeature>
      <geometricProperty typeName="center">
        <Point srsName="EPSG:4326"><coordinates>{cx},{cy}</coordinates></Point>
      </geometricProperty>
    </geoFeature>
  </center>
  <themes>
    <theme name="WLASNOSC_MAPA"/>
  </themes>
</map_request>"""


def _tile_center(coord: float) -> float:
    """Zwraca środek kafelka _TILE_DEG, do którego należy dana współrzędna."""
    return (math.floor(coord / _TILE_DEG) + 0.5) * _TILE_DEG


def _centroid(feature: dict) -> tuple[float, float]:
    """Zwraca przybliżony centroid wielokąta (lng, lat)."""
    geom = feature["geometry"]
    coords = geom["coordinates"]
    if geom["type"] == "Polygon":
        ring = coords[0]
    elif geom["type"] == "MultiPolygon":
        ring = coords[0][0]
    else:
        ring = coords
    lngs = [c[0] for c in ring]
    lats = [c[1] for c in ring]
    return sum(lngs) / len(lngs), sum(lats) / len(lats)


def _render_tile(session: requests.Session, cx: float, cy: float) -> Image.Image | None:
    """
    Renderuje kafelek WLASNOSC_MAPA przez Oracle MapViewer XMLI.
    Zwraca obiekt PIL.Image lub None przy błędzie.
    """
    xml = _XMLI_TMPL.format(px=_TILE_PX, deg=_TILE_DEG, cx=cx, cy=cy)
    try:
        r = session.post(
            f"{OM_BASE}/mapviewer/omserver",
            data={"xml_request": xml},
            timeout=30,
        )
        if r.status_code != 200 or not r.content.startswith(b"\x89PNG"):
            log.debug("  Kafelek (%.4f,%.4f): HTTP %d, treść=%r…",
                      cx, cy, r.status_code, r.content[:40])
            return None
        return Image.open(io.BytesIO(r.content)).convert("RGB")
    except Exception as exc:
        log.debug("  Kafelek (%.4f,%.4f): wyjątek %s", cx, cy, exc)
        return None


def _sample(img: Image.Image, px: int, py: int) -> tuple[int, int, int]:
    """Uśrednia kolor w kwadracie (2·r+1)×(2·r+1) wokół piksela (px, py)."""
    w, h = img.size
    rs = gs = bs = n = 0
    for dy in range(-_SAMPLE_R, _SAMPLE_R + 1):
        for dx in range(-_SAMPLE_R, _SAMPLE_R + 1):
            x, y = px + dx, py + dy
            if 0 <= x < w and 0 <= y < h:
                r, g, b = img.getpixel((x, y))
                rs += r; gs += g; bs += b; n += 1
    return (rs // n, gs // n, bs // n) if n else img.getpixel((px, py))


def _classify(r: int, g: int, b: int) -> str | None:
    """Klasyfikuje kolor piksela na kategorię własności lub None przy braku dopasowania."""
    best, best_d = None, _COLOR_TOL
    for (cr, cg, cb), cat in _OWNERSHIP_COLORS.items():
        d = ((r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2) ** 0.5
        if d < best_d:
            best_d, best = d, cat
    return best


def try_ownership(
    session: requests.Session,
    minx: float, miny: float, maxx: float, maxy: float,
    features: dict[str, dict],
) -> dict[str, str]:
    """
    Klasyfikuje własność działek na podstawie kolorów kafelków WLASNOSC_MAPA
    renderowanych przez Oracle MapViewer XMLI.

    Zwraca słownik {ID_DZIALKI: grupaRejestrowa}.
    """
    log.info("Krok 2 – klasyfikacja własności przez analizę kafelków Oracle MapViewer…")

    # Inicjuj sesję z portalem (wymagane ciasteczko sesji do renderowania)
    try:
        session.get(f"{OM_BASE}/mapaApp1/mapa?service=mapa_wlasnosci", timeout=15)
        log.info("  Sesja z portalem nawiązana.")
    except requests.RequestException as e:
        log.warning("  Nie udało się nawiązać sesji z portalem: %s", e)

    # Wyznacz zbiór centroid kafelków pokrywających wszystkie działki w bbox
    tile_centers: set[tuple[float, float]] = set()
    for feat in features.values():
        lng, lat = _centroid(feat)
        tile_centers.add((_tile_center(lng), _tile_center(lat)))

    log.info("  %d kafelków do wyrenderowania dla %d działek.",
             len(tile_centers), len(features))

    # Renderuj kafelki i cache'uj obrazy
    tile_images: dict[tuple[float, float], Image.Image | None] = {}
    for i, (tcx, tcy) in enumerate(sorted(tile_centers), 1):
        img = _render_tile(session, tcx, tcy)
        tile_images[(tcx, tcy)] = img
        log.info("  Kafelek %d/%d (%.4f,%.4f): %s",
                 i, len(tile_centers), tcx, tcy, "OK" if img else "BŁĄD")

    # Klasyfikuj każdą działkę przez próbkowanie piksela w centroidzie
    result: dict[str, str] = {}
    half = _TILE_DEG / 2
    for fid, feat in features.items():
        lng, lat = _centroid(feat)
        tcx, tcy = _tile_center(lng), _tile_center(lat)
        img = tile_images.get((tcx, tcy))
        if img is None:
            continue
        # Przelicz współrzędne geograficzne na pikselowe w układzie kafelka
        px = int((lng - (tcx - half)) / _TILE_DEG * _TILE_PX)
        py = int(((tcy + half) - lat) / _TILE_DEG * _TILE_PX)
        r, g, b = _sample(img, px, py)
        cat = _classify(r, g, b)
        if cat:
            result[fid] = cat

    classified = len(result)
    total = len(features)
    log.info("  Sklasyfikowano %d / %d działek (%.0f%%).",
             classified, total, 100 * classified / total if total else 0)
    if classified < total * 0.5:
        log.warning(
            "  Mniej niż 50%% działek sklasyfikowanych.\n"
            "  Uzupełnij brakujące wpisy ręcznie korzystając z:\n"
            "  https://mapa.um.warszawa.pl/mapaApp1/mapa?service=mapa_wlasnosci"
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
//
// Źródło: https://mapa.um.warszawa.pl/mapaApp1/mapa?service=mapa_wlasnosci
// Jak uzupełnić: odszukaj działkę na powyższej mapie, sprawdź kolor i wpisz tutaj.

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
    session.headers["User-Agent"] = "wlasnosc-updater/1.0 (mapaPodSkocznia)"

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
    ownership = try_ownership(session, minx, miny, maxx, maxy, new_by_id)

    existing_data = read_data_js(data_path)
    new_data      = dict(existing_data)   # zacznij od istniejących danych
    auto_added    = 0
    for fid, grupa in ownership.items():
        if fid not in existing_data:        # nigdy nie nadpisuj ręcznych wpisów
            new_data[fid] = {"grupaRejestrowa": grupa}
            auto_added += 1
    log.info(
        "  wlasnoscData: %d auto + %d ręcznych = %d łącznie",
        auto_added, len(existing_data), len(new_data),
    )

    # ── 3. Zapis ───────────────────────────────────────────────────────────────
    write_geojson_js(geojson_path, existing_geojson, args.dry_run)
    write_data_js(data_path, new_data, args.dry_run)
    log.info("Gotowe.")


if __name__ == "__main__":
    main()

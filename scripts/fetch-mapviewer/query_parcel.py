#!/usr/bin/env python3
"""
Odpytuje bazę Oracle MapViewer (dane_wawa) o szczegóły działki.

Użycie:
  python query_parcel.py 146505_8.0237.3
  python query_parcel.py 146505_8.0237.3 --table WLASNOSC_DZIALKI_MIASTO
  python query_parcel.py --sql "SELECT * FROM FOO WHERE BAR = 'baz'"
"""

import argparse
import io
import re
import sys
import xml.etree.ElementTree as ET

import requests

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

OM_BASE = "https://mapa.um.warszawa.pl"

TABLES = {
    "wlasnosc": "WLASNOSC_DZIALKI_MIASTO",
}

DEFAULT_QUERIES = [
    ("WLASNOSC_DZIALKI_MIASTO", "SELECT * FROM WLASNOSC_DZIALKI_MIASTO WHERE ID_EGIB_DZIALKI = '{parcel}'"),
]


def info_request(session: requests.Session, sql: str) -> tuple[list[dict], str | None]:
    xml_req = f"""<?xml version="1.0" standalone="yes"?>
<info_request datasource="dane_wawa" format="strict">
{sql}
</info_request>"""
    r = session.post(f"{OM_BASE}/mapviewer/omserver",
                     data={"xml_request": xml_req.encode("utf-8")}, timeout=60)
    r.raise_for_status()
    text = re.sub(r'&(?!(?:amp|lt|gt|apos|quot|#\d+|#x[\da-fA-F]+);)', '&amp;', r.text)
    root = ET.fromstring(text)
    if root.tag == "oms_error":
        return [], root.text.strip() if root.text else "nieznany błąd"
    return [{el.tag: el.text for el in row} for row in root.findall("ROW")], None


def print_rows(rows: list[dict], title: str) -> None:
    print(f"\n{'='*60}")
    print(f"  {title}  ({len(rows)} {'wiersz' if len(rows)==1 else 'wierszy'})")
    print('='*60)
    if not rows:
        print("  (brak wyników)")
        return
    for i, row in enumerate(rows):
        if i > 0:
            print("  ---")
        for key, val in row.items():
            if val and val.strip() not in ("null", ""):
                print(f"  {key:<30} {val}")


def main():
    ap = argparse.ArgumentParser(description="Odpytuje bazę Oracle MapViewer o szczegóły działki")
    ap.add_argument("parcel", nargs="?", help="ID działki, np. 146505_8.0237.3")
    ap.add_argument("--table", help="Zapytaj konkretną tabelę (domyślnie: wszystkie znane)")
    ap.add_argument("--sql", help="Dowolne zapytanie SQL (nadpisuje --table i parcel)")
    args = ap.parse_args()

    if not args.sql and not args.parcel:
        ap.error("podaj ID działki lub --sql")

    session = requests.Session()
    session.headers["User-Agent"] = "query-parcel/1.0 (mapaPodSkocznia)"

    if args.sql:
        rows, err = info_request(session, args.sql)
        if err:
            print(f"BŁĄD: {err}", file=sys.stderr)
            sys.exit(1)
        print_rows(rows, "Wynik")
        return

    queries = DEFAULT_QUERIES
    if args.table:
        queries = [(args.table, f"SELECT * FROM {args.table} WHERE ID_EGIB_DZIALKI = '{{parcel}}'")]

    found_any = False
    for table_name, sql_tmpl in queries:
        sql = sql_tmpl.format(parcel=args.parcel)
        rows, err = info_request(session, sql)
        if err:
            print(f"  [{table_name}] BŁĄD: {err[:120]}", file=sys.stderr)
            continue
        if rows:
            found_any = True
        print_rows(rows, table_name)

    if not found_any:
        print(f"\nNie znaleziono danych dla działki: {args.parcel}")


if __name__ == "__main__":
    main()

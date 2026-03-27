# Oracle MapViewer `dane_wawa` — wyniki eksploracji

## Metoda dostępu

POST do `https://mapa.um.warszawa.pl/mapviewer/omserver` z parametrem `xml_request`.

### Listowanie tematów
```xml
<non_map_request>
  <list_predefined_themes data_source="dane_wawa"/>
</non_map_request>
```
Łącznie ~2700 tematów w datasource `dane_wawa`.

### Zapytanie SQL (info_request)
```xml
<info_request datasource="dane_wawa" format="strict">
SELECT ...
</info_request>
```
- `format="strict"` → XML ROWSET/ROW
- `format="non-strict"` → CSV z separatorem spacji i ` ,` na końcu linii
- Brak autoryzacji (ciasteczka) — endpoint jest otwarty
- Kolumny SDO_GEOMETRY i BLOB są wykluczone z SELECT
- Koordynaty punktów: `SHAPE.SDO_POINT.X`, `SHAPE.SDO_POINT.Y`
- Koordynaty centroidu poligonów: `SDO_GEOM.SDO_CENTROID(SHAPE,0.005).SDO_POINT.X/Y`
- Filtrowanie przestrzenne: `SDO_FILTER(SHAPE, SDO_GEOMETRY(2003,4326,NULL,
  SDO_ELEM_INFO_ARRAY(1,1003,3), SDO_ORDINATE_ARRAY(minLng,minLat,maxLng,maxLat)),
  'querytype=WINDOW')='TRUE'`

---

## Własność działek (WGLAD: 2026-03-27)

**Tabela:** `WLASNOSC_DZIALKI_MIASTO`
**Klucz:** `ID_EGIB_DZIALKI` (VARCHAR2) = format WFS: `146505_8.0237.9/1`
**Filtr:** `RODZAJ_WLS_WLD='WŁAŚCICIEL'`
**Klasyfikacja:**
- `OPIS_PODMIOTU = 'MIASTO STOŁECZNE WARSZAWA'` → `miejska`
- `OPIS_PODMIOTU = 'SKARB PAŃSTWA'` → `skarbu_panstwa`
- brak wpisu → `prywatna`

Wyniki dla bbox mapy (21.019,52.171–21.052,52.197):
- 2286 miejska, 49 skarbu_panstwa, 2078 prywatna (łącznie 4413)

Implementacja: `scripts/update-wlasnosc/updater.py` (jeden SQL, ~3 sekundy).

---

## Inwentarz drzew (WGLĄD: 2026-03-27)

**Tabela:** `BOS_ZIELEN_DRZEWA`
**Geometria:** punkt (SDO_POINT)
**Liczba drzew w bbox:** 15 370

**Kolumny:**
| Kolumna | Typ | Opis |
|---------|-----|------|
| `NUMER_INW` | VARCHAR2 | ID inwentaryzacyjny (np. `D990270`) |
| `DZIELNICA` | VARCHAR2 | Dzielnica |
| `LOKALIZACJA` | VARCHAR2 | Adres/lokalizacja |
| `GATUNEK_NAZWA_POLSKA` | VARCHAR2 | Gatunek po polsku |
| `GATUNEK_NAZWA_LACINSKA` | VARCHAR2 | Gatunek po łacinie |
| `WYSOKOSC` | NUMBER | Wysokość (m) |
| `PNIE_OBWODY_W_CM` | VARCHAR2 | Obwody pni (cm), może być lista |
| `SREDNICA_KORONY` | NUMBER | Średnica korony (m) |
| `STAN_ZDROWOTNY` | VARCHAR2 | dobry/średni/zły/obumarły lub 1–5 |
| `OCENA` | VARCHAR2 | Ocena (A/B/C/D itp.) |
| `WETERAN` | VARCHAR2 | Drzewo weteran |
| `BUDKA` | VARCHAR2 | Budka lęgowa |
| `DZIUPLA` | VARCHAR2 | Dziupla |
| `GNIAZDO` | VARCHAR2 | Gniazdo |
| `OSTANIEC` | VARCHAR2 | Ostaniec |
| `WIAZANIE` | VARCHAR2 | Wiązanie koron |
| `EKSPERTYZA` | VARCHAR2 | Wymaga ekspertyzy |
| `MILION_DRZEW` | NUMBER | Program Milion Drzew |
| `MLODE` | NUMBER | Młode drzewo |
| `DEC_WYCINKA` | VARCHAR2 | Decyzja o wycince |
| `JEDNOSTKA_ZARZADZAJACA` | VARCHAR2 | Zarządca |
| `DATA_OBOWIAZYWANIA_DANYCH` | DATE | Data ważności danych |

**Stan zdrowotny:** dobry (1793), 1 (1496), 2 (1456), 3 (821), średni (695),
4 (181), zły (128), 5 (68), obumarły (8); ~7845 bez danych.

**Najczęstsze gatunki:** lipa drobnolistna (731), klon pospolity (660),
klon jesionolistny (617), jesion wyniosły (449), lipa szerokolistna (402),
klon jawor (388).

**Tabele powiązane:** `BOS_ZIELEN_DRZEWA_NEW`, `BOS_ZIELEN_DRZEWA_UMIAR_RYZ`,
`BOS_ZIELEN_ZASIEG_KORON` (zasięg koron), `BOS_ZIELEN_POMNIKI` (pomniki przyrody).

---

## Decyzje o warunkach zabudowy (WGLĄD: 2026-03-27)

**Tabela:** `DECYZJE_WZ_POW` (poligony)
**Geometria:** polygon (SDO_GEOMETRY), plus CLOB `GEOMETRY_JSON_WGS` (GeoJSON WGS84)
**Liczba decyzji w bbox:** 94 (2008–2022), z czego 88 WZ + 6 LICP

**Kolumny:**
| Kolumna | Typ | Opis |
|---------|-----|------|
| `ID_WZ` | NUMBER | ID decyzji |
| `DEC_WZ` | VARCHAR2 | Numer decyzji |
| `NR_DEC` | VARCHAR2 | Numer decyzji (alternatywny format) |
| `DATA_WZ` | VARCHAR2 | Data wydania |
| `RODZAJ_SPRAWY` | VARCHAR2 | WZ lub LICP |
| `NAZWA_INW` | VARCHAR2 | Nazwa inwestycji |
| `OPIS_RODZ_` | VARCHAR2 | Typ (Nowa/Modernizacja) |
| `NAZWA_UL` | VARCHAR2 | Ulica |
| `NR_P` | VARCHAR2 | Numer posesji |
| `NAZWA_WN` | VARCHAR2 | Inwestor |
| `POW_TER` | NUMBER | Powierzchnia terenu (m²) |
| `POW_ZAB` | NUMBER | Powierzchnia zabudowy (m²) |
| `KOND` | NUMBER | Liczba kondygnacji |
| `WYSOKOSC` | NUMBER | Wysokość (m) |
| `LICZBA_MIE` | NUMBER | Liczba mieszkań |
| `LICZBA_PAR` | NUMBER | Liczba miejsc parkingowych |
| `UWAGI_WZ` | VARCHAR2 | Uwagi |
| `GEOMETRY_JSON_WGS` | CLOB | Geometria jako GeoJSON WGS84 |

**Pobieranie geometrii:** CLOB nie można zwrócić przez info_request bezpośrednio.
Opcje: `DBMS_LOB.SUBSTR(GEOMETRY_JSON_WGS, 3500, 1)` lub centroid przez
`SDO_GEOM.SDO_CENTROID(SHAPE,0.005).SDO_POINT.X/Y`.

---

## Inne interesujące tematy

- `BOS_ZIELEN_POMNIKI` — pomniki przyrody
- `BOS_ZIELEN_ZASIEG_KORON` / `ZASIEGI_KORON_DRZEW` — zasięgi koron
- `BOS_ZIELEN_NASADZENIE_*` — nasadzenia zastępcze
- `BOS_ZIELEN_WYCINKA_ALL` — wycinka
- `BUDYNKI_*` — budynki wg epoki (przed 1800, 1800–1849, …, po 1999)
- `ZABYTKI_OBIEKTY`, `ZABYTKI_OBSZARY` — rejestr zabytków
- `ADAPTCITY_*` — dane klimatyczne (temperatura, opady, NDVI, nieprzepuszczalność)
- `I_MILION_DRZEW_*` — program Milion Drzew wg roku
- `GESTOSC_ZALUDNIENIA_DZIEL_*` — gęstość zaludnienia wg dzielnicy

W# Oracle MapViewer `dane_wawa` — wyniki eksploracji

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

**Znane wartości `RODZAJ_WLS_WLD`:**
- `'WŁAŚCICIEL'` — właściciel nieruchomości
- `'GOSP. ZASOBEM NIERUCH.'` — zarządca zasobu nieruchomości (np. Prezydent Miasta Stołecznego Warszawy zarządzający gruntami Skarbu Państwa) — **nie jest właścicielem**, nie należy go klasyfikować jako współwłaściciela

**Klasyfikacja:**
- `OPIS_PODMIOTU = 'MIASTO STOŁECZNE WARSZAWA'` → `miejska`
- `OPIS_PODMIOTU = 'SKARB PAŃSTWA'` → `skarbu_panstwa`
- brak wpisu → `prywatna`

Wyniki dla aktualnego bbox mapy (21.0214,52.1742–21.0474,52.1922):
- 1360 miejska, 21 skarbu_panstwa, 1447 prywatna, 243 współwłasność (łącznie 2828)

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

## Budynki (WGLĄD: 2026-03-27)

**Tabela:** `BUDYNKI`
**Geometria:** polygon (SDO_GEOMETRY; punkt centroidu przez `SDO_CS.TRANSFORM(SHAPE,4326).SDO_POINT.X/Y`)
**Liczba budynków w bbox:** 1663

**Kolumny:**
| Kolumna | Opis |
|---------|------|
| `ID_EGIB_BUDYNKU` | Identyfikator EGiB (`146505_8.0529.1094_BUD`) |
| `FUN_UZYT_BUD` | Kategoria funkcji (np. `budynki mieszkalne`) |
| `FUNKCJA_GLOWNA` | Szczegółowa funkcja główna |
| `INNE_FUNKCJE` | Pozostałe funkcje |
| `ROK_BUDOWY` | Rok budowy (często NULL) |
| `POW_ZABUD` | Powierzchnia zabudowy (m²) |
| `POW_UZYT_BUD_Z_OBMIAROW` | Powierzchnia użytkowa z obmiarów (m²) |
| `LBA_KOND_NADZ` | Liczba kondygnacji nadziemnych |
| `LBA_KOND_PODZ` | Liczba kondygnacji podziemnych |
| `MAT_SCIAN_BUD` | Materiał ścian |
| `RODZAJ_BUD_WG_PKOB` | Rodzaj budynku wg PKOB |
| `STATUS_BUD` | Status (`1 - wybudowany`, itp.) |

**Powiązanie z adresem:** tabela `EGIB_BUDYNKI_ADRESY` (klucz `BUDYNEK_ID` numeryczny)
z kolumnami `ADRES`, `ULICA_ID`, `NAZWA`, `NUMER_PORZADKOWY`.

---

## Pozwolenia na budowę (WGLĄD: 2026-03-27)

**Tabela:** `POZWOLENIA_BUD_POW`
**Geometria:** polygon (SDO_GEOMETRY) + CLOB `GEOMETRY_JSON_WGS` (GeoJSON WGS84)
**Liczba pozwoleń w bbox:** 103

**Kolumny:**
| Kolumna | Opis |
|---------|------|
| `ID_PB` | ID pozwolenia |
| `DEC_PB` | Numer decyzji |
| `DEC_WZ` | Powiązana decyzja WZ |
| `DATA_PB` | Data wydania (VARCHAR2, format `YYYY-MM-DD HH:MI:SS`) |
| `TYP_INW` | Typ inwestycji |
| `NAZWA_INW` | Nazwa inwestycji |
| `OPIS_RODZ_` | Rodzaj (Nowa / Modernizacja) |
| `NAZWA_UL` | Ulica |
| `NR_P` | Numer posesji |
| `NAZWA_WN` | Inwestor |
| `POW_TER` | Powierzchnia terenu (m²) |
| `POW_ZAB` | Powierzchnia zabudowy (m²) |
| `KOND` | Kondygnacje |
| `WYSOKOSC` | Wysokość (m) |
| `LICZBA_MIE` | Mieszkania |
| `LICZBA_PAR` | Parkingi |
| `GEOMETRY_JSON_WGS` | Geometria GeoJSON WGS84 (CLOB, `DBMS_LOB.SUBSTR(...,3500,1)`) |

**Uwaga:** `DATA_PB` to VARCHAR2, nie DATE — nie używać `TO_CHAR`. Analogiczna struktura do `DECYZJE_WZ_POW`.

---

## Pomniki przyrody (WGLĄD: 2026-03-27)

**Tabela:** `BOS_ZIELEN_POMNIKI_PRZYRODY`
**Geometria:** punkt
**Liczba w bbox:** 7

**Kolumny:**
| Kolumna | Opis |
|---------|------|
| `NR_REJ_WOJ` | Numer rejestru wojewódzkiego |
| `NAZWA_PL` | Nazwa polska (gatunek lub opis) |
| `NAZWA_LAC` | Nazwa łacińska |
| `OBWOD` | Obwód (cm) |
| `WYSOKOSC` | Wysokość (m) |
| `DZIELNICA` | Dzielnica |
| `DZIALKA` | Numer działki (lokalny, bez prefiksu EGiB) |
| `OBIEKT` | Obiekt/lokalizacja |
| `PODSTAWAPR` | Podstawa prawna |

Przykłady w bbox: wiąz polny (289 cm obwód, 25 m), lipa drobnolistna (331 cm, 25 m),
dąb szypułkowy (297 cm, 24 m), buk pospolity (335 cm, 21 m), gnejs (kamień).

---

## Współwłasność działek — tabela uzupełniająca

**Tabela:** `WLASNOSC_DZIALKI_INNY_PODMIOT`
**Klucz:** `ID_EGIB_DZIALKI`

Używana do pobierania konkretnych nazw współwłaścicieli zamiast ogólnego „OSOBA FIZYCZNA".
**Uwaga:** Nie filtrować po `MOJ_PODMIOT` w SQL — polskie znaki powodują 0 wyników przez błąd kodowania.
Filtrować `OBCY_PODMIOT` w Pythonie: pominąć wpisy, gdzie `OBCY_PODMIOT` jest tym samym podmiotem
co główny właściciel działki (np. `SKARB PAŃSTWA` jako współwłaściciel działki SP — redundantne).

| Kolumna | Opis |
|---------|------|
| `MOJ_PODMIOT` | Podmiot publiczny (np. `MIASTO STOŁECZNE WARSZAWA`) |
| `MOJ_RODZAJ` | Rola publiczna (WŁAŚCICIEL / UŻYTKOWNIK) |
| `OBCY_PODMIOT` | Inny podmiot (np. `MOSTOSTAL-EXPORT DEVELOPMENT SP. A.`) |
| `OBCY_RODZAJ` | Rola innego podmiotu |

---

## Adresy budynków i działek

- **`EMUIA_PUNKTY_ADRESOWE`** — oficjalny rejestr EMUiA: `NAZWA_ULICY`, `NUMER_PORZADKOWY`,
  `KOD_POCZTOWY`, `ID_IIP`. Geometria: punkt.
- **`PUNKTY_ADRESOWE`** — uproszczone: `ULICA`, `NUMER`, `DZIELNICA`.
- **`EGIB_BUDYNKI_ADRESY`** — łączy `BUDYNEK_ID` (numeryczny) z adresem.
- **`EGIB_DZIALKI_ADRESY`** — łączy `DZIALKA_ID` (numeryczny) z ulicą i numerem porządkowym.

---

## Schemat bazy MAPA — rozmiar

`SELECT table_name FROM ALL_TABLES WHERE OWNER='MAPA'` zwraca **2540 tabel**.

Niedziałające przez `info_request` (MAPVIEWER-00083): zapytania z `<` lub `>` w SQL
(np. `ROWNUM <= 5`) — XML traktuje `<` jako znacznik. Używać `ROWNUM = 1` lub `FETCH FIRST N ROWS ONLY`.

---

## MPZP — przeznaczenie terenu (WGLĄD: 2026-03-27)

### Źródła danych

| Źródło | Typ | Opis |
|--------|-----|------|
| `wms.um.warszawa.pl/serwis` (MPZP_PRZEZNACZENIE_TERENU) | WMS raster | Już w projekcie (`umWarszawaOverlays`). Tylko kafelki — brak geometrii wektorowej. |
| `wfs.um.warszawa.pl/serwis` | WFS | Tylko zakresy planów (`PLANY_ZAKRESY_OBOWIAZUJACE`, `PLANY_ZAKRESY_SPORZADZANE`) — brak stref przeznaczenia. |
| Oracle MapViewer `PLANY_PRZEZNACZENIE_TERENU_MV` | SQL | Ma `FUN_SYMB`, `FUN_NAZWA`, `GEOMETRY` (SDO_GEOMETRY) — **brak `GEOMETRY_JSON_WGS`**, nie można pobrać poligonów GeoJSON przez `info_request`. |
| **REST API `PrzeznaczenieTerenow`** | **REST → GeoJSON** | **Najlepsza opcja.** Zwraca pełne poligony WGS84 jako GeoJSON. |

### REST API PrzeznaczenieTerenow

**Base URL:** `https://mapa.um.warszawa.pl/WebServices/PrzeznaczenieTerenow/wgs84/`

**Endpointy:**
- `findByPlanName/{nazwa_planu}` — wszystkie strefy dla planu (FeatureCollection)
- `findByCoordinates/{lon}/{lat}` — strefa dla punktu (Feature)
- `findByFunSymb/{fun_symb}`, `findByFunName/{fun_nazwa}`, `findByHilucs/{hilucs}`

Brak autoryzacji, brak paginacji — jeden request na plan.

**Pola w odpowiedzi:**

| Pole | Opis |
|------|------|
| `objectid` | ID rekordu |
| `fun_symb` | Symbol strefy (np. `K28 MNI`, `25 KDD`) — numer + kod |
| `fun_nazwa` | Nazwa funkcji (np. "zabudowa jednorodzinna intensywna") |
| `inten_zab` | Intensywność zabudowy |
| `max_wys` | Maks. wysokość (m) |
| `licz_kond` | Liczba kondygnacji |
| `pow_bio` | Pow. biologicznie czynna (%) |
| `hilucs` | Kod HILUCS |
| `nazwa_plan` | Nazwa planu |

### Plany obowiązujące w bbox mapy

Z tabeli `PLANY_ZAKRESY_OBOWIAZUJACE` (bbox 21.0214–21.0474, 52.1742–52.1922):

| NAZWA_KR | NR_UCHW | DATA_WEJSC | POW_HA |
|----------|---------|------------|--------|
| rejonu pod Skocznią cz. I | XLII/1299/2008 | 2009-01-05 | 207.2 |
| Stegny | XXXIV/1020/2008 | 2008-08-01 | 100.7 |
| Sadyba Pn. cz. I | LXVIII/1817/2013 | 2013-12-27 | 89.7 |
| Służew nad Dolinką cz. I | VII/130/2024 | 2024-08-23 | 64.2 |
| rej. ul. Patkowskiego | XXIX/1068/2025 | 2025-01-08 | 65.8 |
| rej. tzw. Dworca Pd. | LXXVII/2422/2006 | 2006-08-28 | 55.1 |
| Park Dolina Służewska | XI/315/2007 | 2007-08-16 | 46.3 |
| Ksawerów | XCIV/2818/2010 | 2011-01-13 | 42.0 |
| rej. skrzyż. ul. Sikorskiego-Sobieskiego | XCIV/2807/2010 | 2011-01-12 | 41.4 |
| ok. ul. Krasickiego i ul. Malczewskiego | XXIII/882/2025 | 2025-08-07 | 37.6 |
| Wierzbno w rej. ul. Krasickiego | XCIII/2382/2014 | 2015-01-05 | 24.2 |
| Sielce-Beethovena | XCIV/2412/2014 | 2015-01-15 | 16.6 |
| rej. ul. Merliniego cz. I | XCIII/2735/2010 | 2011-01-12 | 11.7 |
| Św. Katarzyna cz. II | LXXI/2320/2022 | 2022-11-25 | 7.9 |

Fetch script pobiera nazwy z `PLANY_ZAKRESY_OBOWIAZUJACE` przez Oracle MapViewer,
następnie woła `findByPlanName` dla każdej nazwy przez REST API.

---

## Inne interesujące tematy

- `BOS_ZIELEN_ZASIEG_KORON` / `ZASIEGI_KORON_DRZEW` — zasięgi koron drzew (poligony)
- `BOS_ZIELEN_KRZEWY` — krzewy (ten sam schemat co drzewa)
- `BOS_ZIELEN_TRAWNIKI` — trawniki (NUMER_INW, STAN_ZACHOWANIA, SHAPE)
- `ZABYTKI_OBIEKTY`, `ZABYTKI_OBSZARY` — rejestr zabytków
- `ADAPTCITY_*` / `AC_*` — dane klimatyczne (temperatura, opady, NDVI, nieprzepuszczalność)
- `I_MILION_DRZEW_*` — program Milion Drzew wg roku
- `GESTOSC_ZALUDNIENIA_DZIEL_*` — gęstość zaludnienia wg dzielnicy
- `STUDIUM_STR_UZYTKOWANIE_2020_01` — przeznaczenie terenu wg Studium (SRID nieznany, zapytanie nie działa)
- `REJESTR_DECYZJI` — decyzje podziałów nieruchomości (OBREB, NR_DECYZJI, DATA_WYDANIA)

# Mapa Wspólnot Pod Skocznią

Interaktywna mapa okolicy Pod Skocznią w Warszawie, stworzona przez [Stowarzyszenie Mieszkańców Pod Skocznią](https://podskocznia.pl). Wizualizuje dane o gruntach, zabudowie, zieleni i planowaniu przestrzennym w rejonie między ul. Puławską, Dolinką Służewiecką i lotniskiem Chopina.

## Uruchomienie lokalne

Brak systemu budowania. Czyste moduły ES ładowane bezpośrednio przez przeglądarkę — wymagany lokalny serwer HTTP (ze względu na `import`):

```bash
python -m http.server 8080
# lub
npx serve .
```

Następnie otwórz `http://localhost:8080` w przeglądarce.

## Warstwy

### Warstwy bazowe
| Warstwa | Źródło |
|---------|--------|
| OpenStreetMap | OSM tile |
| CyclOSM | CyclOSM tile |
| Ortofotomapa | Geoportal WMS |

### Nakładki lokalne (GeoJSON)
| Warstwa | Opis | Źródło danych |
|---------|------|--------------|
| Wspólnoty | Granice wspólnot mieszkaniowych z etykietami | Dane własne |
| Inwestycje deweloperskie | Tereny inwestycji | Dane własne |
| Zieleń | Tereny zieleni | Dane własne |
| Własność gruntów | Klasyfikacja własności działek (miejska / Skarbu Państwa / prywatna / współwłasność) | WFS EGIB + Oracle MapViewer |
| Drzewa | Inwentarz drzew z oceną stanu zdrowotnego; pomniki przyrody wyróżnione | Oracle MapViewer (`BOS_ZIELEN_DRZEWA`, `BOS_ZIELEN_POMNIKI_PRZYRODY`) |
| Warunki zabudowy | Decyzje WZ | Oracle MapViewer (`DECYZJE_WZ_POW`) |
| Pozwolenia na budowę | Pozwolenia budowlane z typem inwestycji | Oracle MapViewer (`POZWOLENIA_BUD_POW`) |
| MPZP – przeznaczenie terenu | Strefy przeznaczenia wg miejscowych planów zagospodarowania (12 planów) | REST API PrzeznaczenieTerenow |

### Nakładki WMS/WFS
| Warstwa | Źródło |
|---------|--------|
| Budynki, Działki, Numery działek | GUGiK KIEG |
| Sieci uzbrojenia terenu | GUGiK KIUT |
| MPZP (raster) | UM Warszawa WMS |

## Aktualizacja danych

Wszystkie skrypty wymagają tylko `requests` (`pip install requests`).

### Własność gruntów

```bash
py scripts/update-wlasnosc/updater.py \
    --geojson layers/overlays/data/wlasnoscGeoJSON.js \
    --data    layers/overlays/data/wlasnoscData.js
```

Pobiera działki z WFS EGIB, klasyfikuje własność przez Oracle MapViewer (`WLASNOSC_DZIALKI_MIASTO`) i wykrywa współwłasność przez `WLASNOSC_DZIALKI_INNY_PODMIOT`.

### Inwentarz drzew

```bash
py scripts/fetch-mapviewer/fetch_drzewa.py
```

Pobiera ~9 600 drzew z `BOS_ZIELEN_DRZEWA` i dopasowuje 6 pomników przyrody z `BOS_ZIELEN_POMNIKI_PRZYRODY` po współrzędnych.

### Warunki zabudowy

```bash
py scripts/fetch-mapviewer/fetch_decyzje_wz.py
```

### Pozwolenia na budowę

```bash
py scripts/fetch-mapviewer/fetch_pozwolenia_bud.py
```

### MPZP – przeznaczenie terenu

```bash
py scripts/fetch-mapviewer/fetch_mpzp.py
```

Pobiera listę planów z Oracle MapViewer, odkrywa nazwy API przez `findByCoordinates`, następnie pobiera strefy przez `findByPlanName`. 12 planów, ~1 250 stref.

### Narzędzie do zapytań ad-hoc

```bash
py scripts/fetch-mapviewer/query_parcel.py 146505_8.0237.3
py scripts/fetch-mapviewer/query_parcel.py --sql "SELECT * FROM BUDYNKI WHERE ROWNUM = 1"
```

## Dokumentacja źródeł danych

`scripts/update-wlasnosc/RESEARCH.md` — szczegółowa dokumentacja dostępnych tabel Oracle MapViewer (`dane_wawa`), endpointów WFS/REST i odkrytych quirków API.

## Architektura

```
index.js                        # punkt wejścia – składa mapę
index.html                      # HTML + CSS
config/mapConfig.js             # bbox, zoom, domyślne warstwy
layers/
  baseLayers.js                 # warstwy bazowe (OSM, CyclOSM, Geoportal)
  overlays/
    *Overlay.js                 # każda nakładka w osobnym pliku
    factories/
      GeoJSONOverlayFactory.js  # fabryka nakładek GeoJSON
      WMSOverlayFactory.js      # fabryka nakładek WMS
    data/
      *GeoJSON.js               # geometria (generowane)
      *Data.js                  # atrybuty (generowane)
utils/
  urlSync.js                    # synchronizacja stanu z URL (?zoom=&lat=…)
  geoUtils.js                   # geometryCenter(), createLabelMarker()
events/mapEvents.js             # menu kontekstowe (kopiowanie współrzędnych)
scripts/
  update-wlasnosc/updater.py    # aktualizacja warstwy własności
  fetch-mapviewer/              # skrypty pobierające dane z Oracle MapViewer
libs/legend/                    # vendored Leaflet.Legend
```

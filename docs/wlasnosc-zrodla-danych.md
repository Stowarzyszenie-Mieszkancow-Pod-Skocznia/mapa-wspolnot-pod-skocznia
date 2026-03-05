# Źródła danych o własności gruntów – wyniki rozpoznania

Data rozpoznania: 2026-03-05

## Cel

Znalezienie ogólnodostępnego źródła danych o grupach rejestrowych (własności) działek
w obrębie osiedla Pod Skocznią, możliwego do wbudowania w mapę jako warstwa WMS lub GeoJSON.

---

## Przebadane źródła

### 1. WMS Urzędu m.st. Warszawy (`wms.um.warszawa.pl/serwis`)

Serwer już używany w projekcie do warstw MPZP.

**Wynik:** Brak warstw własności. Serwis udostępnia ok. 60 warstw, w tym granice działek
(`GEODEZJA_DZIALKI`), budynki i granice dzielnic – wyłącznie geometria, bez atrybutów własności.

---

### 2. WMS EGIB Warszawy (`wms2.um.warszawa.pl/geoserver/WMS/wms`)

Serwis zgłoszony w rejestrze GUGiK (EZiUDP) dla m.st. Warszawy (TERYT 1465).

**Wynik:** 11 warstw (działki, budynki, użytki, kontury, punkty graniczne, opisy).
Brak warstwy własności / grup rejestrowych.

---

### 3. WFS EGIB Warszawy (`wms2.um.warszawa.pl/geoserver/wfs/wfs`)

**Wynik – częściowy sukces:** Typ obiektów `wfs:dzialki` posiada pole `GRUPA_REJESTROWA`
w schemacie XSD, jednak **we wszystkich zwróconych obiektach wartość wynosi `null`**.
Pozostałe pola (POLE_EWIDENCYJNE, KLASOUZYTKI_EGIB, NUMER_JEDNOSTKI) są identycznie puste.
Geometria i numer działki są dostępne poprawnie.

Przykładowy obiekt:
```json
{
  "ID_DZIALKI": "146505_8.0231.14/14",
  "NUMER_DZIALKI": "14/14",
  "NUMER_OBREBU": "0231",
  "NAZWA_OBREBU": "1-02-31",
  "NAZWA_GMINY": "Dzielnica Mokotów",
  "GRUPA_REJESTROWA": null
}
```

Geometria jest dostępna – to na jej podstawie wypełniono plik `wlasnoscGeoJSON.js`.
Danych o własności miasto nie udostępnia przez ten WFS.

---

### 4. Geoportal krajowy – „Mapa własności – grupy rejestrowe"

GUGiK uruchomił usługę prezentującą klasyfikację własności w podziale na 16 klas.

- WMTS: `https://mapy.geoportal.gov.pl/wss/service/WMTS/guest/wmts/GRUPY_REJESTROWE`
- WMS:  `https://mapy.geoportal.gov.pl/wss/service/WMS/guest/wms`

**Wynik:** HTTP 401 dla wszystkich wariantów (z Basic Auth `guest:guest` i bez).
Słowo „guest" w ścieżce URL jest segmentem, nie podpowiedzią loginu.
Usługa wymaga konta instytucjonalnego (rejestracja przez GUGiK) – nie jest dostępna publicznie.

Dane źródłowe tej usługi agregatowej pochodzą z powiatowych WFS, tzn. z pola
`GRUPA_REJESTROWA` w `wfs:dzialki` – tego samego, które Warszawa nie wypełnia.

---

### 5. GUGiK KIEG WMS (`integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow`)

Serwis już używany w projekcie (działki, budynki, numery działek).

**Wynik:** 14 warstw – brak warstwy własności. Dostępne są m.in. `uzytki` i `kontury`,
ale żadna nie dotyczy grup rejestrowych ani formy własności.

---

### 6. Mapa własności UM Warszawa (`mapa.um.warszawa.pl/mapaApp1/mapa?service=mapa_wlasnosci`)

Portal Urzędu prezentuje własność w trzech kategoriach:

| Kategoria | Opis |
|-----------|------|
| Miasto st. Warszawa | Gmina m.st. Warszawa i jej jednostki |
| Skarb Państwa | Skarb Państwa i państwowe osoby prawne |
| Pozostałe | Własność prywatna i inne |

**Wynik:** Dane istnieją i są wizualizowane, ale serwis działa na silniku **Oracle MapViewer**
(jQuery + Oracle Maps JS, API `/mapviewer/tile` i `/mapviewer/foi`).
Warstwy (`dane_wawa.WLASNOSC_MAPA`, `dane_wawa.WLASNOSC_UW`) są obsługiwane przez
własnościowe API – brak publicznych endpointów WMS/WFS.

**Portal może służyć jako źródło referencyjne do ręcznego uzupełniania danych.**

---

## Podsumowanie

| Źródło | Własność dostępna? | Uwagi |
|--------|-------------------|-------|
| WMS UM Warszawa (serwis) | Nie | Tylko geometria |
| WMS EGIB Warszawa (geoserver) | Nie | Tylko geometria |
| WFS EGIB Warszawa (geoserver) | Schemat tak, dane nie | `GRUPA_REJESTROWA` = null |
| Geoportal „grupy rejestrowe" (GUGiK) | Istnieje, ale chronione | HTTP 401, konto instytucjonalne |
| KIEG WMS (GUGiK) | Nie | Brak warstwy własności |
| Mapa własności UM Warszawa | Tak, ale nieotwarte API | Oracle MapViewer, brak WMS/WFS |

---

## Zastosowane rozwiązanie

Wobec braku ogólnodostępnego maszynowego źródła danych o własności, warstwa
**Własność gruntów** (`wlasnoscOverlay.js`) korzysta z podejścia GeoJSON z ręcznym
uzupełnianiem danych:

- **Geometria działek** pochodzi z WFS EGIB Warszawy (pole `ID_DZIALKI`, obręb 0231).
- **Dane o własności** (`wlasnoscData.js`) są uzupełniane ręcznie na podstawie
  portalu mapa.um.warszawa.pl.

### Jak uzupełniać dane

1. Otwórz <https://mapa.um.warszawa.pl/mapaApp1/mapa?service=mapa_wlasnosci>
2. Odszukaj działkę i ustal jej kolor (kategoria własności).
3. Znajdź `ID_DZIALKI` działki – wyświetla się w popupie po kliknięciu w warstwie
   **Własność gruntów** lub **Działki** (KIEG).
4. Dodaj wpis do `layers/overlays/data/wlasnoscData.js`:

```js
"146505_8.0231.14/14": { grupaRejestrowa: "miejska", komentarz: "opcjonalny opis" },
```

Dopuszczalne wartości `grupaRejestrowa`:

| Wartość | Kolor | Znaczenie |
|---------|-------|-----------|
| `"miejska"` | zielony | Gmina / m.st. Warszawa |
| `"skarbu_panstwa"` | pomarańczowy | Skarb Państwa |
| `"prywatna"` | niebieski | Własność prywatna |
| *(brak wpisu)* | szary | Własność nieznana |

### Jak rozszerzyć zasięg warstwy

Plik `wlasnoscGeoJSON.js` zawiera 200 działek z obrębu 0231.
Aby dodać kolejne obręby, pobierz dane z WFS zmieniając BBOX i dołącz nowe obiekty
do tablicy `features`:

```
https://wms2.um.warszawa.pl/geoserver/wfs/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=wfs:dzialki&BBOX=<minLng>,<minLat>,<maxLng>,<maxLat>,EPSG:4326&SRSNAME=EPSG:4326&outputFormat=application/json&count=200
```

Format identyfikatora działki: `146505_8.{NR_OBREBU}.{NUMER_DZIALKI}`
(prefiks `146505_8` = dzielnica Mokotów).

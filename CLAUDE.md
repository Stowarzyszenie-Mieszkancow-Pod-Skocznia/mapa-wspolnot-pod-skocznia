# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A static Leaflet.js map application for the "Pod Skocznią" neighborhood in Warsaw, Poland. Built for Stowarzyszenie Mieszkańców Pod Skocznią to visualize community data (housing communities, developer investments, greenery, land registry, utility networks, and local development plan layers).

**No build system, no package manager.** Pure ES modules loaded directly in the browser.

## Running Locally

Open `index.html` in a browser via a local static server (required for ES module imports). Any of these work:

```bash
python -m http.server 8080
npx serve .
# or use IDE Live Server plugin
```

There are no tests, no lint commands, and no CI.

## Architecture

### Entry Point
`index.js` (loaded as `type="module"`) assembles the map: imports all layers, reads initial state from URL params via `URLSync`, creates the Leaflet map, adds layer controls and scale, attaches legends, and wires event listeners.

### Layer Types

**Base layers** (`layers/baseLayers.js`): OSM tile, CyclOSM tile, Geoportal WMS ortophoto.

**GeoJSON overlays** — local data layers using `createGeoJSONOverlay()` from `layers/overlays/factories/GeoJSONOverlayFactory.js`:
- `wspolnotyOverlay` — housing community boundaries, color-coded by association membership
- `inwestycjeDeweloperskieOverlay` — developer investment sites
- `zielenOverlay` — greenery parcels, color-coded by ownership/condition; exports `attachZielenLegend()` to toggle the map legend on overlay add/remove
- `wlasnoscOverlay` — land ownership parcels (4 000+ parcels), color-coded by ownership category (miejska/skarbu_panstwa/prywatna/nieznana); exports `attachWlasnoscLegend()`

**WMS overlays** (`layers/overlays/gugikOverlays.js`) — remote tile layers using `createWMSOverlays()`:
- `kiegOverlays` — buildings, parcels, parcel numbers (GUGiK KIEG service)
- `kiutOverlays` — utility networks (GUGiK KIUT service)
- `umWarszawaOverlays` — local development plan (MPZP) layers (Warsaw city hall WMS)

### Data Pattern

Each GeoJSON overlay has two data files under `layers/overlays/data/`:
- `*GeoJSON.js` — geometry exported as a GeoJSON FeatureCollection constant
- `*Data.js` — additional properties exported as an object keyed by feature `fid`

`createGeoJSONOverlay()` merges the two by matching on `feature.properties.fid`. To update data, edit both files; GeoJSON holds geometry while the data file holds descriptive attributes.

### Factory Functions

**`createGeoJSONOverlay({ geoJSON, additionalData, styleConfig, popupConfig, attribution })`**
- `styleConfig.styleFn(feature)` — per-feature style function; falls back to static `color`/`fillColor`/`fillOpacity`/`weight` props
- `popupConfig.fields` — per-field config: `{ exclude: true }` hides a field, `{ render(key, val) }` provides custom HTML
- Keys `www`, `url*`, `regon` get special rendering (links)

**`createWMSOverlays(baseUrl, layersConfig, commonOptions)`** — produces a `{ displayName: L.tileLayer.wms }` object ready to spread into the overlays map.

### URL State Sync (`utils/urlSync.js`)

`URLSync` reads/writes `?zoom=&lat=&lng=&baseLayer=&overlays=` query params. On page load, `getInitialState()` returns values from URL or falls back to `MAP_CONFIG` defaults. Changes are debounced and pushed via `history.pushState`.

### Configuration (`config/mapConfig.js`)

Central place for map bounds, zoom levels, default center (Warsaw "Pod Skocznią"), default active layers, and attribution string.

### Context Menu (`events/mapEvents.js`)

Right-click on the map copies coordinates as `[lng, lat]` JSON to clipboard (via `utils/clipboard.js`) and shows a brief confirmation popup.

### Bundled Library (`libs/legend/`)

A vendored copy of the Leaflet.Legend plugin. Do not modify; update by replacing both files if a new version is needed.

## Data Maintenance Scripts

### `scripts/update-wlasnosc/` — Ownership layer updater

A Dockerized Python script that fetches parcel geometries from Warsaw WFS and auto-classifies ownership by sampling pixel colors from Oracle MapViewer tiles.

```bash
docker build -t wlasnosc-updater ./scripts/update-wlasnosc
docker run --rm -v "$(pwd)/layers/overlays/data:/data" wlasnosc-updater
# Optional: smaller area or dry-run
docker run --rm -v "$(pwd)/layers/overlays/data:/data" wlasnosc-updater \
    --bbox "21.025,52.175,21.045,52.190" --dry-run
```

**How ownership classification works:** Warsaw's WFS `GRUPA_REJESTROWA` field is always null. Instead, the script renders PNG tiles from the Oracle MapViewer `WLASNOSC_MAPA` layer via XMLI POST to `/mapviewer/omserver`, then samples the pixel color at each parcel's centroid:

| RGB | Category |
|-----|----------|
| `(231, 229, 229)` gray | `prywatna` |
| `(247, 245, 161)` yellow | `miejska` |
| `(255, 173, 173)` pink | `skarbu_panstwa` |

**Warsaw WFS quirk:** `startIndex` parameter is not supported — both `startIndex=0` and any positive value return HTTP 400. Use a single request with large `count` (script uses `count=5000`).

**Merge safety:** The script never overwrites manually added entries in `wlasnoscData.js`. It only adds entries for `fid`s not already present.

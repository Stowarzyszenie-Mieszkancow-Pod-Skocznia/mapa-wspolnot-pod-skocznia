import { osmLayer, cyclosmOverlay, cyclosmLayer, geoportalOrtoLayer } from './layers/baseLayers.js';
import { wspolnotyOverlay } from './layers/overlays/wspolnotyOverlay.js';
import { inwestycjeDeweloperskieOverlay } from './layers/overlays/inwestycjeDeweloperskieOverlay.js';
import { zielenOverlay } from './layers/overlays/zielenOverlay.js';
import {kiegOverlays, kimpOverlays, kiutOverlays} from './layers/overlays/gugikOverlays.js';
import { MAP_CONFIG } from './config/mapConfig.js';
import { URLSync } from './utils/urlSync.js';
import { setupContextMenu } from './events/mapEvents.js';

const layers = {
  "OpenStreetMap": osmLayer,
  "CyclOSM": cyclosmLayer,
  "Ortofotomapa": geoportalOrtoLayer,
};

const overlays = {
  "Wspólnoty": wspolnotyOverlay,
  "Inwestycje deweloperskie": inwestycjeDeweloperskieOverlay,
  "Zieleń": zielenOverlay,
  "Infrastruktura rowerowa (CyclOSM)": cyclosmOverlay,
  ...kiegOverlays,
  ...kimpOverlays,
  ...kiutOverlays,
};

// Initialize URL synchronization
const urlSync = new URLSync(null, layers, overlays);
const initialState = urlSync.getInitialState();

// Create map
const map = L.map('map', {
  center: initialState.center,
  zoom: initialState.zoom,
  maxBounds: L.latLngBounds(
    L.latLng(MAP_CONFIG.MAX_BOUNDS[0]),
    L.latLng(MAP_CONFIG.MAX_BOUNDS[1])
  ),
  minZoom: MAP_CONFIG.MIN_ZOOM,
  maxZoom: MAP_CONFIG.MAX_ZOOM,
});

// Set map reference in URLSync
urlSync.map = map;

// Add controls
L.control.layers(layers, overlays).addTo(map);
L.control.scale({ imperial: false, maxWidth: 200 }).addTo(map);

// Add base layer
layers[initialState.baseLayer].addTo(map);

// Add overlays
urlSync.activeOverlayKeys = new Set(initialState.overlays);
for (const k of urlSync.activeOverlayKeys) {
  overlays[k].addTo(map);
}

// Setup event listeners
urlSync.setupListeners();
setupContextMenu(map);



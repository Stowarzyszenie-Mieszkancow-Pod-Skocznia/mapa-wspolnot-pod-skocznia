import {
  osmLayer,
  cyclosmOverlay,
  cyclosmLayer
} from "./baseLayers.js"

import {
  wspolnotyOverlay,
} from "./overlays/wspolnotyOverlay.js"

import {
  inwestycjeDeweloperskieOverlay
} from "./overlays/inwestycjeDeweloperskieOverlay.js";

import {
  zielenOverlay
} from "./overlays/zielenOverlay.js";

import {
  gugikOverlays,
} from "./overlays/gugikOverlays.js"

import {
  kimpOverlays,
} from "./overlays/kimpOverlays.js"

import {
  kiutOverlays,
} from "./overlays/kiutOverlays.js"

const params = new URLSearchParams(location.search);

const initialZoom = params.get('zoom') || 16
const initialCenter = [
  params.get('lat') || 52.18401,
  params.get('lng') || 21.03792
]
const maxBounds = [[52.19654,21.01968],[52.17150,21.05232]]

const baseLayer = params.get('baseLayer') || 'OpenStreetMap'

const getKeyByLayer = (layer, dict) =>
  Object.entries(dict).find(([, lyr]) => lyr === layer)?.[0];

const map = L.map('map', {
  center: initialCenter,
  zoom: initialZoom,
  maxBounds: L.latLngBounds(L.latLng(maxBounds[0]),L.latLng(maxBounds[1])),
  minZoom: 14,
});



let urlTimer
const updateUrl = () => {
  clearTimeout(urlTimer)
  urlTimer = setTimeout(() => {
    const mapCenter = map.getCenter()


    // find current base key
    const currentBaseKey = Object.entries(layers)
      .find(([, layer]) => map.hasLayer(layer))?.[0]

    params.set('zoom' ,map.getZoom())
    params.set('lat', mapCenter.lat)
    params.set('lng', mapCenter.lng)
    params.set('baseLayer', currentBaseKey || '')
    params.set('overlays', [...activeOverlayKeys].join(','))

    const newurl = `${window.location.origin}${window.location.pathname}?${params.toString()}`
    window.history.pushState({path:newurl},'',newurl);
  }, 150); // small debounce to avoid spam
};

map.on('moveend zoomend', updateUrl)
map.on('baselayerchange', updateUrl);
map.on('overlayadd', (e) => {
  const key = getKeyByLayer(e.layer, overlays);
  if (key) activeOverlayKeys.add(key);
  updateUrl();
});

map.on('overlayremove', (e) => {
  const key = getKeyByLayer(e.layer, overlays);
  if (key) activeOverlayKeys.delete(key);
  updateUrl();
});





let ortoGeoportalGovPlLayer = L.tileLayer.wms('https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/HighResolution?', {
  layers: "Raster",
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.gov.pl/web/gugik">Główny Urząd Geodezji i Kartografii</a>'
})



const layers = {
  "OpenStreetMap": osmLayer,
  "CyclOSM": cyclosmLayer,
  "Ortofotomapa": ortoGeoportalGovPlLayer,
}

const overlays = {
  "Wspólnoty": wspolnotyOverlay,
  "Inwestycje deweloperskie": inwestycjeDeweloperskieOverlay,
  "Zieleń": zielenOverlay,
  "Infrastruktura rowerowa (CyclOSM)": cyclosmOverlay,
  ...gugikOverlays,
  ...kimpOverlays,
  ...kiutOverlays,
}

L.control.layers(layers,overlays).addTo(map)
L.control.scale({imperial: false, maxWidth: 200}).addTo(map)

layers[baseLayer].addTo(map)

const activeOverlayKeys = new Set(
  (params.get('overlays') || 'Wspólnoty,Inwestycje deweloperskie')
    .split(',')
    .map(s => s.trim())
    .filter(k => k && overlays[k])
)
for (const k of activeOverlayKeys) overlays[k].addTo(map)

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for non-secure contexts/older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      // Avoid scrolling to bottom on iOS
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    return true;
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    return false;
  }
}

map.on('contextmenu', async (e) => {
  // Stop the browser context menu
  if (e.originalEvent) e.originalEvent.preventDefault();

  const { lat, lng } = e.latlng;

  // Choose your preferred format:
  const text = JSON.stringify([lng, lat]); // GeoJSON Point

  const ok = await copyText(text);

  // Give quick visual feedback
  L.popup({
    autoClose: true,
    closeButton: false,
    offset: [0, -8],
    className: ok ? 'copy-ok' : 'copy-fail',
  })
    .setLatLng(e.latlng)
    .setContent(ok ? `Copied: ${text}` : 'Copy failed')
    .openOn(map);
});



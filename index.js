import {
  wspolnotyOverlay,
} from "./overlays/wspolnotyOverlay.js"

import {
  inwestycjeDeweloperskieOverlay
} from "./overlays/inwestycjeDeweloperskieOverlay.js";

import {
  gugikOverlays,
} from "./overlays/gugikOverlays.js"

import {
  kimpOverlays,
} from "./overlays/kimpOverlays.js"

import {
  kiutOverlays,
} from "./overlays/kiutOverlays.js"

const initialZoom = 16
const initialCenter = [52.18401, 21.03792]
const maxBounds = [[52.19654,21.01968],[52.17150,21.05232]]

let map = L.map('map', {
  center: initialCenter,
  zoom: initialZoom,
  maxBounds: L.latLngBounds(L.latLng(maxBounds[0]),L.latLng(maxBounds[1]))
});



let osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
})

let cyclosmLayer = L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
})

let cyclosmOverlay =  L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm-lite/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
})

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
  "Infrastruktura rowerowa (CyclOSM)": cyclosmOverlay,
  ...gugikOverlays,
  ...kimpOverlays,
  ...kiutOverlays,
}

L.control.layers(layers,overlays).addTo(map)
L.control.scale({imperial: false, maxWidth: 200}).addTo(map)

osmLayer.addTo(map)
wspolnotyOverlay.addTo(map)
inwestycjeDeweloperskieOverlay.addTo(map)

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



import {
  wspolnoty
} from "./data/wspolnoty.js"

const initialZoom = 16
const initialCenter = [52.18401, 21.03792]
const maxBounds = [[52.19654193921653,21.019682148937704],[52.171704180432954,21.052329217187463]]

let map = L.map('map', {
  center: initialCenter,
  zoom: initialZoom,
  maxBounds: L.latLngBounds(L.latLng(maxBounds[0]),L.latLng(maxBounds[1]))
});

let wspolnotyOverlay = L.geoJSON(undefined, {
  onEachFeature: (feature, layer) => {
    const props = feature.properties || {};
    const rows = Object.entries(props).map(
      ([k, v]) => `<tr><th style="text-align:left;padding-right:8px;">${k}</th><td>${v}</td></tr>`
    ).join("");

    const html = rows
      ? `<table>${rows}</table>`
      : "No properties";

    layer.bindPopup(html);
  }
})

wspolnoty.forEach(wspolnota => {
  wspolnotyOverlay.addData(wspolnota);
})

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

let ortoGeoportalGovPlOverlay = L.tileLayer.wms('https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/HighResolution?', {
  layers: "Raster",
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.gov.pl/web/gugik">Główny Urząd Geodezji i Kartografii</a>'
})

let dzialkiOverlay =  L.tileLayer.wms('https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow?', {
  layers: "dzialki",
  maxZoom: 19,
  transparent: "true",
  format: "image/png",
  attribution: '&copy; <a href="https://www.gov.pl/web/gugik">Główny Urząd Geodezji i Kartografii</a>'
})

let numeryDzialekOverlay =  L.tileLayer.wms('https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow?', {
  layers: "numery_dzialek",
  maxZoom: 19,
  transparent: "true",
  format: "image/png",
  attribution: '&copy; <a href="https://www.gov.pl/web/gugik">Główny Urząd Geodezji i Kartografii</a>'
})

let budynkiOverlay =  L.tileLayer.wms('https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow?', {
  layers: "budynki",
  maxZoom: 19,
  transparent: "true",
  format: "image/png",
  attribution: '&copy; <a href="https://www.gov.pl/web/gugik">Główny Urząd Geodezji i Kartografii</a>'
})

const layers = {
  "OpenStreetMap": osmLayer,
  "CyclOSM": cyclosmLayer,
  "Ortofotomapa": ortoGeoportalGovPlOverlay,

}

const overlays = {
  "Wspólnoty": wspolnotyOverlay,
  "Infrastruktura rowerowa (CyclOSM)": cyclosmOverlay,
  "Dzialki": dzialkiOverlay,
  "Numery Dzialek": numeryDzialekOverlay,
  "Budynki": budynkiOverlay,
}

L.control.layers(layers,overlays).addTo(map)
L.control.scale({imperial: false, maxWidth: 200}).addTo(map)

osmLayer.addTo(map)
wspolnotyOverlay.addTo(map)




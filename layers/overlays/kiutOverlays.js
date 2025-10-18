import {MAP_CONFIG} from "../../config/mapConfig.js";

const overlayTemplate = {
  attribution: '&copy; <a href="https://www.gov.pl/web/gugik">Główny Urząd Geodezji i Kartografii</a>',
  format: "image/png",
  maxZoom: MAP_CONFIG.MAX_ZOOM,
  transparent: "true",
}

const url = 'https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaUzbrojeniaTerenu?'

const layers = {
  "Sieć ciepłownicza": "przewod_cieplowniczy",
  "Sieć elektroenergetyczna": "przewod_elektroenergetyczny",
  "Sieć gazowa": "przewod_gazowy",
  "Sieć kanalizacyjna": "przewod_kanalizacyjny",
  "Sieć specjalna": "przewod_specjalny",
  "Sieć telekomunikacyjna": "przewod_telekomunikacyjny",
  "Sieć wodociągowa": "przewod_wodociagowy",
  "Sieć niezidentyfikowana": "przewod_niezidentyfikowany",
}

const kiutOverlays = Object.entries(layers).map(([name, layers]) => {
  return {
    name,
    overlay: L.tileLayer.wms(url, {
      ...overlayTemplate,
      layers
    })
  }
}).reduce((acc, layer) => {
  acc[layer.name] = layer.overlay
  return acc
}, {})


export {
  kiutOverlays
}
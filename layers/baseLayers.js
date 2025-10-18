import {MAP_CONFIG} from "../config/mapConfig.js";

const OSM_ATTRIBUTION = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: Math.min(19,MAP_CONFIG.MAX_ZOOM),
  attribution: OSM_ATTRIBUTION
})

const cyclosmLayer = L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
  maxZoom: Math.min(19,MAP_CONFIG.MAX_ZOOM),
  attribution: OSM_ATTRIBUTION
})

const cyclosmOverlay =  L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm-lite/{z}/{x}/{y}.png', {
  maxZoom: Math.min(19,MAP_CONFIG.MAX_ZOOM),
  attribution: OSM_ATTRIBUTION
})

const geoportalOrtoLayer = L.tileLayer.wms('https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/HighResolution?', {
  layers: "Raster",
  maxZoom: MAP_CONFIG.MAX_ZOOM,
  attribution: '&copy; <a href="https://www.gov.pl/web/gugik">Główny Urząd Geodezji i Kartografii</a>'
})

export {
  osmLayer,
  cyclosmOverlay,
  cyclosmLayer,
  geoportalOrtoLayer
}
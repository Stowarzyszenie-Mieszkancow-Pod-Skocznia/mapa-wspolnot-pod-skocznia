import {wspolnotyGeoJSON} from "./data/wspolnotyGeoJSON.js";
import {wspolnotyData} from "./data/wspolnoty.js";

const wspolnotyOverlayData = wspolnotyGeoJSON.features.map(feature => {
  feature.properties = wspolnotyData.find(({name}) => name === feature.properties.wspolnota) || {name: feature.properties.wspolnotagit}
  return feature
})

const wspolnotyOverlay = L.geoJSON(undefined, {
  onEachFeature: (feature, layer) => {
    const props = feature.properties || {};
    const rows = Object.entries(props).map(
      ([k, v]) => `<tr><th style="text-align:left;padding-right:8px;">${k}</th><td>${v}</td></tr>`
    ).join("");

    const html = rows
      ? `<table>${rows}</table>`
      : "No properties";

    layer.bindPopup(html);
  },
  style: feature => {
    const style = {
      weight: 2,
      color: feature.properties.przedstawicielWStowarzyszeniu ? '#33ff88' : '#3388ff',
      fillColor: feature.properties.przedstawicielWStowarzyszeniu ? '#33ff88' : '#3388ff',
    }

    return style
  }
})

wspolnotyOverlayData.forEach(wspolnota => {
  wspolnotyOverlay.addData(wspolnota);
})

export {
  wspolnotyOverlay
}
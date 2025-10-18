import {wspolnotyGeoJSON} from "./data/wspolnotyGeoJSON.js";
import {wspolnotyData} from "./data/wspolnoty.js";
import {MAP_CONFIG} from "../../config/mapConfig.js";

const wspolnotyOverlayData = wspolnotyGeoJSON.features.map(feature => {
  feature.properties = {...feature.properties, ...wspolnotyData.find(({wspolnota}) => wspolnota === feature.properties.wspolnota)}
  return feature
})

const wspolnotyOverlay = L.geoJSON(undefined, {
  attribution: MAP_CONFIG.ATTRIBUTION,
  onEachFeature: (feature, layer) => {
    const props = feature.properties || {}
    const rows = Object.entries(props).map(
      ([k, v]) => {
        switch (k) {
          case "fid":
            return
          case "www":
            return v ? `<tr><th style="text-align:left;padding-right:8px;">${k}</th><td><a href="${v}" target="_blank">${v}</a></td></tr>` : ''
          case "regon":
            return v ? `<tr><th style="text-align:left;padding-right:8px;">${k}</th><td><a href="https://www.owg.pl/wyszukiwarka-regon/${v}" target="_blank">${v}</a></td></tr>` : ''
          default:
            return v ? `<tr><th style="text-align:left;padding-right:8px;">${k}</th><td>${v}</td></tr>` : ''
        }
      }
    ).join("")

    const html = rows
      ? `<table>${rows}</table>`
      : "No properties"

    layer.bindPopup(html)
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
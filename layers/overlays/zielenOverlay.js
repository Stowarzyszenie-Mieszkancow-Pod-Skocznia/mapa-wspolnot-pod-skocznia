import {zielenGeoJSON} from "./data/zielenGeoJSON.js";
import {zielenData} from "./data/zielen.js";
import {MAP_CONFIG} from "../../config/mapConfig.js";

const zielenOverlayData = zielenGeoJSON.features.map(feature => {
  feature.properties = {...feature.properties, ...zielenData[feature.properties.fid]}

  return feature
});

const zielenOverlay = L.geoJSON(undefined, {
  attribution: MAP_CONFIG.ATTRIBUTION,
  onEachFeature: (feature, layer) => {
    const props = feature.properties || {}
    const rows = Object.entries(props).map(
      ([k, v]) => {
        switch (k) {

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
    const color = ({fid, wlasnosc, stan, wlasciciel}) => {
      if (fid === 12) return '#a30000'
      if (wlasnosc === 'miejska' && stan === 'urządzone') return '#0a722c'
      if (wlasnosc === 'miejska' && stan === 'nieurządzone') return '#d88812'
      if (wlasnosc === 'prywatna' && stan === 'urządzone') return '#0a1372'
      if (wlasnosc === 'prywatna' && wlasciciel === 'nieznany') return '#b5b83b'

      return '#000'
    }

    const style = {
      weight: 2,
      fillOpacity: 0.5,
      color: color(feature.properties),
      fillColor: color(feature.properties),
    }

    return style
  }
})

zielenOverlayData.forEach(feature => {
  zielenOverlay.addData(feature);
})

export {
  zielenOverlay
}
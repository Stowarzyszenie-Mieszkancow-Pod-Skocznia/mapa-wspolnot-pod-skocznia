import {zielenGeoJSON} from "./data/zielenGeoJSON.js";

const zielenOverlayData = zielenGeoJSON.features

const zielenOverlay = L.geoJSON(undefined, {
  onEachFeature: (feature, layer) => {
    const props = feature.properties || {};
    const rows = Object.entries(props).map(
      ([k, v]) => {
        switch (k) {
          case "fid":
            return
          default:
            return v ? `<tr><th style="text-align:left;padding-right:8px;">${k}</th><td>${v}</td></tr>` : ''
        }
      }
    ).join("");

    const html = rows
      ? `<table>${rows}</table>`
      : "No properties";

    layer.bindPopup(html);
  },
  style: feature => {
    const style = {
      weight: 2,
      color: '#0a722c',
      fillColor: '#0a722c',
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
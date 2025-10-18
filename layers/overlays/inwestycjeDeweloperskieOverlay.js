import {inwestycjeDeweloperskieGeoJSON} from "./data/inwestycjeDeweloperskieGeoJSON.js";
import {inwestycjeDeweloperskieData} from "./data/inwestycjeDeweloperskie.js";

const inwestycjeDeweloperskieOverlayData = inwestycjeDeweloperskieGeoJSON.features.map(feature => {
  feature.properties = {...feature.properties, ...inwestycjeDeweloperskieData.find(({name}) => name === feature.properties.name)}
  return feature
})

const inwestycjeDeweloperskieOverlay = L.geoJSON(undefined, {
  onEachFeature: (feature, layer) => {
    const props = feature.properties || {};
    const rows = Object.entries(props).map(
      ([k, v]) => {
        switch (k) {
          case "www":
            return v ? `<tr><th style="text-align:left;padding-right:8px;">${k}</th><td><a href="${v}" target="_blank">${v}</a></td></tr>` : ''
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
      color: "#aa7777",
      fillColor: "#aa7777"
    }

    return style
  }
})

inwestycjeDeweloperskieOverlayData.forEach(inwestycja => {
  inwestycjeDeweloperskieOverlay.addData(inwestycja);
})

export {
  inwestycjeDeweloperskieOverlay
}
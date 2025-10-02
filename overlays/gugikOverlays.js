const overlayTemplate = {
  attribution: '&copy; <a href="https://www.gov.pl/web/gugik">Główny Urząd Geodezji i Kartografii</a>',
  format: "image/png",
  maxZoom: 19,
  transparent: "true",
}

const url = 'https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow?'

const layers = {
  "Budynki": 'budynki',
  "Działki": 'dzialki',
  "Numery Dzialek": 'numeryDzialek',
}

const gugikOverlays = Object.entries(layers).map(([name, layers]) => {
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
  gugikOverlays
}
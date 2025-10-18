export const MAP_CONFIG = {
  DEFAULT_ZOOM: 16,
  DEFAULT_CENTER: [52.18401, 21.03792],
  MAX_BOUNDS: [[52.19654, 21.01968], [52.17150, 21.05232]],
  MIN_ZOOM: 14,
  DEFAULT_BASE_LAYER: 'OpenStreetMap',
  DEFAULT_OVERLAYS: 'Wspólnoty,Inwestycje deweloperskie',
};

export const TILE_LAYERS = {
  ortoGeoportal: {
    url: 'https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/HighResolution?',
    options: {
      layers: "Raster",
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.gov.pl/web/gugik">Główny Urząd Geodezji i Kartografii</a>'
    }
  }
}
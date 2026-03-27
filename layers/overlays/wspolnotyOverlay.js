import { wspolnotyGeoJSON } from './data/wspolnotyGeoJSON.js';
import { wspolnotyData } from './data/wspolnotyData.js';
import { createGeoJSONOverlay } from './factories/GeoJSONOverlayFactory.js';

function multiPolygonCenter(geometry) {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const polygon of geometry.coordinates) {
    for (const ring of polygon) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }
  return L.latLng((minLat + maxLat) / 2, (minLng + maxLng) / 2);
}

const polygonsLayer = createGeoJSONOverlay({
  geoJSON: wspolnotyGeoJSON,
  additionalData: wspolnotyData,
  styleConfig: {
    styleFn: (feature) => ({
      weight: 2,
      color: feature.properties.przedstawicielWStowarzyszeniu ? '#33ff88' : '#3388ff',
      fillColor: feature.properties.przedstawicielWStowarzyszeniu ? '#33ff88' : '#3388ff',
    })
  },
  popupConfig: {
    fields: {
      fid: { exclude: true }
    }
  }
});

const labelsLayer = L.layerGroup();
wspolnotyGeoJSON.features.forEach(feature => {
  const name = feature.properties.wspolnota;
  if (!name) return;
  const center = multiPolygonCenter(feature.geometry);
  L.marker(center, {
    icon: L.divIcon({
      className: 'wspolnota-label',
      html: name,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    }),
    interactive: false,
  }).addTo(labelsLayer);
});

const wspolnotyOverlay = L.layerGroup([polygonsLayer, labelsLayer]);

export { wspolnotyOverlay };

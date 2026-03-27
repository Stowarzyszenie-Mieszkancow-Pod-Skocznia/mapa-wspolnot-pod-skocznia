import { wspolnotyGeoJSON } from './data/wspolnotyGeoJSON.js';
import { wspolnotyData } from './data/wspolnotyData.js';
import { createGeoJSONOverlay } from './factories/GeoJSONOverlayFactory.js';
import { geometryCenter, createLabelMarker } from '../../utils/geoUtils.js';

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
  createLabelMarker(geometryCenter(feature.geometry), name, 'wspolnota-label').addTo(labelsLayer);
});

const wspolnotyOverlay = L.layerGroup([polygonsLayer, labelsLayer]);

export { wspolnotyOverlay };

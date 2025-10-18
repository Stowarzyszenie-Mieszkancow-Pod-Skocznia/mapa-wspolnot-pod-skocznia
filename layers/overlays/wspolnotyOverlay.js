import { wspolnotyGeoJSON } from './data/wspolnotyGeoJSON.js';
import { wspolnotyData } from './data/wspolnotyData.js';
import { createGeoJSONOverlay } from './factories/GeoJSONOverlayFactory.js';

const wspolnotyOverlay = createGeoJSONOverlay({
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

export { wspolnotyOverlay };
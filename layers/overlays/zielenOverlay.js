
import { zielenGeoJSON } from './data/zielenGeoJSON.js';
import { zielenData } from './data/zielen.js';
import { createGeoJSONOverlay } from './factories/GeoJSONOverlayFactory.js';

function getZielenColor({ fid, wlasnosc, stan, wlasciciel }) {
  if (fid === 12) return '#a30000';
  if (wlasnosc === 'miejska' && stan === 'urządzone') return '#0a722c';
  if (wlasnosc === 'miejska' && stan === 'nieurządzone') return '#d88812';
  if (wlasnosc === 'prywatna' && stan === 'urządzone') return '#0a1372';
  if (wlasnosc === 'prywatna' && wlasciciel === 'nieznany') return '#7617c3';
  return '#000';
}

const zielenOverlay = createGeoJSONOverlay({
  geoJSON: zielenGeoJSON,
  additionalData: zielenData,
  styleConfig: {
    fillOpacity: 0.5,
    styleFn: (feature) => {
      const color = getZielenColor(feature.properties);
      return {
        weight: 2,
        fillOpacity: 0.5,
        color,
        fillColor: color
      };
    }
  }
});

export { zielenOverlay };

import { zielenGeoJSON } from './data/zielenGeoJSON.js';
import { zielenData } from './data/zielenData.js';
import { createGeoJSONOverlay } from './factories/GeoJSONOverlayFactory.js';

function getZielenColor({ fid, wlasnosc, stan, wlasciciel }) {
  if (fid === 12) return '#a30000';
  if (wlasnosc === 'miejska' && stan === 'urządzone') return '#0a722c';
  if (wlasnosc === 'miejska' && stan === 'nieurządzone') return '#d88812';
  if (wlasnosc === 'prywatna' && stan === 'urządzone') return '#0a1372';
  if (wlasnosc === 'prywatna' && stan === 'nieurządzone' && wlasciciel === 'znany') return '#7a7fc3';
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

const DEFAULT_LEGEND_CONFIG = {
  type: 'rectangle',
  weight: 2,
  fillOpacity: 0.5,
}
const zielenLegend = L.control.Legend({
  position: 'bottomright',
  title: 'Zieleń - Legenda',
  legends: [
    {
      ...DEFAULT_LEGEND_CONFIG,
      label: 'Zagospodarowane posesje prywatne',
      color: '#a30000',
      fillColor: '#a30000',
    },
    {
      ...DEFAULT_LEGEND_CONFIG,
      label: 'Parki urządzone i przejęte przez miasto',
      color: '#0a722c',
      fillColor: '#0a722c',
    },
    {
      ...DEFAULT_LEGEND_CONFIG,
      label: 'Działki miejskie niezagospodarowane',
      color: '#d88812',
      fillColor: '#d88812',
    },
    {
      ...DEFAULT_LEGEND_CONFIG,
      label: 'Parki urządzone pozostające w rękach prywatnych',
      color: '#0a1372',
      fillColor: '#0a1372',
    },
    {
      ...DEFAULT_LEGEND_CONFIG,
      label: 'Działki w własności deweloperów niezagospodarowane',
      color: '#7a7fc3',
      fillColor: '#7a7fc3',
    },
    {
      ...DEFAULT_LEGEND_CONFIG,
      label: 'Działki w rękach prywatnych niezagospodarowane',
      color: '#7617c3',
      fillColor: '#7617c3',
    },
    {
      ...DEFAULT_LEGEND_CONFIG,
      label: 'Pozostałe',
      color: '#000',
      fillColor: '#000',
    },
  ]
})

function attachZielenLegend(map) {
  map.on('overlayadd', ({layer}) => {
    if (layer === zielenOverlay) zielenLegend.addTo(map)
  });

  map.on('overlayremove', ({layer}) => {
    if (layer === zielenOverlay) zielenLegend.remove()
  });
}

export { zielenOverlay, attachZielenLegend };
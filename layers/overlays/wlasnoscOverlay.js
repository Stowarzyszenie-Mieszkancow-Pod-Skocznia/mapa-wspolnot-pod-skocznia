import { wlasnoscGeoJSON } from './data/wlasnoscGeoJSON.js';
import { wlasnoscData } from './data/wlasnoscData.js';
import { createGeoJSONOverlay } from './factories/GeoJSONOverlayFactory.js';

const COLORS = {
  miejska:        '#2e8b57',
  skarbu_panstwa: '#d4820a',
  prywatna:       '#4169b8',
  nieznana:       '#888888',
}

function getWlasnoscColor(grupaRejestrowa) {
  return COLORS[grupaRejestrowa] ?? COLORS.nieznana;
}

const wlasnoscOverlay = createGeoJSONOverlay({
  geoJSON: wlasnoscGeoJSON,
  additionalData: wlasnoscData,
  dataMatchFn: (feature, data) => data[feature.properties.fid] || null,
  styleConfig: {
    styleFn: (feature) => {
      const color = getWlasnoscColor(feature.properties.grupaRejestrowa);
      return {
        weight: 1,
        color,
        fillColor: color,
        fillOpacity: feature.properties.grupaRejestrowa ? 0.45 : 0.15,
      };
    }
  },
  popupConfig: {
    fields: {
      fid:          { render: (k, v) => `<tr><th style="text-align:left;padding-right:8px;">ID działki</th><td>${v}</td></tr>` },
      nr_dzialki:   { render: (k, v) => `<tr><th style="text-align:left;padding-right:8px;">Numer działki</th><td>${v}</td></tr>` },
      nr_obrebu:    { render: (k, v) => `<tr><th style="text-align:left;padding-right:8px;">Obręb</th><td>${v}</td></tr>` },
      nazwa_obrebu: { exclude: true },
      grupaRejestrowa: {
        render: (k, v) => {
          const labels = {
            miejska:        'Gmina / m.st. Warszawa',
            skarbu_panstwa: 'Skarb Państwa',
            prywatna:       'Własność prywatna',
          };
          return `<tr><th style="text-align:left;padding-right:8px;">Własność</th><td>${labels[v] ?? v}</td></tr>`;
        }
      },
    }
  }
});

const DEFAULT_LEGEND_CONFIG = {
  type: 'rectangle',
  weight: 1,
  fillOpacity: 0.45,
}

const wlasnoscLegend = L.control.Legend({
  position: 'bottomright',
  title: 'Własność gruntów',
  legends: [
    { ...DEFAULT_LEGEND_CONFIG, label: 'Gmina / m.st. Warszawa',  color: COLORS.miejska,        fillColor: COLORS.miejska },
    { ...DEFAULT_LEGEND_CONFIG, label: 'Skarb Państwa',           color: COLORS.skarbu_panstwa, fillColor: COLORS.skarbu_panstwa },
    { ...DEFAULT_LEGEND_CONFIG, label: 'Własność prywatna',       color: COLORS.prywatna,       fillColor: COLORS.prywatna },
    { ...DEFAULT_LEGEND_CONFIG, label: 'Własność nieznana',       color: COLORS.nieznana,       fillColor: COLORS.nieznana, fillOpacity: 0.15 },
  ]
});

function attachWlasnoscLegend(map) {
  map.on('overlayadd',    ({ layer }) => { if (layer === wlasnoscOverlay) wlasnoscLegend.addTo(map); });
  map.on('overlayremove', ({ layer }) => { if (layer === wlasnoscOverlay) wlasnoscLegend.remove(); });
}

export { wlasnoscOverlay, attachWlasnoscLegend };

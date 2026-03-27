import { mpzpGeoJSON } from './data/mpzpGeoJSON.js';
import { createGeoJSONOverlay } from './factories/GeoJSONOverlayFactory.js';

// Kolory według kategorii fun_nazwa
function getMpzpColor(nazwa) {
  if (!nazwa) return '#aaaaaa';
  const n = nazwa.toLowerCase();
  if (n.startsWith('zieleń') || n.startsWith('teren zieleni') || n.startsWith('niekubaturowe'))
    return '#4da64d';   // zieleń i rekreacja
  if (n.includes('wód powierzchniowych') || n.includes('wody powierzchniowe'))
    return '#5b9ec9';   // wody
  if (n.startsWith('droga') || n.startsWith('ciąg') || n.startsWith('pętla') ||
      n.startsWith('parking') || n.startsWith('teren parking') || n.startsWith('tereny parking'))
    return '#909090';   // komunikacja i parkingi
  if (n.startsWith('infrastruktura') || n.startsWith('urządzenia') ||
      n.startsWith('obiekty i urz') || n.startsWith('tereny urządzeń'))
    return '#a070c0';   // infrastruktura techniczna
  if (n.startsWith('zabudowa jednorodzinna'))
    return '#e8c840';   // zabudowa jednorodzinna
  if (n.startsWith('zabudowa wielorodzinna') || n.startsWith('zabudowa wielo') ||
      n.startsWith('garaże wielopoziomowe / zabudowa'))
    return '#e07840';   // zabudowa wielorodzinna
  if (n.startsWith('zabudowa usługowo-mieszkaniowa') || n.startsWith('usługi z zabudową') ||
      n.startsWith('usługi nauki i zabudowa'))
    return '#e09070';   // mieszkaniowo-usługowa
  if (n.startsWith('usługi') || n.startsWith('tereny usług') || n.startsWith('centra') ||
      n.startsWith('zabudowa usług') || n.startsWith('dom studencki') ||
      n.startsWith('garaże wielopoziomowe') || n.startsWith('teren usług'))
    return '#c04040';   // usługi
  return '#aaaaaa';
}

const mpzpOverlay = createGeoJSONOverlay({
  geoJSON: mpzpGeoJSON,
  styleConfig: {
    styleFn: (feature) => {
      const color = getMpzpColor(feature.properties.fun_nazwa);
      return { color, fillColor: color, fillOpacity: 0.4, weight: 1 };
    },
  },
  popupConfig: {
    fields: {
      fid:        { exclude: true },
      objectid:   { exclude: true },
      fun_symb:   { render: (k, v) => `<tr><th>Symbol</th><td>${v}</td></tr>` },
      fun_nazwa:  { render: (k, v) => `<tr><th>Przeznaczenie</th><td>${v}</td></tr>` },
      max_wys:    { render: (k, v) => `<tr><th>Maks. wysokość</th><td>${v} m</td></tr>` },
      licz_kond:  { render: (k, v) => `<tr><th>Kondygnacje</th><td>${v}</td></tr>` },
      inten_zab:  { render: (k, v) => `<tr><th>Intensywność zab.</th><td>${v}</td></tr>` },
      pow_bio:    { render: (k, v) => `<tr><th>Pow. biologicznie czynna</th><td>${v}%</td></tr>` },
      hilucs:     { exclude: true },
      nazwa_plan: { render: (k, v) => `<tr><th>Plan</th><td>${v}</td></tr>` },
    },
  },
});

const mpzpLegend = L.control.Legend({
  position: 'bottomright',
  title: 'MPZP – przeznaczenie terenu',
  legends: [
    { type: 'rectangle', color: '#e8c840', fillColor: '#e8c840', fillOpacity: 0.4, weight: 1, label: 'Zabudowa jednorodzinna' },
    { type: 'rectangle', color: '#e07840', fillColor: '#e07840', fillOpacity: 0.4, weight: 1, label: 'Zabudowa wielorodzinna' },
    { type: 'rectangle', color: '#e09070', fillColor: '#e09070', fillOpacity: 0.4, weight: 1, label: 'Mieszkaniowo-usługowa' },
    { type: 'rectangle', color: '#c04040', fillColor: '#c04040', fillOpacity: 0.4, weight: 1, label: 'Usługi' },
    { type: 'rectangle', color: '#4da64d', fillColor: '#4da64d', fillOpacity: 0.4, weight: 1, label: 'Zieleń i rekreacja' },
    { type: 'rectangle', color: '#5b9ec9', fillColor: '#5b9ec9', fillOpacity: 0.4, weight: 1, label: 'Wody' },
    { type: 'rectangle', color: '#909090', fillColor: '#909090', fillOpacity: 0.4, weight: 1, label: 'Komunikacja i parkingi' },
    { type: 'rectangle', color: '#a070c0', fillColor: '#a070c0', fillOpacity: 0.4, weight: 1, label: 'Infrastruktura techniczna' },
    { type: 'rectangle', color: '#aaaaaa', fillColor: '#aaaaaa', fillOpacity: 0.4, weight: 1, label: 'Inne' },
  ],
});

function attachMpzpLegend(map) {
  map.on('overlayadd',    ({ layer }) => { if (layer === mpzpOverlay) mpzpLegend.addTo(map); });
  map.on('overlayremove', ({ layer }) => { if (layer === mpzpOverlay) mpzpLegend.remove(); });
}

export { mpzpOverlay, attachMpzpLegend };

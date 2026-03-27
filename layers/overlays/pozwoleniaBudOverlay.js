import { pozwoleniaBudGeoJSON } from './data/pozwoleniaBudGeoJSON.js';
import { createGeoJSONOverlay } from './factories/GeoJSONOverlayFactory.js';

// TYP_INW codes:
//   MN/MNz  – zabudowa jednorodzinna
//   MW/MWz  – zabudowa wielorodzinna
//   MWU/MU  – zabudowa mieszkaniowo-usługowa
//   U*      – usługi
//   ZP      – zieleń publiczna
function getPozwolanieColor(typ) {
  if (!typ) return '#888888';
  if (typ.startsWith('MN')) return '#e8a020';   // żółto-pomarańczowy – jednorodzinna
  if (typ.startsWith('MW')) return '#c0392b';   // czerwony – wielorodzinna
  if (typ === 'MWU' || typ === 'MU') return '#d4665a'; // różowo-czerwony – mieszana
  if (typ.startsWith('U'))  return '#3060c0';   // niebieski – usługi
  if (typ === 'ZP')         return '#208050';   // zielony – zieleń
  return '#888888';
}

const pozwoleniaBudOverlay = createGeoJSONOverlay({
  geoJSON: pozwoleniaBudGeoJSON,
  styleConfig: {
    styleFn: (feature) => {
      const color = getPozwolanieColor(feature.properties.typ_inw);
      return { color, fillColor: color, fillOpacity: 0.35, weight: 2 };
    },
  },
  popupConfig: {
    fields: {
      fid:         { exclude: true },
      dec_pb:      { render: (k, v) => `<tr><th>Nr pozwolenia</th><td>${v}</td></tr>` },
      dec_wz:      { render: (k, v) => `<tr><th>Powiązana WZ</th><td>${v}</td></tr>` },
      data:        { render: (k, v) => `<tr><th>Data</th><td>${v?.slice(0, 10) ?? ''}</td></tr>` },
      rodzaj:      { render: (k, v) => `<tr><th>Rodzaj</th><td>${v}</td></tr>` },
      nazwa:       { render: (k, v) => `<tr><th>Inwestycja</th><td>${v}</td></tr>` },
      typ_inw:     { render: (k, v) => `<tr><th>Typ</th><td>${v}</td></tr>` },
      ulica:       { render: (k, v) => `<tr><th>Ulica</th><td>${v}</td></tr>` },
      nr:          { render: (k, v) => `<tr><th>Nr</th><td>${v}</td></tr>` },
      inwestor:    { render: (k, v) => `<tr><th>Inwestor</th><td>${v}</td></tr>` },
      pow_ter:     { render: (k, v) => `<tr><th>Pow. terenu</th><td>${v} m²</td></tr>` },
      pow_zab:     { render: (k, v) => `<tr><th>Pow. zabudowy</th><td>${v} m²</td></tr>` },
      pow_ca:      { render: (k, v) => `<tr><th>Pow. całkowita</th><td>${v} m²</td></tr>` },
      pow_uz:      { render: (k, v) => `<tr><th>Pow. użytkowa</th><td>${v} m²</td></tr>` },
      pow_usl:     { render: (k, v) => `<tr><th>Pow. usługowa</th><td>${v} m²</td></tr>` },
      kondygnacje: { render: (k, v) => `<tr><th>Kondygnacje</th><td>${v}</td></tr>` },
      wysokosc:    { render: (k, v) => `<tr><th>Wysokość</th><td>${v} m</td></tr>` },
      mieszkania:  { render: (k, v) => `<tr><th>Mieszkania</th><td>${v}</td></tr>` },
      parkingi:    { render: (k, v) => `<tr><th>Parkingi</th><td>${v}</td></tr>` },
      uwagi:       { render: (k, v) => `<tr><th>Uwagi</th><td>${v}</td></tr>` },
    },
  },
});

const pozwoleniaBudLegend = L.control.Legend({
  position: 'bottomright',
  title: 'Pozwolenia na budowę',
  legends: [
    { type: 'rectangle', color: '#c0392b', fillColor: '#c0392b', fillOpacity: 0.35, weight: 2, label: 'Wielorodzinna (MW)' },
    { type: 'rectangle', color: '#d4665a', fillColor: '#d4665a', fillOpacity: 0.35, weight: 2, label: 'Mieszk.-usługowa (MWU/MU)' },
    { type: 'rectangle', color: '#e8a020', fillColor: '#e8a020', fillOpacity: 0.35, weight: 2, label: 'Jednorodzinna (MN)' },
    { type: 'rectangle', color: '#3060c0', fillColor: '#3060c0', fillOpacity: 0.35, weight: 2, label: 'Usługi (U*)' },
    { type: 'rectangle', color: '#208050', fillColor: '#208050', fillOpacity: 0.35, weight: 2, label: 'Zieleń (ZP)' },
    { type: 'rectangle', color: '#888888', fillColor: '#888888', fillOpacity: 0.35, weight: 2, label: 'Inne' },
  ],
});

function attachPozwoleniaBudLegend(map) {
  map.on('overlayadd',    ({ layer }) => { if (layer === pozwoleniaBudOverlay) pozwoleniaBudLegend.addTo(map); });
  map.on('overlayremove', ({ layer }) => { if (layer === pozwoleniaBudOverlay) pozwoleniaBudLegend.remove(); });
}

export { pozwoleniaBudOverlay, attachPozwoleniaBudLegend };

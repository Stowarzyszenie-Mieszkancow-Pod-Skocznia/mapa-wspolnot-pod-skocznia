import { decyzjeWzGeoJSON } from './data/decyzjeWzGeoJSON.js';
import { createGeoJSONOverlay } from './factories/GeoJSONOverlayFactory.js';

function getDecyzjaColor(feature) {
  const typ = feature.properties.typ;
  const rodzaj = feature.properties.rodzaj;
  if (rodzaj === 'LICP') return '#208050';   // zielony – LICP
  if (typ === 'Modernizacja') return '#3060c0'; // niebieski – przebudowa
  return '#e07030';                            // pomarańczowy – nowa zabudowa
}

const decyzjeWzOverlay = createGeoJSONOverlay({
  geoJSON: decyzjeWzGeoJSON,
  styleConfig: {
    weight: 2,
    fillOpacity: 0.35,
    styleFn: (feature) => {
      const color = getDecyzjaColor(feature);
      return { color, fillColor: color, fillOpacity: 0.35, weight: 2 };
    },
  },
  popupConfig: {
    fields: {
      fid:     { exclude: true },
      dec_wz:  { render: (k, v) => `<tr><th>Nr decyzji</th><td>${v}</td></tr>` },
      nr_dec:  { exclude: true },
      data:    { render: (k, v) => `<tr><th>Data</th><td>${v?.slice(0, 10) ?? ''}</td></tr>` },
      rodzaj:  { render: (k, v) => `<tr><th>Rodzaj</th><td>${v}</td></tr>` },
      nazwa:   { render: (k, v) => `<tr><th>Inwestycja</th><td>${v}</td></tr>` },
      typ:     { render: (k, v) => `<tr><th>Typ</th><td>${v}</td></tr>` },
      ulica:   { render: (k, v) => `<tr><th>Ulica</th><td>${v}</td></tr>` },
      nr:      { render: (k, v) => `<tr><th>Nr</th><td>${v}</td></tr>` },
      inwestor:{ render: (k, v) => `<tr><th>Inwestor</th><td>${v}</td></tr>` },
      pow_ter: { render: (k, v) => `<tr><th>Pow. terenu</th><td>${v} m²</td></tr>` },
      pow_zab: { render: (k, v) => `<tr><th>Pow. zabudowy</th><td>${v} m²</td></tr>` },
      kondygnacje: { render: (k, v) => `<tr><th>Kondygnacje</th><td>${v}</td></tr>` },
      wysokosc:    { render: (k, v) => `<tr><th>Wysokość</th><td>${v} m</td></tr>` },
      mieszkania:  { render: (k, v) => `<tr><th>Mieszkania</th><td>${v}</td></tr>` },
      parkingi:    { render: (k, v) => `<tr><th>Parkingi</th><td>${v}</td></tr>` },
      uwagi:       { render: (k, v) => `<tr><th>Uwagi</th><td>${v}</td></tr>` },
    },
  },
});

const decyzjeWzLegend = L.control.Legend({
  position: 'bottomright',
  title: 'Warunki zabudowy',
  legends: [
    { type: 'rectangle', color: '#e07030', fillColor: '#e07030', fillOpacity: 0.35, weight: 2, label: 'Nowa zabudowa (WZ)' },
    { type: 'rectangle', color: '#3060c0', fillColor: '#3060c0', fillOpacity: 0.35, weight: 2, label: 'Modernizacja (WZ)' },
    { type: 'rectangle', color: '#208050', fillColor: '#208050', fillOpacity: 0.35, weight: 2, label: 'LICP' },
  ],
});

function attachDecyzjeWzLegend(map) {
  map.on('overlayadd',    ({ layer }) => { if (layer === decyzjeWzOverlay) decyzjeWzLegend.addTo(map); });
  map.on('overlayremove', ({ layer }) => { if (layer === decyzjeWzOverlay) decyzjeWzLegend.remove(); });
}

export { decyzjeWzOverlay, attachDecyzjeWzLegend };

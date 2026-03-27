import { drzewaGeoJSON } from './data/drzewaGeoJSON.js';

// Stan zdrowotny: dwa systemy kodowania (tekst i skala 1–5)
// 1/dobry = najlepszy, 5/obumarły = najgorszy
function getDrzewoColor(stan) {
  switch (stan) {
    case 'dobry':   case '1': return '#3a8c3a';  // zielony
    case 'średni':  case '2': case '3': return '#c89a00';  // żółty
    case 'zły':     case '4': return '#c14f00';  // pomarańczowy
    case 'obumarły':case '5': return '#8b0000';  // ciemnoczerwony
    default:                  return '#888888';  // szary – brak danych
  }
}

const renderer = L.canvas({ padding: 0.5 });

const drzewaOverlay = L.geoJSON(drzewaGeoJSON, {
  renderer,
  pointToLayer(feature, latlng) {
    const color = getDrzewoColor(feature.properties.stan_zdrowotny);
    return L.circleMarker(latlng, {
      radius: 3,
      color,
      fillColor: color,
      fillOpacity: 0.8,
      weight: 0,
    });
  },
  onEachFeature(feature, layer) {
    const p = feature.properties;
    const rows = [
      p.gatunek_pl    && `<tr><th>Gatunek</th><td>${p.gatunek_pl}</td></tr>`,
      p.gatunek_lat   && `<tr><th>Nazwa łac.</th><td><em>${p.gatunek_lat}</em></td></tr>`,
      p.stan_zdrowotny && `<tr><th>Stan zdrowotny</th><td>${p.stan_zdrowotny}</td></tr>`,
      p.ocena         && `<tr><th>Ocena</th><td>${p.ocena}</td></tr>`,
      p.wysokosc      && `<tr><th>Wysokość</th><td>${p.wysokosc} m</td></tr>`,
      p.srednica_korony && `<tr><th>Śr. korony</th><td>${p.srednica_korony} m</td></tr>`,
      p.pnie_obwody   && `<tr><th>Obwód pnia</th><td>${p.pnie_obwody} cm</td></tr>`,
      p.lokalizacja   && `<tr><th>Lokalizacja</th><td>${p.lokalizacja}</td></tr>`,
      p.weteran       && `<tr><th>Weteran</th><td>tak</td></tr>`,
      p.dec_wycinka   && `<tr><th>Dec. wycinki</th><td>${p.dec_wycinka}</td></tr>`,
      p.jednostka     && `<tr><th>Zarządca</th><td>${p.jednostka}</td></tr>`,
      p.fid           && `<tr><th>Nr inw.</th><td>${p.fid}</td></tr>`,
      p.data          && `<tr><th>Data danych</th><td>${p.data}</td></tr>`,
    ].filter(Boolean).join('');
    layer.bindPopup(`<table>${rows}</table>`);
  },
});

const drzewaLegend = L.control.Legend({
  position: 'bottomright',
  title: 'Drzewa – stan zdrowotny',
  legends: [
    { type: 'circle', radius: 5, color: '#3a8c3a', fillColor: '#3a8c3a', fillOpacity: 0.8, weight: 0, label: 'Dobry' },
    { type: 'circle', radius: 5, color: '#c89a00', fillColor: '#c89a00', fillOpacity: 0.8, weight: 0, label: 'Średni' },
    { type: 'circle', radius: 5, color: '#c14f00', fillColor: '#c14f00', fillOpacity: 0.8, weight: 0, label: 'Zły' },
    { type: 'circle', radius: 5, color: '#8b0000', fillColor: '#8b0000', fillOpacity: 0.8, weight: 0, label: 'Obumarły' },
    { type: 'circle', radius: 5, color: '#888888', fillColor: '#888888', fillOpacity: 0.8, weight: 0, label: 'Brak danych' },
  ],
});

function attachDrzewaLegend(map) {
  map.on('overlayadd',    ({ layer }) => { if (layer === drzewaOverlay) drzewaLegend.addTo(map); });
  map.on('overlayremove', ({ layer }) => { if (layer === drzewaOverlay) drzewaLegend.remove(); });
}

export { drzewaOverlay, attachDrzewaLegend };

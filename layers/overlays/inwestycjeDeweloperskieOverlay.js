
import { inwestycjeDeweloperskieGeoJSON } from './data/inwestycjeDeweloperskieGeoJSON.js';
import { inwestycjeDeweloperskieData } from './data/inwestycjeDeweloperskieData.js';
import { createGeoJSONOverlay } from './factories/GeoJSONOverlayFactory.js';
import { geometryCenter, createLabelMarker } from '../../utils/geoUtils.js';

const LAYER_COLOR = '#aa7777';

const polygonsLayer = createGeoJSONOverlay({
  geoJSON: inwestycjeDeweloperskieGeoJSON,
  additionalData: inwestycjeDeweloperskieData,
  styleConfig: {
    color: LAYER_COLOR,
    fillColor: LAYER_COLOR
  },
  popupConfig: {
    fields: {
      fid: { exclude: true }
    }
  }
});

const labelsLayer = L.layerGroup();
inwestycjeDeweloperskieGeoJSON.features.forEach(feature => {
  const name = feature.properties.name;
  if (!name) return;
  createLabelMarker(geometryCenter(feature.geometry), name, 'wspolnota-label').addTo(labelsLayer);
});

const inwestycjeDeweloperskieOverlay = L.layerGroup([polygonsLayer, labelsLayer]);

export { inwestycjeDeweloperskieOverlay };

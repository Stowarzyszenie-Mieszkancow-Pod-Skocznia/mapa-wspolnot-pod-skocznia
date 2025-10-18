
import { inwestycjeDeweloperskieGeoJSON } from './data/inwestycjeDeweloperskieGeoJSON.js';
import { inwestycjeDeweloperskieData } from './data/inwestycjeDeweloperskieData.js';
import { createGeoJSONOverlay } from './factories/GeoJSONOverlayFactory.js';

const LAYER_COLOR = '#aa7777';

const inwestycjeDeweloperskieOverlay = createGeoJSONOverlay({
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

export { inwestycjeDeweloperskieOverlay };
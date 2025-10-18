import { MAP_CONFIG } from '../../../config/mapConfig.js';

/**
 * Generates HTML popup content from feature properties
 */
export function createPopupHTML(properties, fieldConfig = {}) {
  const rows = Object.entries(properties)
    .map(([key, value]) => {
      // Skip if no value or explicitly excluded
      if (!value || fieldConfig[key]?.exclude) return '';
      
      // Use custom renderer if provided
      if (fieldConfig[key]?.render) {
        return fieldConfig[key].render(key, value);
      }
      
      if (key === 'www' || key.startsWith('url')) {
        return `<tr><th style="text-align:left;padding-right:8px;">${key}</th><td><a href="${value}" target="_blank">${value}</a></td></tr>`;
      }
      
      if (key === 'regon') {
        return `<tr><th style="text-align:left;padding-right:8px;">${key}</th><td><a href="https://www.owg.pl/wyszukiwarka-regon/${value}" target="_blank">${value}</a></td></tr>`;
      }
      
      return `<tr><th style="text-align:left;padding-right:8px;">${key}</th><td>${value}</td></tr>`;
    })
    .filter(row => row)
    .join('');

  return rows ? `<table>${rows}</table>` : 'No properties';
}

/**
 * Factory function to create GeoJSON overlays with consistent behavior
 */
export function createGeoJSONOverlay({
  geoJSON,
  additionalData = null,
  dataMatchFn = (feature, data) => data[feature.properties.fid] || null,
  styleConfig = {},
  popupConfig = {},
  attribution = MAP_CONFIG.ATTRIBUTION
}) {
  // Merge GeoJSON features with additional data if provided
  const features = geoJSON.features.map(feature => {
    if (additionalData && dataMatchFn) {
      const matchedData = dataMatchFn(feature, additionalData);
      if (matchedData) {
        feature.properties = { ...feature.properties, ...matchedData };
      }
    }
    return feature;
  });

  // Create the layer
  const layer = L.geoJSON(undefined, {
    attribution,
    onEachFeature: (feature, leafletLayer) => {
      const html = createPopupHTML(feature.properties, popupConfig.fields || {});
      leafletLayer.bindPopup(html);
    },
    style: (feature) => {
      // Apply custom style function if provided
      if (typeof styleConfig.styleFn === 'function') {
        return styleConfig.styleFn(feature);
      }
      
      // Default style
      return {
        weight: styleConfig.weight || 2,
        color: styleConfig.color || '#3388ff',
        fillColor: styleConfig.fillColor || styleConfig.color || '#3388ff',
        fillOpacity: styleConfig.fillOpacity || 0.2,
        ...styleConfig.defaults
      };
    }
  });

  // Add features to layer
  features.forEach(feature => layer.addData(feature));

  return layer;
}

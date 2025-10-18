import {MAP_CONFIG} from "../../../config/mapConfig.js";

/**
 * Factory function to create WMS tile layer overlays
 */
export function createWMSOverlay({
  url,
  layerName,
  displayName,
  options = {}
}) {
  const defaultOptions = {
    layers: layerName,
    format: 'image/png',
    transparent: true,
    maxZoom: MAP_CONFIG.MAX_ZOOM,
    ...options
  };

  return {
    name: displayName || layerName,
    layer: L.tileLayer.wms(url, defaultOptions)
  };
}

/**
 * Create multiple WMS overlays from a configuration object
 */
export function createWMSOverlays(baseUrl, layersConfig, commonOptions = {}) {
  return Object.entries(layersConfig).reduce((acc, [key, config]) => {
    const overlay = createWMSOverlay({
      url: baseUrl,
      layerName: config.layerName || key,
      displayName: config.displayName || key,
      options: { ...commonOptions, ...config.options }
    });
    acc[overlay.name] = overlay.layer;
    return acc;
  }, {});
}

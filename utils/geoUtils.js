/**
 * Returns the bounding-box centre of a GeoJSON geometry.
 * Works for Polygon and MultiPolygon (handles multiple sub-polygons correctly).
 */
export function geometryCenter(geometry) {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  const polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }
  return L.latLng((minLat + maxLat) / 2, (minLng + maxLng) / 2);
}

/**
 * Creates an invisible, non-interactive label marker at the given latlng.
 */
export function createLabelMarker(latlng, text, className = 'map-label') {
  return L.marker(latlng, {
    icon: L.divIcon({
      className,
      html: text,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    }),
    interactive: false,
  });
}

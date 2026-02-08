// point: { latitude, longitude } using expo-location format
// ring: array of [lng, lat]
export function pointInRing(point, ring) {
  const x = point.longitude;
  const y = point.latitude;

  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];

    const intersect =
      (yi > y) !== (yj > y) &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}

//  polygon feature for expo-location format
export function pointInPolygonFeature(point, feature) {
  const geom = feature?.geometry;
  if (!geom?.type || !geom?.coordinates) return false;

  if (geom.type === "Polygon") {
    const outer = geom.coordinates?.[0];
    if (!outer) return false;

    if (!pointInRing(point, outer)) return false;

    // holes
    for (let h = 1; h < geom.coordinates.length; h++) {
      if (pointInRing(point, geom.coordinates[h])) return false;
    }
    return true;
  }

  if (geom.type === "MultiPolygon") {
    for (const poly of geom.coordinates || []) {
      const outer = poly?.[0];
      if (!outer) continue;

      if (!pointInRing(point, outer)) continue;

      let inHole = false;
      for (let h = 1; h < poly.length; h++) {
        if (pointInRing(point, poly[h])) {
          inHole = true;
          break;
        }
      }
      if (!inHole) return true;
    }
    return false;
  }

  return false;
}

export function getBuildingId(feature) {
  return feature?.properties?.id ?? null;
}

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
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}

// Returns true if point is inside a single Polygon (coordinates array)
function pointInPolygon(point, coordinates) {
  const outer = coordinates?.[0];
  if (!outer) return false;
  if (!pointInRing(point, outer)) return false;

  for (let h = 1; h < coordinates.length; h++) {
    if (pointInRing(point, coordinates[h])) return false;
  }
  return true;
}

// Returns true if point is inside any polygon of a MultiPolygon (array of polygon coordinates)
function pointInMultiPolygon(point, polygons) {
  for (const poly of polygons) {
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

//  polygon feature for expo-location format
export function pointInPolygonFeature(point, feature) {
  const geom = feature?.geometry;
  if (!geom?.type || !geom?.coordinates) return false;

  if (geom.type === 'Polygon') {
    return pointInPolygon(point, geom.coordinates);
  }

  if (geom.type === 'MultiPolygon') {
    return pointInMultiPolygon(point, geom.coordinates);
  }

  return false;
}

export function getBuildingId(feature) {
  return feature?.properties?.id ?? null;
}

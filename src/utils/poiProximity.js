function toRad(deg) {
  return deg * (Math.PI / 180);
}

export function distanceMetres(a, b) {
  const earthRadiusM = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const value =
    sinLat * sinLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLng * sinLng;

  return earthRadiusM * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function formatDistanceLabel(distance) {
  if (distance < 1000) {
    return `${Math.round(distance)} m`;
  }

  return `${(distance / 1000).toFixed(1)} km`;
}

export function getNearbyOutdoorPois({
  pois = [],
  userCoords = null,
  mode = 'count',
  count = 5,
  rangeMetres = 250,
  category = 'all',
}) {
  if (!userCoords) {
    return [];
  }

  const categoryFiltered = pois.filter((feature) => {
    if (category === 'all') return true;
    return feature?.properties?.category === category;
  });

  const sorted = categoryFiltered
    .map((feature) => {
      const [longitude, latitude] = feature?.geometry?.coordinates || [];
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return null;
      }

      const distance = distanceMetres(userCoords, { latitude, longitude });
      return {
        id: feature.properties?.id || '',
        name: feature.properties?.name || 'Unknown POI',
        campus: feature.properties?.campus || '',
        category: feature.properties?.category || 'other',
        distanceMetres: distance,
        distanceLabel: formatDistanceLabel(distance),
        feature,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceMetres - b.distanceMetres);

  if (mode === 'range') {
    return sorted.filter((poi) => poi.distanceMetres <= rangeMetres);
  }

  return sorted.slice(0, count);
}

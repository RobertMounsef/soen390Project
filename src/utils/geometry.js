// src/utils/geometry.js

/**
 * Extracts all [lng, lat] points from a GeoJSON geometry.
 * Supports: Point, LineString, MultiLineString, Polygon, MultiPolygon.
 */
function extractLngLatPoints(geometry) {
    if (!geometry) return [];

    const { type, coordinates } = geometry;

    switch (type) {
        case 'Point':
            return Array.isArray(coordinates) ? [coordinates] : [];

        case 'LineString':
            return Array.isArray(coordinates) ? coordinates : [];

        case 'MultiLineString':
            return Array.isArray(coordinates) ? coordinates.flat() : [];

        case 'Polygon':
            // Use outer ring
            return Array.isArray(coordinates?.[0]) ? coordinates[0] : [];

        case 'MultiPolygon':
            // Use first polygon outer ring
            return Array.isArray(coordinates?.[0]?.[0]) ? coordinates[0][0] : [];

        default:
            return [];
    }
}

/**
 * Returns an approximate "center" coordinate for a GeoJSON feature.
 * Strategy: average of all vertices (good enough for route estimation).
 */
export function getFeatureCenter(feature) {
    const points = extractLngLatPoints(feature?.geometry);
    if (!points.length) return null;

    let sumLng = 0;
    let sumLat = 0;

    for (const [lng, lat] of points) {
        sumLng += lng;
        sumLat += lat;
    }

    return {
        latitude: sumLat / points.length,
        longitude: sumLng / points.length,
    };
}

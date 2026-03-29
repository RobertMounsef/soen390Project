/**
 * ───────────────────────────────────────────────────────────────────────────
 * DESIGN PATTERN: Component Pattern (React Native)
 * ───────────────────────────────────────────────────────────────────────────
 * MapView is a reusable, self-contained component that encapsulates all map
 * rendering logic — campus markers, building polygons/points, route polylines,
 * and highlight states.  It can be dropped into any screen that needs a map
 * without duplicating rendering code.
 * ───────────────────────────────────────────────────────────────────────────
 */
import React, { useEffect, useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, Text, Keyboard } from 'react-native';
import RNMapView, { Marker, Polygon, Polyline } from 'react-native-maps';
import PropTypes from 'prop-types';

const CATEGORY_ICON = {
  cafe: '☕',
  restaurant: '🍽️',
  services: '🛎️',
  other: '📍',
};
const BUILDING_POINT_ZOOM_THRESHOLD = 0.008;
const POI_ZOOM_THRESHOLD = 0.008;
const POI_OVERLAP_OFFSET = { latitude: 0.00014, longitude: 0.00009 };
const COORD_EPSILON = 0.0000005;

const MapView = forwardRef(({
  center,
  zoom = 18,
  markers = [],
  buildings = [],
  outdoorPois = [],
  onBuildingPress,
  onOutdoorPoiPress,
  highlightedBuildingId,
  originBuildingId,
  destinationBuildingId,
  destinationPoiId,
  routeCoordinates = [],
}, ref) => {
  const mapRef = useRef(null);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region, duration) => {
      mapRef.current?.animateToRegion(region, duration);
    }
  }));

  const computeRegion = (center, zoom) => {
    const delta = 0.01 / Math.max(1, (zoom - 14) * 0.5);
    return {
      ...center,
      latitudeDelta: delta,
      longitudeDelta: delta,
    }
  }

  const [region, setRegion] = useState(computeRegion(center, zoom));

  useEffect(() => {
    const newRegion = computeRegion(center, zoom);
    mapRef.current?.animateToRegion(newRegion, 0);
  }, [center, zoom]);

  const toLatLng = (pair) => ({ latitude: pair[1], longitude: pair[0] });

  const getHighlightType = (feature) => {
    const id = feature?.properties?.id;
    if (!id) return null;

    if (originBuildingId && String(id) === String(originBuildingId)) {
      return 'origin';
    }

    if (destinationBuildingId && String(id) === String(destinationBuildingId)) {
      return 'destination';
    }

    if (highlightedBuildingId && String(id) === String(highlightedBuildingId)) {
      return 'current';
    }

    return null;
  };

  const getPolygonColors = (highlightType) => {
    if (highlightType === 'origin') {
      return {
        strokeColor: '#16a34a',
        fillColor: 'rgba(22, 163, 74, 0.25)',
      };
    }
    if (highlightType === 'destination') {
      return {
        strokeColor: '#ea580c',
        fillColor: 'rgba(234, 88, 12, 0.25)',
      };
    }
    if (highlightType === 'current') {
      return {
        strokeColor: '#8b5cf6',
        fillColor: 'rgba(139, 92, 246, 0.25)',
      };
    }
    return {
      strokeColor: '#8B1538',
      fillColor: 'rgba(139, 21, 56, 0.25)',
    };
  };

  const handleBuildingPress = (buildingId) => onBuildingPress?.(buildingId);

  const renderMultiPolygonRing = (ring, rIdx, featureId, pIdx, strokeColor, fillColor) => {
    const coords = ring.map((pair) => toLatLng(pair));
    const key = `${featureId}-mp-${pIdx}-${rIdx}`;
    return (
      <Polygon
        key={key}
        coordinates={coords}
        strokeWidth={2}
        strokeColor={strokeColor}
        fillColor={fillColor}
        onPress={() => handleBuildingPress(featureId)}
        tappable={!!onBuildingPress}
      />
    );
  };

  const getPoiCoordinate = (feature) => {
    const geom = feature?.geometry;
    if (geom?.type !== 'Point' || !Array.isArray(geom.coordinates)) return null;

    const [lng, lat] = geom.coordinates;
    const buildingCode = feature?.properties?.building;

    const overlapsBuildingPoint = buildings.some((b) => {
      if (b?.geometry?.type !== 'Point' || !Array.isArray(b.geometry.coordinates)) return false;
      const [bLng, bLat] = b.geometry.coordinates;

      // Prefer an explicit building link when available, but keep a coordinate
      // fallback for POIs that share exact map coordinates with building points.
      if (buildingCode && String(b?.properties?.id) === String(buildingCode)) return true;
      return (
        Math.abs(bLat - lat) < COORD_EPSILON
        && Math.abs(bLng - lng) < COORD_EPSILON
      );
    });

    if (!overlapsBuildingPoint) {
      return { latitude: lat, longitude: lng };
    }

    return {
      latitude: lat + POI_OVERLAP_OFFSET.latitude,
      longitude: lng + POI_OVERLAP_OFFSET.longitude,
    };
  };

  return (
    <View style={StyleSheet.absoluteFill} testID="map-view">
      <RNMapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        region={region}
        showsUserLocation
        showsMyLocationButton={false} // We will use our custom button
        onPress={() => Keyboard.dismiss()}
        onRegionChangeComplete={(newRegion) => setRegion(newRegion)}
      >
        {/* Campus markers (existing) */}
        {markers.map((position) => (
          <Marker key={`${position.latitude}-${position.longitude}`} coordinate={position} />
        ))}

        {/* Render polygons / multipolygons first (campus boundaries or building footprints) */}
        {buildings.map((feature) => {
          const highlightType = getHighlightType(feature);
          const { strokeColor, fillColor } = getPolygonColors(highlightType);
          const geom = feature.geometry;
          if (!geom?.type || !geom?.coordinates) return null;

          // Polygon
          if (geom.type === 'Polygon') {
            // take each linear ring as a separate Polygon (outer ring + optional holes)
            return geom.coordinates.map((ring, rIdx) => {
              const coords = ring.map((pair) => toLatLng(pair));
              const key = `${feature.properties.id}-poly-${rIdx}`;
              const buildingId = feature.properties.id;
              return (
                <Polygon
                  key={key}
                  coordinates={coords}
                  strokeWidth={2}
                  strokeColor={strokeColor}
                  fillColor={fillColor}
                  onPress={() => onBuildingPress?.(buildingId)}
                  tappable={!!onBuildingPress}
                />
              );
            });
          }

          // MultiPolygon
          if (geom.type === 'MultiPolygon') {
            const featureId = feature.properties.id;
            return geom.coordinates.flatMap((polygon, pIdx) =>
              polygon.map((ring, rIdx) =>
                renderMultiPolygonRing(ring, rIdx, featureId, pIdx, strokeColor, fillColor)
              )
            );
          }

          return null;
        })}

        {/* Render point markers with custom circle + id text */}
        {region.longitudeDelta < BUILDING_POINT_ZOOM_THRESHOLD && buildings
          .filter((f) => f.geometry?.type === 'Point')
          .map((building) => {
            const coord = building.geometry.coordinates;
            if (!Array.isArray(coord) || coord.length < 2) return null;
            const buildingId = building.properties.id;
            const highlightType = getHighlightType(building);

            let circleStyle = styles.buildingCircle;
            if (highlightType === 'origin') {
              circleStyle = [styles.buildingCircle, styles.originCircle];
            } else if (highlightType === 'destination') {
              circleStyle = [styles.buildingCircle, styles.destinationCircle];
            } else if (highlightType === 'current') {
              circleStyle = [styles.buildingCircle, styles.currentCircle];
            }

            return (
              <Marker
                key={`pt-${buildingId}`}
                coordinate={{ latitude: coord[1], longitude: coord[0] }}
                onPress={() => onBuildingPress?.(buildingId)}
              >
                <View style={circleStyle}>
                  <Text style={styles.buildingId}>{buildingId}</Text>
                </View>
              </Marker>
            );
          })}

        {/* Outdoor POIs — distinct pins; testID for Maestro E2E */}
        {(region.latitudeDelta <= POI_ZOOM_THRESHOLD || region.longitudeDelta <= POI_ZOOM_THRESHOLD) &&
          outdoorPois.map((feature) => {
            const coordinate = getPoiCoordinate(feature);
            if (!coordinate) return null;
            const id = feature.properties?.id;
            if (!id) return null;
            const category = feature.properties?.category || 'other';
            const icon = CATEGORY_ICON[category] || CATEGORY_ICON.other;
            const isDest = destinationPoiId && String(destinationPoiId) === String(id);

            return (
              <Marker
                key={`poi-${id}`}
                coordinate={coordinate}
                onPress={() => onOutdoorPoiPress?.(id)}
                tracksViewChanges={false}
              >
                <View
                  testID={`outdoor-poi-${id}`}
                  style={[styles.poiPin, isDest && styles.poiPinDestination]}
                  accessibilityLabel={`Outdoor point of interest: ${feature.properties?.name || id}`}
                >
                  <Text style={styles.poiPinIcon}>{icon}</Text>
                </View>
              </Marker>
            );
          })}

        {/* Handle multi-segment route arrays */}
        {routeCoordinates.map((segment) => {
          if (!segment.coordinates || segment.coordinates.length < 2) return null;

          const isShuttle = segment.mode === 'shuttle';
          return (
            <Polyline
              key={`route-segment-${segment.id}`}
              coordinates={segment.coordinates}
              strokeColor={isShuttle ? '#ea580c' : '#2563eb'} // Orange for shuttle, Blue for walking/driving
              strokeWidth={isShuttle ? 5 : 4}
              lineDashPattern={isShuttle ? [1, 5] : []} // Dotted line for shuttle
            />
          );
        })}
      </RNMapView>
    </View>
  );
});

MapView.displayName = 'MapView';

MapView.propTypes = {
  center: PropTypes.shape({
    latitude: PropTypes.number.isRequired,
    longitude: PropTypes.number.isRequired,
  }).isRequired,
  zoom: PropTypes.number,
  markers: PropTypes.arrayOf(
    PropTypes.shape({
      latitude: PropTypes.number.isRequired,
      longitude: PropTypes.number.isRequired,
    })
  ),
  buildings: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string,
      properties: PropTypes.object,
      geometry: PropTypes.object,
    })
  ),
  onBuildingPress: PropTypes.func,
  onOutdoorPoiPress: PropTypes.func,
  outdoorPois: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string,
      properties: PropTypes.object,
      geometry: PropTypes.object,
    }),
  ),
  highlightedBuildingId: PropTypes.string,
  originBuildingId: PropTypes.string,
  destinationBuildingId: PropTypes.string,
  destinationPoiId: PropTypes.string,
  routeCoordinates: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      mode: PropTypes.string,
      coordinates: PropTypes.arrayOf(
        PropTypes.shape({
          latitude: PropTypes.number.isRequired,
          longitude: PropTypes.number.isRequired,
        })
      ).isRequired,
    }),
  ),
};

export default MapView;

const styles = StyleSheet.create({
  buildingCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B1538', // Concordia burgundy
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#5C0E23',
  },
  originCircle: {
    backgroundColor: '#005AB5',
    borderColor: '#003F7F',
  },
  destinationCircle: {
    backgroundColor: '#ea580c',
    borderColor: '#9a3412',
  },
  currentCircle: {
    backgroundColor: '#8b5cf6',
    borderColor: '#7c3aed',
  },
  buildingId: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  poiPin: {
    minWidth: 36,
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B1538',
    paddingHorizontal: 4,
  },
  poiPinDestination: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
  },
  poiPinIcon: {
    fontSize: 18,
  },
});

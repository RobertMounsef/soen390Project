import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import RNMapView, { Marker, Polygon } from 'react-native-maps';

export default function MapView({
  center,
  zoom = 18,
  markers = [],
  buildings = [],
  onBuildingPress,
  highlightedBuildingId,
  originBuildingId,
  destinationBuildingId,
}) {
  const [region, setRegion] = useState({
    ...center,
    latitudeDelta: 0.01 / Math.max(1, (zoom - 14) * 0.5),
    longitudeDelta: 0.01 / Math.max(1, (zoom - 14) * 0.5),
  });

  useEffect(() => {
    setRegion({
      ...center,
      latitudeDelta: 0.01 / Math.max(1, (zoom - 14) * 0.5),
      longitudeDelta: 0.01 / Math.max(1, (zoom - 14) * 0.5),
    });
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
        strokeColor: '#2563eb',
        fillColor: 'rgba(37, 99, 235, 0.25)',
      };
    }
    return {
      strokeColor: '#8B1538',
      fillColor: 'rgba(139, 21, 56, 0.25)',
    };
  };

  return (
    <View style={StyleSheet.absoluteFill} testID="map-view"> 
      {markers.map((marker, index) => (
        <View key={index} testID={`map-marker`}>
        </View>
        ))}
      <RNMapView
        style={StyleSheet.absoluteFill}
        region={region} 
        showsUserLocation
        showsMyLocationButton
      >
        {/* Campus markers (existing) */}
        {markers.map((position, index) => (
          <Marker key={`marker-${index}`} coordinate={position} />
        ))}

         {/* Render polygons / multipolygons first (campus boundaries or building footprints) */}
         {buildings.map((feature) => {
          const highlightType = getHighlightType(feature);
          const { strokeColor, fillColor } = getPolygonColors(highlightType);
          const geom = feature.geometry;
          if (!geom || !geom.type || !geom.coordinates) return null;

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
                  onPress={() => onBuildingPress && onBuildingPress(buildingId)}
                  tappable={!!onBuildingPress}
                />
              );
            });
          }

          // MultiPolygon
          if (geom.type === 'MultiPolygon') {
            return geom.coordinates.flatMap((polygon, pIdx) =>
              polygon.map((ring, rIdx) => {
                const coords = ring.map((pair) => toLatLng(pair));
                const key = `${feature.properties.id}-mp-${pIdx}-${rIdx}`;
                const buildingId = feature.properties.id;
                return (
                  <Polygon
                    key={key}
                    coordinates={coords}
                    strokeWidth={2}
                    strokeColor={strokeColor}
                    fillColor={fillColor}
                    onPress={() => onBuildingPress && onBuildingPress(buildingId)}
                    tappable={!!onBuildingPress}
                  />
                );
              })
            );
          }

          return null;
        })}

        {/* Render point markers with custom circle + id text */}
        {buildings
          .filter((f) => f.geometry && f.geometry.type === 'Point')
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
                onPress={() => onBuildingPress && onBuildingPress(buildingId)}
              >
                <View style={circleStyle}>
                  <Text style={styles.buildingId}>{buildingId}</Text>
                </View>
              </Marker>
            );
          })}
      </RNMapView>
    </View>
  );
}

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
    backgroundColor: '#16a34a',
    borderColor: '#166534',
  },
  destinationCircle: {
    backgroundColor: '#ea580c',
    borderColor: '#9a3412',
  },
  currentCircle: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8',
  },
  buildingId: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
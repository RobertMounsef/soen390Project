import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import RNMapView, { Marker, Polygon } from 'react-native-maps';

export default function MapView({ center, zoom = 18, markers = [], buildings = [] }) {
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

  return (
    <View style={StyleSheet.absoluteFill}>
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
          const geom = feature.geometry;
          if (!geom || !geom.type || !geom.coordinates) return null;

          // Polygon
          if (geom.type === 'Polygon') {
            // take each linear ring as a separate Polygon (outer ring + optional holes)
            return geom.coordinates.map((ring, rIdx) => {
              const coords = ring.map((pair) => toLatLng(pair));
              const key = `${feature.properties.id}-poly-${rIdx}`;
              return (
                <Polygon
                  key={key}
                  coordinates={coords}
                  strokeWidth={2}
                  strokeColor="#8B1538"
                  fillColor="rgba(139, 21, 56, 0.25)"
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
                return (
                  <Polygon
                    key={key}
                    coordinates={coords}
                    strokeWidth={2}
                    strokeColor="#8B1538"
                    fillColor="rgba(139, 21, 56, 0.25)"
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
            return (
              <Marker
                key={`pt-${building.properties.id}`}
                coordinate={{ latitude: coord[1], longitude: coord[0] }}
              >
                <View style={styles.buildingCircle}>
                  <Text style={styles.buildingId}>{building.properties.id}</Text>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B1538', // Concordia burgundy
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#5C0E23',
  },
  buildingId: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import RNMapView, { Marker } from 'react-native-maps';

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

        {/* Building circles/polygons */}
        {buildings.map((building) => {
          const coord = building.geometry.coordinates;
          return (
            <Marker
              key={building.properties.id}
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

// CSS styles
const styles = StyleSheet.create({
  buildingCircle: {
    width: 40,
    height: 40,
    borderRadius: 50,
    backgroundColor: '#e53e3e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#c53030',
  },
  buildingId: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
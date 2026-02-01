import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import RNMapView, { Marker } from 'react-native-maps';

export default function MapView({ center, zoom = 18, markers = [] }) {
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
        {markers.map((position, index) => (
          <Marker key={index} coordinate={position} />
        ))}
      </RNMapView>
    </View>
  );
}

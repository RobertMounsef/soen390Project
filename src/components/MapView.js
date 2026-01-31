import React from 'react'
import { StyleSheet, View } from 'react-native'
import MapView from 'react-native-maps'
import { Marker } from 'react-native-maps'

/**
 * Campus map display (SGW / Loyola).
 * Uses react-native-maps; supports iOS and Android.
 * @param {Object} props
 * @param {{ latitude: number, longitude: number }} props.center - Map center (campus coordinates)
 * @param {number} [props.zoom=18] - Initial zoom (mapped to delta)
 * @param {Array<{ latitude: number, longitude: number }>} [props.markers=[]] - Marker positions
 */
export default function MapView({ center, zoom = 18, markers = [] }) {
  const latitudeDelta = 0.01 / Math.max(1, (zoom - 14) * 0.5)
  const region = {
    ...center,
    latitudeDelta,
    longitudeDelta: latitudeDelta,
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton
      >
        {markers.map((position, index) => (
          <Marker key={index} coordinate={position} />
        ))}
      </MapView>
    </View>
  )
}

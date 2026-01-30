import { GoogleMap, Marker } from '@react-google-maps/api'

const defaultMapOptions = {
  zoomControl: false,
  streetViewControl: false,
  mapTypeControl: false,
  cameraControl: false,
  fullscreenControl: false,
}

const defaultContainerStyle = {
  width: '100%',
  height: '100%',
}

/**
 * MapView – reusable campus map display (SGW / Loyola).
 * Renders a Google Map with the given center, zoom, and markers.
 * @param {Object} props
 * @param {{ lat: number, lng: number }} props.center - Map center (e.g. campus coordinates)
 * @param {number} [props.zoom=18] - Initial zoom level
 * @param {Array<{ lat: number, lng: number }>} [props.markers=[]] - Marker positions
 * @param {function(google.maps.Map): void} [props.onMapLoad] - Called when the map instance is ready
 * @param {Object} [props.mapContainerStyle] - Override container dimensions
 * @param {Object} [props.options] - Google Map options (merged with defaults)
 */
function MapView({
  center,
  zoom = 18,
  markers = [],
  onMapLoad,
  mapContainerStyle = defaultContainerStyle,
  options = {},
}) {
  const mapOptions = { ...defaultMapOptions, ...options }

  return (
    <GoogleMap
      center={center}
      zoom={zoom}
      mapContainerStyle={mapContainerStyle}
      options={mapOptions}
      onLoad={onMapLoad}
    >
      {markers.map((position, index) => (
        <Marker key={index} position={position} />
      ))}
    </GoogleMap>
  )
}

export default MapView

import { Box, Flex, SkeletonText } from '@chakra-ui/react'
import { useJsApiLoader } from '@react-google-maps/api'
import MapView from './components/MapView'

const SGW = { lat: 45.496953450868936, lng: -73.57880920781449 }
const LOY = { lat: 45.45807166641666, lng: -73.63926547807088 }

function App() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  })

  if (!isLoaded) {
    return <SkeletonText />
  }

  return (
    <Flex position='relative' h='100vh' w='100vw' overflow='hidden'>
      <Box position='absolute' inset={0}>
        <MapView
          center={SGW}
          zoom={18}
          markers={[SGW, LOY]}
        />
      </Box>
    </Flex>
  )
}

export default App

import {
  Box,
  Flex,
  SkeletonText,
  Tab,
  TabList,
  Tabs,
} from '@chakra-ui/react'
import { useJsApiLoader } from '@react-google-maps/api'
import { useState } from 'react'
import MapView from './components/MapView'

const SGW = { lat: 45.496953450868936, lng: -73.57880920781449 }
const LOY = { lat: 45.45807166641666, lng: -73.63926547807088 }

const CAMPUSES = [
  { id: 'SGW', label: 'SGW', center: SGW, markers: [SGW, LOY] },
  { id: 'LOYOLA', label: 'LOYOLA', center: LOY, markers: [SGW, LOY] },
]

function App() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  })

  const [campusIndex, setCampusIndex] = useState(0)
  const campus = CAMPUSES[campusIndex]

  if (!isLoaded) {
    return <SkeletonText />
  }

  return (
    <Flex
      position='relative'
      flexDirection='column'
      h='100vh'
      w='100vw'
      overflow='hidden'
      bg='gray.50'
    >
      {/* Top: campus tabs */}
      <Box
        flexShrink={0}
        bg='white'
        shadow='sm'
        zIndex='sticky'
        py={2}
        px={4}
      >
        <Tabs
          index={campusIndex}
          onChange={setCampusIndex}
          variant='soft-rounded'
          colorScheme='red'
        >
          <TabList gap={2} bg='gray.100' p={1} borderRadius='lg' w='full'>
            <Tab
              flex={1}
              borderRadius='md'
              fontWeight='semibold'
              _selected={{ bg: 'red.500', color: 'white' }}
            >
              SGW
            </Tab>
            <Tab
              flex={1}
              borderRadius='md'
              fontWeight='semibold'
              _selected={{ bg: 'red.500', color: 'white' }}
            >
              LOYOLA
            </Tab>
          </TabList>
        </Tabs>
      </Box>

      {/* Map */}
      <Box position='relative' flex={1} minH={0}>
        <Box position='absolute' inset={0}>
          <MapView
            key={campus.id}
            center={campus.center}
            zoom={18}
            markers={campus.markers}
          />
        </Box>
      </Box>
    </Flex>
  )
}

export default App

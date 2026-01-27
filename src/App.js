import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  HStack,
  IconButton,
  Input,
  Text,
  SkeletonText,
} from '@chakra-ui/react'
import { FaLocationArrow, FaTimes } from 'react-icons/fa'
import { FaG, FaL } from "react-icons/fa6";
import {useJsApiLoader, GoogleMap, Marker} from '@react-google-maps/api'
import { useState } from 'react'

const SGW = {lat: 45.496953450868936, lng:-73.57880920781449}
const LOY = {lat: 45.45807166641666, lng: -73.63926547807088}

function App() {

  const {isLoaded} = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  })

  const [map, setMap] = useState(/**@type google.maps.Map */ (null));

  if(!isLoaded){
    return <SkeletonText/>
  }

  return (
    <Flex
      position='relative'
      flexDirection='column'
      alignItems='center'
      h='100vh'
      w='100vw'
    >
      
      <Box position='absolute' left={0} top={0} h='100%' w='100%'>
        {/* This box displays the Google Map*/}
        <GoogleMap center={SGW} 
                   zoom={18} 
                   mapContainerStyle={{width: '100%', height: '100%'}}
                   options={{zoomControl: false,
                             streetViewControl:false,
                             mapTypeControl: false,
                             cameraControl: false,
                             fullscreenControl:false
                            }}
                    onLoad={(map) => setMap(map)}>
          <Marker position={SGW}/> 
          <Marker position={LOY}/>                 
        </GoogleMap>
      </Box>

      <Box
        p={4}
        borderRadius='lg'
        mt={4}
        bgColor='white'
        shadow='base'
        zIndex='modal'
      >
        <HStack spacing={4} justifyContent='center'>
          <IconButton
            aria-label='center back'
            icon={<FaG />}
            isRound
            
            size='lg'
            onClick={() => map.panTo(SGW)}
          />
          <IconButton
            aria-label='center back'
            icon={<FaL />}
            isRound
            
            size='lg'
            onClick={() => map.panTo(LOY)}
          />
        </HStack>
      </Box>
    </Flex>
  )
}

export default App

import {
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  List,
  ListItem,
  Text,
  VStack,
} from '@chakra-ui/react'
import { FaWheelchair, FaChevronRight } from 'react-icons/fa'
import { FaCircleInfo, FaGear } from 'react-icons/fa6'

/**
 * Bottom sheet panel showing building details (mockup style).
 * Includes drag handle, title, Accessibility, Key Services, Departments, and More Details button.
 */
function BuildingInfoPanel() {
  return (
    <Box
      position='absolute'
      left={0}
      right={0}
      bottom={0}
      zIndex='modal'
      bg='white'
      borderTopRadius='2xl'
      shadow='lg'
      pt={2}
      pb={6}
      px={5}
      maxH='45vh'
      overflowY='auto'
    >
      {/* Drag handle */}
      <Flex justify='center' mb={2}>
        <Box w={10} h={1} borderRadius='full' bg='gray.300' />
      </Flex>

      <Heading as='h2' size='lg' mb={4}>
        EV Building
      </Heading>

      <VStack align='stretch' spacing={4}>
        {/* Accessibility */}
        <Box>
          <Flex align='center' gap={2} mb={2}>
            <Icon as={FaWheelchair} color='gray.600' boxSize={4} />
            <Text fontWeight='semibold' fontSize='sm' color='gray.700'>
              Accessibility
            </Text>
          </Flex>
          <Text fontSize='sm' color='gray.600' pl={6}>
            Ramp & elevators
          </Text>
        </Box>

        {/* Key Services */}
        <Box>
          <Flex align='center' gap={2} mb={2}>
            <Icon as={FaCircleInfo} color='gray.600' boxSize={4} />
            <Text fontWeight='semibold' fontSize='sm' color='gray.700'>
              Key Services
            </Text>
          </Flex>
          <List spacing={1} pl={6} fontSize='sm' color='gray.600' styleType='disc'>
            <ListItem>Student Service Centre</ListItem>
            <ListItem>Library Services</ListItem>
          </List>
        </Box>

        {/* Departments */}
        <Box>
          <Flex align='center' gap={2} mb={2}>
            <Icon as={FaGear} color='gray.600' boxSize={4} />
            <Text fontWeight='semibold' fontSize='sm' color='gray.700'>
              Departments
            </Text>
          </Flex>
          <List spacing={1} pl={6} fontSize='sm' color='gray.600' styleType='disc'>
            <ListItem>Engineering Dept.</ListItem>
            <ListItem>Computer Science Dept.</ListItem>
          </List>
        </Box>

        <Button
          colorScheme='blue'
          rightIcon={<FaChevronRight />}
          size='md'
          borderRadius='lg'
          mt={2}
        >
          More Details
        </Button>
      </VStack>
    </Box>
  )
}

export default BuildingInfoPanel

jest.mock('../screens/MapScreen', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');

  return function MockMapScreen(props) {
    return (
      <View>
        <Text>MapScreen</Text>

        {/* Campus tabs */}
        <Pressable testID="campus-tab-SGW">
          <Text>SGW</Text>
        </Pressable>

        <Pressable testID="campus-tab-LOYOLA">
          <Text>LOYOLA</Text>
        </Pressable>

        {/* Trigger navigation */}
        <Pressable
          testID="open-route-options"
          onPress={() =>
            props.onGoToRoutes?.({
              start: { latitude: 45.497, longitude: -73.579, label: 'SGW' },
              end: { latitude: 45.458, longitude: -73.64, label: 'LOYOLA' },
              destinationName: 'LOYOLA',
            })
          }
        >
          <Text>Open Route Options</Text>
        </Pressable>
      </View>
    );
  };
});

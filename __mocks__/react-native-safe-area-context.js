const React = require('react');
const { View } = require('react-native');

const SafeAreaView = (props) => React.createElement(View, { ...props, testID: 'safe-area-view' });

module.exports = { SafeAreaView };

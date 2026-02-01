const React = require('react');
const { View } = require('react-native');

const MockMarker = (props) => React.createElement(View, { ...props, testID: 'map-marker' });
const MockMapView = (props) => React.createElement(View, { ...props, testID: 'map-view' });
MockMapView.Marker = MockMarker;

module.exports = MockMapView;

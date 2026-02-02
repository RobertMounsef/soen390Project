import React from 'react';
import { View } from 'react-native';

export const Marker = ({ children }) => <View>{children}</View>;
export const Polygon = ({ children }) => <View>{children}</View>;
export const Polyline = ({ children }) => <View>{children}</View>;
export const PROVIDER_GOOGLE = 'google';

const MockMapView = ({ children }) => <View>{children}</View>;
export default MockMapView;

import React from 'react';
import { Platform, View } from 'react-native';
import MapComponentNative from './MapComponent.native';
import MapComponentWeb from './MapComponent.web';
import { MapComponentProps } from './MapComponent.types';

export default function MapComponent({ style, ...rest }: MapComponentProps) {
	const Implementation = Platform.OS === 'web' ? MapComponentWeb : MapComponentNative;
	return React.createElement(View, { style }, React.createElement(Implementation, rest));
}

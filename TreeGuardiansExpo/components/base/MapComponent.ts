import React from 'react';
import { Platform } from 'react-native';
import MapComponentNative from './MapComponent.native';
import MapComponentWeb from './MapComponent.web';
import { MapComponentProps } from './MapComponent.types';

export default function MapComponent(props: MapComponentProps) {
	const Implementation = Platform.OS === 'web' ? MapComponentWeb : MapComponentNative;
	return React.createElement(Implementation, props);
}

import { StyleProp, ViewStyle } from 'react-native';
import { Tree } from '@/objects/TreeDetails';

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type PlotPointer = {
  latitude: number;
  longitude: number;
  screenX: number;
  screenY: number;
};

export interface MapComponentProps {
  style?: StyleProp<ViewStyle>;
  onPress?: (coordinate: MapCoordinate) => void;
  onTreeClick?: (tree: Tree) => void;
  isPlotting?: boolean;
  plottedTrees?: Tree[];
  renderTreeIcon?: (tree: Tree) => string;
  onPlotPointerMove?: (pointer: PlotPointer | null) => void;
}

export const BOUNDS = {
  southWest: { lat: 51.868, lng: -2.075 },
  northEast: { lat: 51.905, lng: -2.020 },
};

export const CENTER = {
  lat: (BOUNDS.southWest.lat + BOUNDS.northEast.lat) / 2,
  lng: (BOUNDS.southWest.lng + BOUNDS.northEast.lng) / 2,
};

export const MIN_ZOOM = 14;
export const MAX_ZOOM = 18;
export const BOUNDS_PADDING_RATIO = 0.08;

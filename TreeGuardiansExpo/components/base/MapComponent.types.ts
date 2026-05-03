import { StyleProp, ViewStyle } from 'react-native';
import { ReactElement } from 'react';
import { Tree } from '@/objects/TreeDetails';
import regionBoundsGeoJson from '@/assets/data/charlton_kings_region_bounds.json';

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

export type MapRenderContext = {
  zoom: number;
};

export interface MapComponentProps {
  style?: StyleProp<ViewStyle>;
  onPress?: (coordinate: MapCoordinate) => void;
  onTreeClick?: (tree: Tree) => void;
  isPlotting?: boolean;
  plottedTrees?: Tree[];
  selectedLocation?: MapCoordinate | null;
  renderTreeIcon?: (tree: Tree, context: MapRenderContext) => ReactElement;
  onPlotPointerMove?: (pointer: PlotPointer | null) => void;
}

type GeoJsonPolygon = {
  type: 'Polygon';
  coordinates: number[][][];
};

const regionPolygon = regionBoundsGeoJson as GeoJsonPolygon;
const regionOuterRing = regionPolygon.coordinates[0] ?? [];

const regionRingLatLng = regionOuterRing
  .filter((coordinate) => Array.isArray(coordinate) && coordinate.length >= 2)
  .map(([lng, lat]) => ({ lat, lng }));

const getBoundsFromRing = (ring: { lat: number; lng: number }[]) => {
  const fallback = {
    minLat: 51.868,
    maxLat: 51.905,
    minLng: -2.075,
    maxLng: -2.02,
  };

  if (ring.length === 0) {
    return fallback;
  }

  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;

  ring.forEach((point) => {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  });

  return { minLat, maxLat, minLng, maxLng };
};

const bounds = getBoundsFromRing(regionRingLatLng);
const latSpan = bounds.maxLat - bounds.minLat;
const lngSpan = bounds.maxLng - bounds.minLng;
const squareSide = Math.max(latSpan, lngSpan);
const latPad = (squareSide - latSpan) / 2;
const lngPad = (squareSide - lngSpan) / 2;

export const BOUNDS = {
  southWest: { lat: bounds.minLat - latPad, lng: bounds.minLng - lngPad },
  northEast: { lat: bounds.maxLat + latPad, lng: bounds.maxLng + lngPad },
};

export const CENTER = {
  lat: (BOUNDS.southWest.lat + BOUNDS.northEast.lat) / 2,
  lng: (BOUNDS.southWest.lng + BOUNDS.northEast.lng) / 2,
};

export const MIN_ZOOM = 14;
export const MAX_ZOOM = 18;
export const TILE_MAX_NATIVE_ZOOM = 19;
export const BOUNDS_PADDING_RATIO = 0.08;

const closeLatLngRing = (ring: [number, number][]): [number, number][] => {
  if (ring.length === 0) {
    return ring;
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  return first[0] === last[0] && first[1] === last[1] ? ring : [...ring, first];
};

export const REGION_RING_LEAFLET: [number, number][] = closeLatLngRing(
  regionRingLatLng.map(({ lat, lng }) => [lat, lng] as [number, number])
);

export const BOUNDS_SQUARE_RING_LEAFLET: [number, number][] = closeLatLngRing([
  [BOUNDS.southWest.lat, BOUNDS.southWest.lng],
  [BOUNDS.northEast.lat, BOUNDS.southWest.lng],
  [BOUNDS.northEast.lat, BOUNDS.northEast.lng],
  [BOUNDS.southWest.lat, BOUNDS.northEast.lng],
]);

export const MASK_OUTER_RING_LEAFLET: [number, number][] = closeLatLngRing([
  [-90, -180],
  [90, -180],
  [90, 180],
  [-90, 180],
]);

export const CHARLTON_CENTER = {
  latitude: 51.8865,
  longitude: -2.0475,
};

/** Outer ring as GeoJSON order: [lng, lat] — same geometry as the highlighted map boundary */
const CHARLTON_KINGS_RING_LNG_LAT: [number, number][] = regionOuterRing
  .filter((coordinate) => Array.isArray(coordinate) && coordinate.length >= 2)
  .map(([lng, lat]) => [lng, lat] as [number, number]);

const isPointInPolygonLngLat = (lng: number, lat: number, ring: [number, number][]): boolean => {
  if (ring.length < 3) {
    return false;
  }

  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi === yj) {
      continue;
    }
    const crossesHorizontalRay =
      (yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crossesHorizontalRay) {
      inside = !inside;
    }
  }
  return inside;
};

/** True only inside the Charlton Kings boundary polygon (matches the highlighted outline), not the padded map box */
export const isCoordinateWithinCharltonKingsBoundary = (coordinate: MapCoordinate): boolean => {
  return isPointInPolygonLngLat(coordinate.longitude, coordinate.latitude, CHARLTON_KINGS_RING_LNG_LAT);
};

export const isCoordinateWithinBounds = (coordinate: MapCoordinate): boolean => {
  return (
    coordinate.latitude >= BOUNDS.southWest.lat &&
    coordinate.latitude <= BOUNDS.northEast.lat &&
    coordinate.longitude >= BOUNDS.southWest.lng &&
    coordinate.longitude <= BOUNDS.northEast.lng
  );
};

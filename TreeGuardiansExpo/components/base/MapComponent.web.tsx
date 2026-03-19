import { useEffect, useRef } from 'react';
import { Tree } from '@/objects/TreeDetails';
import {
  BOUNDS,
  BOUNDS_PADDING_RATIO,
  CENTER,
  MapComponentProps,
  MAX_ZOOM,
  MIN_ZOOM,
} from './MapComponent.types';

type LeafletModule = typeof import('leaflet');
type LeafletMapInstance = InstanceType<LeafletModule['Map']>;
type LeafletLayerGroupInstance = InstanceType<LeafletModule['LayerGroup']>;

type LeafletMouseEvent = {
  latlng?: {
    lat: number;
    lng: number;
  };
  originalEvent?: {
    clientX: number;
    clientY: number;
  };
};

const ensureLeafletCss = () => {
  if (typeof document === 'undefined') {
    return;
  }

  const existing = document.getElementById('leaflet-css-runtime');
  if (existing) {
    return;
  }

  const link = document.createElement('link');
  link.id = 'leaflet-css-runtime';
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
};

export default function MapComponentWeb({
  onPress,
  onTreeClick,
  isPlotting = false,
  plottedTrees = [],
  renderTreeIcon,
  onPlotPointerMove,
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const onPressRef = useRef(onPress);
  const onPlotPointerMoveRef = useRef(onPlotPointerMove);
  const isPlottingRef = useRef(isPlotting);
  const leafletRef = useRef<LeafletModule | null>(null);
  const mapInstance = useRef<LeafletMapInstance | null>(null);
  const treeLayer = useRef<LeafletLayerGroupInstance | null>(null);

  useEffect(() => {
    onPressRef.current = onPress;
  }, [onPress]);

  useEffect(() => {
    onPlotPointerMoveRef.current = onPlotPointerMove;
  }, [onPlotPointerMove]);

  useEffect(() => {
    isPlottingRef.current = isPlotting;
  }, [isPlotting]);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) {
      return;
    }

    let isDisposed = false;

    const setupMap = async () => {
      ensureLeafletCss();

      const Leaflet = await import('leaflet');
      if (isDisposed || !mapRef.current) {
        return;
      }

      leafletRef.current = Leaflet;

      if ((mapRef.current as unknown as Record<string, unknown>)._leaflet_id) {
        return;
      }

      const hardBounds = Leaflet.latLngBounds(
        [BOUNDS.southWest.lat, BOUNDS.southWest.lng],
        [BOUNDS.northEast.lat, BOUNDS.northEast.lng]
      );
      const interactionBounds = hardBounds.pad(BOUNDS_PADDING_RATIO);

      const map = Leaflet.map(mapRef.current, {
        center: [CENTER.lat, CENTER.lng],
        zoom: MIN_ZOOM,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        maxBounds: interactionBounds,
        maxBoundsViscosity: 0.85,
        zoomControl: false,
      });

      Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      const tilePane = map.getPane('tilePane');
      if (tilePane) {
        tilePane.style.filter = 'saturate(0.74) contrast(0.92) brightness(0.98)';
      }

      Leaflet.control.zoom({ position: 'topright' }).addTo(map);

      treeLayer.current = Leaflet.layerGroup().addTo(map);
      mapInstance.current = map;

      map.on('click', (event: unknown) => {
        if (!onPressRef.current) {
          return;
        }

        const e = event as LeafletMouseEvent;
        if (!e.latlng) {
          return;
        }

        onPressRef.current({
          latitude: e.latlng.lat,
          longitude: e.latlng.lng,
        });
      });

      map.on('mousemove', (event: unknown) => {
        if (!isPlottingRef.current || !onPlotPointerMoveRef.current) {
          return;
        }

        const e = event as LeafletMouseEvent;
        if (!e.latlng || !e.originalEvent) {
          return;
        }

        onPlotPointerMoveRef.current({
          latitude: e.latlng.lat,
          longitude: e.latlng.lng,
          screenX: e.originalEvent.clientX,
          screenY: e.originalEvent.clientY,
        });
      });

      map.on('mouseout', () => {
        if (!onPlotPointerMoveRef.current) {
          return;
        }
        onPlotPointerMoveRef.current(null);
      });

      setTimeout(() => map.invalidateSize(), 0);
    };

    void setupMap();

    return () => {
      isDisposed = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      treeLayer.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current) {
      return;
    }

    const container = mapInstance.current.getContainer();
    container.style.cursor = isPlotting ? 'crosshair' : '';
  }, [isPlotting]);

  useEffect(() => {
    if (!treeLayer.current || !leafletRef.current) {
      return;
    }

    const Leaflet = leafletRef.current;

    treeLayer.current.clearLayers();

    plottedTrees.forEach((tree: Tree) => {
      const html = renderTreeIcon ? renderTreeIcon(tree) : '🌳';
      const icon = Leaflet.divIcon({
        html,
        className: '',
        iconSize: [50, 50],
        iconAnchor: [25, 25],
      });

      const marker = Leaflet.marker([tree.latitude, tree.longitude], { icon }).addTo(treeLayer.current!);
      marker.on('click', () => {
        if (onTreeClick) {
          onTreeClick(tree);
        }
      });
    });
  }, [plottedTrees, renderTreeIcon, onTreeClick]);

  return <div ref={mapRef} style={{ height: '100%', width: '100%', position: 'relative', zIndex: 0 }} />;
}

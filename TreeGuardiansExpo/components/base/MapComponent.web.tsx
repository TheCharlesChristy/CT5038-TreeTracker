import { useCallback, useEffect, useRef, useState } from 'react';
import { Tree } from '@/objects/TreeDetails';
import { getTreeMarkerIconHtml } from '@/components/map/TreeMarkerIcon';
import {
  BOUNDS,
  BOUNDS_PADDING_RATIO,
  CENTER,
  MASK_OUTER_RING_LEAFLET,
  MapComponentProps,
  MAX_ZOOM,
  MIN_ZOOM,
  REGION_RING_LEAFLET,
  TILE_MAX_NATIVE_ZOOM,
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
  const [isMapReady, setIsMapReady] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(MIN_ZOOM);

  useEffect(() => {
    onPressRef.current = onPress;
  }, [onPress]);

  useEffect(() => {
    onPlotPointerMoveRef.current = onPlotPointerMove;
  }, [onPlotPointerMove]);

  useEffect(() => {
    isPlottingRef.current = isPlotting;
  }, [isPlotting]);

  const buildIconHtml = useCallback((tree: Tree) => {
    if (!renderTreeIcon) {
      return getTreeMarkerIconHtml({ zoomLevel: currentZoom });
    }

    const renderedIcon = renderTreeIcon(tree, { zoom: currentZoom });
    const props =
      renderedIcon && typeof renderedIcon === 'object' && 'props' in renderedIcon
        ? (renderedIcon.props as { selected?: boolean; zoomLevel?: number })
        : undefined;

    return getTreeMarkerIconHtml({
      selected: Boolean(props?.selected),
      zoomLevel: typeof props?.zoomLevel === 'number' ? props.zoomLevel : currentZoom,
    });
  }, [currentZoom, renderTreeIcon]);

  const syncTreeMarkers = useCallback(() => {
    if (!treeLayer.current || !leafletRef.current) {
      return;
    }

    const Leaflet = leafletRef.current;

    treeLayer.current.clearLayers();

    plottedTrees.forEach((tree: Tree) => {
      const html = buildIconHtml(tree);
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
  }, [buildIconHtml, onTreeClick, plottedTrees]);

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
        maxNativeZoom: TILE_MAX_NATIVE_ZOOM,
      }).addTo(map);

      const tilePane = map.getPane('tilePane');
      if (tilePane) {
        tilePane.style.filter = 'saturate(0.74) contrast(0.92) brightness(0.98)';
      }

      Leaflet.control.zoom({ position: 'topright' }).addTo(map);

      Leaflet.polygon([MASK_OUTER_RING_LEAFLET, REGION_RING_LEAFLET], {
        stroke: false,
        fillColor: '#9ca3af',
        fillOpacity: 0.45,
        fillRule: 'evenodd',
        noClip: true,
        interactive: false,
      }).addTo(map);

      Leaflet.polygon(REGION_RING_LEAFLET, {
        color: '#4b5563',
        weight: 2,
        opacity: 0.75,
        fill: false,
        interactive: false,
      }).addTo(map);

      treeLayer.current = Leaflet.layerGroup().addTo(map);
      mapInstance.current = map;
      setCurrentZoom(map.getZoom());
      setIsMapReady(true);

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

      map.on('zoomend', () => {
        setCurrentZoom(map.getZoom());
      });

      setTimeout(() => map.invalidateSize(), 0);
    };

    void setupMap();

    return () => {
      isDisposed = true;
      setIsMapReady(false);
      setCurrentZoom(MIN_ZOOM);
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
    if (!isMapReady) {
      return;
    }

    syncTreeMarkers();
  }, [isMapReady, syncTreeMarkers]);

  return <div ref={mapRef} style={{ height: '100%', width: '100%', position: 'relative', zIndex: 0 }} />;
}

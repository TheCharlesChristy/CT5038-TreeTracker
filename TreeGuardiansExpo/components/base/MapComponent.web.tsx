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
import { fetchOtmTreesInBbox, OtmTree } from '@/lib/otmApi';

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

function getOtmMarkerIconHtml(selected = false): string {
  const size = selected ? 44 : 36;
  return `<div style="
    width:${size}px;height:${size}px;border-radius:50%;
    background:rgba(202,104,20,0.88);
    border:2.5px solid rgba(255,220,180,0.9);
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 8px rgba(120,60,0,0.35);
    cursor:pointer;
  ">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="5" fill="rgba(255,255,255,0.9)"/>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="rgba(255,255,255,0.5)"/>
    </svg>
  </div>`;
}

export default function MapComponentWeb({
  onPress,
  onTreeClick,
  isPlotting = false,
  plottedTrees = [],
  selectedLocation = null,
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
  const selectedLocationLayer = useRef<LeafletLayerGroupInstance | null>(null);
  const otmLayer = useRef<LeafletLayerGroupInstance | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(MIN_ZOOM);
  const [showOtmTrees, setShowOtmTrees] = useState(true);
  const [otmTrees, setOtmTrees] = useState<OtmTree[]>([]);
  const [selectedOtmTree, setSelectedOtmTree] = useState<OtmTree | null>(null);

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

  const syncOtmMarkers = useCallback(() => {
    if (!otmLayer.current || !leafletRef.current) return;
    const Leaflet = leafletRef.current;
    otmLayer.current.clearLayers();
    if (!showOtmTrees) return;

    otmTrees.forEach((tree) => {
      const icon = Leaflet.divIcon({
        html: getOtmMarkerIconHtml(false),
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      const marker = Leaflet.marker([tree.latitude, tree.longitude], { icon }).addTo(otmLayer.current!);
      const speciesLabel = tree.species ?? 'Unknown species';
      const diameterLabel = tree.diameter != null ? `${tree.diameter}" DBH` : '';
      const conditionLabel = tree.condition ?? '';
      const otmLink = tree.otmUrl ? `<a href="${tree.otmUrl}" target="_blank" rel="noopener noreferrer" style="color:#b45309;">View on OTM ↗</a>` : '';
      marker.bindPopup(`
        <div style="min-width:180px;font-family:sans-serif;font-size:13px;">
          <div style="font-weight:700;color:#92400e;margin-bottom:4px;">${speciesLabel}</div>
          ${tree.scientificName ? `<div style="font-style:italic;color:#6b7280;margin-bottom:4px;">${tree.scientificName}</div>` : ''}
          ${diameterLabel ? `<div style="color:#374151;">Diameter: ${diameterLabel}</div>` : ''}
          ${conditionLabel ? `<div style="color:#374151;">Condition: ${conditionLabel}</div>` : ''}
          <div style="margin-top:6px;font-size:11px;color:#9ca3af;">Source: OpenTreeMap</div>
          ${otmLink ? `<div style="margin-top:4px;">${otmLink}</div>` : ''}
        </div>
      `);
      marker.on('click', () => setSelectedOtmTree(tree));
    });
  }, [showOtmTrees, otmTrees]);

  const syncSelectedLocationMarker = useCallback(() => {
    if (!selectedLocationLayer.current || !leafletRef.current) {
      return;
    }

    const Leaflet = leafletRef.current;
    selectedLocationLayer.current.clearLayers();

    if (!selectedLocation) {
      return;
    }

    const html = getTreeMarkerIconHtml({
      selected: true,
      zoomLevel: currentZoom,
    }).replace(/rgba\(14, 56, 25, 0\.82\)/g, 'rgba(202, 104, 20, 0.92)')
      .replace(/rgba\(14, 56, 25, 0\.62\)/g, 'rgba(202, 104, 20, 0.74)')
      .replace(/rgba\(18, 72, 32, 0\.5\)/g, 'rgba(120, 58, 8, 0.56)')
      .replace(/rgba\(214, 232, 219, 0\.85\)/g, 'rgba(255, 233, 210, 0.92)');

    const icon = Leaflet.divIcon({
      html,
      className: '',
      iconSize: [63, 63],
      iconAnchor: [31.5, 31.5],
    });

    Leaflet.marker([selectedLocation.latitude, selectedLocation.longitude], { icon }).addTo(
      selectedLocationLayer.current
    );
  }, [currentZoom, selectedLocation]);

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
      otmLayer.current = Leaflet.layerGroup().addTo(map);
      selectedLocationLayer.current = Leaflet.layerGroup().addTo(map);
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
      otmLayer.current = null;
      selectedLocationLayer.current = null;
      leafletRef.current = null;
    };
  }, []);

  // Fetch OTM trees whenever the map viewport changes (debounced via moveend)
  useEffect(() => {
    if (!isMapReady || !mapInstance.current) return;
    const map = mapInstance.current;

    const onMoveEnd = () => {
      const bounds = map.getBounds();
      fetchOtmTreesInBbox({
        swLat: bounds.getSouth(),
        swLng: bounds.getWest(),
        neLat: bounds.getNorth(),
        neLng: bounds.getEast(),
      })
        .then((trees) => setOtmTrees(trees))
        .catch(() => {/* OTM unavailable — our trees continue to display normally */});
    };

    map.on('moveend', onMoveEnd);
    onMoveEnd(); // initial fetch on mount

    return () => { map.off('moveend', onMoveEnd); };
  }, [isMapReady]);

  useEffect(() => {
    if (!isMapReady) return;
    syncOtmMarkers();
  }, [isMapReady, syncOtmMarkers]);

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

  useEffect(() => {
    if (!isMapReady) {
      return;
    }

    syncSelectedLocationMarker();
  }, [isMapReady, syncSelectedLocationMarker]);

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', zIndex: 0 }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      {/* OTM toggle — bottom-left, above Leaflet controls */}
      <button
        onClick={() => setShowOtmTrees((v) => !v)}
        title={showOtmTrees ? 'Hide OpenTreeMap trees' : 'Show OpenTreeMap trees'}
        style={{
          position: 'absolute',
          bottom: 24,
          left: 12,
          zIndex: 1000,
          padding: '6px 10px',
          borderRadius: 8,
          border: '1px solid rgba(202,104,20,0.6)',
          background: showOtmTrees ? 'rgba(202,104,20,0.88)' : 'rgba(255,255,255,0.9)',
          color: showOtmTrees ? '#fff' : '#92400e',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
        }}
      >
        {showOtmTrees ? '🌳 OTM: On' : '🌳 OTM: Off'}
      </button>
    </div>
  );
}

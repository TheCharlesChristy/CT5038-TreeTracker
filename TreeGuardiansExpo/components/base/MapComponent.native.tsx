import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { Tree } from '@/objects/TreeDetails';
import { getTreeMarkerIconHtml } from '@/components/map/TreeMarkerIcon';
import leafletBundle from './leafletBundle.json';
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

export default function MapComponentNative({
  style,
  onPress,
  onViewportCenterChange,
  onTreeClick,
  plottedTrees = [],
  selectedLocation = null,
  renderTreeIcon,
  onPlotPointerMove,
}: MapComponentProps) {
  const webViewRef = useRef<WebView | null>(null);
  const maskOuterRingJson = JSON.stringify(MASK_OUTER_RING_LEAFLET);
  const regionRingJson = JSON.stringify(REGION_RING_LEAFLET);
  const leafletCss = leafletBundle.css;
  const leafletJs = leafletBundle.js.replace(/<\/script/gi, '<\\/script');
  const [isWebViewReady, setIsWebViewReady] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(MIN_ZOOM);

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

  useEffect(() => {
    if (onPlotPointerMove) {
      onPlotPointerMove(null);
    }
  }, [onPlotPointerMove]);

  const syncTreesToMap = useCallback(() => {
    if (!webViewRef.current || !isWebViewReady) {
      return;
    }

    const treesToSend = plottedTrees.map((tree) => ({
      ...tree,
      iconHtml: buildIconHtml(tree),
    }));

    webViewRef.current.postMessage(
      JSON.stringify({
        type: 'updateTrees',
        plottedTrees: treesToSend,
        selectedLocation,
        selectedLocationIconHtml: getTreeMarkerIconHtml({
          selected: true,
          zoomLevel: currentZoom,
        }).replace(/rgba\(14, 56, 25, 0\.82\)/g, 'rgba(202, 104, 20, 0.92)')
          .replace(/rgba\(14, 56, 25, 0\.62\)/g, 'rgba(202, 104, 20, 0.74)')
          .replace(/rgba\(18, 72, 32, 0\.5\)/g, 'rgba(120, 58, 8, 0.56)')
          .replace(/rgba\(214, 232, 219, 0\.85\)/g, 'rgba(255, 233, 210, 0.92)'),
      })
    );
  }, [buildIconHtml, currentZoom, isWebViewReady, plottedTrees, selectedLocation]);

  useEffect(() => {
    syncTreesToMap();
  }, [syncTreesToMap]);

  const leafletHTML = `
  <!DOCTYPE html>
  <html>
  <head>
  <meta name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
  ${leafletCss}

  html, body, #map {
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  .leaflet-tile-pane {
    filter: saturate(0.74) contrast(0.92) brightness(0.98);
  }
  </style>
  </head>
  <body>
  <div id="map"></div>

  <script>
  ${leafletJs}
  </script>

  <script>
  function initMap() {
    if (window.__treeTrackerMapInitialized) {
      return;
    }
    window.__treeTrackerMapInitialized = true;

    var southWest = L.latLng(${BOUNDS.southWest.lat}, ${BOUNDS.southWest.lng});
    var northEast = L.latLng(${BOUNDS.northEast.lat}, ${BOUNDS.northEast.lng});
    var hardBounds = L.latLngBounds(southWest, northEast);
    var interactionBounds = hardBounds.pad(${BOUNDS_PADDING_RATIO});

    var map = L.map('map', {
      center: [${CENTER.lat}, ${CENTER.lng}],
      zoom: ${MIN_ZOOM},
      minZoom: ${MIN_ZOOM},
      maxZoom: ${MAX_ZOOM},
      maxBounds: interactionBounds,
      maxBoundsViscosity: 0.85,
      zoomControl: false
    });

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '© OpenStreetMap contributors',
        maxNativeZoom: ${TILE_MAX_NATIVE_ZOOM}
      }
    ).addTo(map);

    var maskOuterRing = ${maskOuterRingJson};
    var regionRing = ${regionRingJson};

    L.polygon([maskOuterRing, regionRing], {
      stroke: false,
      fillColor: '#9ca3af',
      fillOpacity: 0.45,
      fillRule: 'evenodd',
      noClip: true,
      interactive: false
    }).addTo(map);

    L.polygon(regionRing, {
      color: '#4b5563',
      weight: 2,
      opacity: 0.75,
      fill: false,
      interactive: false
    }).addTo(map);

    var treeLayer = L.layerGroup().addTo(map);
    var selectedLocationLayer = L.layerGroup().addTo(map);

    map.on('click', function(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'mapPress',
        latitude: e.latlng.lat,
        longitude: e.latlng.lng
      }));
    });

    map.on('zoomend', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'zoomChange',
        zoom: map.getZoom()
      }));
    });

    map.on('moveend', function() {
      var center = map.getCenter();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'viewportCenterChange',
        latitude: center.lat,
        longitude: center.lng
      }));
    });

    function handleMessage(event) {
      const data = JSON.parse(event.data);

      if (data.type === 'updateTrees' && data.plottedTrees) {
        treeLayer.clearLayers();
        selectedLocationLayer.clearLayers();

        data.plottedTrees.forEach(function(tree) {
          const html = tree.iconHtml || '🌳';

          const icon = L.divIcon({html, className: '', iconSize: [50,50], iconAnchor: [25,25] });
          const marker = L.marker([tree.latitude, tree.longitude], { icon }).addTo(treeLayer);

          marker.on('click', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'treeClick',
            tree: tree
            }));
          });
        });

        if (data.selectedLocation && typeof data.selectedLocation.latitude === 'number' && typeof data.selectedLocation.longitude === 'number') {
          const selectedIcon = L.divIcon({
            html: data.selectedLocationIconHtml || '🌳',
            className: '',
            iconSize: [63, 63],
            iconAnchor: [31.5, 31.5]
          });

          L.marker([data.selectedLocation.latitude, data.selectedLocation.longitude], { icon: selectedIcon }).addTo(selectedLocationLayer);
        }
      }
    }

    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);

    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'mapReady',
      zoom: map.getZoom()
    }));
  }

  window.onload = initMap;
  </script>

  </body>
  </html>
  `;

  return (
    <View style={style}>
      {Platform.OS === 'web' ? null : (
        <WebView
          originWhitelist={['*']}
          source={{ html: leafletHTML }}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
          ref={webViewRef}
          onMessage={(event: WebViewMessageEvent) => {
            let data: unknown;
            try {
              data = JSON.parse(event.nativeEvent.data);
            } catch {
              return;
            }

            if (!data || typeof data !== 'object') {
              return;
            }

            const typedData = data as {
              type?: string;
              latitude?: number;
              longitude?: number;
              zoom?: number;
              tree?: Tree;
            };

            if (typedData.type === 'mapReady') {
              setIsWebViewReady(true);
              if (typeof typedData.zoom === 'number') {
                setCurrentZoom(typedData.zoom);
              }
            } else if (typedData.type === 'zoomChange' && typeof typedData.zoom === 'number') {
              setCurrentZoom(typedData.zoom);
            } else if (
              typedData.type === 'viewportCenterChange' &&
              onViewportCenterChange &&
              typeof typedData.latitude === 'number' &&
              typeof typedData.longitude === 'number'
            ) {
              onViewportCenterChange({ latitude: typedData.latitude, longitude: typedData.longitude });
            } else if (
              typedData.type === 'mapPress' &&
              onPress &&
              typeof typedData.latitude === 'number' &&
              typeof typedData.longitude === 'number'
            ) {
              onPress({ latitude: typedData.latitude, longitude: typedData.longitude });
            } else if (typedData.type === 'treeClick' && onTreeClick && typedData.tree) {
              onTreeClick(typedData.tree);
            }
          }}
          onLoadStart={() => {
            setIsWebViewReady(false);
            setCurrentZoom(MIN_ZOOM);
          }}
        />
      )}
    </View>
  );
}

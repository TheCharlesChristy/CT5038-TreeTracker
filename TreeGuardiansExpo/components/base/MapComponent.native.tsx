import { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { Tree } from '@/objects/TreeDetails';
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
  onTreeClick,
  plottedTrees = [],
  renderTreeIcon,
  onPlotPointerMove,
}: MapComponentProps) {
  const webViewRef = useRef<WebView | null>(null);
  const maskOuterRingJson = JSON.stringify(MASK_OUTER_RING_LEAFLET);
  const regionRingJson = JSON.stringify(REGION_RING_LEAFLET);

  useEffect(() => {
    if (onPlotPointerMove) {
      onPlotPointerMove(null);
    }
  }, [onPlotPointerMove]);

  useEffect(() => {
    if (!webViewRef.current) {
      return;
    }

    const treesToSend = plottedTrees.map((tree) => ({
      ...tree,
      iconHtml: renderTreeIcon ? renderTreeIcon(tree) : '🌳',
    }));

    webViewRef.current.postMessage(
      JSON.stringify({
        type: 'updateTrees',
        plottedTrees: treesToSend,
      })
    );
  }, [plottedTrees, renderTreeIcon]);

  const leafletHTML = `
  <!DOCTYPE html>
  <html>
  <head>
  <meta name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
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
  <link rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  </head>
  <body>
  <div id="map"></div>

  <script>
  function initMap() {
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

    L.control.zoom({ position: 'topright' }).addTo(map);

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

    map.on('click', function(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'mapPress',
        latitude: e.latlng.lat,
        longitude: e.latlng.lng
      }));
    });

    function handleMessage(event) {
      const data = JSON.parse(event.data);

      if (data.type === 'updateTrees' && data.plottedTrees) {
        treeLayer.clearLayers();

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
      }
    }

    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);
  }

  window.onload = initMap;
  </script>

  <script
  src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  onload="initMap()">
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
              tree?: Tree;
            };

            if (
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
        />
      )}
    </View>
  );
}

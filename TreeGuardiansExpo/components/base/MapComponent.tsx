import { Platform, View, StyleProp, ViewStyle } from 'react-native';
import { useEffect, useRef } from 'react';
import { WebViewMessageEvent } from 'react-native-webview';
import { Tree } from '@/objects/TreeDetails';

interface MapComponentProps {
  style?: StyleProp<ViewStyle>;

  onPress?: (coordinate: {latitude: number; longitude: number; }) => void;
  onTreeClick?: (tree: Tree) => void;

  isPlotting?: boolean;
  plottedTrees?: Tree[];
  renderTreeIcon?: (tree: Tree) => string;
}

// Bounding box for Charlton Kings in Cheltenham
// Southwest corner -> Northeast corner
const BOUNDS = {
  southWest: { lat: 51.868, lng: -2.075 },
  northEast: { lat: 51.905, lng: -2.020 },
};

const CENTER = { lat: 51.886, lng: -2.047 };
const MIN_ZOOM = 14; // Can't zoom out past this — keeps user inside the area
const MAX_ZOOM = 18;

// ===============================
// Web Version
// ===============================

function MapWeb({
  onPress,
  onTreeClick,
  isPlotting = false,
  plottedTrees = [],
  renderTreeIcon,

}: MapComponentProps) {
  const mapRef = useRef<any>(null);
  const onPressRef = useRef(onPress);
  const mapInstance = useRef<any>(null);
  const treeLayer = useRef<any>(null);

  useEffect(() => {
    onPressRef.current = onPress;
  }, [onPress]);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    require('leaflet/dist/leaflet.css');
    const L = require('leaflet');

    if (mapRef.current._leaflet_id) return;

    const bounds = L.latLngBounds(
      [BOUNDS.southWest.lat, BOUNDS.southWest.lng],
      [BOUNDS.northEast.lat, BOUNDS.northEast.lng]
    );

    const map = L.map(mapRef.current, {
      center: [CENTER.lat, CENTER.lng],
      zoom: MIN_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0,
      zoomControl: false,
    });

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '© OpenStreetMap contributors' }
    ).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    treeLayer.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    map.on('click', function (e: any) {
      if (!onPressRef.current) return;

      onPressRef.current({
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      });
    });

    setTimeout(() => map.invalidateSize(), 0);

    return () => map.remove();
  }, []);

  // Cursor change in plot mode
  useEffect(() => {
    if (!mapInstance.current) return;

    const container = mapInstance.current.getContainer();
    container.style.cursor = isPlotting ? 'crosshair' : '';
  }, [isPlotting]);

  // Rendering plotted trees
  useEffect(() => {
    if (!treeLayer.current) return;

    const L = require('leaflet');
    treeLayer.current.clearLayers();

    plottedTrees.forEach((tree) => {
      const html = renderTreeIcon ? renderTreeIcon(tree) : '🌳';

      const icon = L.divIcon({
        html,
        className: '',
        iconSize: [50, 50],
        iconAnchor: [25, 25],
      });

      const marker = L.marker([tree.latitude, tree.longitude], { icon }).addTo(treeLayer.current);

      // adding a click listener
      marker.on('click', () => {
        if (onTreeClick) {
          onTreeClick(tree)
        }
      })
    });
  }, [plottedTrees, renderTreeIcon]);

  return (
    <div
      ref={mapRef}
      style={{ height: '100%', width: '100%' }}
    />
  );
}

// ===============================
// Mobile Version
// ===============================

function MapMobile({
 onPress, onTreeClick, isPlotting = false, plottedTrees = [], renderTreeIcon} : MapComponentProps) {
  const WebView = require('react-native-webview').default;
  const webViewRef = useRef<any>(null);

  // send tree updates to WebView. Not the most efficient of methods but for the scale of this project and not having tens of thousands of trees and users, 
  // it makes it so there is a single source of trees to update and send from especially since this mapview is not global and only to charlton kings
  useEffect(() => {
    if (!webViewRef.current) return;

    const treesToSend = plottedTrees.map((tree) => ({
      ...tree, // spreads tree details
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
    var bounds = L.latLngBounds(southWest, northEast);

    var map = L.map('map', {
      center: [${CENTER.lat}, ${CENTER.lng}],
      zoom: ${MIN_ZOOM},
      minZoom: ${MIN_ZOOM},
      maxZoom: ${MAX_ZOOM},
      maxBounds: bounds,
      maxBoundsViscosity: 1.0,
      zoomControl: false
    });

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '© OpenStreetMap contributors', bounds: bounds }
    ).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

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

          // adding click event
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
    <WebView
      originWhitelist={['*']}
      source={{ html: leafletHTML }}
      style={{ flex: 1 }}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      ref={webViewRef}

      onMessage={(event: WebViewMessageEvent) => {
        const data = JSON.parse(event.nativeEvent.data);

        if (data.type === 'mapPress' && onPress) {
          onPress?.({latitude: data.latitude, longitude: data.longitude});

        } else if (data.type === 'treeClick' && onTreeClick) {
          onTreeClick(data.tree);
        }
      }}
    />
  );
}

// ===============================
// Main Export
// ===============================

export default function MapComponent({
  style,
  onPress,
  onTreeClick,
  isPlotting,
  plottedTrees,
  renderTreeIcon,
}: MapComponentProps) {
  return (
    <View style={style}>
      {Platform.OS === 'web' ? (
        <MapWeb
          onPress={onPress}
          onTreeClick={onTreeClick}
          isPlotting={isPlotting}
          plottedTrees={plottedTrees}
          renderTreeIcon={renderTreeIcon}
        />
      ) : (
        <MapMobile
          onPress={onPress}
          onTreeClick={onTreeClick}
          isPlotting={isPlotting}
          plottedTrees={plottedTrees}
          renderTreeIcon={renderTreeIcon}
        />
      )}
    </View>
  );
}
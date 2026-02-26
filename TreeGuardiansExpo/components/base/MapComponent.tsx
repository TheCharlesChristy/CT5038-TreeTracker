import { Platform, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';

interface MapComponentProps {
  style?: StyleProp<ViewStyle>;
}

// Bounding box for Charlton Kings in cheltenham
// Southwest corner -> Northeast corner
const BOUNDS = {
  southWest: { lat: 51.868, lng: -2.075 },
  northEast: { lat: 51.905, lng: -2.020 },
};
const CENTER = { lat: 51.886, lng: -2.047 };
const MIN_ZOOM = 14; // Can't zoom out past this — keeps user inside the area
const MAX_ZOOM = 18;

function MapWeb() {
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    // Importing CSS to render the tiles
    require('leaflet/dist/leaflet.css');
    const L = require('leaflet');

    // Guard against double init
    if (mapRef.current._leaflet_id) return;

    const bounds = L.latLngBounds(
      [BOUNDS.southWest.lat, BOUNDS.southWest.lng],
      [BOUNDS.northEast.lat, BOUNDS.northEast.lng]
    )

    const map = L.map(mapRef.current, {
      center: [CENTER.lat, CENTER.lng],
      zoom: MIN_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      // Clamps the panning so that the user cannot scroll outside
      maxBounds: bounds,
      // The boundary will bound back (0 = Instant stop, higher becomes more bouncy)
      maxBoundsViscosity: 1.0,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // changing the zoom button spot
    L.control.zoom({
      position: 'topright'
    }).addTo(map);

    // Recalculating the container dimensions after render
    setTimeout(() => map.invalidateSize(), 0);

    return () => map.remove();
  }, []);

  // Return raw div — only valid on web
  return <div ref={mapRef} style={{ height: '100%', width: '100%' }} />;
}

function MapMobile() {
  const WebView = require('react-native-webview').default;
  
  const leafletHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        html, body, #map {
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      </style>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    </head>
    <body>
      <div id="map"></div>

      <!--
        initMap is defined first as a plain function.
        The <script> tag for Leaflet then calls it via onload=
        so initMap only ever runs AFTER L is guaranteed to exist.
      -->

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

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            // Ensures tiles outside the bounds aren't even requested
            bounds: bounds,
          }).addTo(map);

          // changing the zoom button spot
          L.control.zoom({
            position: 'topright'
          }).addTo(map);

          // Hard clamp on moveend as a belt-and-braces fallback for Android touch inertia carrying past maxBounds
          map.on('moveend', function () {
            if (!bounds.contains(map.getCenter())) {
              map.panInsideBounds(bounds, { animate: false });
            }
          });

          // Also clamp during move, not just after — stops inertia drift mid-gesture
          map.on('move', function () {
            var center = map.getCenter();
            var clampedLat = Math.max(southWest.lat, Math.min(northEast.lat, center.lat));
            var clampedLng = Math.max(southWest.lng, Math.min(northEast.lng, center.lng));
            if (clampedLat !== center.lat || clampedLng !== center.lng) {
              map.panTo([clampedLat, clampedLng], { animate: false });
            }
          });

          setTimeout(function () { map.invalidateSize(); }, 200);
        }
      </script>

      <!-- onload= guarantees initMap runs only after L is fully parsed and ready -->
      <script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        onload="initMap()"
      ></script>
    </body>
    </html>
  `;

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html: leafletHTML }}
      style={{ flex: 1 }}
      javaScriptEnabled={true}  // Required for some android versions
      domStorageEnabled={true}   // Prevents tile catching on android
      scalesPageToFit={false}
      mixedContentMode="always"
    />
  );
}

export default function MapComponent({ style }: MapComponentProps) {
  return (
    <View style={ style }>
      {Platform.OS === 'web' ? <MapWeb /> : <MapMobile />}
    </View>
  );
}
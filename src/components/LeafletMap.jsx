import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../theme';
import { T } from './T';
import { MAP_HTML } from './mapHtml';

// خريطة Leaflet + OpenStreetMap داخل WebView — مجانية بالكامل ومن غير أي API key



export default function LeafletMap({
  markers = [],
  center = null,
  zoom = null,
  pickMode = false,
  pickPosition = null,
  myPosition = null,
  followMe = false,
  route = null,
  onMarkerPress = null,
  onPick = null,
  style = null,
}) {
  const webRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const markersKey = useMemo(() => JSON.stringify(markers), [markers]);
  const routeKey = useMemo(() => JSON.stringify(route), [route]);

  function post(obj) {
    webRef.current?.postMessage(JSON.stringify(obj));
  }

  useEffect(() => {
    if (ready) post({ type: 'markers', markers });
  }, [ready, markersKey]);

  useEffect(() => {
    if (ready && center) post({ type: 'center', lat: center.lat, lng: center.lng, zoom: zoom || 15 });
  }, [ready, center ? center.lat : null, center ? center.lng : null, zoom]);

  useEffect(() => {
    if (ready) post({ type: 'pickMode', on: pickMode, lat: pickPosition?.lat, lng: pickPosition?.lng });
  }, [ready, pickMode]);

  useEffect(() => {
    if (ready && pickMode && pickPosition) post({ type: 'setPick', lat: pickPosition.lat, lng: pickPosition.lng });
  }, [ready, pickPosition ? pickPosition.lat : null, pickPosition ? pickPosition.lng : null]);

  useEffect(() => {
    if (ready && myPosition) post({ type: 'me', lat: myPosition.lat, lng: myPosition.lng, follow: followMe });
  }, [ready, followMe, myPosition ? myPosition.lat : null, myPosition ? myPosition.lng : null]);

  useEffect(() => {
    if (ready) post({ type: 'route', coords: route });
  }, [ready, routeKey]);

  function handleMessage(event) {
    let msg;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch (e) {
      return;
    }
    if (msg.type === 'ready') {
      setReady(true);
    } else if (msg.type === 'marker') {
      onMarkerPress?.(msg.id);
    } else if (msg.type === 'pick') {
      onPick?.({ lat: msg.lat, lng: msg.lng });
    }
  }

  return (
    <View style={[styles.wrap, style]}>
      <WebView
        ref={webRef}
        source={{ html: MAP_HTML, baseUrl: 'https://localhost' }}
        style={styles.web}
        onMessage={handleMessage}
        onLoadEnd={() => setLoading(false)}
        originWhitelist={['*']}
        mixedContentMode="always"
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
      />
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.teal} size="large" />
          <T style={styles.loadingText}>بنحمّل الخريطة…</T>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden', backgroundColor: '#E8EEF4' },
  web: { flex: 1, backgroundColor: '#E8EEF4' },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8EEF4',
  },
  loadingText: { marginTop: 8, color: colors.textSoft, fontSize: 14 },
});

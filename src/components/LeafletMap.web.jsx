import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../theme';
import { T } from './T';

// نسخة الويب من الخريطة (نفس الـ HTML جوه iframe)
// بتتستخدم تلقائيًا لما التطبيق يتبني للويب — الأندرويد بيستخدم LeafletMap.jsx

import { MAP_HTML } from './mapHtml';

export default function LeafletMap(props) {
  const {
    markers = [],
    center = null,
    zoom = null,
    pickMode = false,
    pickPosition = null,
    myPosition = null,
    onMarkerPress = null,
    onPick = null,
    style = null,
  } = props;
  const frameRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const markersKey = useMemo(() => JSON.stringify(markers), [markers]);

  function post(obj) {
    frameRef.current?.contentWindow?.postMessage(JSON.stringify(obj), '*');
  }

  useEffect(() => {
    function onMsg(e) {
      try {
        const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (!msg || !msg.type) return;
        if (msg.type === 'ready') setReady(true);
        else if (msg.type === 'marker') onMarkerPress?.(msg.id);
        else if (msg.type === 'pick') onPick?.({ lat: msg.lat, lng: msg.lng });
      } catch (err) {}
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onMarkerPress, onPick]);

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
    if (ready && myPosition) post({ type: 'me', lat: myPosition.lat, lng: myPosition.lng });
  }, [ready, myPosition ? myPosition.lat : null, myPosition ? myPosition.lng : null]);

  return (
    <View style={[styles.wrap, style]}>
      <iframe
        ref={frameRef}
        srcDoc={MAP_HTML}
        style={{ flex: 1, width: '100%', height: '100%', border: 'none', backgroundColor: '#E8EEF4' }}
        onLoad={() => setLoading(false)}
        title="map"
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
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8EEF4',
  },
  loadingText: { marginTop: 8, color: colors.textSoft, fontSize: 14 },
});

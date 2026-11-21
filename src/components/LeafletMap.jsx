import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../theme';

// خريطة Leaflet + OpenStreetMap داخل WebView — مجانية بالكامل ومن غير أي API key

const MAP_HTML = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html, body, #map { margin:0; padding:0; height:100%; width:100%; background:#E8EEF4; }
  .pin { width:26px; height:26px; border-radius:50% 50% 50% 0; transform:rotate(-45deg);
         border:2px solid #fff; box-shadow:0 2px 5px rgba(0,0,0,.35); position:relative; }
  .pin::after { content:''; position:absolute; width:8px; height:8px; background:#fff;
                border-radius:50%; top:7px; left:7px; }
  .pick-pin { width:30px; height:30px; border-radius:50% 50% 50% 0; transform:rotate(-45deg);
              background:#0D9488; border:3px solid #fff; box-shadow:0 3px 8px rgba(0,0,0,.4); }
  .pick-pin::after { content:''; position:absolute; width:10px; height:10px; background:#fff;
                     border-radius:50%; top:7px; left:7px; }
  .me { width:18px; height:18px; border-radius:50%; background:#3B82F6; border:3px solid #fff;
        box-shadow:0 0 0 4px rgba(59,130,246,.25); }
  #err { display:none; position:absolute; z-index:999; inset:0; background:#F4F7FA; color:#0F172A;
         font-family:sans-serif; text-align:center; padding-top:45%; font-size:15px; }
</style>
</head>
<body>
<div id="map"></div>
<div id="err">الخريطة محتاجة اتصال بالإنترنت عشان تظهر 🌐</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map = null, markersLayer = null, pickMarker = null, meMarker = null, pickMode = false;
function send(obj){ if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(obj)); }
function makeIcon(color, cls){
  return L.divIcon({ className:'', iconSize:[26,34], iconAnchor:[13,30],
    html:'<div class="'+(cls||'pin')+'" style="background:'+color+'"></div>' });
}
function init(){
  if (typeof L === 'undefined') { document.getElementById('err').style.display='block'; return; }
  map = L.map('map', { zoomControl:true, attributionControl:true });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  map.setView([30.0444, 31.2357], 12); // القاهرة افتراضياً
  markersLayer = L.layerGroup().addTo(map);
  map.on('click', function(e){
    if (!pickMode) return;
    setPick(e.latlng.lat, e.latlng.lng);
    send({ type:'pick', lat:e.latlng.lat, lng:e.latlng.lng });
  });
  send({ type:'ready' });
}
function setPick(lat, lng){
  if (!map) return;
  if (pickMarker) pickMarker.setLatLng([lat, lng]);
  else pickMarker = L.marker([lat, lng], { icon: makeIcon('#0D9488','pick-pin'), draggable:true }).addTo(map);
  pickMarker.off('dragend');
  pickMarker.on('dragend', function(){
    var p = pickMarker.getLatLng();
    send({ type:'pick', lat:p.lat, lng:p.lng });
  });
}
function handle(msg){
  if (!map && msg.type !== 'ping') return;
  if (msg.type === 'markers'){
    markersLayer.clearLayers();
    (msg.markers||[]).forEach(function(m){
      if (m.lat == null || m.lng == null) return;
      var mk = L.marker([m.lat, m.lng], { icon: makeIcon(m.color || '#EF4444') });
      mk.on('click', function(){ send({ type:'marker', id:m.id }); });
      markersLayer.addLayer(mk);
    });
  } else if (msg.type === 'center'){
    map.setView([msg.lat, msg.lng], msg.zoom || map.getZoom(), { animate:true });
  } else if (msg.type === 'pickMode'){
    pickMode = !!msg.on;
    if (!pickMode && pickMarker){ map.removeLayer(pickMarker); pickMarker = null; }
    if (pickMode && msg.lat != null) setPick(msg.lat, msg.lng);
  } else if (msg.type === 'setPick'){
    setPick(msg.lat, msg.lng);
  } else if (msg.type === 'me'){
    if (meMarker) map.removeLayer(meMarker);
    meMarker = L.marker([msg.lat, msg.lng], { icon: makeIcon('#3B82F6','me') }).addTo(map);
  }
}
function onMsg(e){
  try { handle(JSON.parse(e.data)); } catch (err) {}
}
window.addEventListener('message', onMsg);
document.addEventListener('message', onMsg);
window.onload = init;
</script>
</body>
</html>`;

export default function LeafletMap({
  markers = [],
  center = null,
  zoom = null,
  pickMode = false,
  pickPosition = null,
  myPosition = null,
  onMarkerPress = null,
  onPick = null,
  style = null,
}) {
  const webRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const markersKey = useMemo(() => JSON.stringify(markers), [markers]);

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
    if (ready && myPosition) post({ type: 'me', lat: myPosition.lat, lng: myPosition.lng });
  }, [ready, myPosition ? myPosition.lat : null, myPosition ? myPosition.lng : null]);

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
          <Text style={styles.loadingText}>بنحمّل الخريطة…</Text>
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
  loadingText: { marginTop: 8, color: colors.textSoft, fontSize: 14, writingDirection: 'rtl' },
});

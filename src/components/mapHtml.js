// نسخة الـ HTML بتاعت خريطة Leaflet — مشتركة بين الموبايل (WebView) والويب (iframe)
export const MAP_HTML = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html, body, #map { margin:0; padding:0; height:100%; width:100%; background:#E8EEF4; }
  .pin-wrap { display:flex; flex-direction:column; align-items:center; filter:drop-shadow(0 3px 4px rgba(10,26,46,.4)); }
  .pin { width:34px; height:34px; border-radius:50% 50% 50% 0; transform:rotate(-45deg);
         border:2.5px solid #fff; display:flex; align-items:center; justify-content:center; }
  .pin span { transform:rotate(45deg); font-size:15px; line-height:1; }
  .pick-pin { width:36px; height:36px; border-radius:50% 50% 50% 0; transform:rotate(-45deg);
              background:#0D9488; border:3px solid #fff; box-shadow:0 4px 10px rgba(0,0,0,.45);
              display:flex; align-items:center; justify-content:center; }
  .pick-pin span { transform:rotate(45deg); font-size:16px; }
  .me { width:18px; height:18px; border-radius:50%; background:#3B82F6; border:3px solid #fff;
        box-shadow:0 0 0 4px rgba(59,130,246,.25); }
  @keyframes pulse { 0% { box-shadow:0 0 0 0 rgba(239,68,68,.5); } 100% { box-shadow:0 0 0 14px rgba(239,68,68,0); } }
  .pin-new { animation:pulse 1.6s ease-out infinite; }
  #err { display:none; position:absolute; z-index:999; inset:0; background:#F4F7FA; color:#0F172A;
         font-family:sans-serif; text-align:center; padding-top:45%; font-size:15px; }
  #tile-err { display:none; position:absolute; z-index:500; left:50%; top:70px; transform:translateX(-50%);
              background:rgba(255,255,255,.94); color:#0F172A; font-family:sans-serif; text-align:center;
              font-size:13px; line-height:1.8; padding:10px 14px; border-radius:12px;
              box-shadow:0 6px 18px rgba(10,26,46,.18); max-width:74%; }
  #tile-err small { color:#64748B; font-size:12px; }
</style>
</head>
<body>
<div id="map"></div>
<div id="err">الخريطة محتاجة اتصال بالإنترنت عشان تظهر 🌐</div>
<div id="tile-err">الخريطة الأساسية مش متاحة دلوقتي 🗺️<br/><small>المسار والبلاغات والتنبيهات هتفضل شغالة عادي</small></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map = null, markersLayer = null, pickMarker = null, meMarker = null, routeLine = null, pickMode = false;
function send(obj){ if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(obj)); }
function makeIcon(color, icon, cls){
  var inner = '<div class="'+(cls||'pin')+'" style="background:'+color+'"><span>'+(icon||'')+'</span></div>';
  return L.divIcon({ className:'', iconSize:[36,40], iconAnchor:[18,38],
    html:'<div class="pin-wrap">'+inner+'</div>' });
}
function init(){
  if (typeof L === 'undefined') { document.getElementById('err').style.display='block'; return; }
  map = L.map('map', { zoomControl:false, attributionControl:true });
  L.control.zoom({ position:'bottomleft' }).addTo(map); // بعيد عن بانر التنبيهات فوق
  // لو التايلز فشلت (مثلاً مفيش نت أو السيرفر رفض) بنشيلها ونظهر رسالة نضيفة
  // بدل شاشة مليانة تايلز مكسورة — من غير ما نعيد المحاولة أو نغير المزود
  var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  });
  var tileErrs = 0, tilesGaveUp = false;
  tiles.on('tileerror', function(){
    if (tilesGaveUp) return;
    if (++tileErrs >= 6) {
      tilesGaveUp = true;
      if (map) map.removeLayer(tiles);
      var el = document.getElementById('tile-err');
      if (el) el.style.display = 'block';
      send({ type:'basemapUnavailable' });
    }
  });
  tiles.addTo(map);
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
  else pickMarker = L.marker([lat, lng], { icon: makeIcon('#0D9488','📍','pick-pin'), draggable:true }).addTo(map);
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
      var cls = m.status === 'new' ? 'pin pin-new' : 'pin';
      var mk = L.marker([m.lat, m.lng], { icon: makeIcon(m.color || '#EF4444', m.icon || '', cls) });
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
  } else if (msg.type === 'route'){
    if (routeLine){ map.removeLayer(routeLine); routeLine = null; }
    if (msg.coords && msg.coords.length > 1){
      routeLine = L.polyline(msg.coords.map(function(c){ return [c.lat, c.lng]; }),
        { color:'#0D9488', weight:6, opacity:.85 }).addTo(map);
      map.fitBounds(routeLine.getBounds(), { padding:[44,44] });
    }
  } else if (msg.type === 'me'){
    if (meMarker) map.removeLayer(meMarker);
    meMarker = L.marker([msg.lat, msg.lng], { icon: makeIcon('#3B82F6','','me') }).addTo(map);
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

export const MAP_HTML_FOR_WEB = MAP_HTML;

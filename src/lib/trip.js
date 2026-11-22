// حسابات الرحلة الآمنة: هندسة المسار ومطابقة البلاغات — دوال نقية من غير مكتبات
// عشان تتختبر لوحدها وتفضل واضحة. كل المسافات بالمتر.

const EARTH_R = 6371000;

export const CORRIDOR_METERS = 45; // عرض ممر المسار اللي بنعتبر البلاغ "على الطريق" جواه
export const OFF_ROUTE_METERS = 70; // بعد ده نعتبر المستخدم خرج عن المسار
export const ALERT_FAR_METERS = 300; // تنبيه أول
export const ALERT_NEAR_METERS = 100; // تأكيد أخير
export const PASS_BEHIND_METERS = 25; // عدّينا البلاغ بالمسافة دي → نقفل تنبيهاته

function toRad(d) {
  return (d * Math.PI) / 180;
}

// مسافة بين نقطتين {lat,lng} بالمتر
export function haversineMeters(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(s)));
}

// طول المسار الكامل بالمتر. coords: [{lat,lng}...]
export function routeLength(coords) {
  let total = 0;
  for (let i = 1; i < coords.length; i++) total += haversineMeters(coords[i - 1], coords[i]);
  return total;
}

// إسقاط نقطة على مقطع مستقيم في إسقاط مستوٍ محلي (دقيق للمسافات القصيرة)
// يرجع { distMeters, t } — t بين 0 و 1 = موضع أقرب نقطة على المقطع
function projectOnSegment(p, a, b, latRef) {
  const kx = toRad(1) * EARTH_R * Math.cos(toRad(latRef));
  const ky = toRad(1) * EARTH_R;
  const px = (p.lng - a.lng) * kx;
  const py = (p.lat - a.lat) * ky;
  const bx = (b.lng - a.lng) * kx;
  const by = (b.lat - a.lat) * ky;
  const len2 = bx * bx + by * by;
  let t = len2 === 0 ? 0 : (px * bx + py * by) / len2;
  t = Math.max(0, Math.min(1, t));
  const dx = px - bx * t;
  const dy = py - by * t;
  return { distMeters: Math.sqrt(dx * dx + dy * dy), t };
}

// موضع نقطة بالنسبة للمسار: أقرب مقطع + المسافة المقطوعة على المسار لحدها + البعد العمودي
// يرجع { alongMeters, offRouteMeters } — coords لازم يكون فيها نقطتين على الأقل
export function routePosition(coords, point) {
  let best = null;
  let traveled = 0;
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1];
    const b = coords[i];
    const segLen = haversineMeters(a, b);
    const proj = projectOnSegment(point, a, b, (a.lat + b.lat) / 2);
    if (!best || proj.distMeters < best.offRouteMeters) {
      best = { alongMeters: traveled + segLen * proj.t, offRouteMeters: proj.distMeters };
    }
    traveled += segLen;
  }
  return best || { alongMeters: 0, offRouteMeters: Infinity };
}

// نقطة على المسار عند مسافة alongMeters من بدايته (لوضع المحاكاة)
export function interpolateRoute(coords, alongMeters) {
  let traveled = 0;
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1];
    const b = coords[i];
    const segLen = haversineMeters(a, b);
    if (alongMeters <= traveled + segLen) {
      const t = segLen === 0 ? 0 : (alongMeters - traveled) / segLen;
      return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
    }
    traveled += segLen;
  }
  return coords[coords.length - 1];
}

// البلاغات اللي واقعة جوه ممر المسار، مرتبة بموضعها على الطريق
// hazards: [{id, lat, lng, ...}] — بيتجاهل اللي مفيهاش إحداثيات
export function hazardsOnRoute(coords, hazards, corridorMeters = CORRIDOR_METERS) {
  const out = [];
  for (const h of hazards) {
    if (h.lat == null || h.lng == null) continue;
    const pos = routePosition(coords, { lat: h.lat, lng: h.lng });
    if (pos.offRouteMeters <= corridorMeters) {
      out.push({ hazard: h, alongMeters: pos.alongMeters, offRouteMeters: pos.offRouteMeters });
    }
  }
  out.sort((x, y) => x.alongMeters - y.alongMeters);
  return out;
}

// قرار التنبيه لبلاغ واحد: بناءً على المسافة الباقية ليه وحالة التنبيهات السابقة
// state: { far: bool, near: bool } — بيتحدث في مكانه. يرجع 'far' | 'near' | 'passed' | null
export function nextAlert(distanceAhead, state) {
  if (distanceAhead < -PASS_BEHIND_METERS) return 'passed';
  if (distanceAhead <= ALERT_NEAR_METERS && !state.near) {
    state.near = true;
    state.far = true;
    return 'near';
  }
  if (distanceAhead <= ALERT_FAR_METERS && !state.far) {
    state.far = true;
    return 'far';
  }
  return null;
}

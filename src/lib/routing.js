// جلب مسار قيادة من خدمة OSRM التجريبية (مجانية، بلا مفتاح)
// شروط الخدمة: استخدام تجريبي غير تجاري معقول، حد أقصى طلب/ثانية، بدون ضمان توافر،
// مع ذكر المصدر. بنبعت User-Agent باسم التطبيق زي ما شروطهم بتطلب.
// https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';
const USER_AGENT = 'TareeqakAman/1.0 (graduation project, Modern Academy)';

// from/to: {lat,lng} — يرجع { coords: [{lat,lng}...], distanceMeters, durationSeconds }
// بيرمي Error برسالة عربية لو الخدمة رفضت أو مفيش مسار
export async function fetchDrivingRoute(from, to) {
  const url =
    `${OSRM_BASE}/${from.lng},${from.lat};${to.lng},${to.lat}` +
    '?geometries=geojson&overview=full&alternatives=false&steps=false';
  let res;
  try {
    res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
  } catch (e) {
    throw new Error('تعذر الاتصال بخدمة المسارات. اتأكد من الإنترنت وجرب تاني.');
  }
  if (!res.ok) {
    throw new Error('خدمة المسارات مش متاحة دلوقتي. جرب بعد شوية.');
  }
  const data = await res.json();
  const route = data?.routes?.[0];
  if (data?.code !== 'Ok' || !route?.geometry?.coordinates?.length) {
    throw new Error('مفيش مسار قيادة بين النقطتين دول. قرب الوجهة من طريق معروف.');
  }
  return {
    coords: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    distanceMeters: route.distance ?? 0,
    durationSeconds: route.duration ?? 0,
  };
}

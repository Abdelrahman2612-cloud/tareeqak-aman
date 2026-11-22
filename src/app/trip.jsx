// وضع الرحلة الآمنة: تحديد وجهة على الخريطة ← مسار قيادة ← تنبيه صوتي ومرئي
// بالبلاغات اللي على المسار قدّامك. نطاق تجريبي: الشاشة بتفضل مفتوحة، والمسافات تقريبية،
// والتنبيه مساعد مش بديل للانتباه. الملاحة الكاملة (تعليمات اللفات) مش ضمن النطاق.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import LeafletMap from '../components/LeafletMap';
import { T } from '../components/T';
import { colors, radius, CATEGORIES, FONTS } from '../theme';
import { listenToReports } from '../lib/db';
import { fetchDrivingRoute } from '../lib/routing';
import {
  routePosition,
  routeLength,
  interpolateRoute,
  hazardsOnRoute,
  nextAlert,
  haversineMeters,
  OFF_ROUTE_METERS,
  ALERT_FAR_METERS,
  ALERT_NEAR_METERS,
} from '../lib/trip';

const ARRIVAL_METERS = 30; // أقل من كده نعتبرها وصول

const SIM_SPEED_MPS = 8; // سرعة المحاكاة (~29 كم/س)
const SIM_TICK_MS = 1000;

export default function TripScreen() {
  // المراحل: pick (تحديد الوجهة) ← routing (جاري جلب المسار) ← active (الرحلة شغالة)
  const [phase, setPhase] = useState('pick');
  const [destination, setDestination] = useState(null);
  const [routeCoords, setRouteCoords] = useState(null);
  const [routeMeters, setRouteMeters] = useState(0);
  const [myPos, setMyPos] = useState(null);
  const [reports, setReports] = useState([]);
  const [banner, setBanner] = useState(null); // { text, near }
  const [offRoute, setOffRoute] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [arVoice, setArVoice] = useState(true);
  const [routeError, setRouteError] = useState('');

  const alertStates = useRef({}); // لكل بلاغ: { far, near } — بيتصفر مع كل رحلة جديدة
  const arrivedRef = useRef(false); // تنبيه الوصول مرة واحدة بس
  const simAlong = useRef(0);
  const bannerTimer = useRef(null);
  const watchSub = useRef(null);

  // البلاغات المفتوحة بس (المتحلولة مالهاش تنبيه)
  const openHazards = useMemo(
    () => reports.filter((r) => r.status !== 'resolved' && r.lat != null && r.lng != null),
    [reports]
  );

  // البلاغات اللي جوه ممر المسار الحالي
  const routeHazards = useMemo(
    () => (routeCoords ? hazardsOnRoute(routeCoords, openHazards) : []),
    [routeCoords, openHazards]
  );

  // موضعي على المسار
  const myRoutePos = useMemo(
    () => (routeCoords && myPos ? routePosition(routeCoords, myPos) : null),
    [routeCoords, myPos]
  );

  // أقرب بلاغ قدّامي
  const nextHazard = useMemo(() => {
    if (!myRoutePos) return null;
    return routeHazards.find((h) => h.alongMeters > myRoutePos.alongMeters - 5) || null;
  }, [routeHazards, myRoutePos]);

  useEffect(() => {
    const unsub = listenToReports(setReports, () => {});
    return unsub;
  }, []);

  // نحدد موقعك أول ما تفتح الشاشة عشان نعرض بعد الوجهة قبل البدء ونوسّط الخريطة عليك
  useEffect(() => {
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setMyPos((cur) => cur || { lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch (e) {}
    })();
  }, []);

  // فحص صوت عربي متاح على الجهاز — لو مش موجود بنكتفي بالبانر
  useEffect(() => {
    Speech.getAvailableVoicesAsync()
      .then((voices) => setArVoice((voices || []).some((v) => (v.language || '').startsWith('ar'))))
      .catch(() => {});
  }, []);

  // متابعة الموقع الحقيقي أثناء الرحلة (مش في وضع المحاكاة)
  useEffect(() => {
    if (phase !== 'active' || simulating) {
      watchSub.current?.remove();
      watchSub.current = null;
      return;
    }
    let cancelled = false;
    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('صلاحية الموقع', 'محتاجين إذن الموقع عشان نتابعك على المسار.');
        return;
      }
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (loc) => {
          if (!cancelled) setMyPos({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      );
      watchSub.current = sub;
    })();
    return () => {
      cancelled = true;
      watchSub.current?.remove();
      watchSub.current = null;
    };
  }, [phase, simulating]);

  // المحاكاة: حركة وهمية على طول المسار بسرعة ثابتة — للتجربة وإنت واقف
  useEffect(() => {
    if (!simulating || !routeCoords) return;
    const id = setInterval(() => {
      simAlong.current += SIM_SPEED_MPS * (SIM_TICK_MS / 1000);
      if (simAlong.current >= routeLength(routeCoords)) {
        simAlong.current = routeLength(routeCoords);
        setSimulating(false);
        if (!arrivedRef.current) {
          arrivedRef.current = true;
          showBanner('وصلت لوجهتك', false);
        }
      }
      setMyPos(interpolateRoute(routeCoords, simAlong.current));
    }, SIM_TICK_MS);
    return () => clearInterval(id);
  }, [simulating, routeCoords]);

  const speak = useCallback(
    (text) => {
      if (!arVoice) return;
      Speech.stop();
      Speech.speak(text, { language: 'ar', rate: 0.95 });
    },
    [arVoice]
  );

  const showBanner = useCallback((text, near) => {
    setBanner({ text, near });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 7000);
  }, []);

  // منطق التنبيه مع كل تحديث موقع
  useEffect(() => {
    if (phase !== 'active' || !myRoutePos || !routeCoords) return;
    setOffRoute(myRoutePos.offRouteMeters > OFF_ROUTE_METERS);
    if (myRoutePos.offRouteMeters > OFF_ROUTE_METERS) return;
    // وصلنا لنهاية المسار؟ تنبيه وصول مرة واحدة
    const remaining = routeLength(routeCoords) - myRoutePos.alongMeters;
    if (remaining <= ARRIVAL_METERS && !arrivedRef.current) {
      arrivedRef.current = true;
      showBanner('وصلت لوجهتك', false);
      speak('وصلنا لوجهتك');
      return;
    }
    for (const h of routeHazards) {
      const ahead = h.alongMeters - myRoutePos.alongMeters;
      const key = h.hazard.id;
      alertStates.current[key] = alertStates.current[key] || { far: false, near: false };
      const decision = nextAlert(ahead, alertStates.current[key]);
      if (decision === 'far' || decision === 'near') {
        const label = CATEGORIES[h.hazard.category]?.label || 'بلاغ';
        const rounded = Math.max(50, Math.round(ahead / 50) * 50);
        const text =
          decision === 'near'
            ? `${label} قريب جدًا — حوالي ${rounded} متر قدّامك`
            : `انتبه: ${label} بعد حوالي ${rounded} متر على طريقك`;
        showBanner(text, decision === 'near');
        speak(`انتبه، ${label} بعد حوالي ${rounded} متر`);
        break; // تنبيه واحد في المرة
      }
    }
  }, [myRoutePos, phase, routeHazards, showBanner, speak]);

  async function confirmDestination() {
    if (!destination) return;
    setRouteError('');
    // محتاجين موقع البداية: الحالي لو معروف، وإلا نجيبه دلوقتي
    let start = myPos;
    if (!start) {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('صلاحية الموقع', 'محتاجين موقعك الحالي كنقطة بداية للمسار.');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        start = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setMyPos(start);
      } catch (e) {
        Alert.alert('تعذر تحديد الموقع', 'اتأكد إن الـ GPS شغال وجرب تاني.');
        return;
      }
    }
    setPhase('routing');
    try {
      const route = await fetchDrivingRoute(start, destination);
      setRouteCoords(route.coords);
      setRouteMeters(route.distanceMeters);
      alertStates.current = {};
      arrivedRef.current = false;
      simAlong.current = myPos ? routePosition(route.coords, myPos).alongMeters : 0;
      setPhase('active');
      const km = (route.distanceMeters / 1000).toFixed(1);
      const onRoute = routeHazardsCount(route.coords);
      showBanner(
        `المسار جاهز: ${km} كم${onRoute ? ` — وفيه ${onRoute} بلاغ على طريقك` : ' — الطريق خالي من البلاغات'} 🧭`,
        false
      );
    } catch (e) {
      setPhase('pick');
      setRouteError(e.message || 'حصل خطأ في جلب المسار.');
    }
  }

  function routeHazardsCount(coords) {
    return hazardsOnRoute(coords, openHazards).length;
  }

  function endTrip() {
    setPhase('pick');
    setRouteCoords(null);
    setDestination(null);
    setBanner(null);
    setOffRoute(false);
    setSimulating(false);
    alertStates.current = {};
    arrivedRef.current = false;
    Speech.stop();
  }

  const remainingMeters =
    myRoutePos && routeCoords ? Math.max(0, routeLength(routeCoords) - myRoutePos.alongMeters) : null;
  const nextHazardMeters = nextHazard && myRoutePos ? nextHazard.alongMeters - myRoutePos.alongMeters : null;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={{ flex: 1 }}>
        <LeafletMap
          markers={openHazards.map((r) => ({
            id: r.id,
            lat: r.lat,
            lng: r.lng,
            icon: CATEGORIES[r.category]?.icon,
            color: CATEGORIES[r.category]?.color,
            status: r.status,
          }))}
          pickMode={phase === 'pick'}
          pickPosition={destination}
          onPick={setDestination}
          myPosition={myPos}
          followMe={phase === 'active'}
          route={routeCoords}
          style={{ flex: 1 }}
        />

        {/* بانر التنبيه */}
        {banner && (
          <View style={[styles.banner, banner.near && styles.bannerNear]}>
            <T style={styles.bannerText}>{banner.text}</T>
          </View>
        )}

        {/* تحذير الخروج عن المسار */}
        {phase === 'active' && offRoute && !simulating && (
          <View style={[styles.banner, styles.bannerOff]}>
            <T style={styles.bannerText}>يبدو إنك خرجت عن المسار — التنبيهات واقفة لحد ما ترجع</T>
          </View>
        )}

        {/* لوحة التحكم السفلية */}
        <View style={styles.panel}>
          {phase === 'pick' && (
            <>
              <T style={styles.panelTitle}>حدد وجهتك بضغطة على الخريطة</T>
              {destination && myPos && (
                <T style={styles.distLine}>
                  الوجهة على بعد {(haversineMeters(myPos, destination) / 1000).toFixed(1)} كم تقريبًا (خط مستقيم)
                </T>
              )}
              {routeError ? <T style={styles.errorText}>{routeError}</T> : null}
              <Pressable
                style={[styles.primaryBtn, !destination && { opacity: 0.5 }]}
                disabled={!destination}
                onPress={confirmDestination}
              >
                <T style={styles.primaryBtnText}>ابدأ الرحلة</T>
              </Pressable>
            </>
          )}

          {phase === 'routing' && (
            <View style={styles.row}>
              <ActivityIndicator color={colors.teal} />
              <T style={styles.panelTitle}>بنجهّز المسار…</T>
            </View>
          )}

          {phase === 'active' && (
            <>
              {!arVoice && (
                <T style={styles.voiceNote}>
                  التنبيه الصوتي غير متاح على جهازك (مفيش صوت عربي متسطب) — التنبيهات المرئية شغالة
                </T>
              )}
              <View style={styles.row}>
                <T style={styles.stat}>
                  المتبقي: {remainingMeters != null ? (remainingMeters / 1000).toFixed(1) : '…'} كم
                </T>
                <T style={styles.stat}>
                  {nextHazardMeters != null
                    ? `أقرب بلاغ بعد ${Math.max(0, Math.round(nextHazardMeters))} م`
                    : 'مفيش بلاغات قدّامك'}
                </T>
              </View>
              {routeHazards.length > 0 && (
                <T style={styles.hazardLine}>
                  على المسار: {routeHazards.length} بلاغ (
                  {[...new Set(routeHazards.map((h) => CATEGORIES[h.hazard.category]?.label || 'بلاغ'))].join('، ')}
                  )
                </T>
              )}
              <View style={styles.btnRow}>
                <Pressable
                  style={[styles.secondaryBtn, simulating && styles.secondaryBtnOn]}
                  onPress={() => {
                    if (!simulating && myPos && routeCoords) {
                      simAlong.current = routePosition(routeCoords, myPos).alongMeters;
                    }
                    setSimulating((s) => !s);
                  }}
                >
                  <T style={[styles.secondaryBtnText, simulating && { color: colors.white }]}>
                    {simulating ? 'وقّف المحاكاة ⏸' : 'جرّب بمحاكاة الحركة ▶️'}
                  </T>
                </Pressable>
                <Pressable style={styles.endBtn} onPress={endTrip}>
                  <T style={styles.endBtnText}>إنهاء الرحلة</T>
                </Pressable>
              </View>
            </>
          )}

          <T style={styles.attribution}>
            الخريطة © OpenStreetMap contributors · المسار: OSRM (خدمة تجريبية)
          </T>
          <T style={styles.disclaimer}>
            نطاق تجريبي: المسافات تقريبية والبلاغات من المستخدمين — التنبيه مساعد وليس بديلاً عن انتباهك.
          </T>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  banner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    elevation: 6,
  },
  bannerNear: { backgroundColor: colors.red },
  bannerOff: { backgroundColor: colors.amber },
  bannerText: { color: colors.white, fontFamily: FONTS.bold, fontSize: 15, textAlign: 'center' },
  panel: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 8,
  },
  panelTitle: { fontFamily: FONTS.bold, fontSize: 15, color: colors.text, textAlign: 'center' },
  errorText: { color: colors.red, fontSize: 13, textAlign: 'center' },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  stat: { fontFamily: FONTS.bold, fontSize: 14, color: colors.text },
  hazardLine: { fontSize: 13, color: colors.textSoft, textAlign: 'center' },
  voiceNote: {
    fontFamily: FONTS.bold,
    fontSize: 12.5,
    color: colors.amber,
    textAlign: 'center',
  },
  distLine: { fontFamily: FONTS.bold, fontSize: 13.5, color: colors.teal, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: colors.teal,
    borderRadius: radius.lg,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryBtnText: { color: colors.white, fontFamily: FONTS.extraBold, fontSize: 16 },
  btnRow: { flexDirection: 'row-reverse', gap: 8 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderRadius: radius.lg,
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryBtnOn: { backgroundColor: colors.teal },
  secondaryBtnText: { color: colors.teal, fontFamily: FONTS.bold, fontSize: 14 },
  endBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.red,
    borderRadius: radius.lg,
    paddingVertical: 11,
    alignItems: 'center',
  },
  endBtnText: { color: colors.red, fontFamily: FONTS.bold, fontSize: 14 },
  attribution: { fontSize: 10.5, color: colors.textSoft, textAlign: 'center' },
  disclaimer: { fontSize: 10.5, color: colors.textSoft, textAlign: 'center' },
});

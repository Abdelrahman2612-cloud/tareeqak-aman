import React, { useEffect, useMemo, useState } from 'react';
import {
  View,

  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { T } from '../components/T';
import { Icon } from '../components/Icon';
import { colors, radius, STATUS, CATEGORIES, CATEGORY_KEYS, SEVERITY, formatDate, FONTS } from '../theme';
import { listenToReports } from '../lib/db';
import { isFirebaseConfigured } from '../config/firebase';
import LeafletMap from '../components/LeafletMap';
import { StatusChip, SeverityChip, CategoryBadge, FirebaseNotConfigured, PrimaryButton, GhostButton } from '../components/ui';

export default function MapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const configured = isFirebaseConfigured();

  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [myPos, setMyPos] = useState(null);
  const [center, setCenter] = useState(null);

  useEffect(() => {
    if (!configured) return undefined;
    return listenToReports(setReports, () => {});
  }, [configured]);

  // لو جايين من شاشة التتبع ببلاغ معين، نركز عليه
  useEffect(() => {
    if (params.focus && reports.length) {
      const r = reports.find((x) => x.trackingCode === params.focus);
      if (r && r.lat != null) {
        setCenter({ lat: r.lat, lng: r.lng });
        setSelected(r);
      }
    }
  }, [params.focus, reports]);

  const filtered = useMemo(
    () => (filter === 'all' ? reports : reports.filter((r) => r.category === filter)),
    [reports, filter]
  );

  const markers = useMemo(
    () =>
      filtered
        .filter((r) => r.lat != null && r.lng != null)
        .map((r) => ({
          id: r.id,
          lat: r.lat,
          lng: r.lng,
          color: (STATUS[r.status] || STATUS.new).color,
          icon: CATEGORIES[r.category]?.icon || '',
          status: r.status,
        })),
    [filtered]
  );

  async function goMyLocation() {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const p = { lat: loc.coords.latitude, lng: loc.coords.longitude };
    setMyPos(p);
    setCenter(p);
  }

  if (!configured) return <FirebaseNotConfigured />;

  return (
    <View style={{ flex: 1 }}>
      {/* فلاتر الفئات */}
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, flexDirection: 'row-reverse' }}>
          <FilterChip label="الكل" active={filter === 'all'} onPress={() => setFilter('all')} />
          {CATEGORY_KEYS.map((k) => (
            <FilterChip
              key={k}
              label={`${CATEGORIES[k].icon} ${CATEGORIES[k].label}`}
              active={filter === k}
              onPress={() => setFilter(k)}
            />
          ))}
        </ScrollView>
      </View>

      <LeafletMap
        markers={markers}
        center={center}
        zoom={16}
        myPosition={myPos}
        onMarkerPress={(id) => setSelected(reports.find((r) => r.id === id) || null)}
        style={{ flex: 1 }}
      />

      {/* مفتاح الألوان */}
      <View style={styles.legend}>
        {Object.values(STATUS).map((s) => (
          <View key={s.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <T style={styles.legendText}>{s.label}</T>
          </View>
        ))}
      </View>

      {/* زرار الرحلة الآمنة */}
      <Pressable style={({ pressed }) => [styles.tripBtn, pressed && { opacity: 0.85 }]} onPress={() => router.push('/trip')}>
        <Icon name="navigate" size={20} color="#fff" />
      </Pressable>

      {/* زرار موقعي */}
      <Pressable style={({ pressed }) => [styles.myLocBtn, pressed && { opacity: 0.85 }]} onPress={goMyLocation}>
        <Icon name="locate" size={20} color={colors.teal} />
      </Pressable>

      {/* كارت البلاغ المحدد */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {selected && (
              <ScrollView>
                <View style={styles.sheetHead}>
                  <CategoryBadge category={selected.category} size={46} />
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <T style={styles.sheetTitle}>{CATEGORIES[selected.category]?.label}</T>
                    <T style={styles.sheetCode}>{selected.trackingCode}</T>
                  </View>
                </View>
                <View style={styles.sheetChips}>
                  <StatusChip status={selected.status} />
                  <SeverityChip severity={selected.severity} />
                </View>
                {selected.imageUrl ? (
                  <Image source={{ uri: selected.imageUrl }} style={styles.sheetImg} />
                ) : null}
                {selected.description ? (
                  <T style={styles.sheetDesc}>{selected.description}</T>
                ) : null}
                <T style={styles.sheetDate}>{formatDate(selected.createdAtMillis)}</T>
                <PrimaryButton
                  title="تفاصيل ومتابعة الحالة"
                  onPress={() => {
                    setSelected(null);
                    router.push({ pathname: '/track', params: { code: selected.trackingCode } });
                  }}
                  style={{ marginTop: 6 }}
                />
                <GhostButton title="إغلاق" onPress={() => setSelected(null)} style={{ marginTop: 8 }} />
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function FilterChip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterChip, active && { backgroundColor: colors.navy, borderColor: colors.navy }]}
    >
      <T style={[styles.filterText, active && { color: '#fff' }]}>{label}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filters: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
  },
  filterChip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.card,
  },
  filterText: { fontSize: 13, fontWeight: '700', color: colors.text, writingDirection: 'rtl' },
  legend: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legendItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: colors.text, fontWeight: '600', writingDirection: 'rtl' },
  myLocBtn: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 4,
  },
  tripBtn: {
    position: 'absolute',
    bottom: 76,
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(10,26,46,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: 20,
    maxHeight: '75%',
  },
  sheetHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: colors.text, writingDirection: 'rtl' },
  sheetCode: { fontSize: 13, color: colors.textSoft, marginTop: 2 },
  sheetChips: { flexDirection: 'row-reverse', gap: 8, marginTop: 12 },
  sheetImg: { width: '100%', height: 180, borderRadius: radius.sm, marginTop: 12 },
  sheetDesc: { fontSize: 14.5, color: colors.text, marginTop: 12, textAlign: 'right', writingDirection: 'rtl', lineHeight: 22 },
  sheetDate: { fontSize: 12, color: colors.textSoft, marginTop: 10, marginBottom: 10, textAlign: 'right' },
});

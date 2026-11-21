import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, shadow, STATUS, CATEGORIES, formatDate } from '../theme';
import { listenToReports } from '../lib/db';
import { isFirebaseConfigured } from '../config/firebase';
import { normalizeTrackingCode } from '../lib/trackingCode';
import { StatusChip, CategoryBadge, EmptyState, Card } from '../components/ui';

export default function HomeScreen() {
  const router = useRouter();
  const configured = isFirebaseConfigured();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(configured);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);
  const [code, setCode] = useState('');

  useEffect(() => {
    if (!configured) return undefined;
    setLoading(true);
    const unsub = listenToReports(
      (rows) => {
        setReports(rows);
        setLoading(false);
        setRefreshing(false);
      },
      () => {
        setLoading(false);
        setRefreshing(false);
      }
    );
    return unsub;
  }, [configured, tick]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTick((t) => t + 1);
  }, []);

  const stats = {
    total: reports.length,
    new: reports.filter((r) => r.status === 'new').length,
    inProgress: reports.filter((r) => r.status === 'in_progress').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
  };

  function goTrack() {
    const c = normalizeTrackingCode(code);
    Keyboard.dismiss();
    if (c) router.push({ pathname: '/track', params: { code: c } });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />
        }
      >
        {/* الهيدر */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeIcon}>📍</Text>
          </View>
          <Text style={styles.heroTitle}>طريقك أمان</Text>
          <Text style={styles.heroSub}>بلّغ عن مشاكل الطريق وتابع إصلاحها لحد ما تتحل</Text>

          <Pressable
            style={({ pressed }) => [styles.reportBtn, pressed && { opacity: 0.9 }]}
            onPress={() => router.push('/report')}
          >
            <Text style={styles.reportBtnIcon}>🚨</Text>
            <Text style={styles.reportBtnText}>أبلغ عن مشكلة</Text>
          </Pressable>

          {/* بحث برقم البلاغ */}
          <View style={styles.searchBox}>
            <Pressable onPress={goTrack} style={styles.searchBtn}>
              <Text style={styles.searchBtnText}>تتبع</Text>
            </Pressable>
            <TextInput
              style={styles.searchInput}
              placeholder="عندك رقم بلاغ؟ اكتبه هنا (TA-123456)"
              placeholderTextColor="#8FA3BC"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={goTrack}
              textAlign="right"
            />
          </View>
        </View>

        {/* إحصائيات */}
        <View style={styles.statsRow}>
          <StatCard label="كل البلاغات" value={stats.total} color={colors.navy} loading={loading} />
          <StatCard label="جديدة" value={stats.new} color={colors.red} loading={loading} />
          <StatCard label="قيد العمل" value={stats.inProgress} color={colors.amber} loading={loading} />
          <StatCard label="اتحلت" value={stats.resolved} color={colors.green} loading={loading} />
        </View>

        {/* اختصارات */}
        <View style={styles.shortcuts}>
          <Shortcut
            icon="🗺️"
            title="الخريطة"
            subtitle="شوف البلاغات حواليك"
            onPress={() => router.push('/map')}
          />
          <Shortcut
            icon="🔎"
            title="تتبع بلاغ"
            subtitle="برقمه المرجعي"
            onPress={() => router.push('/track')}
          />
          <Shortcut
            icon="🛠️"
            title="المشرفين"
            subtitle="إدارة وتحديث الحالات"
            onPress={() => router.push('/admin')}
          />
        </View>

        {/* أحدث البلاغات */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>أحدث البلاغات</Text>
          <Pressable onPress={() => router.push('/map')}>
            <Text style={styles.sectionLink}>عرض الكل على الخريطة ←</Text>
          </Pressable>
        </View>

        {!configured ? (
          <Card style={{ marginHorizontal: 16 }}>
            <EmptyState
              icon="⚙️"
              title="البلاغات هتظهر هنا"
              subtitle="ظبط Firebase من ملف README (قسم الإعداد) وارجع هنا"
            />
          </Card>
        ) : loading ? (
          <Card style={{ marginHorizontal: 16 }}>
            <EmptyState icon="⏳" title="بنحمّل البلاغات…" />
          </Card>
        ) : reports.length === 0 ? (
          <Card style={{ marginHorizontal: 16 }}>
            <EmptyState
              icon="🛣️"
              title="مفيش بلاغات لسه"
              subtitle="كون أول واحد يبلّغ عن مشكلة في طريقك"
            />
          </Card>
        ) : (
          reports.slice(0, 5).map((r) => (
            <Pressable
              key={r.id}
              style={({ pressed }) => [styles.reportRow, pressed && { opacity: 0.85 }]}
              onPress={() => router.push({ pathname: '/track', params: { code: r.trackingCode } })}
            >
              <CategoryBadge category={r.category} />
              <View style={styles.reportRowBody}>
                <Text style={styles.reportRowTitle} numberOfLines={1}>
                  {CATEGORIES[r.category]?.label || r.category}
                </Text>
                <Text style={styles.reportRowMeta} numberOfLines={1}>
                  {r.trackingCode} · {formatDate(r.createdAtMillis)}
                </Text>
              </View>
              <StatusChip status={r.status} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, color, loading }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{loading ? '…' : value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Shortcut({ icon, title, subtitle, onPress }) {
  return (
    <Pressable style={({ pressed }) => [styles.shortcut, pressed && { opacity: 0.85 }]} onPress={onPress}>
      <Text style={styles.shortcutIcon}>{icon}</Text>
      <Text style={styles.shortcutTitle}>{title}</Text>
      <Text style={styles.shortcutSub}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  scroll: { flex: 1, backgroundColor: colors.bg },
  hero: {
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 26,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: 'center',
  },
  heroBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroBadgeIcon: { fontSize: 30 },
  heroTitle: { color: colors.white, fontSize: 30, fontWeight: '900', writingDirection: 'rtl' },
  heroSub: {
    color: '#A9BBD1',
    fontSize: 14.5,
    marginTop: 6,
    marginBottom: 20,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  reportBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: 17,
    alignSelf: 'stretch',
    gap: 10,
    ...shadow.card,
  },
  reportBtnIcon: { fontSize: 20 },
  reportBtnText: { color: colors.white, fontSize: 19, fontWeight: '900', writingDirection: 'rtl' },
  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.navySoft,
    borderRadius: radius.md,
    marginTop: 14,
    alignSelf: 'stretch',
    paddingLeft: 6,
    borderWidth: 1,
    borderColor: '#1E3A57',
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    writingDirection: 'rtl',
  },
  searchBtn: {
    backgroundColor: colors.teal,
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  searchBtnText: { color: colors.white, fontWeight: '800', fontSize: 14 },
  statsRow: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 16,
    marginTop: 18,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 11.5, color: colors.textSoft, marginTop: 3, writingDirection: 'rtl' },
  shortcuts: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 10,
  },
  shortcut: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  shortcutIcon: { fontSize: 26, marginBottom: 6 },
  shortcutTitle: { fontSize: 14, fontWeight: '800', color: colors.text, writingDirection: 'rtl' },
  shortcutSub: { fontSize: 10.5, color: colors.textSoft, textAlign: 'center', marginTop: 2, writingDirection: 'rtl' },
  sectionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: colors.text, writingDirection: 'rtl' },
  sectionLink: { fontSize: 13, color: colors.teal, fontWeight: '700' },
  reportRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: radius.md,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportRowBody: { flex: 1, alignItems: 'flex-end' },
  reportRowTitle: { fontSize: 15, fontWeight: '800', color: colors.text, writingDirection: 'rtl' },
  reportRowMeta: { fontSize: 12, color: colors.textSoft, marginTop: 2 },
});

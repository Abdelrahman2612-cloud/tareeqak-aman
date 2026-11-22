import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  Keyboard,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, shadow, STATUS, CATEGORIES, formatDate, FONTS } from '../theme';
import { listenToReports } from '../lib/db';
import { isFirebaseConfigured } from '../config/firebase';
import { normalizeTrackingCode } from '../lib/trackingCode';
import { useAuth, signOut } from '../lib/auth';
import { hasSeenOnboarding } from './onboarding';
import { T } from '../components/T';
import { StatusChip, CategoryBadge, EmptyState, Card } from '../components/ui';

export default function HomeScreen() {
  const router = useRouter();
  const configured = isFirebaseConfigured();
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(configured);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);
  const [code, setCode] = useState('');

  // أول تشغيل: شاشات التعريف
  useEffect(() => {
    (async () => {
      const seen = await hasSeenOnboarding();
      if (!seen) router.replace('/onboarding');
    })();
  }, []);

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

  const myReports = user ? reports.filter((r) => r.userId === user.uid) : [];
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
        <LinearGradient colors={[colors.navy, colors.navyLight]} style={styles.hero}>
          <View style={styles.heroTopRow}>
            <Pressable
              style={({ pressed }) => [styles.accountChip, pressed && { opacity: 0.8 }]}
              onPress={() => {
                if (!user) {
                  router.push('/auth');
                } else {
                  Alert.alert(
                    'حسابك',
                    user.displayName ? `${user.displayName}\n${user.email || ''}` : user.email || '',
                    [
                      { text: 'تسجيل الخروج', style: 'destructive', onPress: () => signOut() },
                      { text: 'إلغاء', style: 'cancel' },
                    ]
                  );
                }
              }}
            >
              <T style={styles.accountChipIcon}>{user ? '👤' : '🔑'}</T>
              <T style={styles.accountChipText} numberOfLines={1}>
                {user ? user.displayName || user.email : 'تسجيل الدخول'}
              </T>
            </Pressable>
          </View>

          <View style={styles.heroBadge}>
            <T style={styles.heroBadgeIcon}>📍</T>
          </View>
          <T style={styles.heroTitle}>طريقك أمان</T>
          <T style={styles.heroSub}>بلّغ عن مشاكل الطريق وتابع إصلاحها لحد ما تتحل</T>

          <Pressable
            style={({ pressed }) => [styles.reportBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
            onPress={() => router.push('/report')}
          >
            <T style={styles.reportBtnIcon}>🚨</T>
            <T style={styles.reportBtnText}>أبلغ عن مشكلة</T>
          </Pressable>

          {/* بحث برقم البلاغ */}
          <View style={styles.searchBox}>
            <Pressable onPress={goTrack} style={styles.searchBtn}>
              <T style={styles.searchBtnText}>تتبع</T>
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
        </LinearGradient>

        {/* إحصائيات */}
        <View style={styles.statsRow}>
          <StatCard label="كل البلاغات" value={stats.total} color={colors.navy} loading={loading} />
          <StatCard label="جديدة" value={stats.new} color={colors.red} loading={loading} />
          <StatCard label="قيد العمل" value={stats.inProgress} color={colors.amber} loading={loading} />
          <StatCard label="اتحلت" value={stats.resolved} color={colors.green} loading={loading} />
        </View>

        {/* بلاغاتي */}
        {user && myReports.length > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <T style={styles.sectionTitle}>بلاغاتي ({myReports.length})</T>
            </View>
            {myReports.slice(0, 3).map((r) => (
              <ReportRow key={r.id} report={r} onPress={() => router.push({ pathname: '/track', params: { code: r.trackingCode } })} />
            ))}
          </View>
        )}

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
          <T style={styles.sectionTitle}>أحدث البلاغات</T>
          <Pressable onPress={() => router.push('/map')}>
            <T style={styles.sectionLink}>عرض الكل على الخريطة ←</T>
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
            <ReportRow key={r.id} report={r} onPress={() => router.push({ pathname: '/track', params: { code: r.trackingCode } })} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReportRow({ report: r, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.reportRow, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      <CategoryBadge category={r.category} />
      <View style={styles.reportRowBody}>
        <T style={styles.reportRowTitle} numberOfLines={1}>
          {CATEGORIES[r.category]?.label || r.category}
        </T>
        <T style={styles.reportRowMeta} numberOfLines={1}>
          {r.trackingCode} · {formatDate(r.createdAtMillis)}
        </T>
      </View>
      <StatusChip status={r.status} />
    </Pressable>
  );
}

function StatCard({ label, value, color, loading }) {
  return (
    <View style={styles.statCard}>
      <T style={[styles.statValue, { color }]}>{loading ? '…' : value}</T>
      <T style={styles.statLabel}>{label}</T>
    </View>
  );
}

function Shortcut({ icon, title, subtitle, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.shortcut, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
      onPress={onPress}
    >
      <T style={styles.shortcutIcon}>{icon}</T>
      <T style={styles.shortcutTitle}>{title}</T>
      <T style={styles.shortcutSub}>{subtitle}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  scroll: { flex: 1, backgroundColor: colors.bg },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    alignItems: 'center',
  },
  heroTopRow: { alignSelf: 'stretch', alignItems: 'flex-start', marginBottom: 6 },
  accountChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '70%',
  },
  accountChipIcon: { fontSize: 13 },
  accountChipText: { color: '#DCE6F2', fontSize: 12.5, fontFamily: FONTS.semiBold },
  heroBadge: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(20,184,166,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(20,184,166,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  heroBadgeIcon: { fontSize: 34 },
  heroTitle: { fontSize: 32, fontFamily: FONTS.black, color: colors.white, letterSpacing: 0.5 },
  heroSub: { fontSize: 14.5, color: '#B8C7D9', marginTop: 6, textAlign: 'center', lineHeight: 22 },
  reportBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginTop: 20,
    ...shadow.raised,
  },
  reportBtnIcon: { fontSize: 20 },
  reportBtnText: { color: colors.white, fontSize: 17, fontFamily: FONTS.extraBold },
  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.md,
    marginTop: 16,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  searchBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: 18,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  searchBtnText: { color: colors.white, fontFamily: FONTS.bold, fontSize: 14 },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontFamily: FONTS.regular,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    ...shadow.card,
  },
  statValue: { fontSize: 22, fontFamily: FONTS.black },
  statLabel: { fontSize: 11.5, color: colors.textSoft, marginTop: 4, fontFamily: FONTS.semiBold },
  sectionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontFamily: FONTS.extraBold, color: colors.text },
  sectionLink: { fontSize: 13, color: colors.teal, fontFamily: FONTS.bold },
  shortcuts: {
    flexDirection: 'row-reverse',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  shortcut: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 6,
    ...shadow.card,
  },
  shortcutIcon: { fontSize: 26, marginBottom: 8 },
  shortcutTitle: { fontSize: 14, fontFamily: FONTS.bold, color: colors.text },
  shortcutSub: { fontSize: 10.5, color: colors.textSoft, marginTop: 3, textAlign: 'center' },
  reportRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    ...shadow.card,
  },
  reportRowBody: { flex: 1, alignItems: 'flex-end' },
  reportRowTitle: { fontSize: 14.5, fontFamily: FONTS.bold, color: colors.text },
  reportRowMeta: { fontSize: 11.5, color: colors.textSoft, marginTop: 3 },
});

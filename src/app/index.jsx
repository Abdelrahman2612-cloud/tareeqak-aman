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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, shadow, STATUS, CATEGORIES, formatDate, FONTS, spacing } from '../theme';
import { listenToReports } from '../lib/db';
import { isFirebaseConfigured } from '../config/firebase';
import { normalizeTrackingCode } from '../lib/trackingCode';
import { useAuth, signOut } from '../lib/auth';
import { hasSeenOnboarding } from './onboarding';
import { T } from '../components/T';
import { StatusChip, CategoryBadge, EmptyState, Card } from '../components/ui';
import { Icon, IconTile } from '../components/Icon';

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

  function onAccount() {
    if (!user) {
      router.push('/auth');
    } else {
      Alert.alert(
        'حسابك',
        user.displayName ? `${user.displayName}\n${user.email || ''}` : user.email || '',
        [
          { text: 'بيانات التواصل', onPress: () => router.push('/auth') },
          { text: 'تسجيل الخروج', style: 'destructive', onPress: () => signOut() },
          { text: 'إلغاء', style: 'cancel' },
        ]
      );
    }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'صباح الخير' : 'مساء الخير';
  const today = new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 36 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />
        }
      >
        {/* الهيدر */}
        <LinearGradient colors={[colors.navy, colors.navySoft]} style={styles.hero}>
          <View style={styles.topRow}>
            <View style={styles.brandWrap}>
              {/* دخول المشرفين مخفي: ضغطة مطوّلة على علامة التطبيق */}
              <Pressable onLongPress={() => router.push('/admin')} delayLongPress={1500}>
                <Image source={require('../../assets/brand-mark.png')} style={styles.brandMark} />
              </Pressable>
              <View>
                <T style={styles.brandName}>طريقك أمان</T>
                <T style={styles.brandSub}>بلاغات الطرق في مصر</T>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.accountChip, pressed && { opacity: 0.8 }]}
              onPress={onAccount}
            >
              <Icon
                name={user ? 'person-circle-outline' : 'key-outline'}
                size={15}
                color="#C9D8EA"
              />
              <T style={styles.accountChipText} numberOfLines={1}>
                {user ? user.displayName || user.email : 'دخول'}
              </T>
            </Pressable>
          </View>

          <View style={styles.greetWrap}>
            <T style={styles.greeting}>
              {greeting}
              {user?.displayName ? ` يا ${user.displayName.split(' ')[0]}` : ''}
            </T>
            <T style={styles.dateLine}>{today}</T>
          </View>

          {/* النداء الأساسي */}
          <Pressable
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] }]}
            onPress={() => router.push('/report')}
          >
            <View style={styles.ctaTextWrap}>
              <T style={styles.ctaTitle}>أبلغ عن مشكلة في الطريق</T>
              <T style={styles.ctaSub}>صوّر وحدد الموقع — وبلاغك يتسجّل وتتابعه برقم مرجعي</T>
            </View>
            <View style={styles.ctaIconWrap}>
              <Icon name="megaphone-outline" size={26} color={colors.white} />
            </View>
          </Pressable>

          {/* بحث برقم البلاغ */}
          <View style={styles.searchBox}>
            <Pressable onPress={goTrack} style={styles.searchBtn} hitSlop={8}>
              <Icon name="arrow-back" size={16} color={colors.white} />
            </Pressable>
            <TextInput
              style={styles.searchInput}
              placeholder="عندك رقم بلاغ؟ اكتبه هنا (TA-123456)"
              placeholderTextColor="#7E93AC"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={goTrack}
              textAlign="right"
            />
            <Icon name="search-outline" size={17} color="#7E93AC" style={{ marginLeft: 12 }} />
          </View>
        </LinearGradient>

        {/* إحصائيات */}
        <View style={styles.statsCard}>
          <StatCell label="كل البلاغات" value={stats.total} color={colors.navy} loading={loading} />
          <View style={styles.statDivider} />
          <StatCell label="جديدة" value={stats.new} color={colors.red} loading={loading} />
          <View style={styles.statDivider} />
          <StatCell label="قيد العمل" value={stats.inProgress} color={colors.amber} loading={loading} />
          <View style={styles.statDivider} />
          <StatCell label="اتحلت" value={stats.resolved} color={colors.green} loading={loading} />
        </View>

        {/* خدمات التطبيق */}
        <View style={styles.servicesRow}>
          <ServiceTile
            icon="map-outline"
            tint={colors.blue}
            title="الخريطة"
            subtitle="البلاغات حواليك"
            onPress={() => router.push('/map')}
          />
          <ServiceTile
            icon="navigate-outline"
            tint={colors.teal}
            title="الرحلة الآمنة"
            subtitle="تنبيهات على طريقك"
            onPress={() => router.push('/trip')}
          />
          <ServiceTile
            icon="receipt-outline"
            tint={colors.amber}
            title="تتبع بلاغ"
            subtitle="برقمه المرجعي"
            onPress={() => router.push('/track')}
          />
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

        {/* أحدث البلاغات */}
        <View style={styles.sectionHeader}>
          <T style={styles.sectionTitle}>أحدث البلاغات</T>
          <Pressable onPress={() => router.push('/map')} style={styles.sectionLinkWrap}>
            <T style={styles.sectionLink}>عرض الكل</T>
            <Icon name="arrow-back" size={13} color={colors.teal} />
          </Pressable>
        </View>

        {!configured ? (
          <Card style={{ marginHorizontal: 16 }}>
            <EmptyState
              icon={<IconTile name="construct" size={56} iconSize={26} color={colors.teal} bg={colors.tealPale} />}
              title="البلاغات هتظهر هنا"
              subtitle="ظبط Firebase من ملف README (قسم الإعداد) وارجع هنا"
            />
          </Card>
        ) : loading ? (
          <Card style={{ marginHorizontal: 16 }}>
            <EmptyState icon={<IconTile name="hourglass" size={56} iconSize={26} color={colors.teal} bg={colors.tealPale} />} title="بنحمّل البلاغات…" />
          </Card>
        ) : reports.length === 0 ? (
          <Card style={{ marginHorizontal: 16 }}>
            <EmptyState
              icon={<IconTile name="map" size={56} iconSize={26} color={colors.teal} bg={colors.tealPale} />}
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
      <Icon name="chevron-back" size={16} color={colors.textSoft} />
    </Pressable>
  );
}

function StatCell({ label, value, color, loading }) {
  return (
    <View style={styles.statCell}>
      <T style={[styles.statValue, { color }]}>{loading ? '…' : value}</T>
      <T style={styles.statLabel}>{label}</T>
    </View>
  );
}

function ServiceTile({ icon, tint, title, subtitle, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.serviceTile, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
      onPress={onPress}
    >
      <IconTile name={icon} size={46} iconSize={23} color={tint} />
      <T style={styles.serviceTitle}>{title}</T>
      <T style={styles.serviceSub}>{subtitle}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  scroll: { flex: 1, backgroundColor: colors.bg },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  topRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  brandMark: { width: 42, height: 42 },
  brandName: { fontFamily: FONTS.extraBold, fontSize: 19, color: colors.white, textAlign: 'right' },
  brandSub: { fontFamily: FONTS.regular, fontSize: 11, color: '#8FA3BC', marginTop: 1, textAlign: 'right' },
  accountChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.full,
    paddingHorizontal: 11,
    paddingVertical: 6,
    maxWidth: '46%',
  },
  accountChipText: { color: '#C9D8EA', fontSize: 12, fontFamily: FONTS.semiBold },
  greetWrap: { marginTop: 22, alignItems: 'flex-end' },
  greeting: { fontFamily: FONTS.black, fontSize: 26, color: colors.white, textAlign: 'right' },
  dateLine: { fontFamily: FONTS.regular, fontSize: 12.5, color: '#8FA3BC', marginTop: 4, textAlign: 'right' },
  cta: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.teal,
    borderRadius: radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginTop: 18,
    ...shadow.raised,
  },
  ctaTextWrap: { flex: 1, alignItems: 'flex-end' },
  ctaTitle: { fontFamily: FONTS.extraBold, fontSize: 16.5, color: colors.white, textAlign: 'right' },
  ctaSub: { fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3, textAlign: 'right' },
  ctaIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
  },
  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.md,
    marginTop: 14,
  },
  searchBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: 16,
    alignSelf: 'stretch',
    justifyContent: 'center',
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontFamily: FONTS.regular,
    fontSize: 13.5,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  statsCard: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 16,
    marginTop: 18,
    paddingVertical: 14,
    ...shadow.card,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },
  statValue: { fontSize: 20, fontFamily: FONTS.black },
  statLabel: { fontSize: 11, color: colors.textSoft, marginTop: 3, fontFamily: FONTS.semiBold },
  servicesRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  serviceTile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    ...shadow.card,
  },
  serviceTitle: { fontSize: 13, fontFamily: FONTS.bold, color: colors.text, marginTop: 9 },
  serviceSub: { fontSize: 10, color: colors.textSoft, marginTop: 2, textAlign: 'center' },
  sectionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontFamily: FONTS.extraBold, color: colors.text },
  sectionLinkWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  sectionLink: { fontSize: 12.5, color: colors.teal, fontFamily: FONTS.bold },
  reportRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    ...shadow.card,
  },
  reportRowBody: { flex: 1, alignItems: 'flex-end' },
  reportRowTitle: { fontSize: 14, fontFamily: FONTS.bold, color: colors.text },
  reportRowMeta: { fontSize: 11, color: colors.textSoft, marginTop: 3 },
});

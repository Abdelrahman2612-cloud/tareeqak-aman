import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { colors, radius, shadow, STATUS, STATUS_ORDER, CATEGORIES, CATEGORY_KEYS, SEVERITY_ORDER, formatDate, FONTS } from '../theme';
import { listenToReports, updateReportStatus, deleteReport } from '../lib/db';
import { isFirebaseConfigured } from '../config/firebase';
import { ADMIN_PIN } from '../config/admin';
import { useAuth, signInWithEmail, signOut, authErrorMessage } from '../lib/auth';
import { T } from '../components/T';
import { StatusChip, CategoryBadge, SeverityChip, Card, EmptyState, FirebaseNotConfigured } from '../components/ui';
import { Icon, IconTile } from '../components/Icon';

export default function AdminScreen() {
  const configured = isFirebaseConfigured();
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const { user } = useAuth();
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [signInBusy, setSignInBusy] = useState(false);
  const [signInError, setSignInError] = useState('');

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!configured || !authed) return undefined;
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
  }, [configured, authed, tick]);

  // الأولوية: الخطورة العالية الأول، وبعدين الأحدث
  // لازم يفضل فوق أي return شرطي (قواعد الـ hooks)
  const sorted = useMemo(() => {
    let rows = reports;
    if (statusFilter !== 'all') rows = rows.filter((r) => r.status === statusFilter);
    return [...rows].sort((a, b) => {
      const sa = SEVERITY_ORDER.indexOf(a.severity);
      const sb = SEVERITY_ORDER.indexOf(b.severity);
      if (sa !== sb) return sa - sb;
      return (b.createdAtMillis || 0) - (a.createdAtMillis || 0);
    });
  }, [reports, statusFilter]);

  if (!configured) return <FirebaseNotConfigured />;

  function tryPin() {
    if (pin.trim() === ADMIN_PIN) {
      setAuthed(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  }

  // شاشة الدخول بالـ PIN
  if (!authed) {
    return (
      <View style={styles.pinWrap}>
        <View style={styles.pinIconWrap}>
          <Icon name="lock-closed" size={34} color={colors.teal} />
        </View>
        <T style={styles.pinTitle}>منطقة المشرفين</T>
        <T style={styles.pinSub}>ادخل الرقم السري عشان تكمل</T>
        <TextInput
          style={[styles.pinInput, pinError && { borderColor: colors.red }]}
          value={pin}
          onChangeText={(t) => {
            setPin(t);
            setPinError(false);
          }}
          keyboardType="number-pad"
          secureTextEntry
          placeholder="••••"
          placeholderTextColor="#9AA7B8"
          maxLength={12}
          textAlign="center"
          onSubmitEditing={tryPin}
        />
        {pinError && <T style={styles.pinError}>الرقم غلط، حاول تاني</T>}
        <Pressable style={({ pressed }) => [styles.pinBtn, pressed && { opacity: 0.85 }]} onPress={tryPin}>
          <T style={styles.pinBtnText}>دخول</T>
        </Pressable>
        <T style={styles.pinHint}>الرقم بيتغيّر من ملف src/config/admin.js</T>
      </View>
    );
  }

  async function adminSignIn() {
    if (signInBusy) return;
    setSignInBusy(true);
    setSignInError('');
    try {
      await signInWithEmail(adminEmail, adminPass);
    } catch (e) {
      setSignInError(authErrorMessage(e));
    } finally {
      setSignInBusy(false);
    }
  }

  // المرحلة التانية: تسجيل دخول المشرف بحساب Firebase Auth
  // قواعد Firestore بتمنع تعديل/حذف البلاغات إلا لمستخدم مسجل دخوله
  if (!user) {
    return (
      <View style={styles.pinWrap}>
        <View style={styles.pinIconWrap}>
          <Icon name="person" size={34} color={colors.teal} />
        </View>
        <T style={styles.pinTitle}>تسجيل دخول المشرف</T>
        <T style={styles.pinSub}>سجّل بحساب المشرف عشان تقدر تدير البلاغات</T>
        <TextInput
          style={[styles.pinInput, styles.authInput]}
          value={adminEmail}
          onChangeText={(t) => {
            setAdminEmail(t);
            setSignInError('');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="admin@example.com"
          placeholderTextColor="#9AA7B8"
          textAlign="left"
        />
        <TextInput
          style={[styles.pinInput, styles.authInput, { marginTop: 10 }]}
          value={adminPass}
          onChangeText={(t) => {
            setAdminPass(t);
            setSignInError('');
          }}
          secureTextEntry
          placeholder="كلمة السر"
          placeholderTextColor="#9AA7B8"
          textAlign="left"
          onSubmitEditing={adminSignIn}
        />
        {!!signInError && <T style={styles.pinError}>{signInError}</T>}
        <Pressable
          style={({ pressed }) => [styles.pinBtn, (pressed || signInBusy) && { opacity: 0.85 }]}
          onPress={adminSignIn}
        >
          <T style={styles.pinBtnText}>{signInBusy ? 'بيسجّل…' : 'دخول'}</T>
        </Pressable>
        <T style={styles.pinHint}>حساب المشرف بيتعمل من Firebase Console (Authentication → Users)</T>
      </View>
    );
  }

  const stats = {
    total: reports.length,
    new: reports.filter((r) => r.status === 'new').length,
    inProgress: reports.filter((r) => r.status === 'in_progress').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
  };
  const byCategory = CATEGORY_KEYS.map((k) => ({
    key: k,
    count: reports.filter((r) => r.category === k && r.status !== 'resolved').length,
  }));

  async function changeStatus(report, newStatus) {
    setBusyId(report.id);
    try {
      await updateReportStatus(report.id, newStatus, report.statusHistory);
    } catch (e) {
      const denied = String(e?.code || '').includes('permission-denied');
      Alert.alert(
        'حصل خطأ',
        denied ? 'مفيش صلاحية تعديل — اتأكد إنك مسجل دخول بحساب المشرف.' : 'الحالة ماتحدثتش. اتأكد من الإنترنت وجرب تاني.'
      );
    } finally {
      setBusyId(null);
    }
  }

  function confirmDelete(report) {
    Alert.alert('حذف البلاغ؟', `هيتم حذف البلاغ ${report.trackingCode} نهائيًا.`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReport(report.id);
          } catch (e) {
            const denied = String(e?.code || '').includes('permission-denied');
            Alert.alert(
              'حصل خطأ',
              denied ? 'مفيش صلاحية حذف — اتأكد إنك مسجل دخول بحساب المشرف.' : 'البلاغ ماتحذفش. جرب تاني.'
            );
          }
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            setTick((t) => t + 1);
          }}
          tintColor={colors.teal}
        />
      }
    >
      {/* شريط المشرف المسجل */}
      <View style={styles.adminBar}>
        <T style={styles.adminBarText} numberOfLines={1}>
          مسجل كمشرف: {user.email || user.displayName || ''}
        </T>
        <Pressable onPress={() => signOut()}>
          <T style={styles.adminBarOut}>خروج</T>
        </Pressable>
      </View>

      {/* إحصائيات عامة */}
      <View style={styles.statsRow}>
        <Stat label="الكل" value={stats.total} color={colors.navy} active={statusFilter === 'all'} onPress={() => setStatusFilter('all')} />
        <Stat label="جديدة" value={stats.new} color={colors.red} active={statusFilter === 'new'} onPress={() => setStatusFilter('new')} />
        <Stat label="قيد العمل" value={stats.inProgress} color={colors.amber} active={statusFilter === 'in_progress'} onPress={() => setStatusFilter('in_progress')} />
        <Stat label="اتحلت" value={stats.resolved} color={colors.green} active={statusFilter === 'resolved'} onPress={() => setStatusFilter('resolved')} />
      </View>

      {/* بلاغات مفتوحة حسب الفئة */}
      <Card style={{ marginTop: 12 }}>
        <T style={styles.cardTitle}>بلاغات مفتوحة حسب النوع</T>
        <View style={styles.catRow}>
          {byCategory.map((c) => (
            <View key={c.key} style={styles.catItem}>
              <View style={[styles.catIconWrap, { backgroundColor: CATEGORIES[c.key].color + '1F' }]}>
                <Icon name={CATEGORIES[c.key].ion || 'help-circle'} size={20} color={CATEGORIES[c.key].color} />
              </View>
              <T style={styles.catCount}>{c.count}</T>
              <T style={styles.catLabel}>{CATEGORIES[c.key].label}</T>
            </View>
          ))}
        </View>
      </Card>

      {/* قائمة البلاغات */}
      <T style={[styles.cardTitle, { marginTop: 20, marginBottom: 10 }]}>
        البلاغات (مرتبة بالأولوية)
      </T>
      {loading ? (
        <Card><EmptyState icon="⏳" title="بنحمّل…" /></Card>
      ) : sorted.length === 0 ? (
        <Card><EmptyState icon={<IconTile name="file-tray" size={56} iconSize={26} color={colors.teal} bg={colors.tealPale} />} title="مفيش بلاغات هنا" subtitle="جرب فلتر تاني أو اعمل تحديث" /></Card>
      ) : (
        sorted.map((r) => {
          const statusIdx = STATUS_ORDER.indexOf(r.status);
          const nextStatus = statusIdx < STATUS_ORDER.length - 1 ? STATUS_ORDER[statusIdx + 1] : null;
          const prevStatus = statusIdx > 0 ? STATUS_ORDER[statusIdx - 1] : null;
          return (
            <Card key={r.id} style={{ marginBottom: 10, opacity: busyId === r.id ? 0.6 : 1 }}>
              <View style={styles.itemHead}>
                <CategoryBadge category={r.category} size={44} />
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <T style={styles.itemTitle}>{CATEGORIES[r.category]?.label}</T>
                  <T style={styles.itemCode}>
                    {r.trackingCode} · {formatDate(r.createdAtMillis)}
                    {r.userName ? ` · ${r.userName}` : ''}
                  </T>
                </View>
              </View>
              <View style={styles.itemChips}>
                <StatusChip status={r.status} />
                <SeverityChip severity={r.severity} />
              </View>
              {r.imageUrl ? <Image source={{ uri: r.imageUrl }} style={styles.itemImg} /> : null}
              {r.description ? <T style={styles.itemDesc} numberOfLines={3}>{r.description}</T> : null}
              <View style={styles.actionsRow}>
                {nextStatus && (
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: STATUS[nextStatus].color }]}
                    onPress={() => changeStatus(r, nextStatus)}
                    disabled={busyId === r.id}
                  >
                    <T style={styles.actionBtnText}>تحويل إلى «{STATUS[nextStatus].label}»</T>
                  </Pressable>
                )}
                {prevStatus && (
                  <Pressable
                    style={[styles.actionBtn, styles.actionBtnGhost]}
                    onPress={() => changeStatus(r, prevStatus)}
                    disabled={busyId === r.id}
                  >
                    <T style={[styles.actionBtnText, { color: colors.textSoft }]}>رجوع لـ«{STATUS[prevStatus].label}»</T>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.actionBtn, styles.actionBtnDelete]}
                  onPress={() => confirmDelete(r)}
                  disabled={busyId === r.id}
                >
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5 }}>
                    <Icon name="trash" size={13} color={colors.red} />
                    <T style={[styles.actionBtnText, { color: colors.red }]}>حذف</T>
                  </View>
                </Pressable>
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

function Stat({ label, value, color, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.statCard, active && { borderColor: color, borderWidth: 2 }]}
    >
      <T style={[styles.statValue, { color }]}>{value}</T>
      <T style={styles.statLabel}>{label}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pinWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.bg },
  pinIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...shadow.raised,
  },
  pinIcon: { fontSize: 38 },
  pinTitle: { fontSize: 22, fontFamily: FONTS.black, color: colors.text },
  pinSub: { fontSize: 14, color: colors.textSoft, marginTop: 6, marginBottom: 22 },
  pinInput: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    width: 190,
    paddingVertical: 12,
    fontSize: 22,
    fontFamily: FONTS.extraBold,
    color: colors.text,
    letterSpacing: 6,
  },
  authInput: { width: 280, fontSize: 15, letterSpacing: 0, fontFamily: FONTS.semiBold, paddingHorizontal: 14 },
  pinError: { color: colors.red, fontSize: 13, marginTop: 8, fontFamily: FONTS.semiBold },
  pinBtn: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 64,
    marginTop: 16,
    ...shadow.card,
  },
  pinBtnText: { color: '#fff', fontSize: 16, fontFamily: FONTS.extraBold },
  pinHint: { fontSize: 11.5, color: colors.textSoft, marginTop: 20, textAlign: 'center' },
  adminBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  adminBarText: { fontSize: 12.5, color: colors.textSoft, fontFamily: FONTS.semiBold, flex: 1 },
  adminBarOut: { fontSize: 12.5, color: colors.red, fontFamily: FONTS.bold },
  statsRow: { flexDirection: 'row-reverse', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  statValue: { fontSize: 21, fontFamily: FONTS.black },
  statLabel: { fontSize: 11.5, color: colors.textSoft, marginTop: 3, fontFamily: FONTS.semiBold },
  cardTitle: { fontSize: 16.5, fontFamily: FONTS.black, color: colors.text, textAlign: 'right' },
  catRow: { flexDirection: 'row-reverse', justifyContent: 'space-around', marginTop: 14 },
  catItem: { alignItems: 'center', gap: 5, flex: 1 },
  catIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catIcon: { fontSize: 22 },
  catCount: { fontSize: 17, fontFamily: FONTS.black, color: colors.navy },
  catLabel: { fontSize: 9.5, color: colors.textSoft, textAlign: 'center', fontFamily: FONTS.semiBold },
  itemHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  itemTitle: { fontSize: 16, fontFamily: FONTS.extraBold, color: colors.text },
  itemCode: { fontSize: 12, color: colors.textSoft, marginTop: 2 },
  itemChips: { flexDirection: 'row-reverse', gap: 8, marginTop: 10 },
  itemImg: { width: '100%', height: 160, borderRadius: radius.sm, marginTop: 10 },
  itemDesc: { fontSize: 14, color: colors.text, marginTop: 10, textAlign: 'right', lineHeight: 21 },
  actionsRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  actionBtn: {
    borderRadius: radius.sm,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  actionBtnGhost: { backgroundColor: '#EEF2F7' },
  actionBtnDelete: { backgroundColor: '#FDECEC' },
  actionBtnText: { color: '#fff', fontSize: 12.5, fontFamily: FONTS.bold },
});

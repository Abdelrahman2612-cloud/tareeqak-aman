import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { colors, radius, STATUS, STATUS_ORDER, CATEGORIES, CATEGORY_KEYS, SEVERITY, SEVERITY_ORDER, formatDate } from '../theme';
import { listenToReports, updateReportStatus, deleteReport } from '../lib/db';
import { isFirebaseConfigured } from '../config/firebase';
import { ADMIN_PIN } from '../config/admin';
import { StatusChip, CategoryBadge, SeverityChip, Card, EmptyState, FirebaseNotConfigured } from '../components/ui';

export default function AdminScreen() {
  const configured = isFirebaseConfigured();
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

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
        <Text style={styles.pinIcon}>🔐</Text>
        <Text style={styles.pinTitle}>منطقة المشرفين</Text>
        <Text style={styles.pinSub}>ادخل الرقم السري عشان تكمل</Text>
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
        {pinError && <Text style={styles.pinError}>الرقم غلط، حاول تاني</Text>}
        <Pressable style={({ pressed }) => [styles.pinBtn, pressed && { opacity: 0.85 }]} onPress={tryPin}>
          <Text style={styles.pinBtnText}>دخول</Text>
        </Pressable>
        <Text style={styles.pinHint}>الرقم الافتراضي 1234 — غيّره من ملف src/config/admin.js</Text>
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

  // الأولوية: الخطورة العالية الأول، وبعدين الأحدث
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

  async function changeStatus(report, newStatus) {
    setBusyId(report.id);
    try {
      await updateReportStatus(report.id, newStatus, report.statusHistory);
    } catch (e) {
      Alert.alert('حصل خطأ', 'الحالة ماتحدثتش. اتأكد من الإنترنت وجرب تاني.');
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
            Alert.alert('حصل خطأ', 'البلاغ ماتحذفش. جرب تاني.');
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
      {/* إحصائيات عامة */}
      <View style={styles.statsRow}>
        <Stat label="الكل" value={stats.total} color={colors.navy} active={statusFilter === 'all'} onPress={() => setStatusFilter('all')} />
        <Stat label="جديدة" value={stats.new} color={colors.red} active={statusFilter === 'new'} onPress={() => setStatusFilter('new')} />
        <Stat label="قيد العمل" value={stats.inProgress} color={colors.amber} active={statusFilter === 'in_progress'} onPress={() => setStatusFilter('in_progress')} />
        <Stat label="اتحلت" value={stats.resolved} color={colors.green} active={statusFilter === 'resolved'} onPress={() => setStatusFilter('resolved')} />
      </View>

      {/* بلاغات مفتوحة حسب الفئة */}
      <Card style={{ marginTop: 12 }}>
        <Text style={styles.cardTitle}>بلاغات مفتوحة حسب النوع</Text>
        <View style={styles.catRow}>
          {byCategory.map((c) => (
            <View key={c.key} style={styles.catItem}>
              <Text style={styles.catIcon}>{CATEGORIES[c.key].icon}</Text>
              <Text style={styles.catCount}>{c.count}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* قائمة البلاغات */}
      <Text style={[styles.cardTitle, { marginTop: 20, marginBottom: 10 }]}>
        البلاغات (مرتبة بالأولوية)
      </Text>
      {loading ? (
        <Card><EmptyState icon="⏳" title="بنحمّل…" /></Card>
      ) : sorted.length === 0 ? (
        <Card><EmptyState icon="📭" title="مفيش بلاغات هنا" subtitle="جرب فلتر تاني أو اعمل تحديث" /></Card>
      ) : (
        sorted.map((r) => {
          const statusIdx = STATUS_ORDER.indexOf(r.status);
          const nextStatus = statusIdx < STATUS_ORDER.length - 1 ? STATUS_ORDER[statusIdx + 1] : null;
          const prevStatus = statusIdx > 0 ? STATUS_ORDER[statusIdx - 1] : null;
          return (
            <Card key={r.id} style={{ marginBottom: 10, opacity: busyId === r.id ? 0.6 : 1 }}>
              <View style={styles.itemHead}>
                <CategoryBadge category={r.category} size={42} />
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.itemTitle}>{CATEGORIES[r.category]?.label}</Text>
                  <Text style={styles.itemCode}>{r.trackingCode} · {formatDate(r.createdAtMillis)}</Text>
                </View>
              </View>
              <View style={styles.itemChips}>
                <StatusChip status={r.status} />
                <SeverityChip severity={r.severity} />
              </View>
              {r.imageUrl ? <Image source={{ uri: r.imageUrl }} style={styles.itemImg} /> : null}
              {r.description ? <Text style={styles.itemDesc} numberOfLines={3}>{r.description}</Text> : null}
              <View style={styles.actionsRow}>
                {nextStatus && (
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: STATUS[nextStatus].color }]}
                    onPress={() => changeStatus(r, nextStatus)}
                    disabled={busyId === r.id}
                  >
                    <Text style={styles.actionBtnText}>تحويل إلى «{STATUS[nextStatus].label}»</Text>
                  </Pressable>
                )}
                {prevStatus && (
                  <Pressable
                    style={[styles.actionBtn, styles.actionBtnGhost]}
                    onPress={() => changeStatus(r, prevStatus)}
                    disabled={busyId === r.id}
                  >
                    <Text style={[styles.actionBtnText, { color: colors.textSoft }]}>رجوع لـ«{STATUS[prevStatus].label}»</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.actionBtn, styles.actionBtnDelete]}
                  onPress={() => confirmDelete(r)}
                  disabled={busyId === r.id}
                >
                  <Text style={[styles.actionBtnText, { color: colors.red }]}>🗑 حذف</Text>
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
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pinWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.bg },
  pinIcon: { fontSize: 46, marginBottom: 12 },
  pinTitle: { fontSize: 21, fontWeight: '900', color: colors.text, writingDirection: 'rtl' },
  pinSub: { fontSize: 14, color: colors.textSoft, marginTop: 6, marginBottom: 20, writingDirection: 'rtl' },
  pinInput: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    width: 180,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 6,
  },
  pinError: { color: colors.red, fontSize: 13, marginTop: 8, writingDirection: 'rtl' },
  pinBtn: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 60,
    marginTop: 16,
  },
  pinBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  pinHint: { fontSize: 11.5, color: colors.textSoft, marginTop: 18, writingDirection: 'rtl', textAlign: 'center' },
  statsRow: { flexDirection: 'row-reverse', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: 21, fontWeight: '900' },
  statLabel: { fontSize: 11.5, color: colors.textSoft, marginTop: 2, writingDirection: 'rtl' },
  cardTitle: { fontSize: 16, fontWeight: '900', color: colors.text, textAlign: 'right', writingDirection: 'rtl' },
  catRow: { flexDirection: 'row-reverse', justifyContent: 'space-around', marginTop: 12 },
  catItem: { alignItems: 'center', gap: 4 },
  catIcon: { fontSize: 24 },
  catCount: { fontSize: 16, fontWeight: '900', color: colors.navy },
  itemHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  itemTitle: { fontSize: 16, fontWeight: '800', color: colors.text, writingDirection: 'rtl' },
  itemCode: { fontSize: 12, color: colors.textSoft, marginTop: 2 },
  itemChips: { flexDirection: 'row-reverse', gap: 8, marginTop: 10 },
  itemImg: { width: '100%', height: 150, borderRadius: radius.sm, marginTop: 10 },
  itemDesc: { fontSize: 13.5, color: colors.text, marginTop: 10, textAlign: 'right', writingDirection: 'rtl', lineHeight: 20 },
  actionsRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  actionBtn: {
    borderRadius: radius.sm,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  actionBtnGhost: { backgroundColor: '#EEF2F6' },
  actionBtnDelete: { backgroundColor: '#FEE2E2' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '800', writingDirection: 'rtl' },
});

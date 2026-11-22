import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  Image,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radius, STATUS, STATUS_ORDER, CATEGORIES, formatDate, FONTS } from '../theme';
import { findReportByCode } from '../lib/db';
import { isFirebaseConfigured } from '../config/firebase';
import { normalizeTrackingCode } from '../lib/trackingCode';
import { T } from '../components/T';
import {
  PrimaryButton,
  CategoryBadge,
  StatusChip,
  SeverityChip,
  Card,
  EmptyState,
  FirebaseNotConfigured,
} from '../components/ui';

export default function TrackScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const configured = isFirebaseConfigured();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (configured && params.code) {
      const c = normalizeTrackingCode(params.code);
      setCode(c);
      search(c);
    }
  }, [params.code, configured]);

  if (!configured) return <FirebaseNotConfigured />;

  async function search(rawCode) {
    const c = normalizeTrackingCode(rawCode ?? code);
    if (!c) return;
    setLoading(true);
    setNotFound(false);
    setReport(null);
    try {
      const r = await findReportByCode(c);
      if (r) setReport(r);
      else setNotFound(true);
    } catch (e) {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* صندوق البحث */}
      <View style={styles.searchRow}>
        <PrimaryButton title="بحث" onPress={() => search()} loading={loading} style={{ paddingHorizontal: 24, paddingVertical: 12 }} />
        <TextInput
          style={styles.input}
          placeholder="الرقم المرجعي (TA-123456)"
          placeholderTextColor="#9AA7B8"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => search()}
          textAlign="right"
        />
      </View>

      {notFound && (
        <Card style={{ marginTop: 16 }}>
          <EmptyState
            icon="🔍"
            title="الرقم ده مش موجود"
            subtitle="اتأكد من الرقم المرجعي وحاول تاني — بيبدأ بـ TA- وبعدها ٦ أرقام"
          />
        </Card>
      )}

      {report && (
        <View style={{ marginTop: 16 }}>
          {/* تفاصيل البلاغ */}
          <Card>
            <View style={styles.headRow}>
              <CategoryBadge category={report.category} size={54} />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <T style={styles.title}>{CATEGORIES[report.category]?.label}</T>
                <T style={styles.code}>{report.trackingCode}</T>
              </View>
            </View>
            <View style={styles.chipsRow}>
              <StatusChip status={report.status} />
              <SeverityChip severity={report.severity} />
            </View>
            {report.imageUrl ? <Image source={{ uri: report.imageUrl }} style={styles.img} /> : null}
            {report.description ? <T style={styles.desc}>{report.description}</T> : null}
            <View style={styles.metaRow}>
              <T style={styles.date}>اتسجل: {formatDate(report.createdAtMillis)}</T>
              {report.userName ? <T style={styles.author}>بواسطة: {report.userName}</T> : null}
            </View>
            <Pressable
              onPress={() => router.push({ pathname: '/map', params: { focus: report.trackingCode } })}
            >
              <T style={styles.mapLink}>عرض الموقع على الخريطة ←</T>
            </Pressable>
          </Card>

          {/* الخط الزمني للحالة */}
          <Card style={{ marginTop: 14 }}>
            <T style={styles.timelineTitle}>🧭 مسار البلاغ</T>
            {STATUS_ORDER.map((sKey, i) => {
              const hist = (report.statusHistory || []).find((h) => h.status === sKey);
              const reached = !!hist || STATUS_ORDER.indexOf(report.status) >= i;
              const isCurrent = report.status === sKey;
              const done = STATUS_ORDER.indexOf(report.status) > i;
              const s = STATUS[sKey];
              return (
                <View key={sKey} style={styles.timelineRow}>
                  {/* الخط والنقطة */}
                  <View style={styles.timelineRail}>
                    <View
                      style={[
                        styles.timelineDot,
                        { backgroundColor: reached ? s.color : '#D7DEE8' },
                        isCurrent && styles.timelineDotCurrent,
                        isCurrent && { borderColor: s.color },
                      ]}
                    >
                      {done ? <T style={styles.timelineCheck}>✓</T> : null}
                    </View>
                    {i < STATUS_ORDER.length - 1 && (
                      <View
                        style={[
                          styles.timelineLine,
                          { backgroundColor: done ? colors.green : '#D7DEE8' },
                        ]}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end', paddingBottom: 26 }}>
                    <T style={[styles.timelineLabel, { color: reached ? colors.text : '#9AA7B8' }]}>
                      {s.label}
                    </T>
                    {isCurrent ? (
                      <View style={[styles.currentPill, { backgroundColor: s.bg }]}>
                        <T style={[styles.currentPillText, { color: s.color }]}>الحالة الحالية</T>
                      </View>
                    ) : null}
                    {hist ? <T style={styles.timelineDate}>{formatDate(hist.at)}</T> : null}
                  </View>
                </View>
              );
            })}
            {report.status === 'resolved' && (
              <View style={styles.doneBox}>
                <T style={styles.doneNote}>🎉 المشكلة اتحلت. شكرًا لبلاغك!</T>
              </View>
            )}
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row-reverse', gap: 10, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: colors.text,
  },
  headRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  title: { fontSize: 20, fontFamily: FONTS.black, color: colors.text },
  code: { fontSize: 13.5, color: colors.textSoft, marginTop: 2, fontFamily: FONTS.semiBold },
  chipsRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 12 },
  img: { width: '100%', height: 200, borderRadius: radius.sm, marginTop: 12 },
  desc: { fontSize: 14.5, color: colors.text, marginTop: 12, textAlign: 'right', lineHeight: 23 },
  metaRow: { marginTop: 12, gap: 3, alignItems: 'flex-end' },
  date: { fontSize: 12.5, color: colors.textSoft, textAlign: 'right' },
  author: { fontSize: 12.5, color: colors.teal, fontFamily: FONTS.bold, textAlign: 'right' },
  mapLink: { color: colors.teal, fontFamily: FONTS.extraBold, fontSize: 14, marginTop: 12, textAlign: 'right' },
  timelineTitle: { fontSize: 16.5, fontFamily: FONTS.black, color: colors.text, textAlign: 'right', marginBottom: 18 },
  timelineRow: { flexDirection: 'row-reverse', gap: 14 },
  timelineRail: { alignItems: 'center', width: 24 },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotCurrent: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 4,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  timelineCheck: { color: '#fff', fontSize: 11, fontFamily: FONTS.black },
  timelineLine: { width: 3, flex: 1, marginTop: 3, borderRadius: 2 },
  timelineLabel: { fontSize: 15.5, fontFamily: FONTS.extraBold },
  currentPill: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 6,
  },
  currentPillText: { fontSize: 11.5, fontFamily: FONTS.bold },
  timelineDate: { fontSize: 12, color: colors.textSoft, marginTop: 5 },
  doneBox: {
    backgroundColor: colors.greenPale,
    borderRadius: radius.sm,
    padding: 12,
    marginTop: 4,
  },
  doneNote: { fontSize: 14, color: colors.green, fontFamily: FONTS.extraBold, textAlign: 'center' },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radius, STATUS, STATUS_ORDER, CATEGORIES, formatDate } from '../theme';
import { findReportByCode } from '../lib/db';
import { isFirebaseConfigured } from '../config/firebase';
import { normalizeTrackingCode } from '../lib/trackingCode';
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
              <CategoryBadge category={report.category} size={50} />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.title}>{CATEGORIES[report.category]?.label}</Text>
                <Text style={styles.code}>{report.trackingCode}</Text>
              </View>
            </View>
            <View style={styles.chipsRow}>
              <StatusChip status={report.status} />
              <SeverityChip severity={report.severity} />
            </View>
            {report.imageUrl ? <Image source={{ uri: report.imageUrl }} style={styles.img} /> : null}
            {report.description ? <Text style={styles.desc}>{report.description}</Text> : null}
            <Text style={styles.date}>اتسجل: {formatDate(report.createdAtMillis)}</Text>
            <Pressable
              onPress={() => router.push({ pathname: '/map', params: { focus: report.trackingCode } })}
            >
              <Text style={styles.mapLink}>عرض الموقع على الخريطة ←</Text>
            </Pressable>
          </Card>

          {/* الخط الزمني للحالة */}
          <Card style={{ marginTop: 14 }}>
            <Text style={styles.timelineTitle}>مسار البلاغ</Text>
            {STATUS_ORDER.map((sKey, i) => {
              const hist = (report.statusHistory || []).find((h) => h.status === sKey);
              const reached = !!hist || STATUS_ORDER.indexOf(report.status) >= i;
              const isCurrent = report.status === sKey;
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
                      ]}
                    />
                    {i < STATUS_ORDER.length - 1 && (
                      <View
                        style={[
                          styles.timelineLine,
                          { backgroundColor: STATUS_ORDER.indexOf(report.status) > i ? colors.green : '#D7DEE8' },
                        ]}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end', paddingBottom: 22 }}>
                    <Text style={[styles.timelineLabel, { color: reached ? colors.text : '#9AA7B8' }]}>
                      {s.label}
                      {isCurrent ? '  •  الحالة الحالية' : ''}
                    </Text>
                    {hist ? <Text style={styles.timelineDate}>{formatDate(hist.at)}</Text> : null}
                  </View>
                </View>
              );
            })}
            {report.status === 'resolved' && (
              <Text style={styles.doneNote}>🎉 المشكلة اتحلت. شكرًا لبلاغك!</Text>
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
    color: colors.text,
  },
  headRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  title: { fontSize: 19, fontWeight: '900', color: colors.text, writingDirection: 'rtl' },
  code: { fontSize: 13.5, color: colors.textSoft, marginTop: 2 },
  chipsRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 12 },
  img: { width: '100%', height: 200, borderRadius: radius.sm, marginTop: 12 },
  desc: { fontSize: 14.5, color: colors.text, marginTop: 12, textAlign: 'right', writingDirection: 'rtl', lineHeight: 22 },
  date: { fontSize: 12.5, color: colors.textSoft, marginTop: 10, textAlign: 'right' },
  mapLink: { color: colors.teal, fontWeight: '800', fontSize: 14, marginTop: 10, textAlign: 'right' },
  timelineTitle: { fontSize: 16, fontWeight: '900', color: colors.text, textAlign: 'right', writingDirection: 'rtl', marginBottom: 14 },
  timelineRow: { flexDirection: 'row-reverse', gap: 12 },
  timelineRail: { alignItems: 'center', width: 20 },
  timelineDot: { width: 16, height: 16, borderRadius: 8, marginTop: 2 },
  timelineDotCurrent: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineLine: { width: 3, flex: 1, marginTop: 2, borderRadius: 2 },
  timelineLabel: { fontSize: 15, fontWeight: '800', writingDirection: 'rtl' },
  timelineDate: { fontSize: 12, color: colors.textSoft, marginTop: 3 },
  doneNote: { fontSize: 14, color: colors.green, fontWeight: '800', textAlign: 'center', marginTop: 4, writingDirection: 'rtl' },
});

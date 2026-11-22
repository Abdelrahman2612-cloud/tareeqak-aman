import React, { useEffect, useState } from 'react';
import {
  View,

  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { T } from '../components/T';
import { colors, radius, CATEGORIES, CATEGORY_KEYS, SEVERITY, STATUS, FONTS } from '../theme';
import { submitReport, findNearbyDuplicate } from '../lib/db';
import { uploadImageToCloudinary, isCloudinaryConfigured } from '../lib/cloudinary';
import { isFirebaseConfigured } from '../config/firebase';
import { formatDistance } from '../lib/geo';
import LeafletMap from '../components/LeafletMap';
import {
  PrimaryButton,
  GhostButton,
  CategoryBadge,
  StatusChip,
  FirebaseNotConfigured,
  Card,
} from '../components/ui';
import { Icon } from '../components/Icon';

const STEPS = ['الصورة', 'التفاصيل', 'الموقع', 'المراجعة'];

export default function ReportScreen() {
  const router = useRouter();
  const configured = isFirebaseConfigured();

  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState(null); // { uri }
  const [category, setCategory] = useState(null);
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [position, setPosition] = useState(null); // { lat, lng }
  const [locLoading, setLocLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState('');
  const [result, setResult] = useState(null); // { trackingCode }

  useEffect(() => {
    // نحاول نجيب الموقع مرة من الأول عشان الخريطة تكون جاهزة
    if (step === 2 && !position) {
      useMyLocation(true);
    }
  }, [step]);

  if (!configured) return <FirebaseNotConfigured />;

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('صلاحية الكاميرا', 'محتاجين إذن الكاميرا عشان تصور المشكلة.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!res.canceled && res.assets?.[0]) setPhoto({ uri: res.assets[0].uri });
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('صلاحية الصور', 'محتاجين إذن الوصول للصور عشان تختار صورة.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
    if (!res.canceled && res.assets?.[0]) setPhoto({ uri: res.assets[0].uri });
  }

  async function useMyLocation(silent = false) {
    setLocLoading(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        if (!silent) Alert.alert('صلاحية الموقع', 'محتاجين إذن الموقع عشان نحدد مكان البلاغ.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setPosition({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch (e) {
      if (!silent) Alert.alert('تعذر تحديد الموقع', 'اتأكد إن الـ GPS شغال وجرب تاني.');
    } finally {
      setLocLoading(false);
    }
  }

  function canNext() {
    if (step === 1 && !category) return false;
    if (step === 2 && !position) return false;
    return true;
  }

  function next() {
    if (step === 1 && !category) {
      Alert.alert('اختار نوع المشكلة', 'لازم تحدد فئة البلاغ الأول (حفرة، إنارة، …).');
      return;
    }
    if (step === 2 && !position) {
      Alert.alert('حدد الموقع', 'اضغط «استخدم موقعي الحالي» أو دوس على الخريطة لتحديد مكان المشكلة.');
      return;
    }
    setStep((s) => Math.min(s + 1, 3));
  }

  async function doSubmit(skipDuplicateCheck = false) {
    setSubmitting(true);
    try {
      // ١) فحص التكرار (زي ما جاي في العرض: منع البلاغات المكررة)
      if (!skipDuplicateCheck) {
        setSubmitStage('بنراجع لو في بلاغ مشابه قريب…');
        const dup = await findNearbyDuplicate(category, position.lat, position.lng, 50);
        if (dup) {
          setSubmitting(false);
          Alert.alert(
            'في بلاغ مشابه قريب',
            `فيه بلاغ تاني عن نفس المشكلة على بعد ${formatDistance(dup.distance)} من هنا (${dup.report.trackingCode}).`,
            [
              {
                text: 'عرض البلاغ',
                onPress: () => router.push({ pathname: '/track', params: { code: dup.report.trackingCode } }),
              },
              { text: 'إرسال على أي حال', onPress: () => doSubmit(true) },
              { text: 'إلغاء', style: 'cancel' },
            ]
          );
          return;
        }
      }

      // ٢) رفع الصورة (لو Cloudinary متظبط) — ولو فشل الرفع نكمل من غيرها
      let imageUrl = null;
      if (photo?.uri && isCloudinaryConfigured()) {
        setSubmitStage('بنرفع الصورة…');
        try {
          imageUrl = await uploadImageToCloudinary(photo.uri);
        } catch (e) {
          imageUrl = null;
        }
      }

      // ٣) تسجيل البلاغ في Firestore
      setSubmitStage('بنسجّل البلاغ…');
      const res = await submitReport({
        category,
        severity,
        description: description.trim(),
        imageUrl,
        lat: position.lat,
        lng: position.lng,
      });
      setResult(res);
    } catch (e) {
      Alert.alert('حصل خطأ', 'البلاغ ماتسجلش. اتأكد من الإنترنت ومن إعدادات Firebase وجرب تاني.');
    } finally {
      setSubmitting(false);
      setSubmitStage('');
    }
  }

  // شاشة النجاح بالرقم المرجعي
  if (result) {
    return (
      <View style={styles.successWrap}>
        <View style={styles.successIconWrap}>
          <Icon name="checkmark-circle" size={46} color={colors.green} />
        </View>
        <T style={styles.successTitle}>بلاغك اتسجل بنجاح!</T>
        <T style={styles.successSub}>احتفظ بالرقم المرجعي ده عشان تتابع حالة البلاغ:</T>
        <View style={styles.codeBox}>
          <T style={styles.codeText}>{result.trackingCode}</T>
        </View>
        <PrimaryButton
          title="تابع البلاغ دلوقتي"
          onPress={() => router.replace({ pathname: '/track', params: { code: result.trackingCode } })}
          style={{ alignSelf: 'stretch', marginTop: 8 }}
        />
        <GhostButton
          title="شوفه على الخريطة"
          onPress={() => router.replace('/map')}
          style={{ alignSelf: 'stretch', marginTop: 10 }}
        />
        <GhostButton
          title="الرئيسية"
          onPress={() => router.replace('/')}
          style={{ alignSelf: 'stretch', marginTop: 10 }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* مؤشر الخطوات */}
      <View style={styles.stepsBar}>
        {STEPS.map((label, i) => (
          <View key={label} style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                i < step && styles.stepDotDone,
                i === step && styles.stepDotActive,
              ]}
            >
              <T style={[styles.stepNum, (i <= step) && { color: '#fff' }]}>
                {i < step ? '✓' : i + 1}
              </T>
            </View>
            <T style={[styles.stepLabel, i === step && { color: colors.navy, fontWeight: '800' }]}>
              {label}
            </T>
          </View>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* الخطوة ١: الصورة */}
        {step === 0 && (
          <View>
            <T style={styles.h}>صوّر المشكلة</T>
            <T style={styles.p}>صورة واضحة للمشكلة بتخلي البلاغ أقوى وبتساعد فرق الصيانة.</T>
            {photo ? (
              <View>
                <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                <GhostButton title="تغيير الصورة" onPress={() => setPhoto(null)} style={{ marginTop: 12 }} />
              </View>
            ) : (
              <View style={styles.photoBtns}>
                <Pressable style={({ pressed }) => [styles.photoBtn, pressed && { opacity: 0.85 }]} onPress={pickFromCamera}>
                  <Icon name="camera" size={28} color={colors.teal} />
                  <T style={styles.photoBtnText}>التقط صورة</T>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.photoBtn, pressed && { opacity: 0.85 }]} onPress={pickFromGallery}>
                  <Icon name="images" size={28} color={colors.teal} />
                  <T style={styles.photoBtnText}>من المعرض</T>
                </Pressable>
              </View>
            )}
            <Pressable onPress={() => setStep(1)}>
              <T style={styles.skip}>تخطي من غير صورة ←</T>
            </Pressable>
          </View>
        )}

        {/* الخطوة ٢: الفئة والتفاصيل */}
        {step === 1 && (
          <View>
            <T style={styles.h}>نوع المشكلة إيه؟</T>
            <View style={styles.catGrid}>
              {CATEGORY_KEYS.map((key) => {
                const c = CATEGORIES[key];
                const active = category === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setCategory(key)}
                    style={[
                      styles.catCard,
                      {
                        backgroundColor: c.color + (active ? '1A' : '0D'),
                        borderColor: c.color + (active ? 'CC' : '38'),
                      },
                    ]}
                  >
                    <Icon name={c.ion || 'help-circle'} size={30} color={c.color} />
                    <T style={[styles.catLabel, active && { color: c.color }]}>{c.label}</T>
                  </Pressable>
                );
              })}
            </View>

            <T style={[styles.h, { marginTop: 20 }]}>درجة الخطورة</T>
            <View style={styles.sevRow}>
              {Object.values(SEVERITY).map((s) => {
                const active = severity === s.key;
                return (
                  <Pressable
                    key={s.key}
                    onPress={() => setSeverity(s.key)}
                    style={[
                      styles.sevChip,
                      active && { backgroundColor: s.color + '22', borderColor: s.color },
                    ]}
                  >
                    <T style={[styles.sevText, active && { color: s.color, fontWeight: '800' }]}>
                      {s.label}
                    </T>
                  </Pressable>
                );
              })}
            </View>

            <T style={[styles.h, { marginTop: 20 }]}>وصف مختصر (اختياري)</T>
            <TextInput
              style={styles.textArea}
              placeholder="مثال: حفرة كبيرة قدام مدخل العمارة بتعرقل العربيات…"
              placeholderTextColor="#9AA7B8"
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
              textAlign="right"
              textAlignVertical="top"
            />
          </View>
        )}

        {/* الخطوة ٣: الموقع */}
        {step === 2 && (
          <View style={{ flex: 1 }}>
            <T style={styles.h}>فين المشكلة بالظبط؟</T>
            <T style={styles.p}>
              دوس على أي نقطة على الخريطة لتحديد المكان، أو استخدم موقعك الحالي.
            </T>
            <PrimaryButton
              title={locLoading ? 'بنحدد موقعك…' : 'استخدم موقعي الحالي'}
              onPress={() => useMyLocation(false)}
              loading={locLoading}
              style={{ marginVertical: 12 }}
            />
            <View style={styles.mapBox}>
              <LeafletMap
                pickMode
                pickPosition={position}
                center={position}
                zoom={17}
                onPick={(p) => setPosition(p)}
                style={{ flex: 1 }}
              />
            </View>
            {position && (
              <T style={styles.coords}>
                ✓ الموقع اتحدد: {position.lat.toFixed(5)} , {position.lng.toFixed(5)}
              </T>
            )}
          </View>
        )}

        {/* الخطوة ٤: المراجعة */}
        {step === 3 && (
          <View>
            <T style={styles.h}>راجع البلاغ قبل الإرسال</T>
            <Card style={{ marginTop: 12 }}>
              {photo?.uri ? <Image source={{ uri: photo.uri }} style={styles.reviewPhoto} /> : null}
              <View style={styles.reviewRow}>
                <T style={styles.reviewLabel}>النوع</T>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                  <CategoryBadge category={category} size={34} />
                  <T style={styles.reviewValue}>{CATEGORIES[category]?.label}</T>
                </View>
              </View>
              <View style={styles.reviewRow}>
                <T style={styles.reviewLabel}>الخطورة</T>
                <T style={[styles.reviewValue, { color: SEVERITY[severity]?.color }]}>
                  {SEVERITY[severity]?.label}
                </T>
              </View>
              {description.trim() ? (
                <View style={styles.reviewRow}>
                  <T style={styles.reviewLabel}>الوصف</T>
                  <T style={[styles.reviewValue, { flex: 1, textAlign: 'left' }]}>{description.trim()}</T>
                </View>
              ) : null}
              <View style={styles.reviewRow}>
                <T style={styles.reviewLabel}>الموقع</T>
                <T style={styles.reviewValue}>
                  {position ? '✓ اتحدد على الخريطة' : '—'}
                </T>
              </View>
              <View style={styles.reviewRow}>
                <T style={styles.reviewLabel}>الصورة</T>
                <T style={styles.reviewValue}>
                  {photo?.uri
                    ? isCloudinaryConfigured()
                      ? '✓ هتترفع مع البلاغ'
                      : 'هتتسجل محليًا بس (Cloudinary مش متظبط)'
                    : 'من غير صورة'}
                </T>
              </View>
            </Card>
            <T style={styles.note}>
              بعد الإرسال هتاخد رقم مرجعي تتابع بيه حالة البلاغ في أي وقت.
            </T>
          </View>
        )}
      </ScrollView>

      {/* أزرار التنقل */}
      <View style={styles.navBar}>
        {step > 0 ? (
          <GhostButton title="رجوع →" onPress={() => setStep((s) => s - 1)} style={{ flex: 1 }} disabled={submitting} />
        ) : null}
        {step < 3 ? (
          <PrimaryButton title="← التالي" onPress={next} disabled={!canNext()} style={{ flex: 2 }} />
        ) : (
          <PrimaryButton
            title={submitting ? submitStage || 'جاري الإرسال…' : 'إرسال البلاغ'}
            onPress={() => doSubmit(false)}
            loading={submitting && !submitStage}
            disabled={submitting}
            style={{ flex: 2 }}
          />
        )}
      </View>
      {submitting && submitStage ? (
        <View style={styles.stageBar}>
          <ActivityIndicator color={colors.teal} size="small" />
          <T style={styles.stageText}>{submitStage}</T>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  stepsBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E7ECF2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: colors.teal },
  stepDotDone: { backgroundColor: colors.navy },
  stepNum: { fontSize: 13, fontWeight: '800', color: colors.textSoft },
  stepLabel: { fontSize: 11, color: colors.textSoft, writingDirection: 'rtl' },
  h: { fontSize: 19, fontWeight: '900', color: colors.text, textAlign: 'right', writingDirection: 'rtl', marginBottom: 6 },
  p: { fontSize: 13.5, color: colors.textSoft, textAlign: 'right', writingDirection: 'rtl', lineHeight: 21 },
  photoBtns: { flexDirection: 'row-reverse', gap: 12, marginTop: 18 },
  photoBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  photoBtnIcon: { fontSize: 30 },
  photoBtnText: { fontSize: 14, fontWeight: '700', color: colors.text, writingDirection: 'rtl' },
  photoPreview: { width: '100%', height: 260, borderRadius: radius.md, marginTop: 14 },
  skip: { color: colors.teal, fontWeight: '700', textAlign: 'center', marginTop: 18, fontSize: 14 },
  catGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  catCard: {
    width: '31%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  catIcon: { fontSize: 34 },
  catLabel: { fontSize: 12.5, fontWeight: '700', color: colors.text, textAlign: 'center', writingDirection: 'rtl' },
  sevRow: { flexDirection: 'row-reverse', gap: 10, marginTop: 8 },
  sevChip: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  sevText: { fontSize: 14, color: colors.textSoft, writingDirection: 'rtl' },
  textArea: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 110,
    padding: 14,
    fontSize: 14.5,
    fontFamily: FONTS.regular,
    color: colors.text,
    marginTop: 8,
  },
  mapBox: {
    height: 340,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  coords: { marginTop: 10, fontSize: 12.5, color: colors.green, fontWeight: '700', textAlign: 'right' },
  reviewPhoto: { width: '100%', height: 180, borderRadius: radius.sm, marginBottom: 12 },
  reviewRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3F7',
    gap: 10,
  },
  reviewLabel: { fontSize: 13.5, color: colors.textSoft, fontWeight: '700', writingDirection: 'rtl' },
  reviewValue: { fontSize: 14.5, color: colors.text, fontWeight: '700', writingDirection: 'rtl' },
  note: { marginTop: 14, fontSize: 12.5, color: colors.textSoft, textAlign: 'center', writingDirection: 'rtl' },
  navBar: {
    flexDirection: 'row-reverse',
    gap: 10,
    padding: 14,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stageBar: {
    flexDirection: 'row-reverse',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 14,
    backgroundColor: colors.card,
  },
  stageText: { color: colors.textSoft, fontSize: 13, writingDirection: 'rtl' },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  successIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successIcon: { fontSize: 42 },
  successTitle: { fontSize: 22, fontWeight: '900', color: colors.text, writingDirection: 'rtl' },
  successSub: { fontSize: 14, color: colors.textSoft, marginTop: 8, textAlign: 'center', writingDirection: 'rtl' },
  codeBox: {
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    paddingVertical: 18,
    paddingHorizontal: 36,
    marginVertical: 20,
  },
  codeText: { color: colors.white, fontSize: 30, fontWeight: '900', letterSpacing: 2 },
});

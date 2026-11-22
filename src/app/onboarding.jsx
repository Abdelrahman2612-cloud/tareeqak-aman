import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, FONTS } from '../theme';
import { T } from '../components/T';
import { PrimaryButton } from '../components/ui';

const ONBOARDING_KEY = 'onboarding_seen_v1';

const SLIDES = [
  {
    icon: '🚨',
    title: 'بلّغ عن مشكلة في ثواني',
    text: 'صوّر الحفرة أو العطل، حدد مكانه على الخريطة، وابعت البلاغ — من غير أي مكالمات أو ورق.',
  },
  {
    icon: '🗺️',
    title: 'شوف كل البلاغات على الخريطة',
    text: 'خريطة تفاعلية بتعرض بلاغات الناس حواليك، ملوّنة حسب حالة كل بلاغ: جديد، قيد العمل، أو اتحل.',
  },
  {
    icon: '🔎',
    title: 'تابع بلاغك برقم مرجعي',
    text: 'كل بلاغ ليه رقم مرجعي خاص بيه — ادخل بيه في أي وقت وشوف وصل لأي مرحلة لحد ما يتحل.',
  },
];

export async function hasSeenOnboarding() {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === '1';
  } catch (e) {
    return true;
  }
}

async function markOnboardingSeen() {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
  } catch (e) {}
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef(null);
  const [page, setPage] = useState(0);
  const last = page === SLIDES.length - 1;

  async function finish() {
    await markOnboardingSeen();
    router.replace('/auth');
  }

  function next() {
    if (last) {
      finish();
      return;
    }
    scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
  }

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={[colors.navy, colors.navySoft]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.topRow}>
          <Pressable onPress={finish} hitSlop={12}>
            <T style={styles.skip}>تخطي</T>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ flexDirection: 'row-reverse' }}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          scrollEventThrottle={16}
        >
          {SLIDES.map((s) => (
            <View key={s.title} style={[styles.slide, { width }]}>
              <View style={styles.iconCircle}>
                <T style={styles.icon}>{s.icon}</T>
              </View>
              <T style={styles.title}>{s.title}</T>
              <T style={styles.text}>{s.text}</T>
            </View>
          ))}
        </ScrollView>

        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            title={last ? 'ابدأ دلوقتي 🚀' : 'التالي'}
            onPress={next}
            style={{ backgroundColor: colors.teal }}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.navy },
  topRow: { alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 10 },
  skip: { color: '#9FB3C8', fontSize: 15, fontFamily: FONTS.semiBold },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  iconCircle: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(20,184,166,0.14)',
    borderWidth: 2,
    borderColor: 'rgba(20,184,166,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  icon: { fontSize: 62 },
  title: { color: colors.white, fontSize: 24, fontFamily: FONTS.black, textAlign: 'center' },
  text: {
    color: '#B8C7D9',
    fontSize: 15.5,
    textAlign: 'center',
    lineHeight: 26,
    marginTop: 14,
  },
  dots: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 8, marginVertical: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActive: { width: 24, backgroundColor: colors.tealLight },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
});

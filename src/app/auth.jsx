import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, shadow, FONTS } from '../theme';
import { T } from '../components/T';
import { PrimaryButton } from '../components/ui';
import { signInWithEmail, signUpWithEmail, authErrorMessage } from '../lib/auth';
import { isFirebaseConfigured } from '../config/firebase';

export default function AuthScreen() {
  const router = useRouter();
  const configured = isFirebaseConfigured();
  const [mode, setMode] = useState('login'); // login | signup
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (busy) return;
    setError('');
    if (!email.trim() || !password) {
      setError('اكتب البريد الإلكتروني وكلمة السر.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('اكتب اسمك عشان يظهر مع بلاغاتك.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(name, email, password);
      }
      router.back();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={[colors.navy, colors.navySoft]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* الهيدر */}
            <View style={styles.hero}>
              <View style={styles.logoCircle}>
                <T style={styles.logoIcon}>🛡️</T>
              </View>
              <T style={styles.appName}>طريقك أمان</T>
              <T style={styles.tagline}>بلّغ عن مشاكل الطريق وتابع إصلاحها لحد ما تتحل</T>
            </View>

            {/* كارت تسجيل الدخول */}
            <View style={styles.card}>
              {/* التبويبات */}
              <View style={styles.tabs}>
                <Pressable
                  style={[styles.tab, mode === 'signup' && styles.tabActive]}
                  onPress={() => { setMode('signup'); setError(''); }}
                >
                  <T style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>حساب جديد</T>
                </Pressable>
                <Pressable
                  style={[styles.tab, mode === 'login' && styles.tabActive]}
                  onPress={() => { setMode('login'); setError(''); }}
                >
                  <T style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>تسجيل الدخول</T>
                </Pressable>
              </View>

              {mode === 'signup' && (
                <View style={styles.field}>
                  <T style={styles.label}>الاسم</T>
                  <TextInput
                    style={styles.input}
                    placeholder="مثال: عبدالرحمن خالد"
                    placeholderTextColor="#9AA7B8"
                    value={name}
                    onChangeText={setName}
                    textAlign="right"
                    autoCapitalize="words"
                  />
                </View>
              )}

              <View style={styles.field}>
                <T style={styles.label}>البريد الإلكتروني</T>
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor="#9AA7B8"
                  value={email}
                  onChangeText={setEmail}
                  textAlign="left"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.field}>
                <T style={styles.label}>كلمة السر</T>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#9AA7B8"
                  value={password}
                  onChangeText={setPassword}
                  textAlign="left"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <T style={styles.errorText}>⚠️ {error}</T>
                </View>
              ) : null}

              <PrimaryButton
                title={mode === 'login' ? 'دخول' : 'إنشاء الحساب'}
                onPress={submit}
                loading={busy}
                disabled={!configured}
                style={{ marginTop: 8 }}
              />

              {!configured && (
                <T style={styles.configNote}>
                  ⚙️ ظبط Firebase الأول من ملف README عشان تسجيل الدخول يشتغل.
                </T>
              )}
            </View>

            {/* دخول كضيف */}
            <Pressable onPress={() => router.back()} style={styles.guestBtn} disabled={busy}>
              {busy ? (
                <ActivityIndicator color="#9FB3C8" />
              ) : (
                <T style={styles.guestText}>المتابعة كضيف ←</T>
              )}
            </Pressable>

            <T style={styles.whyNote}>
              ليه أسجّل؟ عشان بلاغاتك تتربط باسمك وتقدر تتابعها من أي موبايل.
            </T>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.navy },
  scroll: { paddingHorizontal: 22, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingTop: 28, paddingBottom: 26 },
  logoCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(20,184,166,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(20,184,166,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoIcon: { fontSize: 42 },
  appName: { color: colors.white, fontSize: 30, fontFamily: FONTS.black },
  tagline: { color: '#B8C7D9', fontSize: 14.5, marginTop: 8, textAlign: 'center' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 20,
    ...shadow.raised,
  },
  tabs: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: 18,
  },
  tab: { flex: 1, paddingVertical: 11, borderRadius: radius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: colors.navy },
  tabText: { fontSize: 14.5, fontFamily: FONTS.bold, color: colors.textSoft },
  tabTextActive: { color: colors.white },
  field: { marginBottom: 14 },
  label: { fontSize: 13.5, fontFamily: FONTS.bold, color: colors.text, marginBottom: 7, textAlign: 'right' },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: colors.text,
  },
  errorBox: {
    backgroundColor: colors.redPale,
    borderRadius: radius.sm,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: colors.red, fontSize: 13.5, fontFamily: FONTS.semiBold, textAlign: 'right', lineHeight: 20 },
  configNote: { marginTop: 12, fontSize: 12.5, color: colors.amber, textAlign: 'center' },
  guestBtn: { alignItems: 'center', marginTop: 22, padding: 8 },
  guestText: { color: colors.tealLight, fontSize: 15, fontFamily: FONTS.bold },
  whyNote: { color: '#7E93AB', fontSize: 12.5, textAlign: 'center', marginTop: 18, lineHeight: 20 },
});

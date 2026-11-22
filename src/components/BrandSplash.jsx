import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, FONTS } from '../theme';
import { T } from './T';

// افتتاحية خفيفة: علامة التطبيق بتكبر بهدوء، اسم التطبيق بيظهر، وبعد لحظة بتختفي
// بالتلاشي من غير ما تعطّل الدخول. بتتعرض مرة واحدة فوق المحتوى لحد ما يجهز.
export default function BrandSplash({ ready, onDone }) {
  const [gone, setGone] = useState(false);
  const overlay = useRef(new Animated.Value(1)).current;
  const markScale = useRef(new Animated.Value(0.82)).current;
  const markOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!ready) return;
    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(markOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(markScale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
      ]),
      Animated.timing(textOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.timing(overlay, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => {
        setGone(true);
        onDone?.();
      });
    }, 800);
    return () => clearTimeout(t);
  }, [ready]);

  if (gone) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: overlay }]} pointerEvents="none">
      <Animated.View
        style={[styles.mark, { opacity: markOpacity, transform: [{ scale: markScale }] }]}
      >
        <Ionicons name="navigate" size={42} color={colors.white} />
      </Animated.View>
      <Animated.View style={{ opacity: textOpacity, alignItems: 'center' }}>
        <T style={styles.name}>طريقك أمان</T>
        <View style={styles.rule} />
        <T style={styles.sub}>بلّغ · تابع · اطمن</T>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  mark: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  name: { fontFamily: FONTS.black, fontSize: 30, color: colors.white },
  rule: { width: 44, height: 2, backgroundColor: colors.teal, borderRadius: 1, marginVertical: 12 },
  sub: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#9FB4CC', letterSpacing: 1 },
});

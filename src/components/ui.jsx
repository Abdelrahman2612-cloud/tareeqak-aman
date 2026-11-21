import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radius, shadow, STATUS, CATEGORIES, SEVERITY } from '../theme';

export function StatusChip({ status }) {
  const s = STATUS[status] || STATUS.new;
  return (
    <View style={[styles.chip, { backgroundColor: s.bg }]}>
      <View style={[styles.dot, { backgroundColor: s.color }]} />
      <Text style={[styles.chipText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

export function CategoryBadge({ category, size = 40 }) {
  const c = CATEGORIES[category] || { icon: '❓', label: category };
  return (
    <View
      style={[
        styles.catBadge,
        { width: size, height: size, borderRadius: size * 0.32 },
      ]}
    >
      <Text style={{ fontSize: size * 0.48 }}>{c.icon}</Text>
    </View>
  );
}

export function SeverityChip({ severity }) {
  const s = SEVERITY[severity];
  if (!s) return null;
  return (
    <View style={[styles.chip, { backgroundColor: s.color + '1A' }]}>
      <Text style={[styles.chipText, { color: s.color }]}>خطورة {s.label}</Text>
    </View>
  );
}

export function PrimaryButton({ title, onPress, disabled, loading, style, color = colors.teal }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryBtn,
        { backgroundColor: color },
        (disabled || loading) && { opacity: 0.55 },
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.primaryBtnText}>{title}</Text>
      )}
    </Pressable>
  );
}

export function GhostButton({ title, onPress, disabled, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.ghostBtn,
        disabled && { opacity: 0.5 },
        pressed && { opacity: 0.75 },
        style,
      ]}
    >
      <Text style={styles.ghostBtnText}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function EmptyState({ icon, title, subtitle }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
    </View>
  );
}

// رسالة واضحة لو Firebase لسه مش متظبط
export function FirebaseNotConfigured() {
  return (
    <View style={styles.fbWrap}>
      <Text style={styles.fbIcon}>⚙️</Text>
      <Text style={styles.fbTitle}>خطوة واحدة فاضلة</Text>
      <Text style={styles.fbText}>
        التطبيق جاهز، بس محتاج تربطه بقاعدة بيانات Firebase المجانية.{'\n'}
        افتح ملف README.md واتبع قسم «إعداد Firebase» (٥ دقايق بالظبط)،
        وبعدها ارجع هنا وكل حاجة هتشتغل.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  catBadge: {
    backgroundColor: colors.tealPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', writingDirection: 'rtl' },
  ghostBtn: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  ghostBtnText: { color: colors.text, fontSize: 15, fontWeight: '700', writingDirection: 'rtl' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 44, marginBottom: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center', writingDirection: 'rtl' },
  emptySub: { fontSize: 14, color: colors.textSoft, textAlign: 'center', marginTop: 6, writingDirection: 'rtl' },
  fbWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.bg },
  fbIcon: { fontSize: 46, marginBottom: 12 },
  fbTitle: { fontSize: 19, fontWeight: '800', color: colors.text, marginBottom: 10, writingDirection: 'rtl' },
  fbText: { fontSize: 14.5, color: colors.textSoft, textAlign: 'center', lineHeight: 24, writingDirection: 'rtl' },
});

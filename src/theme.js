// Tareeqak Aman - design tokens (matching the approved deck: navy + teal + white)
export const colors = {
  navy: '#0A1A2E',
  navySoft: '#12263F',
  navyLight: '#1B3A5C',
  teal: '#0D9488',
  tealDark: '#0F766E',
  tealLight: '#14B8A6',
  tealPale: '#CCFBF1',
  bg: '#F4F7FA',
  card: '#FFFFFF',
  border: '#E5EAF0',
  text: '#0F172A',
  textSoft: '#64748B',
  red: '#EF4444',
  redPale: '#FEE2E2',
  amber: '#F59E0B',
  amberPale: '#FEF3C7',
  green: '#10B981',
  greenPale: '#D1FAE5',
  blue: '#3B82F6',
  bluePale: '#DBEAFE',
  white: '#FFFFFF',
};

// خط Cairo — الأوزان بتتسجّل كعائلات منفصلة وبتتختار تلقائيًا في مكوّن T
export const FONTS = {
  regular: 'Cairo_400Regular',
  semiBold: 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold',
  extraBold: 'Cairo_800ExtraBold',
  black: 'Cairo_900Black',
};

export function fontForWeight(weight) {
  const w = String(weight ?? '400');
  if (w === '900' || w === '1000') return FONTS.black;
  if (w === '800') return FONTS.extraBold;
  if (w === '700') return FONTS.bold;
  if (w === '600' || w === '500') return FONTS.semiBold;
  return FONTS.regular;
}

export const STATUS = {
  new: { key: 'new', label: 'جديد', color: colors.red, bg: colors.redPale, icon: '🔴' },
  in_progress: { key: 'in_progress', label: 'قيد العمل', color: colors.amber, bg: colors.amberPale, icon: '🟡' },
  resolved: { key: 'resolved', label: 'تم الحل', color: colors.green, bg: colors.greenPale, icon: '🟢' },
};
export const STATUS_ORDER = ['new', 'in_progress', 'resolved'];

export const CATEGORIES = {
  pothole: { key: 'pothole', label: 'حفرة أو تصدعات', icon: '🕳️', color: '#B45309' },
  bump: { key: 'bump', label: 'مطب', icon: '🚧', color: '#C2410C' },
  lighting: { key: 'lighting', label: 'إنارة معطلة', icon: '💡', color: '#A16207' },
  water: { key: 'water', label: 'تراكم مياه', icon: '🌊', color: '#1D4ED8' },
  manhole: { key: 'manhole', label: 'بالوعة مكشوفة', icon: '⭕', color: '#7C3AED' },
};
export const CATEGORY_KEYS = Object.keys(CATEGORIES);

export const SEVERITY = {
  low: { key: 'low', label: 'منخفضة', color: colors.blue },
  medium: { key: 'medium', label: 'متوسطة', color: colors.amber },
  high: { key: 'high', label: 'عالية', color: colors.red },
};
export const SEVERITY_ORDER = ['high', 'medium', 'low'];

export const radius = { sm: 10, md: 16, lg: 24, xl: 32, full: 999 };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const shadow = {
  card: {
    shadowColor: '#0A1A2E',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  raised: {
    shadowColor: '#0A1A2E',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
};

export function formatDate(millis) {
  if (!millis) return '';
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(millis));
  } catch (e) {
    return new Date(millis).toLocaleString();
  }
}

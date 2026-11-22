// Tareeqak Aman - design tokens (matching the approved deck: navy + teal + white)
export const colors = {
  navy: '#0A1A2E',
  navySoft: '#12263F',
  navyLight: '#1B3A5C',
  teal: '#376E68',
  tealDark: '#2A5651',
  tealLight: '#55857F',
  tealPale: '#E4ECEA',
  bg: '#F4F7FA',
  card: '#FFFFFF',
  border: '#E5EAF0',
  text: '#0F172A',
  textSoft: '#64748B',
  red: '#A8554D',
  redPale: '#F3E7E5',
  amber: '#A3853F',
  amberPale: '#F4EDDB',
  green: '#5F8A75',
  greenPale: '#E6EDE8',
  blue: '#5E7FA3',
  bluePale: '#E7ECF2',
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
  pothole: { key: 'pothole', label: 'حفرة أو تصدعات', icon: '🕳️', color: '#8A6D4F' },
  bump: { key: 'bump', label: 'مطب', icon: '🚧', color: '#96604A' },
  lighting: { key: 'lighting', label: 'إنارة معطلة', icon: '💡', color: '#97834A' },
  water: { key: 'water', label: 'تراكم مياه', icon: '🌊', color: '#5E7FA3' },
  manhole: { key: 'manhole', label: 'بالوعة مكشوفة', icon: '⭕', color: '#7B7194' },
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

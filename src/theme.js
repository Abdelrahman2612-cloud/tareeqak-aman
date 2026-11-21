// Tareeqak Aman - design tokens (matching the approved deck: navy + teal + white)
export const colors = {
  navy: '#0A1A2E',
  navySoft: '#12263F',
  teal: '#0D9488',
  tealLight: '#14B8A6',
  tealPale: '#CCFBF1',
  bg: '#F4F7FA',
  card: '#FFFFFF',
  border: '#E5EAF0',
  text: '#0F172A',
  textSoft: '#64748B',
  red: '#EF4444',
  amber: '#F59E0B',
  green: '#10B981',
  blue: '#3B82F6',
  white: '#FFFFFF',
};

export const STATUS = {
  new: { key: 'new', label: 'جديد', color: colors.red, bg: '#FEE2E2' },
  in_progress: { key: 'in_progress', label: 'قيد العمل', color: colors.amber, bg: '#FEF3C7' },
  resolved: { key: 'resolved', label: 'تم الحل', color: colors.green, bg: '#D1FAE5' },
};
export const STATUS_ORDER = ['new', 'in_progress', 'resolved'];

export const CATEGORIES = {
  pothole: { key: 'pothole', label: 'حفرة أو تصدعات', icon: '🕳️' },
  bump: { key: 'bump', label: 'مطب', icon: '🚧' },
  lighting: { key: 'lighting', label: 'إنارة معطلة', icon: '💡' },
  water: { key: 'water', label: 'تراكم مياه', icon: '🌊' },
  manhole: { key: 'manhole', label: 'بالوعة مكشوفة', icon: '⭕' },
};
export const CATEGORY_KEYS = Object.keys(CATEGORIES);

export const SEVERITY = {
  low: { key: 'low', label: 'منخفضة', color: colors.blue },
  medium: { key: 'medium', label: 'متوسطة', color: colors.amber },
  high: { key: 'high', label: 'عالية', color: colors.red },
};
export const SEVERITY_ORDER = ['high', 'medium', 'low'];

export const radius = { sm: 10, md: 16, lg: 24, full: 999 };
export const shadow = {
  card: {
    shadowColor: '#0A1A2E',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
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

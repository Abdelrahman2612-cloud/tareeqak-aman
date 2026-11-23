// Normalize Egyptian mobile numbers, or an explicitly international E.164 number.
export function normalizePhone(value) {
  const digits = String(value || '').replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 1776)).replace(/[\s()-]/g, '');
  const number = digits.startsWith('00') ? '+' + digits.slice(2) : digits;
  if (/^01[0125][0-9]{8}$/.test(number)) return '+20' + number.slice(1);
  if (/^\+201[0125][0-9]{8}$/.test(number)) return number;
  if (number.startsWith('+20')) return null;
  return /^\+[1-9][0-9]{7,14}$/.test(number) ? number : null;
}

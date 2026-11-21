// توليد رقم مرجعي سهل القراءة والتكرار على التليفون: TA-XXXXXX
export function generateTrackingCode() {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `TA-${digits}`;
}

export function normalizeTrackingCode(input) {
  return (input || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[–—]/g, '-');
}

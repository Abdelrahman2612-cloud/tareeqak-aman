// ============================================================
//  إعدادات Cloudinary — اختيارية (عشان رفع صور البلاغات)
//  لو ساببتها زي ما هي، التطبيق هيشتغل عادي والبلاغ هيتسجل
//  من غير صورة، ولما تظبطها الصور هتترفع أوتوماتيك.
//  الشرح خطوة بخطوة في README.md قسم "إعداد Cloudinary"
// ============================================================

export const cloudinaryConfig = {
  cloudName: 'rbowd46v',
  uploadPreset: 'tareeqak_reports',
};

export function isCloudinaryConfigured() {
  return (
    !!cloudinaryConfig.cloudName &&
    !cloudinaryConfig.cloudName.includes('PASTE_') &&
    !!cloudinaryConfig.uploadPreset &&
    !cloudinaryConfig.uploadPreset.includes('PASTE_')
  );
}

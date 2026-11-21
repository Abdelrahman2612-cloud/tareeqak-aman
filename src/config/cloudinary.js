// ============================================================
//  إعدادات Cloudinary — اختيارية (عشان رفع صور البلاغات)
//  لو ساببتها زي ما هي، التطبيق هيشتغل عادي والبلاغ هيتسجل
//  من غير صورة، ولما تظبطها الصور هتترفع أوتوماتيك.
//  الشرح خطوة بخطوة في README.md قسم "إعداد Cloudinary"
// ============================================================

export const cloudinaryConfig = {
  cloudName: 'PASTE_CLOUD_NAME_HERE',
  uploadPreset: 'PASTE_UNSIGNED_PRESET_HERE',
};

export function isCloudinaryConfigured() {
  return (
    !!cloudinaryConfig.cloudName &&
    !cloudinaryConfig.cloudName.includes('PASTE_') &&
    !!cloudinaryConfig.uploadPreset &&
    !cloudinaryConfig.uploadPreset.includes('PASTE_')
  );
}

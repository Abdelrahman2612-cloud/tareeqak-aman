import { cloudinaryConfig, isCloudinaryConfigured } from '../config/cloudinary';

// رفع صورة على Cloudinary (unsigned preset — مجاني ومن غير سيرفر)
// يرجع رابط الصورة، أو يرمي خطأ لو الرفع فشل
export async function uploadImageToCloudinary(localUri) {
  if (!isCloudinaryConfigured()) {
    throw new Error('cloudinary-not-configured');
  }
  const { cloudName, uploadPreset } = cloudinaryConfig;
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const data = new FormData();
  data.append('file', {
    uri: localUri,
    type: 'image/jpeg',
    name: 'report.jpg',
  });
  data.append('upload_preset', uploadPreset);

  const res = await fetch(url, { method: 'POST', body: data });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`cloudinary-upload-failed: ${res.status} ${text.slice(0, 120)}`);
  }
  const json = await res.json();
  return json.secure_url;
}

export { isCloudinaryConfigured };

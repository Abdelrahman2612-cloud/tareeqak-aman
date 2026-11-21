// ============================================================
//  إعدادات Firebase — الخطوة دي لازمة عشان التطبيق يشتغل
//  1) افتح https://console.firebase.google.com
//  2) اعمل مشروع جديد (اسمه مثلاً tareeqak-aman)
//  3) من Project Settings > Your apps > Web (</>) سجّل تطبيق
//  4) انسخ القيم وحطها مكان الكلام اللي تحت
//  الشرح كامل بالصور خطوة بخطوة في ملف README.md قسم "إعداد Firebase"
// ============================================================

export const firebaseConfig = {
  apiKey: 'PASTE_API_KEY_HERE',
  authDomain: 'PASTE_PROJECT_ID.firebaseapp.com',
  projectId: 'PASTE_PROJECT_ID_HERE',
  storageBucket: 'PASTE_PROJECT_ID.appspot.com',
  messagingSenderId: 'PASTE_SENDER_ID_HERE',
  appId: 'PASTE_APP_ID_HERE',
};

export function isFirebaseConfigured() {
  return (
    !!firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes('PASTE_') &&
    !!firebaseConfig.projectId &&
    !firebaseConfig.projectId.includes('PASTE_')
  );
}

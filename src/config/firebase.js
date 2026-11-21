// ============================================================
//  إعدادات Firebase — الخطوة دي لازمة عشان التطبيق يشتغل
//  1) افتح https://console.firebase.google.com
//  2) اعمل مشروع جديد (اسمه مثلاً tareeqak-aman)
//  3) من Project Settings > Your apps > Web (</>) سجّل تطبيق
//  4) انسخ القيم وحطها مكان الكلام اللي تحت
//  الشرح كامل بالصور خطوة بخطوة في ملف README.md قسم "إعداد Firebase"
// ============================================================

export const firebaseConfig = {
  apiKey: 'AIzaSyBIADXHGuF5wNpQBrZUpsvC2HMesjbdQAc',
  authDomain: 'tareeqak-aman-bfebc.firebaseapp.com',
  projectId: 'tareeqak-aman-bfebc',
  storageBucket: 'tareeqak-aman-bfebc.firebasestorage.app',
  messagingSenderId: '430208454464',
  appId: '1:430208454464:web:ed5258d54e36786efbb4a5',
};

export function isFirebaseConfigured() {
  return (
    !!firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes('PASTE_') &&
    !!firebaseConfig.projectId &&
    !firebaseConfig.projectId.includes('PASTE_')
  );
}

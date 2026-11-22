import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig, isFirebaseConfigured } from '../config/firebase';

// نقطة واحدة لتهيئة Firebase — بتستخدمها قاعدة البيانات وتسجيل الدخول
let appInstance = null;

export function getFirebaseApp() {
  if (!isFirebaseConfigured()) return null;
  if (!appInstance) {
    appInstance = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return appInstance;
}

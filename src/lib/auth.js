import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut,
} from 'firebase/auth';
import { getFirebaseApp } from './firebaseApp';

// ============================================================
//  تسجيل الدخول بالبريد وكلمة السر (Firebase Auth)
//  ملاحظة: لازم تفعّل Email/Password من لوحة Firebase:
//  Authentication → Sign-in method → Email/Password → Enable
//  (الشرح في README.md قسم «إعداد Firebase»)
// ============================================================

let authInstance = null;

export function getAuthInstance() {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!authInstance) {
    try {
      // حفظ الجلسة على الجهاز عشان المستخدم ميسجلش دخوله كل مرة
      authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch (e) {
      // لو اتهيّأ قبل كده (مثلاً أثناء hot reload)
      authInstance = getAuth(app);
    }
  }
  return authInstance;
}

// ترجمة أكواد أخطاء Firebase لرسائل عربية مفهومة
export function authErrorMessage(error) {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'البريد الإلكتروني مش مظبوط، راجعه وحاول تاني.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'البريد أو كلمة السر غلط. جرب تاني أو اعمل حساب جديد.';
    case 'auth/email-already-in-use':
      return 'البريد ده مسجل قبل كده. جرب تسجيل الدخول بدل إنشاء حساب.';
    case 'auth/weak-password':
      return 'كلمة السر ضعيفة — لازم ٦ حروف أو أرقام على الأقل.';
    case 'auth/network-request-failed':
      return 'مفيش اتصال بالإنترنت. اتأكد من الشبكة وحاول تاني.';
    case 'auth/too-many-requests':
      return 'محاولات كتير غلط. استنى شوية وحاول تاني.';
    case 'auth/operation-not-allowed':
      return 'تسجيل الدخول بالبريد مش مفعّل لسه — فعّله من لوحة Firebase (قسم Authentication).';
    default:
      return 'حصل خطأ أثناء تسجيل الدخول. حاول تاني.';
  }
}

const AuthContext = createContext({ user: null, loading: true, configured: false });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const configured = !!getFirebaseApp();

  useEffect(() => {
    const auth = getAuthInstance();
    if (!auth) {
      setLoading(false);
      return undefined;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, configured }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export async function signInWithEmail(email, password) {
  const auth = getAuthInstance();
  if (!auth) throw new Error('firebase-not-configured');
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signUpWithEmail(name, email, password) {
  const auth = getAuthInstance();
  if (!auth) throw new Error('firebase-not-configured');
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (name?.trim()) {
    await updateProfile(cred.user, { displayName: name.trim() });
  }
  return cred.user;
}

export async function signOut() {
  const auth = getAuthInstance();
  if (auth) await fbSignOut(auth);
}

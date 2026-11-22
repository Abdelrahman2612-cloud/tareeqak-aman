import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseApp } from './firebaseApp';
import { getAuthInstance } from './auth';
import { generateTrackingCode } from './trackingCode';
import { distanceMeters } from './geo';

let dbInstance = null;

export function getDb() {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!dbInstance) {
    dbInstance = getFirestore(app);
  }
  return dbInstance;
}

export function normalizeReport(id, data) {
  return {
    id,
    trackingCode: data.trackingCode || '',
    category: data.category || 'pothole',
    severity: data.severity || 'medium',
    description: data.description || '',
    imageUrl: data.imageUrl || null,
    lat: data.location?.lat ?? null,
    lng: data.location?.lng ?? null,
    status: data.status || 'new',
    statusHistory: Array.isArray(data.statusHistory) ? data.statusHistory : [],
    userId: data.userId || null,
    userName: data.userName || null,
    createdAtMillis:
      data.createdAtMillis || (data.createdAt?.toMillis ? data.createdAt.toMillis() : null),
  };
}

// إضافة بلاغ جديد — يرجع الرقم المرجعي. البلاغ بيتربط بالمستخدم لو مسجل دخوله
export async function submitReport({ category, severity, description, imageUrl, lat, lng }) {
  const db = getDb();
  if (!db) throw new Error('firebase-not-configured');
  const trackingCode = generateTrackingCode();
  const now = Date.now();
  const user = getAuthInstance()?.currentUser || null;
  const docRef = await addDoc(collection(db, 'reports'), {
    trackingCode,
    category,
    severity,
    description: description || '',
    imageUrl: imageUrl || null,
    location: { lat, lng },
    status: 'new',
    statusHistory: [{ status: 'new', at: now }],
    userId: user?.uid || null,
    userName: user?.displayName || user?.email || 'ضيف',
    createdAt: serverTimestamp(),
    createdAtMillis: now,
  });
  return { id: docRef.id, trackingCode };
}

// البحث عن بلاغ برقمه المرجعي
export async function findReportByCode(code) {
  const db = getDb();
  if (!db) throw new Error('firebase-not-configured');
  const q = query(collection(db, 'reports'), where('trackingCode', '==', code), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return normalizeReport(d.id, d.data());
}

// فحص التكرار: بلاغ مفتوح من نفس الفئة في نطاق معين (بالأمتار)
export async function findNearbyDuplicate(category, lat, lng, radiusMeters = 50) {
  const db = getDb();
  if (!db) return null;
  // استعلام بحقل واحد بس عشان منحتاجش composite index في Firestore
  const q = query(collection(db, 'reports'), where('category', '==', category), limit(200));
  const snap = await getDocs(q);
  let best = null;
  snap.forEach((d) => {
    const r = normalizeReport(d.id, d.data());
    if (r.status === 'resolved') return;
    if (r.lat == null || r.lng == null) return;
    const dist = distanceMeters(lat, lng, r.lat, r.lng);
    if (dist <= radiusMeters && (!best || dist < best.distance)) {
      best = { report: r, distance: dist };
    }
  });
  return best;
}

// متابعة حية لكل البلاغات (للخريطة والرئيسية ولوحة التحكم)
export function listenToReports(onData, onError) {
  const db = getDb();
  if (!db) {
    onError?.(new Error('firebase-not-configured'));
    return () => {};
  }
  const q = query(collection(db, 'reports'), orderBy('createdAtMillis', 'desc'), limit(500));
  return onSnapshot(
    q,
    (snap) => {
      const rows = [];
      snap.forEach((d) => rows.push(normalizeReport(d.id, d.data())));
      onData(rows);
    },
    (err) => onError?.(err)
  );
}

// تحديث حالة بلاغ (لوحة المشرفين) + تسجيلها في الخط الزمني
export async function updateReportStatus(id, newStatus, currentHistory) {
  const db = getDb();
  if (!db) throw new Error('firebase-not-configured');
  const history = Array.isArray(currentHistory) ? [...currentHistory] : [];
  history.push({ status: newStatus, at: Date.now() });
  await updateDoc(doc(db, 'reports', id), {
    status: newStatus,
    statusHistory: history,
  });
}

export async function deleteReport(id) {
  const db = getDb();
  if (!db) throw new Error('firebase-not-configured');
  await deleteDoc(doc(db, 'reports', id));
}

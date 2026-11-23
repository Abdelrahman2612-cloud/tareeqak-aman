import { getFirestore, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseApp } from './firebaseApp';
import { getAuthInstance } from './auth';
import { normalizePhone } from './phone';

// Never put contact details in public /reports documents or Auth displayName.
function contactDb() {
  const app = getFirebaseApp();
  if (!app) throw new Error('firebase-not-configured');
  return getFirestore(app);
}
export async function saveMyContact(name, phone, contactAllowed) {
  const user = getAuthInstance()?.currentUser;
  const normalized = normalizePhone(phone);
  if (!user) throw new Error('contact-auth-required');
  if (contactAllowed !== true) {
    await deleteDoc(doc(contactDb(), 'reporterContacts', user.uid));
    return;
  }
  if (!name.trim() || name.trim().length > 100 || !normalized || contactAllowed !== true) throw new Error('contact-invalid');
  await setDoc(doc(contactDb(), 'reporterContacts', user.uid), {
    name: name.trim(), phone: normalized, contactAllowed: true, updatedAt: serverTimestamp(),
  });
}
export async function getContactForUser(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(contactDb(), 'reporterContacts', uid));
  return snap.exists() ? snap.data() : null;
}

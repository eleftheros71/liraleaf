// Optional cloud backup. Without VITE_FIREBASE_* values the app runs fully local.
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, getFirestore, serverTimestamp, setDoc, writeBatch, type Firestore } from 'firebase/firestore';
import type { GuideBundle, Shift } from '../types';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.projectId && config.appId);

let auth: Auth | null = null;
let db: Firestore | null = null;
if (firebaseEnabled) {
  const app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
  getRedirectResult(auth).catch(() => {});
}

export type { User };

export function watchAuth(cb: (u: User | null) => void): () => void {
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

export async function signInWithGoogle(): Promise<void> {
  if (!auth) throw new Error('Cloud backup is not configured on this install.');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/popup-blocked') return signInWithRedirect(auth, provider);
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
    throw err;
  }
}

export async function signOut(): Promise<void> {
  if (auth) await fbSignOut(auth);
}

// ---------- Weekly guide cache ----------

export async function loadCloudGuide(uid: string, weekOf: string): Promise<GuideBundle | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'users', uid, 'guides', `guide_${weekOf}`));
  const data = snap.data() as { guideJson?: string; sourcesJson?: string } | undefined;
  if (!data?.guideJson) return null;
  try {
    return { guide: JSON.parse(data.guideJson), sources: JSON.parse(data.sourcesJson ?? '[]') };
  } catch {
    return null;
  }
}

export async function saveCloudGuide(uid: string, b: GuideBundle): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'users', uid, 'guides', `guide_${b.guide.weekOf}`), {
    weekOf: b.guide.weekOf,
    guideJson: JSON.stringify(b.guide),
    sourcesJson: JSON.stringify(b.sources.slice(0, 80)),
    savedAt: serverTimestamp(),
  });
}

// ---------- Shift log sync (last write wins per shift, deletes are tombstones) ----------

function toDoc(s: Shift) {
  return {
    start: s.start,
    end: s.end,
    platform: s.platform,
    earnings: s.earnings,
    tips: s.tips,
    trips: s.trips,
    miles: s.miles,
    tolls: s.tolls,
    areas: s.areas,
    notes: s.notes.slice(0, 2000),
    updatedAt: s.updatedAt,
    deleted: Boolean(s.deleted),
  };
}

export async function pushShift(uid: string, s: Shift): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'users', uid, 'shifts', s.id), toDoc(s));
}

/** Merge local and cloud logs by updatedAt, write back whatever the cloud is missing. */
export async function syncShifts(uid: string, local: Shift[]): Promise<Shift[]> {
  if (!db) return local;
  const snap = await getDocs(collection(db, 'users', uid, 'shifts'));
  const merged = new Map<string, Shift>();
  const remote = new Map<string, Shift>();
  snap.forEach((d) => remote.set(d.id, { id: d.id, ...(d.data() as Omit<Shift, 'id'>) }));
  for (const s of remote.values()) merged.set(s.id, s);
  const toPush: Shift[] = [];
  for (const s of local) {
    const r = remote.get(s.id);
    if (!r || s.updatedAt > r.updatedAt) {
      merged.set(s.id, s);
      toPush.push(s);
    }
  }
  for (let i = 0; i < toPush.length; i += 400) {
    const batch = writeBatch(db);
    for (const s of toPush.slice(i, i + 400)) batch.set(doc(db, 'users', uid, 'shifts', s.id), toDoc(s));
    await batch.commit();
  }
  return [...merged.values()];
}

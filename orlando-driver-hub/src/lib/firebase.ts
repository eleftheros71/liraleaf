import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { doc, getDoc, getFirestore, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';
import type { Corridor, GuideBundle } from '../types';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.projectId && config.appId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
if (firebaseEnabled) {
  app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
}

export function watchAuth(cb: (u: User | null) => void): () => void {
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

export async function signInWithGoogle(): Promise<void> {
  if (!auth) throw new Error('Firebase is not configured. Add the VITE_FIREBASE_* values to .env.');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/popup-blocked') {
      // Popup blocked by the browser: fall back to a full-page redirect.
      await signInWithRedirect(auth, provider);
      return;
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
    throw err;
  }
}

export async function signOut(): Promise<void> {
  if (auth) await fbSignOut(auth);
}

export async function saveProfile(user: User, corridors: Corridor[]): Promise<void> {
  if (!db) return;
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  await setDoc(
    ref,
    {
      displayName: (user.displayName ?? '').slice(0, 120),
      email: (user.email ?? '').slice(0, 200),
      corridors,
      updatedAt: serverTimestamp(),
      ...(snap.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  );
}

export async function loadCachedGuide(uid: string, weekOf: string): Promise<(GuideBundle & { corridors: Corridor[] }) | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'users', uid, 'guides', `guide_${weekOf}`));
  if (!snap.exists()) return null;
  const data = snap.data() as { guideJson?: string; sources?: GuideBundle['sources']; corridors?: Corridor[] };
  if (!data.guideJson) return null;
  try {
    return { guide: JSON.parse(data.guideJson), sources: data.sources ?? [], corridors: data.corridors ?? [] };
  } catch {
    return null;
  }
}

export async function saveCachedGuide(uid: string, bundle: GuideBundle): Promise<void> {
  if (!db) return;
  const { guide, sources } = bundle;
  await setDoc(doc(db, 'users', uid, 'guides', `guide_${guide.weekOf}`), {
    ownerUid: uid,
    weekOf: guide.weekOf,
    corridors: guide.corridors,
    guideJson: JSON.stringify(guide),
    sources: sources.slice(0, 60).map((s) => ({ title: s.title.slice(0, 300), uri: s.uri.slice(0, 2000) })),
    createdAt: serverTimestamp(),
  });
}

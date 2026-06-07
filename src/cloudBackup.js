import { initializeApp } from "firebase/app";
import {
  getAuth, GoogleAuthProvider,
  signInWithPopup, signOut as fbSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore, doc, setDoc, getDoc, onSnapshot,
} from "firebase/firestore";
import { firebaseConfig, IS_CONFIGURED } from "./firebaseConfig.js";

let _app, _auth, _db;

function getServices() {
  if (!IS_CONFIGURED) throw new Error("NOT_CONFIGURED");
  if (!_app) {
    _app  = initializeApp(firebaseConfig);
    _auth = getAuth(_app);
    _db   = getFirestore(_app);
  }
  return { auth: _auth, db: _db };
}

export function listenAuthState(callback) {
  if (!IS_CONFIGURED) return () => {};
  const { auth } = getServices();
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  const { auth } = getServices();
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  return result.user;
}

export async function signOut() {
  const { auth } = getServices();
  await fbSignOut(auth);
}

export async function backupToCloud(data) {
  const { auth, db } = getServices();
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const updatedAt = new Date().toISOString();
  await setDoc(doc(db, "backups", user.uid), {
    payload:     JSON.stringify(data),
    updatedAt,
    personCount: data.persons.length,
    recordCount: data.records.length,
  });
  return updatedAt;
}

/**
 * Subscribe to real-time changes for the signed-in user's backup document.
 * Calls onData({ data, updatedAt }) whenever the Firestore document changes.
 * Returns an unsubscribe function.
 */
export function subscribeToCloud(uid, onData) {
  if (!IS_CONFIGURED) return () => {};
  const { db } = getServices();
  return onSnapshot(doc(db, "backups", uid), (snap) => {
    if (!snap.exists()) return;
    const { payload, updatedAt } = snap.data();
    try {
      onData({ data: JSON.parse(payload), updatedAt });
    } catch {}
  });
}

export async function restoreFromCloud() {
  const { auth, db } = getServices();
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const snap = await getDoc(doc(db, "backups", user.uid));
  if (!snap.exists()) return null;
  const { payload, updatedAt } = snap.data();
  return { data: JSON.parse(payload), modifiedTime: updatedAt };
}

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

// ── PRO STATUS ────────────────────────────────────────────────────────────────
const PRO_CACHE = "mh_pro_v1";

/** Write pro status to Firestore + localStorage cache after a successful payment. */
export async function setProStatus({ plan, ref }) {
  const { auth, db } = getServices();
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  const now = new Date();
  const expiresAt = new Date(now);
  if (plan === "monthly") expiresAt.setMonth(expiresAt.getMonth() + 1);
  else expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const data = { pro: true, plan, ref, paidAt: now.toISOString(), expiresAt: expiresAt.toISOString() };
  await setDoc(doc(db, "users", user.uid), data, { merge: true });
  localStorage.setItem(PRO_CACHE, JSON.stringify(data));
  return data;
}

/** Subscribe to pro status from Firestore. Calls onData(true|false) on change. */
export function subscribeProStatus(uid, onData) {
  if (!IS_CONFIGURED) { onData(false); return () => {}; }
  const { db } = getServices();
  return onSnapshot(doc(db, "users", uid), (snap) => {
    if (!snap.exists()) { onData(false); return; }
    const d = snap.data();
    if (!d.pro || (d.expiresAt && new Date(d.expiresAt) < new Date())) { onData(false); return; }
    localStorage.setItem(PRO_CACHE, JSON.stringify(d));
    onData(true);
  }, () => onData(false));
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

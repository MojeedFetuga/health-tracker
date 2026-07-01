import { initializeApp } from "firebase/app";
import {
  getAuth, GoogleAuthProvider,
  signInWithPopup, signOut as fbSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore, doc, setDoc, getDoc, deleteDoc, onSnapshot,
  collection, query, where, getDocs,
} from "firebase/firestore";
import { firebaseConfig, IS_CONFIGURED } from "./firebaseConfig.js";
import { deriveKey, encryptPayload, decryptPayload } from "./crypto.js";
import { SHARED_LAST_KEY } from "./driveBackup.js";

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

// ── AUTH ──────────────────────────────────────────────────────────────────────
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

// ── BACKUP ────────────────────────────────────────────────────────────────────
export async function backupToCloud(data) {
  const { auth, db } = getServices();
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  const key       = await deriveKey(user.uid, user.email);
  const envelope  = await encryptPayload(data, key);
  const updatedAt = new Date().toISOString();

  await setDoc(doc(db, "backups", user.uid), {
    payload:     envelope,          // encrypted blob — developer cannot read this
    updatedAt,
    personCount: data.persons.length,
    recordCount: data.records.length,
  });
  localStorage.setItem(SHARED_LAST_KEY, updatedAt);
  return updatedAt;
}

/** Subscribe to real-time Firestore changes. Decrypts before calling onData. */
export function subscribeToCloud(uid, onData) {
  if (!IS_CONFIGURED) return () => {};
  const { auth, db } = getServices();
  return onSnapshot(doc(db, "backups", uid), async (snap) => {
    if (!snap.exists()) return;
    const { payload, updatedAt } = snap.data();
    try {
      const user = auth.currentUser;
      if (!user) return;
      const key  = await deriveKey(user.uid, user.email);
      const data = await decryptPayload(payload, key);
      onData({ data, updatedAt });
    } catch (e) {
      console.warn("Decrypt failed:", e);
    }
  });
}

export async function restoreFromCloud() {
  const { auth, db } = getServices();
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const snap = await getDoc(doc(db, "backups", user.uid));
  if (!snap.exists()) return null;
  const { payload, updatedAt } = snap.data();
  const key  = await deriveKey(user.uid, user.email);
  const data = await decryptPayload(payload, key);
  return { data, modifiedTime: updatedAt };
}

// ── DELETE ALL USER DATA (Right to Erasure — NDPR Art. 3.1(9)) ───────────────
/** Permanently deletes all user data from Firestore and clears local cache. */
export async function deleteAllUserData() {
  const { auth, db } = getServices();
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  // Delete both Firestore collections for this user
  await Promise.all([
    deleteDoc(doc(db, "backups", user.uid)).catch(() => {}),
    deleteDoc(doc(db, "users",   user.uid)).catch(() => {}),
  ]);

  // Clear local Pro cache
  localStorage.removeItem("mh_pro_v1");
  localStorage.removeItem("htLastSync");
}

// ── PRO STATUS ────────────────────────────────────────────────────────────────
const PRO_CACHE = "mh_pro_v1";

/**
 * Write pro status to Firestore + localStorage cache after a successful payment.
 * uid/email/displayName can be passed explicitly to avoid relying on
 * auth.currentUser, which may be transiently null during Paystack callback.
 */
export async function setProStatus({ plan, ref, uid: passedUid, email: passedEmail, displayName: passedName }) {
  const { auth, db } = getServices();
  const user = auth.currentUser;

  const uid         = passedUid   || user?.uid;
  const email       = passedEmail || user?.email       || "";
  const displayName = passedName  || user?.displayName || "";

  if (!uid) throw new Error("Not signed in — please sign in and try again");

  const expiresAt = plan === "lifetime" ? "9999-12-31T23:59:59.000Z" : null;
  const data = {
    pro: true, plan, ref,
    paidAt: new Date().toISOString(),
    expiresAt, email, displayName,
  };

  // Write localStorage first so Pro activates instantly in the UI
  localStorage.setItem(PRO_CACHE, JSON.stringify(data));

  // Then persist to Firestore (user is Pro even if this momentarily fails)
  await setDoc(doc(db, "users", uid), data, { merge: true });
  return data;
}

// ── USER REGISTRATION (free users) ───────────────────────────────────────────
/**
 * Called on every Google sign-in. Creates a lightweight /users/{uid} record
 * for free users so the admin can see all signed-in users, not just Pro payers.
 * Uses merge:true so it never overwrites Pro status if already set.
 */
export async function registerUser() {
  try {
    const { auth, db } = getServices();
    const user = auth.currentUser;
    if (!user) return;
    const ref  = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      // First sign-in — create free record
      await setDoc(ref, {
        email:       user.email,
        displayName: user.displayName || "",
        signedUpAt:  new Date().toISOString(),
        plan:        "free",
        pro:         false,
      });
    } else {
      // Subsequent sign-in — just update email/name/lastSeen, preserve Pro status
      await setDoc(ref, {
        email:       user.email,
        displayName: user.displayName || "",
        lastSeenAt:  new Date().toISOString(),
      }, { merge: true });
    }
  } catch { /* non-critical — don't break the sign-in flow */ }
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────
/** Fetch ALL signed-in users (free + pro). Requires admin Firestore rules. */
export async function getAllUsers() {
  const { db } = getServices();
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

/** Fetch Pro-only users. */
export async function getProUsers() {
  const { db } = getServices();
  const snap = await getDocs(query(collection(db, "users"), where("pro", "==", true)));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

/** Subscribe to pro status from Firestore. Calls onData(true|false) on change. */
export function subscribeProStatus(uid, onData) {
  if (!IS_CONFIGURED) { onData(false); return () => {}; }
  const { db } = getServices();
  return onSnapshot(doc(db, "users", uid), (snap) => {
    if (!snap.exists()) { onData(false); return; }
    const d = snap.data();
    if (!d.pro) { onData(false); return; }
    // lifetime = expiresAt "9999-..." — always valid
    if (d.expiresAt && d.expiresAt !== "9999-12-31T23:59:59.000Z" && new Date(d.expiresAt) < new Date()) {
      onData(false); return;
    }
    localStorage.setItem(PRO_CACHE, JSON.stringify(d));
    onData(true);
  }, () => onData(false));
}

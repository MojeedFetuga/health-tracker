// ─────────────────────────────────────────────────────────────────────────────
// Google Drive Personal Backup
//
// Stores one encrypted backup file in the user's OWN Google Drive
// (appDataFolder — hidden from regular Drive UI, only this app can read it).
//
// The developer NEVER sees this data. It never passes through any server.
// Zero server costs. Full user data sovereignty.
// ─────────────────────────────────────────────────────────────────────────────

import { deriveKey, encryptPayload, decryptPayload } from "./crypto.js";
import { GOOGLE_DRIVE_CLIENT_ID, IS_DRIVE_CONFIGURED } from "./driveConfig.js";

const BACKUP_FILENAME = "metrichealth_backup.json";
const DRIVE_CONN_KEY  = "mh_drive_v1";       // localStorage: connected flag
const DRIVE_LAST_KEY  = "mh_drive_last_v1";  // localStorage: last Drive backup ts
export const SHARED_LAST_KEY = "mh_last_any_backup"; // shared with Firebase

// ── OAuth token management ────────────────────────────────────────────────────
let _accessToken = null;
let _tokenExpiry = 0;

function loadGIS() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.onload  = resolve;
    s.onerror = () => reject(new Error("Could not load Google Identity Services — check your connection."));
    document.head.appendChild(s);
  });
}

/**
 * Request an OAuth access token for the Drive appdata scope.
 * @param {string}  hint  - User email (pre-fills account selector)
 * @param {boolean} force - true = always show popup; false = silent if possible
 */
export function requestDriveToken(hint, force = false) {
  return new Promise(async (resolve, reject) => {
    // Return cached token if still valid
    if (_accessToken && Date.now() < _tokenExpiry && !force) {
      resolve(_accessToken);
      return;
    }
    try { await loadGIS(); } catch (e) { reject(e); return; }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_DRIVE_CLIENT_ID,
      scope:     "https://www.googleapis.com/auth/drive.appdata",
      hint:      hint || undefined,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        _accessToken = response.access_token;
        _tokenExpiry = Date.now() + (response.expires_in - 30) * 1000;
        resolve(_accessToken);
      },
      error_callback: (err) => {
        reject(new Error(err.message || "Google Drive authorisation was cancelled."));
      },
    });
    // prompt: "" = silent if user has already granted; falls back to popup automatically
    client.requestAccessToken(force ? {} : { prompt: "" });
  });
}

// ── Drive REST helpers ────────────────────────────────────────────────────────
async function findBackupFile() {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("spaces", "appDataFolder");
  url.searchParams.set("q",      `name = '${BACKUP_FILENAME}' and trashed = false`);
  url.searchParams.set("fields", "files(id,name,modifiedTime,size)");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${_accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Drive list error ${res.status}`);
  }
  const json = await res.json();
  return json.files?.[0] || null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** True if the user has connected Google Drive on this device. */
export const isDriveConnected  = () => !!localStorage.getItem(DRIVE_CONN_KEY);

/** ISO string of last Drive backup, or null. */
export const getDriveLastBackup = () => localStorage.getItem(DRIVE_LAST_KEY);

/**
 * Open Google authorisation popup and connect Drive.
 * Call when user clicks "Connect Google Drive".
 */
export async function connectDrive(userEmail) {
  if (!IS_DRIVE_CONFIGURED) throw new Error("Google Drive Client ID not configured — see driveConfig.js.");
  await requestDriveToken(userEmail, true);   // always show picker on first connect
  localStorage.setItem(DRIVE_CONN_KEY, "1");
}

/** Disconnect Drive (clears local state only, does not revoke Google token). */
export function disconnectDrive() {
  _accessToken = null;
  _tokenExpiry = 0;
  localStorage.removeItem(DRIVE_CONN_KEY);
  localStorage.removeItem(DRIVE_LAST_KEY);
}

/**
 * Encrypt and upload the app data to the user's Google Drive appDataFolder.
 * Creates the file on first run; updates it on subsequent runs.
 * Data is encrypted with AES-256-GCM BEFORE leaving the device.
 *
 * @param {object} data   - full app data object
 * @param {string} uid    - Firebase UID (used for encryption key derivation)
 * @param {string} email  - user email  (used for encryption key derivation + token hint)
 * @returns {string} ISO timestamp of the backup
 */
export async function backupToDrive(data, uid, email) {
  await requestDriveToken(email);

  // Encrypt before upload
  const key      = await deriveKey(uid, email);
  const envelope = await encryptPayload(data, key);
  const content  = JSON.stringify({
    enc:        true,
    version:    1,
    payload:    envelope,
    backedUpAt: new Date().toISOString(),
    meta:       { persons: data.persons.length, records: data.records.length },
  });

  const metadata = {
    name:        BACKUP_FILENAME,
    mimeType:    "application/json",
    description: `MetricHealth encrypted backup — ${data.persons.length} persons · ${data.records.length} records`,
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file",     new Blob([content],                  { type: "application/json" }));

  const existing  = await findBackupFile();
  const uploadUrl = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart&fields=id,modifiedTime`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime`;

  const res = await fetch(uploadUrl, {
    method:  existing ? "PATCH" : "POST",
    headers: { Authorization: `Bearer ${_accessToken}` },
    body:    form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Drive upload failed");
  }

  const result = await res.json();
  const ts = result.modifiedTime || new Date().toISOString();
  localStorage.setItem(DRIVE_LAST_KEY,  ts);
  localStorage.setItem(SHARED_LAST_KEY, ts);
  return ts;
}

/**
 * Download and decrypt the backup from the user's Google Drive.
 * @returns {{ data, modifiedTime }} or null if no backup exists
 */
export async function restoreFromDrive(uid, email) {
  await requestDriveToken(email);

  const file = await findBackupFile();
  if (!file) return null;

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
    { headers: { Authorization: `Bearer ${_accessToken}` } }
  );
  if (!res.ok) throw new Error("Could not read backup file from Drive.");

  const raw  = await res.json();
  const key  = await deriveKey(uid, email);
  const data = await decryptPayload(raw.payload, key);
  return { data, modifiedTime: file.modifiedTime };
}

/**
 * Fetch lightweight metadata about the Drive backup (no data download).
 * Returns { modifiedTime, sizeKB } or null.
 */
export async function getDriveBackupInfo(email) {
  try {
    await requestDriveToken(email);
    const file = await findBackupFile();
    if (!file) return null;
    return {
      modifiedTime: file.modifiedTime,
      sizeKB:       file.size ? (parseInt(file.size, 10) / 1024).toFixed(1) : null,
    };
  } catch {
    return null;
  }
}

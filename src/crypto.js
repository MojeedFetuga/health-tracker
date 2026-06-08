// ─────────────────────────────────────────────────────────────────────────────
// Shared AES-256-GCM encryption utilities (Web Crypto API — no library needed)
// Used by both Firebase backup and Google Drive backup.
// Data is always encrypted on the device BEFORE transmission.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive a deterministic AES-256-GCM key from the user's uid + email.
 * The same user on any device gets the same key — enables seamless sync.
 */
export async function deriveKey(uid, email) {
  const raw = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`mh-enc-v1:${uid}:${email}`)
  );
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

/**
 * Encrypt a JS object.
 * Returns { enc: true, iv: number[], data: number[] }
 */
export async function encryptPayload(obj, key) {
  const iv        = crypto.getRandomValues(new Uint8Array(12));
  const encoded   = new TextEncoder().encode(JSON.stringify(obj));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return { enc: true, iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) };
}

/**
 * Decrypt an encrypted envelope back to a JS object.
 * Backwards-compatible: plain JSON strings (pre-encryption) pass through unchanged.
 */
export async function decryptPayload(envelope, key) {
  if (!envelope?.enc) {
    return typeof envelope === "string" ? JSON.parse(envelope) : envelope;
  }
  const iv        = new Uint8Array(envelope.iv);
  const data      = new Uint8Array(envelope.data);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return JSON.parse(new TextDecoder().decode(decrypted));
}

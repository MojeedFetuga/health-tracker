// ─────────────────────────────────────────────────────────────────────────────
// Google Drive Backup Configuration
//
// One-time setup (5 minutes):
// 1. Go to console.cloud.google.com
// 2. Select your Firebase project  (healthtracker-f784a)
// 3. APIs & Services → Library → search "Google Drive API" → Enable
// 4. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
//    • Application type: Web application
//    • Authorized JavaScript origins:
//        https://dailyvitals.app
//        http://localhost:5173   (for local development)
// 5. Copy the Client ID (looks like: 123456789-abc.apps.googleusercontent.com)
// 6. Paste it below
// ─────────────────────────────────────────────────────────────────────────────

// Set VITE_GOOGLE_DRIVE_CLIENT_ID in your Vercel environment variables.
export const GOOGLE_DRIVE_CLIENT_ID = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID || "";

export const IS_DRIVE_CONFIGURED = !!GOOGLE_DRIVE_CLIENT_ID;

// ─────────────────────────────────────────────────────────────────────────────
// DEVELOPER SETUP (one-time, takes ~5 minutes):
//
// 1. Go to https://console.firebase.google.com and create a project.
// 2. Click "Add app" → Web → register the app → copy the config below.
// 3. In the Firebase Console sidebar go to:
//      Build → Authentication → Get started → Google → Enable → Save
// 4. Build → Firestore Database → Create database → Start in production mode
//      → choose a region → Done.
// 5. Firestore → Rules tab → paste these rules → Publish:
//
//      rules_version = '2';
//      service cloud.firestore {
//        match /databases/{database}/documents {
//          match /backups/{userId} {
//            allow read, write: if request.auth != null
//                               && request.auth.uid == userId;
//          }
//        }
//      }
//
// 6. Fill in the values below from your Firebase project settings.
//    (Project settings → Your apps → SDK setup → Config)
//
// After this, YOUR USERS never touch any of this.
// They just click "Sign in with Google" inside the app.
// ─────────────────────────────────────────────────────────────────────────────

export const firebaseConfig = {
  apiKey:            "AIzaSyCqhUKsbBar9gdH5XZDhnBycsxmqiJ4zk0",
  authDomain:        "healthtracker-f784a.firebaseapp.com",
  projectId:         "healthtracker-f784a",
  storageBucket:     "healthtracker-f784a.firebasestorage.app",
  messagingSenderId: "596702033058",
  appId:             "1:596702033058:web:c27d78207bc29647af53fb",
};

export const IS_CONFIGURED = !!firebaseConfig.apiKey;

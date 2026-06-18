/* ============================================================
   صندوق مهر۱۱۰ — frontend Firebase config + mode switch.

   FB_LIVE controls where the app gets its data:
     • false (default) → DEMO mode: the app runs entirely in the browser
       on the deterministic dataset in data.js. No backend, no network,
       no secrets — safe for a PUBLIC GitHub repo and GitHub Pages.
     • true            → LIVE mode: the app talks to your Firebase project
       (Auth + Cloud Functions). Fill in FB_CONFIG below with YOUR project's
       web config and set FB_LIVE = true.

   NOTE ON SECRETS: a Firebase *web* config (apiKey, appId, …) is a public
   client identifier, NOT a secret — it is safe to commit. It only identifies
   the project; access is controlled by Firebase Auth + Security Rules + the
   Cloud Functions, never by hiding this value. The values below are
   PLACEHOLDERS; replace them with your own from the Firebase console.
   (Real admin credentials / service accounts are server-side only and are
   git-ignored — they never appear in the browser.)
   ============================================================ */
// LIVE: backend deployed (Functions on Blaze), Firestore seeded, manager
// account created with role=admin. The app now talks to the real backend;
// every interaction goes through a Cloud Function callable.
window.FB_LIVE = true;

// Project mehr110-62009 web config. A Firebase WEB apiKey is a public client
// identifier (NOT a secret) — access is governed by Auth + Security Rules +
// Functions, never by hiding this. Safe to commit.
window.FB_CONFIG = {
  apiKey: "AIzaSyAlvqFhVakrmMzEyYygBHeQ66DYiRzgjvI",
  authDomain: "mehr110-62009.firebaseapp.com",
  projectId: "mehr110-62009",
  storageBucket: "mehr110-62009.firebasestorage.app",
  messagingSenderId: "4451294429",
  appId: "1:4451294429:web:327b81d4fd1e9ca7384f34",
  measurementId: "G-4N01JJC2J9",
};

// Cloud Functions region — must match setGlobalOptions in functions/src/index.ts
window.FB_REGION = "us-central1";

// When true, point the SDKs at the local Firebase Emulator Suite.
window.FB_USE_EMULATOR = false;

// app/lib/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// --- IMPORTANT ---
// Ensure all these NEXT_PUBLIC_* env vars are set in Vercel:
// NEXT_PUBLIC_FIREBASE_API_KEY
// NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
// NEXT_PUBLIC_FIREBASE_PROJECT_ID
// NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET        (optional but common)
// NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID   (optional but common)
// NEXT_PUBLIC_FIREBASE_APP_ID
// NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY     (your reCAPTCHA v3 key from App Check)

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Initialize App Check **on the client only**
if (typeof window !== "undefined" && !window.__APP_CHECK_INIT__) {
  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
  if (siteKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    window.__APP_CHECK_INIT__ = true;
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

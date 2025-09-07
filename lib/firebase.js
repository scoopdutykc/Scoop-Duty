// lib/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Optional: surface SDK logs in the browser console if you set NEXT_PUBLIC_FIREBASE_DEBUG=true
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_FIREBASE_DEBUG === "true") {
  // Lazy import to avoid bundling for server
  import("firebase/firestore").then(({ setLogLevel }) => setLogLevel("debug"));
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ---- App Check (required in production if Firestore/AppCheck is enforced) ----
// Add NEXT_PUBLIC_RECAPTCHA_SITE_KEY in Vercel → Project Settings → Environment Variables
if (typeof window !== "undefined") {
  try {
    // If you want to use App Check debug token (good for quick prod testing):
    // In Vercel set NEXT_PUBLIC_APPCHECK_DEBUG="true" temporarily, deploy, load the site once,
    // check the console for a debug token, then add it in Firebase Console → App Check → Debug tokens.
    if (process.env.NEXT_PUBLIC_APPCHECK_DEBUG === "true") {
      // eslint-disable-next-line no-undef
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    // Ignore duplicate init during Fast Refresh
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);

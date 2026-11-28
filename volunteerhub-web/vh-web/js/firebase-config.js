/*
 * firebase-config.js
 * The published site uses this Firebase project for authentication and shared records.
 * If the connection is unavailable, hosted sign-in waits for it to recover.
 * These values are safe to publish: they identify your project, and firestore.rules
 * decides who can read or change data. See SETUP-FIREBASE.md for the steps.
 */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBGqCDf2qL0o924-JJvmLot0OtS60zWCac",
  authDomain: "volunteerhub-12975.firebaseapp.com",
  projectId: "volunteerhub-12975",
  storageBucket: "volunteerhub-12975.firebasestorage.app",
  messagingSenderId: "1095597784809",
  appId: "1:1095597784809:web:587e9813ad4381a703ba78",
};

// Optional public reCAPTCHA Enterprise site key for Firebase App Check.
window.FIREBASE_APP_CHECK_SITE_KEY = "";

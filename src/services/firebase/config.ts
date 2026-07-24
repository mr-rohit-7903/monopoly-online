import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously as firebaseSignInAnonymously } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Live Firebase configuration provided by user
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyBPruzPuqzcsMPnj_-SaC9RKsclnQLaPFA",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "monopoly-banker-34f61.firebaseapp.com",
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || "https://monopoly-banker-34f61-default-rtdb.firebaseio.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "monopoly-banker-34f61",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "monopoly-banker-34f61.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "219033872306",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:219033872306:web:fe9674134ade75cec726ab",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-N0VSRFQ4YD"
};

// Initialize Firebase App & Realtime Database
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getDatabase(app);

export { firebaseSignInAnonymously };

// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app"

// Firebase configuration with fallback values
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAlVd-8KdKlkLFtqoW7toUvCkR_G3Kxb4Y",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "forgefit-k1uia.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "forgefit-k1uia",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "forgefit-k1uia.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1074051143809",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1074051143809:web:0de0c02560ae7e4a075580",
}

// Debug logging in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('Firebase Config:', {
    apiKey: firebaseConfig.apiKey ? 'Set' : 'Missing',
    authDomain: firebaseConfig.authDomain ? 'Set' : 'Missing',
    projectId: firebaseConfig.projectId ? 'Set' : 'Missing',
    storageBucket: firebaseConfig.storageBucket ? 'Set' : 'Missing',
    messagingSenderId: firebaseConfig.messagingSenderId ? 'Set' : 'Missing',
    appId: firebaseConfig.appId ? 'Set' : 'Missing',
  })
}

// Only initialize Firebase if we have valid configuration
const hasValidConfig = firebaseConfig.apiKey && 
                      firebaseConfig.authDomain && 
                      firebaseConfig.projectId

let app: FirebaseApp | null = null
try {
  app = hasValidConfig ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null
} catch (error) {
  console.error('Firebase initialization error:', error)
}

export { app }
export const isFirebaseConfigured = hasValidConfig && app !== null

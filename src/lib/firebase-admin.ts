// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let isInitialized = false;

// Initialize Firebase Admin SDK only when needed and at runtime
export function initializeAdminApp() {
  // Only run at runtime, not during build
  if (typeof window !== 'undefined') return; // Client-side guard
  if (isInitialized) return; // Already initialized guard
  
  try {
    // Only initialize if we have valid configuration AND we're in a runtime environment
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (projectId && privateKey && clientEmail && getApps().length === 0) {
      const serviceAccount: ServiceAccount = {
        projectId,
        privateKey,
        clientEmail,
      };

      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.projectId,
      });
      
      isInitialized = true;
      console.log('Firebase Admin SDK initialized successfully');
    } else if (!projectId || !privateKey || !clientEmail) {
      console.warn('Firebase Admin SDK configuration missing, skipping initialization');
    }
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error);
  }
}

// Export the admin firestore with runtime initialization
export const getAdminDB = () => {
  // Only run at runtime, not during build
  if (typeof window !== 'undefined') return null; // Client-side guard
  
  try {
    // Initialize if needed
    initializeAdminApp();
    
    // Return firestore instance if available
    return getApps().length > 0 ? getFirestore() : null;
  } catch (error) {
    console.warn('Firebase Admin not initialized, returning null for adminDB:', error);
    return null;
  }
};

export const getAdminAuth = () => {
  if (typeof window !== 'undefined') return null;

  try {
    initializeAdminApp();
    return getApps().length > 0 ? getAuth() : null;
  } catch (error) {
    console.warn('Firebase Admin not initialized, returning null for adminAuth:', error);
    return null;
  }
}

// Legacy export for backward compatibility (but this will be null at build time)
export const adminDB = null;

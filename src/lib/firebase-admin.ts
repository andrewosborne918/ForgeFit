// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let isInitialized = false;

// Initialize Firebase Admin SDK only when needed and at runtime
function initializeFirebaseAdmin() {
  // Only run at runtime, not during build
  if (typeof window !== 'undefined') return; // Client-side guard
  if (isInitialized) return; // Already initialized guard
  
  try {
    // Only initialize if we have valid configuration AND we're in a runtime environment
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    console.log('🔧 Firebase Admin initialization attempt:');
    console.log('  Project ID:', !!projectId);
    console.log('  Client Email:', !!clientEmail);
    console.log('  Private Key:', !!privateKey);
    console.log('  Existing apps:', getApps().length);

    // Validate credentials are not placeholders
    const isPlaceholderEmail = clientEmail && clientEmail.includes('your_service_account_email');
    const isPlaceholderKey = privateKey && privateKey.includes('your_private_key_here');
    
    if (isPlaceholderEmail || isPlaceholderKey) {
      console.error('🚨 CRITICAL: Firebase Admin credentials are placeholders!');
      console.error('  Placeholder email detected:', isPlaceholderEmail);
      console.error('  Placeholder key detected:', isPlaceholderKey);
      console.error('  This will cause workout count tracking to fail.');
      console.error('  Please update .env.local with real Firebase service account credentials.');
      return;
    }

    if (projectId && privateKey && clientEmail) {
      // Check if already initialized
      if (getApps().length === 0) {
        const serviceAccount: ServiceAccount = {
          projectId,
          privateKey,
          clientEmail,
        };

        console.log('🚀 Initializing Firebase Admin...');
        initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.projectId,
        });
        
        console.log('✅ Firebase Admin SDK initialized successfully');
      } else {
        console.log('✅ Firebase Admin already initialized');
      }
      
      isInitialized = true;
    } else {
      console.warn('❌ Firebase Admin SDK configuration missing:');
      console.warn('  Missing Project ID:', !projectId);
      console.warn('  Missing Client Email:', !clientEmail);
      console.warn('  Missing Private Key:', !privateKey);
    }
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization error:', error);
    // Additional error details
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 500)
      });
    }
  }
}

// Export the admin firestore with runtime initialization
export const getAdminDB = () => {
  // Only run at runtime, not during build
  if (typeof window !== 'undefined') return null; // Client-side guard
  
  try {
    // Initialize if needed
    initializeFirebaseAdmin();
    
    // Check if we have any apps initialized
    const apps = getApps();
    console.log('🔍 getAdminDB check - apps available:', apps.length, 'isInitialized:', isInitialized);
    
    if (apps.length > 0) {
      const firestore = getFirestore();
      console.log('✅ Returning Firestore instance');
      return firestore;
    } else {
      console.warn('❌ No Firebase apps initialized');
      return null;
    }
  } catch (error) {
    console.error('❌ Firebase Admin getAdminDB error:', error);
    return null;
  }
};

// Legacy export for backward compatibility (but this will be null at build time)
export const adminDB = null;

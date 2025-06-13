import { NextRequest, NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';

export async function GET() {
  try {
    console.log('🔍 Testing Firebase Admin SDK...');
    
    // Detailed debugging information
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    
    console.log('Environment check:');
    console.log('  PROJECT_ID:', !!projectId, projectId ? `(${projectId})` : '');
    console.log('  CLIENT_EMAIL:', !!clientEmail, clientEmail ? `(${clientEmail.substring(0, 20)}...)` : '');
    console.log('  PRIVATE_KEY:', !!privateKey, privateKey ? `(${privateKey.substring(0, 50)}...)` : '');
    
    // Check for placeholder credentials
    const isPlaceholderEmail = clientEmail && clientEmail.includes('your_service_account_email');
    const isPlaceholderKey = privateKey && privateKey.includes('your_private_key_here');
    
    if (isPlaceholderEmail || isPlaceholderKey) {
      console.log('🚨 PLACEHOLDER CREDENTIALS DETECTED!');
      return NextResponse.json({ 
        success: false, 
        error: 'Firebase Admin credentials are placeholders',
        details: 'The .env.local file contains placeholder values instead of real Firebase service account credentials',
        placeholderIssues: {
          email: isPlaceholderEmail,
          privateKey: isPlaceholderKey
        },
        solution: 'Please update .env.local with real Firebase service account credentials from Firebase Console > Project Settings > Service Accounts',
        debug: {
          hasProjectId: !!projectId,
          hasClientEmail: !!clientEmail,
          hasPrivateKey: !!privateKey,
          isPlaceholderEmail,
          isPlaceholderKey
        }
      }, { status: 500 });
    }
    
    // Check if apps are already initialized
    const { getApps } = await import('firebase-admin/app');
    const existingApps = getApps();
    console.log('Existing Firebase apps:', existingApps.length);
    
    const adminDB = getAdminDB();
    
    if (!adminDB) {
      console.log('❌ Firebase Admin DB is null');
      return NextResponse.json({ 
        success: false, 
        error: 'Firebase Admin SDK not initialized',
        details: 'getAdminDB() returned null - check initialization logic',
        debug: {
          hasProjectId: !!projectId,
          hasClientEmail: !!clientEmail,
          hasPrivateKey: !!privateKey,
          existingApps: existingApps.length,
          privateKeyStart: privateKey ? privateKey.substring(0, 30) : 'missing',
          clientEmailStart: clientEmail ? clientEmail.substring(0, 30) : 'missing'
        },
        envCheck: {
          FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
          FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
          FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
        }
      }, { status: 500 });
    }
    
    console.log('✅ Firebase Admin DB is available');
    
    // Try to read from Firestore to test connection
    const testCollection = await adminDB.collection('test').limit(1).get();
    console.log('✅ Successfully connected to Firestore');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Firebase Admin SDK is working correctly',
      documentsInTest: testCollection.size,
      envCheck: {
        FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
        FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
        FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      }
    });
    
  } catch (error) {
    console.error('❌ Firebase Admin SDK test failed:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Firebase Admin SDK test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      envCheck: {
        FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
        FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
        FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      }
    }, { status: 500 });
  }
}

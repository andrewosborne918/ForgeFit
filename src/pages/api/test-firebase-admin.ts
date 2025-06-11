// Test endpoint to verify Firebase Admin SDK is working
import { NextApiRequest, NextApiResponse } from 'next';
import { adminDB } from '@/lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!adminDB) {
      return res.status(500).json({ 
        error: 'Firebase Admin not configured',
        details: 'Firebase Admin SDK credentials missing'
      });
    }

    // Try to access Firestore
    const testDoc = await adminDB.collection('test').doc('connection').get();
    
    return res.status(200).json({ 
      success: true,
      message: 'Firebase Admin SDK is working correctly',
      timestamp: new Date().toISOString(),
      hasConnection: true
    });
  } catch (error) {
    console.error('Firebase Admin SDK test error:', error);
    return res.status(500).json({ 
      error: 'Firebase Admin SDK error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDB } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const auth = getAdminAuth();
    const db = getAdminDB();

    if (!auth || !db) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    // Reactivate in Firebase Auth
    await auth.updateUser(userId, { disabled: false });

    // Update status in Firestore
    const userRef = db.collection('users').doc(userId);
    await userRef.update({ status: 'active' });

    return NextResponse.json({ message: 'User reactivated successfully' });
  } catch (error: any) {
    console.error('Error reactivating user:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

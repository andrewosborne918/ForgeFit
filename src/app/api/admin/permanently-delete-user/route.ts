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

    // Delete from Firebase Auth
    await auth.deleteUser(userId);

    // Delete from Firestore
    const userRef = db.collection('users').doc(userId);
    await userRef.delete();

    return NextResponse.json({ message: 'User permanently deleted' });
  } catch (error: any) {
    console.error('Error permanently deleting user:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

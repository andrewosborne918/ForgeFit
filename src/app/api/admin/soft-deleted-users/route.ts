import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';
import { UserRecord } from 'firebase-admin/auth';

export async function GET() {
  try {
    const db = getAdminDB();
    if (!db) {
      throw new Error('Firebase Admin SDK not initialized');
    }
    const usersCollection = db.collection('users');
    const snapshot = await usersCollection.where('status', '==', 'soft-deleted').get();

    if (snapshot.empty) {
      return NextResponse.json({ users: [] });
    }

    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error fetching soft-deleted users:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

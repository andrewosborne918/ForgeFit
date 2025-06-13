import { NextRequest, NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';

// API endpoint to check if email has been used before
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const adminDB = getAdminDB();
    if (!adminDB) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    // Check current users
    const currentUsersQuery = await adminDB
      .collection('users')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (!currentUsersQuery.empty) {
      return NextResponse.json({
        available: false,
        reason: 'Email already in use'
      });
    }

    // Check deleted users / email blacklist
    const deletedUsersQuery = await adminDB
      .collection('deletedEmails')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (!deletedUsersQuery.empty) {
      const deletedUser = deletedUsersQuery.docs[0].data();
      return NextResponse.json({
        available: false,
        reason: 'Email was previously used and cannot be reused',
        deletedAt: deletedUser.deletedAt,
        workoutsUsed: deletedUser.workoutsUsed
      });
    }

    return NextResponse.json({
      available: true,
      reason: 'Email can be used'
    });

  } catch (error) {
    console.error('Error checking email availability:', error);
    return NextResponse.json(
      { error: 'Failed to check email availability' },
      { status: 500 }
    );
  }
}

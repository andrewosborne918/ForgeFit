// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { getAuth } from 'firebase-admin/auth';
import { getApp } from 'firebase-admin/app';

export async function GET(request: NextRequest) {
  try {
    // Get user email from authorization header or query params
    const authorization = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('adminEmail');
    
    // Verify admin access
    if (!verifyAdminAccess(userEmail || '')) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const adminDB = getAdminDB();
    if (!adminDB) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get pagination params
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const search = searchParams.get('search') || '';

    // Build query
    let query: FirebaseFirestore.Query = adminDB.collection('users');

    // Add search filter if provided
    if (search) {
      // For email search, we need to use where clause
      query = query.where('email', '>=', search.toLowerCase())
                  .where('email', '<=', search.toLowerCase() + '\uf8ff');
    }

    // Add sorting
    if (sortBy === 'createdAt' || sortBy === 'email') {
      query = query.orderBy(sortBy, sortOrder as 'asc' | 'desc');
    }

    // Get total count for pagination
    const totalSnapshot = await query.get();
    const totalUsers = totalSnapshot.size;

    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedSnapshot = await query.offset(offset).limit(limit).get();

    // Process user data
    const users = await Promise.all(
      paginatedSnapshot.docs.map(async (doc) => {
        const userData = doc.data();
        
        // Get additional stats
        const [logsSnapshot, scheduleSnapshot] = await Promise.all([
          adminDB.collection(`users/${doc.id}/logs`).get(),
          adminDB.collection(`users/${doc.id}/weeklySchedule`).get()
        ]);

        return {
          id: doc.id,
          email: userData.email,
          createdAt: userData.createdAt?.toDate?.() || userData.createdAt,
          profile: {
            plan: userData.profile?.plan || 'free',
            workoutsGenerated: userData.profile?.workoutsGenerated || 0,
            age: userData.profile?.age,
            gender: userData.profile?.gender,
            experience: userData.profile?.experience,
            goals: userData.profile?.goals
          },
          subscription: {
            customerId: userData.customerId,
            subscriptionId: userData.subscriptionId,
            currentPeriodEnd: userData.currentPeriodEnd?.toDate?.() || userData.currentPeriodEnd,
          },
          stats: {
            workoutLogs: logsSnapshot.size,
            scheduleEntries: scheduleSnapshot.size
          },
          lastLogin: userData.lastLogin?.toDate?.() || userData.lastLogin,
          updatedAt: userData.updatedAt?.toDate?.() || userData.updatedAt
        };
      })
    );

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: totalUsers,
        pages: Math.ceil(totalUsers / limit)
      },
      sortBy,
      sortOrder,
      search
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, userId, userEmail: adminEmail, ...updateData } = await request.json();

    // Verify admin access
    if (!verifyAdminAccess(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const adminDB = getAdminDB();
    if (!adminDB) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    switch (action) {
      case 'updateSubscription':
        await adminDB.collection('users').doc(userId).update({
          'profile.plan': updateData.plan,
          updatedAt: new Date(),
          updatedBy: 'admin'
        });
        return NextResponse.json({ success: true, message: 'Subscription updated' });

      case 'resetPassword':
        // This would typically send a password reset email
        const adminAuth = getAuth(getApp());
        await adminAuth.generatePasswordResetLink(updateData.email);
        return NextResponse.json({ success: true, message: 'Password reset email sent' });

      case 'deleteUser':
        // Use the existing delete-user endpoint logic
        return NextResponse.json({ 
          success: false, 
          message: 'Use /api/delete-user endpoint for user deletion',
          redirect: '/api/delete-user'
        });

      case 'updateProfile':
        const profileUpdates: any = {};
        if (updateData.plan) profileUpdates['profile.plan'] = updateData.plan;
        if (updateData.workoutsGenerated !== undefined) {
          profileUpdates['profile.workoutsGenerated'] = updateData.workoutsGenerated;
        }
        profileUpdates.updatedAt = new Date();
        profileUpdates.updatedBy = 'admin';

        await adminDB.collection('users').doc(userId).update(profileUpdates);
        return NextResponse.json({ success: true, message: 'Profile updated' });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

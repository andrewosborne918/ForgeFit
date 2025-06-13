import { NextRequest, NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getApp } from 'firebase-admin/app';
import Stripe from 'stripe';

// Define a more specific type for UserData
interface UserProfileData {
  plan?: string;
  workoutsGenerated?: number;
  // Add any other properties that might exist on profile
}

interface UserData {
  email?: string;
  customerId?: string;
  subscriptionId?: string;
  createdAt?: any; // Consider using a more specific type like Timestamp or Date
  profile?: UserProfileData;
  // Add any other top-level properties from your user document
  [key: string]: any; // Keep this for flexibility if not all properties are known
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil', // Using the version from the error message
});

interface DeletionResult {
  success: boolean;
  deletedData: {
    firebaseAuth: boolean;
    firestoreUser: boolean;
    firestoreLogs: number;
    firestoreSchedule: number;
    stripeCustomer: boolean;
    stripeSubscriptions: number;
  };
  errors: string[];
  userId: string;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId, confirmationCode, adminOverride } = await request.json();

    // Validate required parameters
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate confirmation code (should match a specific pattern)
    if (!adminOverride && confirmationCode !== `DELETE-${userId.slice(-6).toUpperCase()}`) {
      return NextResponse.json(
        { error: 'Invalid confirmation code' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Starting complete deletion for user: ${userId}`);

    const deletionResult: DeletionResult = {
      success: false,
      deletedData: {
        firebaseAuth: false,
        firestoreUser: false,
        firestoreLogs: 0,
        firestoreSchedule: 0,
        stripeCustomer: false,
        stripeSubscriptions: 0,
      },
      errors: [],
      userId,
      timestamp: new Date().toISOString(),
    };

    // Get Firebase Admin instances
    const adminDB = getAdminDB();
    if (!adminDB) {
      deletionResult.errors.push('Firebase Admin not initialized');
      // It's important to return here if adminDB is not available.
      return NextResponse.json(deletionResult, { status: 500 });
    }

    const adminAuth = getAuth(getApp());

    // Step 1: Get user data before deletion (for logging and Stripe cleanup)
    console.log('📋 Retrieving user data before deletion...');
    let userData: UserData | null = null; // Use the UserData interface
    try {
      const userDoc = await adminDB.collection('users').doc(userId).get();
      if (userDoc.exists) {
        userData = userDoc.data() as UserData; // Assert to UserData
        if (userData) { // Null check for userData
          console.log(`   Found user data: ${userData.email}`);
          console.log(`   Customer ID: ${userData.customerId}`);
          console.log(`   Subscription ID: ${userData.subscriptionId}`);
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve user data:', error);
      deletionResult.errors.push(`Failed to retrieve user data: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Step 2: Delete Stripe data (if exists)
    if (userData && userData.customerId) { // Null check for userData
      console.log('💳 Deleting Stripe customer data...');
      try {
        // Cancel all active subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: userData.customerId as string, // Ensure customerId is a string
          status: 'active',
        });

        for (const subscription of subscriptions.data) {
          await stripe.subscriptions.cancel(subscription.id);
          deletionResult.deletedData.stripeSubscriptions++;
          console.log(`   Cancelled subscription: ${subscription.id}`);
        }

        // Delete customer (this removes payment methods and billing info)
        await stripe.customers.del(userData.customerId as string); // Ensure customerId is a string
        deletionResult.deletedData.stripeCustomer = true;
        console.log(`   Deleted Stripe customer: ${userData.customerId}`);
      } catch (error) {
        console.error('Failed to delete Stripe data:', error);
        deletionResult.errors.push(`Stripe deletion failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Step 3: Delete Firestore subcollections
    console.log('🗂️ Deleting Firestore subcollections...');
    
    // Delete workout logs
    try {
      const logsCollection = adminDB.collection(`users/${userId}/logs`);
      const logsSnapshot = await logsCollection.get();
      
      const logBatch = adminDB.batch();
      logsSnapshot.docs.forEach(doc => {
        logBatch.delete(doc.ref);
      });
      
      if (logsSnapshot.size > 0) {
        await logBatch.commit();
        deletionResult.deletedData.firestoreLogs = logsSnapshot.size;
        console.log(`   Deleted ${logsSnapshot.size} workout logs`);
      }
    } catch (error) {
      console.error('Failed to delete workout logs:', error);
      deletionResult.errors.push(`Workout logs deletion failed: ${error}`);
    }

    // Delete weekly schedule
    try {
      const scheduleCollection = adminDB.collection(`users/${userId}/weeklySchedule`);
      const scheduleSnapshot = await scheduleCollection.get();
      
      const scheduleBatch = adminDB.batch();
      scheduleSnapshot.docs.forEach(doc => {
        scheduleBatch.delete(doc.ref);
      });
      
      if (scheduleSnapshot.size > 0) {
        await scheduleBatch.commit();
        deletionResult.deletedData.firestoreSchedule = scheduleSnapshot.size;
        console.log(`   Deleted ${scheduleSnapshot.size} weekly schedule entries`);
      }
    } catch (error) {
      console.error('Failed to delete weekly schedule:', error);
      deletionResult.errors.push(`Weekly schedule deletion failed: ${error}`);
    }

    // Step 4: Delete main user document
    console.log('👤 Deleting main user document...');
    try {
      await adminDB.collection('users').doc(userId).delete();
      deletionResult.deletedData.firestoreUser = true;
      console.log(`   Deleted user document: ${userId}`);
    } catch (error) {
      console.error('Failed to delete user document:', error);
      deletionResult.errors.push(`User document deletion failed: ${error}`);
    }

    // Step 5: Delete Firebase Auth user
    console.log('🔐 Deleting Firebase Auth user...');
    try {
      await adminAuth.deleteUser(userId);
      deletionResult.deletedData.firebaseAuth = true;
      console.log(`   Deleted Firebase Auth user: ${userId}`);
    } catch (error) {
      console.error('Failed to delete Firebase Auth user:', error);
      deletionResult.errors.push(`Firebase Auth deletion failed: ${error}`);
    }

    // Step 6: Log deletion operation and blacklist email (for audit trail and abuse prevention)
    try {
      // Log deletion for audit
      await adminDB.collection('deletionLogs').add({
        userId,
        userEmail: userData?.email || 'unknown',
        deletedAt: new Date(),
        deletedBy: adminOverride ? 'admin' : 'user',
        deletionResult,
        originalUserData: {
          email: userData?.email,
          createdAt: userData?.createdAt,
          plan: userData?.profile?.plan,
          workoutsGenerated: userData?.profile?.workoutsGenerated,
        },
      });

      // Add email to blacklist to prevent re-registration abuse
      if (userData && userData.email) { // Null check for userData
        await adminDB.collection('deletedEmails').add({
          email: userData.email.toLowerCase(),
          originalUserId: userId,
          deletedAt: new Date(),
          workoutsUsed: userData?.profile?.workoutsGenerated || 0,
          plan: userData?.profile?.plan || 'free',
          reason: 'user_deletion',
          canReregister: false, // Set to true if you want to allow re-registration after a cooldown
        });
        console.log(`📧 Added ${userData.email} to deleted emails blacklist`);
      }
      
      console.log('📝 Logged deletion operation');
    } catch (error) {
      console.warn('Failed to log deletion operation:', error);
      // Don't fail the entire operation for logging errors
    }

    // Determine overall success
    deletionResult.success = deletionResult.errors.length === 0;

    console.log(`✅ User deletion completed. Success: ${deletionResult.success}`);
    console.log(`   Errors: ${deletionResult.errors.length}`);

    return NextResponse.json(deletionResult, { 
      status: deletionResult.success ? 200 : 207 // 207 = Multi-Status (partial success)
    });

  } catch (error) {
    console.error('❌ User deletion failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'User deletion failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to generate confirmation code and preview deletion
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user data to show what will be deleted
    const adminDB = getAdminDB();
    if (!adminDB) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      );
    }

    const userDoc = await adminDB.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // Count subcollection documents
    const logsSnapshot = await adminDB.collection(`users/${userId}/logs`).get();
    const scheduleSnapshot = await adminDB.collection(`users/${userId}/weeklySchedule`).get();

    // Generate confirmation code
    const confirmationCode = `DELETE-${userId.slice(-6).toUpperCase()}`;

    return NextResponse.json({
      userId,
      confirmationCode,
      userInfo: {
        email: userData?.email,
        createdAt: userData?.createdAt,
        plan: userData?.profile?.plan,
        workoutsGenerated: userData?.profile?.workoutsGenerated,
      },
      dataToDelete: {
        workoutLogs: logsSnapshot.size,
        weeklyScheduleEntries: scheduleSnapshot.size,
        hasStripeCustomer: !!userData?.customerId,
        hasActiveSubscription: !!userData?.subscriptionId,
      },
      warning: 'This action cannot be undone. All user data will be permanently deleted.',
    });

  } catch (error) {
    console.error('❌ Failed to preview user deletion:', error);
    return NextResponse.json(
      { 
        error: 'Failed to preview user deletion',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

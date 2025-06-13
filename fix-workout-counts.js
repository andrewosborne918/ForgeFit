// Fix workout count for users who have workouts but count shows 0
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID || "forgefit-k1uia",
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function fixWorkoutCounts() {
  try {
    console.log('🔧 Fixing workout counts for all users...');
    
    const usersSnapshot = await db.collection('users').get();
    let fixedCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const email = userData.email || 'No email';
      
      try {
        // Count actual workout logs
        const logsSnapshot = await db.collection(`users/${userId}/logs`).get();
        const actualWorkoutCount = logsSnapshot.size;
        
        // Get current profile data
        const profile = userData.profile || {};
        const currentRecordedCount = profile.workoutsGenerated || 0;
        
        console.log(`\n👤 User: ${email}`);
        console.log(`   Actual workouts: ${actualWorkoutCount}`);
        console.log(`   Recorded count: ${currentRecordedCount}`);
        
        // If there's a mismatch, fix it
        if (actualWorkoutCount !== currentRecordedCount) {
          console.log(`   🔄 Updating count from ${currentRecordedCount} to ${actualWorkoutCount}`);
          
          await userDoc.ref.update({
            'profile.workoutsGenerated': actualWorkoutCount,
            'profile.lastWorkoutCountFix': new Date(),
          });
          
          console.log(`   ✅ Fixed workout count for ${email}`);
          fixedCount++;
        } else {
          console.log(`   ✅ Count is already correct`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error fixing ${email}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Fix complete!`);
    console.log(`   Users fixed: ${fixedCount}`);
    console.log(`   Total users: ${usersSnapshot.size}`);
    
    // Also check if Firebase Admin is working for future workout generations
    console.log(`\n🔍 Testing Firebase Admin SDK for future tracking...`);
    const testDoc = await db.collection('test').doc('connection-test').set({
      tested: true,
      timestamp: new Date(),
    });
    console.log(`✅ Firebase Admin SDK is working - future workout counts should track correctly`);
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    
    if (error.message.includes('Could not load the default credentials')) {
      console.log('\n🔧 Firebase Admin credentials are not configured!');
      console.log('This is why workout counts are not being tracked.');
      console.log('\n📋 To fix permanently:');
      console.log('1. Go to: https://console.firebase.google.com/project/forgefit-k1uia/settings/serviceaccounts/adminsdk');
      console.log('2. Generate a new private key');
      console.log('3. Add to your environment variables:');
      console.log('   FIREBASE_CLIENT_EMAIL="your-service-account@forgefit-k1uia.iam.gserviceaccount.com"');
      console.log('   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
      console.log('\n💡 Temporary workaround:');
      console.log('   - Manually update workout counts in Firebase Console');
      console.log('   - Set user to premium plan to bypass limits');
    }
  }
}

fixWorkoutCounts();

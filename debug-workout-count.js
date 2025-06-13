// Debug script to check specific user's workout count issue
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

async function debugUserWorkoutCount() {
  try {
    console.log('🔍 Debugging user workout count issue...');
    
    // Get all users to see their workout counts
    const usersSnapshot = await db.collection('users').get();
    
    console.log('\n=== ALL USERS WORKOUT COUNT STATUS ===');
    usersSnapshot.docs.forEach(doc => {
      const userData = doc.data();
      const profile = userData.profile || {};
      
      console.log(`\nUser: ${userData.email || 'No email'} (${doc.id})`);
      console.log(`  Plan: ${profile.plan || 'Not set'}`);
      console.log(`  Workouts Generated: ${profile.workoutsGenerated || 'Not set'}`);
      console.log(`  Last Workout: ${profile.lastWorkoutGenerated ? profile.lastWorkoutGenerated.toDate() : 'Never'}`);
      console.log(`  Created: ${userData.createdAt ? userData.createdAt.toDate() : 'Unknown'}`);
      
      // Check if user has workout logs
      console.log(`  Checking workout logs...`);
    });
    
    // Check if there are any workout logs that might indicate workouts were generated
    console.log('\n=== CHECKING WORKOUT LOGS ===');
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      try {
        const logsSnapshot = await db.collection(`users/${userId}/logs`).get();
        if (logsSnapshot.size > 0) {
          console.log(`\nUser ${userData.email || userId} has ${logsSnapshot.size} workout logs:`);
          
          logsSnapshot.docs.forEach(logDoc => {
            const logData = logDoc.data();
            console.log(`  - ${logData.title || 'Untitled'} (${logDoc.id}) - ${logData.createdAt || 'No date'}`);
          });
          
          // If user has logs but workout count is 0, that's the problem
          const profile = userData.profile || {};
          const workoutsGenerated = profile.workoutsGenerated || 0;
          
          if (logsSnapshot.size > workoutsGenerated) {
            console.log(`  ⚠️  MISMATCH: User has ${logsSnapshot.size} logs but workoutsGenerated shows ${workoutsGenerated}`);
            console.log(`  💡 SOLUTION: Need to update workoutsGenerated to match actual workout count`);
          }
        }
      } catch (error) {
        console.log(`  Error checking logs for ${userId}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    
    if (error.message.includes('Could not load the default credentials')) {
      console.log('\n🔧 Firebase Admin credentials not configured.');
      console.log('This explains why workout counts are not being tracked!');
      console.log('\nTo fix this:');
      console.log('1. Go to: https://console.firebase.google.com/project/forgefit-k1uia/settings/serviceaccounts/adminsdk');
      console.log('2. Generate a new private key');
      console.log('3. Set environment variables:');
      console.log('   export FIREBASE_CLIENT_EMAIL="your-service-account@forgefit-k1uia.iam.gserviceaccount.com"');
      console.log('   export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
    }
  }
}

debugUserWorkoutCount();

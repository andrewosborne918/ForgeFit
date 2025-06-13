// Quick browser diagnostic - run this in browser console while logged in
// This will help diagnose the workout count issue

async function diagnoseBug() {
  console.log('🔍 Diagnosing workout count bug...');
  
  // Check if user is logged in
  const auth = window.firebase?.auth?.currentUser;
  if (!auth) {
    console.log('❌ No user logged in');
    return;
  }
  
  console.log('👤 Current user:', auth.uid);
  console.log('📧 Email:', auth.email);
  
  // Test the Firebase Admin endpoint
  try {
    console.log('\n🧪 Testing Firebase Admin SDK...');
    const response = await fetch('/api/test-firebase-admin');
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Firebase Admin SDK is working');
    } else {
      console.log('❌ Firebase Admin SDK is broken:', result.error);
      console.log('🔧 Environment check:', result.envCheck);
      console.log('💡 This explains why workout counts are not tracked!');
    }
  } catch (error) {
    console.log('❌ Failed to test Firebase Admin:', error);
  }
  
  // Check user's Firestore data
  try {
    console.log('\n📊 Checking user data in Firestore...');
    
    // This requires firebase/firestore to be available
    if (window.firebase?.firestore) {
      const db = window.firebase.firestore();
      const userDoc = await db.collection('users').doc(auth.uid).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        const profile = userData.profile || {};
        
        console.log('📋 User profile data:');
        console.log('   Plan:', profile.plan || 'Not set');
        console.log('   Workouts Generated:', profile.workoutsGenerated || 'Not set');
        console.log('   Last Workout:', profile.lastWorkoutGenerated || 'Never');
        
        // Check workout logs
        const logsSnapshot = await db.collection(`users/${auth.uid}/logs`).get();
        console.log('   Actual workout logs:', logsSnapshot.size);
        
        if (logsSnapshot.size !== (profile.workoutsGenerated || 0)) {
          console.log('⚠️  MISMATCH DETECTED!');
          console.log(`   Database shows: ${profile.workoutsGenerated || 0} workouts`);
          console.log(`   Actually generated: ${logsSnapshot.size} workouts`);
          console.log('💡 This confirms the tracking bug!');
        }
      } else {
        console.log('❌ User document not found');
      }
    } else {
      console.log('❌ Firestore not available in browser');
    }
  } catch (error) {
    console.log('❌ Error checking Firestore:', error);
  }
  
  // Test workout generation API
  console.log('\n🧪 Testing workout generation API behavior...');
  console.log('💡 Generate a workout and watch the browser network tab for:');
  console.log('   - POST /api/generate-plan should show logs about workout counting');
  console.log('   - Look for "Firebase Admin DB not available" warnings');
  
  console.log('\n📝 DIAGNOSIS COMPLETE');
  console.log('🔧 Next steps: Configure Firebase Admin SDK environment variables');
}

// Auto-run the diagnosis
diagnoseBug();

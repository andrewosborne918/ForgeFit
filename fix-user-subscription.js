// Fix user subscription data in Firestore
const admin = require('firebase-admin');

// Initialize Firebase Admin using environment variables
const serviceAccount = {
  projectId: "forgefit-k1uia",
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function fixUserSubscription() {
  try {
    const userId = "O3S9uHXiqhMVkEI7X0jTgEE3BDX2"; // Your user ID from the data
    
    console.log(`🔧 Fixing subscription for user: ${userId}`);
    
    // Get current user data
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log('❌ User not found');
      return;
    }
    
    const currentData = userDoc.data();
    console.log('📋 Current user data:');
    console.log('   Profile:', JSON.stringify(currentData.profile, null, 2));
    console.log('   Email:', currentData.email);
    
    // Update the profile to include subscription fields
    const updatedProfile = {
      ...currentData.profile,
      plan: 'premium',
      workoutsGenerated: 0
    };
    
    console.log('📝 Updating profile to:');
    console.log(JSON.stringify(updatedProfile, null, 2));
    
    // Update the user document
    await userDoc.ref.update({
      'profile': updatedProfile,
      subscriptionId: 'manual_subscription_' + Date.now(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      customerId: 'manual_customer_' + Date.now(),
      updatedAt: new Date(),
    });
    
    console.log('✅ Successfully updated user subscription!');
    
    // Verify the update
    const updatedDoc = await userDoc.ref.get();
    const updatedData = updatedDoc.data();
    console.log('🔍 Verification - Updated profile:');
    console.log(JSON.stringify(updatedData.profile, null, 2));
    console.log('✅ User should now show as Premium with 0/unlimited workouts');
    
  } catch (error) {
    console.error('❌ Error fixing user subscription:', error);
    
    if (error.message.includes('Could not load the default credentials')) {
      console.log('\n🔧 Please set up your Firebase Admin credentials:');
      console.log('1. Go to: https://console.firebase.google.com/project/forgefit-k1uia/settings/serviceaccounts/adminsdk');
      console.log('2. Generate a new private key');
      console.log('3. Set these environment variables:');
      console.log('   export FIREBASE_CLIENT_EMAIL="your-service-account@forgefit-k1uia.iam.gserviceaccount.com"');
      console.log('   export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
    }
  }
}

fixUserSubscription();

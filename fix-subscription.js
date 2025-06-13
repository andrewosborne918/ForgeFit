// Manual fix script to update your subscription status
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
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
    const yourEmail = 'andrewosborne918@gmail.com';
    const userQuery = await db.collection('users').where('email', '==', yourEmail).get();
    
    if (!userQuery.empty) {
      const userDoc = userQuery.docs[0];
      const userData = userDoc.data();
      
      console.log('Found user:', userDoc.id);
      console.log('Current data:', JSON.stringify(userData, null, 2));
      
      // Update to premium subscription
      await userDoc.ref.update({
        'profile.plan': 'premium',
        subscriptionId: 'manual_fix_' + Date.now(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        updatedAt: new Date(),
      });
      
      console.log('✅ Successfully updated user to premium plan!');
      
      // Verify the update
      const updatedDoc = await userDoc.ref.get();
      const updatedData = updatedDoc.data();
      console.log('Updated data:', JSON.stringify(updatedData, null, 2));
      
    } else {
      console.log(`❌ No user found with email: ${yourEmail}`);
    }

  } catch (error) {
    console.error('❌ Error fixing user subscription:', error);
  }
}

fixUserSubscription();

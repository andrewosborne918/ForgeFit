// Debug script to check user subscription status
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

async function checkUserStatus() {
  try {
    // Get all users to find the one with your email
    const usersSnapshot = await db.collection('users').get();
    
    console.log('=== ALL USERS IN FIRESTORE ===');
    usersSnapshot.docs.forEach(doc => {
      const userData = doc.data();
      console.log(`\nUser ID: ${doc.id}`);
      console.log(`Email: ${userData.email}`);
      console.log(`Profile:`, userData.profile);
      console.log(`Subscription ID: ${userData.subscriptionId}`);
      console.log(`Customer ID: ${userData.customerId}`);
      console.log(`Current Period End: ${userData.currentPeriodEnd}`);
      console.log(`Updated At: ${userData.updatedAt}`);
      console.log('---');
    });

    // Look for your specific email
    const yourEmail = 'andrewosborne918@gmail.com';
    const userQuery = await db.collection('users').where('email', '==', yourEmail).get();
    
    if (!userQuery.empty) {
      console.log('\n=== YOUR USER DATA ===');
      const userDoc = userQuery.docs[0];
      const userData = userDoc.data();
      console.log('User ID:', userDoc.id);
      console.log('Full user data:', JSON.stringify(userData, null, 2));
    } else {
      console.log(`\nNo user found with email: ${yourEmail}`);
    }

  } catch (error) {
    console.error('Error checking user status:', error);
  }
}

checkUserStatus();

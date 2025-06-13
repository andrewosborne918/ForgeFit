// Simple manual fix using the same values from .env
const admin = require('firebase-admin');

// Use the actual project values
const serviceAccount = {
  projectId: "forgefit-k1uia",
  clientEmail: "firebase-adminsdk-your-email@forgefit-k1uia.iam.gserviceaccount.com", // You need to get this
  privateKey: "-----BEGIN PRIVATE KEY-----\nYOUR_ACTUAL_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----", // You need to get this
};

// For now, let's try a simpler approach using the client SDK
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyAlVd-8KdKlkLFtqoW7toUvCkR_G3Kxb4Y",
  authDomain: "forgefit-k1uia.firebaseapp.com",
  projectId: "forgefit-k1uia",
  storageBucket: "forgefit-k1uia.firebasestorage.app",
  messagingSenderId: "1074051143809",
  appId: "1:1074051143809:web:0de0c02560ae7e4a075580"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function fixSubscriptionManually() {
  try {
    console.log('🔧 Manual subscription fix...');
    
    // You'll need to sign in with your email/password first
    const email = 'andrewosborne918@gmail.com';
    const password = 'YOUR_PASSWORD_HERE'; // You need to provide this
    
    console.log('Signing in...');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('✅ Signed in as:', user.uid);
    
    // Update the user document
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      'profile.plan': 'premium',
      subscriptionId: 'manual_fix_' + Date.now(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      updatedAt: new Date(),
    });
    
    console.log('✅ Successfully updated subscription to premium!');
    console.log('🎉 Your profile should now show Premium plan!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Alternative: Update directly in Firebase Console');
    console.log('1. Go to https://console.firebase.google.com/');
    console.log('2. Select your forgefit-k1uia project');
    console.log('3. Go to Firestore Database');
    console.log('4. Find your user document');
    console.log('5. Update the "profile.plan" field to "premium"');
  }
}

fixSubscriptionManually();

// Quick test of Firebase Admin initialization
const admin = require('firebase-admin');

console.log('🔍 Testing Firebase Admin setup...');

// Check environment variables
console.log('\n📋 Environment Variables:');
console.log('FIREBASE_PROJECT_ID:', !!process.env.FIREBASE_PROJECT_ID);
console.log('FIREBASE_CLIENT_EMAIL:', !!process.env.FIREBASE_CLIENT_EMAIL);
console.log('FIREBASE_PRIVATE_KEY:', !!process.env.FIREBASE_PRIVATE_KEY);

if (process.env.FIREBASE_CLIENT_EMAIL) {
  console.log('Client Email preview:', process.env.FIREBASE_CLIENT_EMAIL.substring(0, 30) + '...');
}

if (process.env.FIREBASE_PRIVATE_KEY) {
  const key = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  console.log('Private Key preview:', key.substring(0, 50) + '...');
  console.log('Private Key starts with BEGIN:', key.includes('-----BEGIN PRIVATE KEY-----'));
  console.log('Private Key ends with END:', key.includes('-----END PRIVATE KEY-----'));
}

// Try to initialize
try {
  if (!admin.apps.length) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };
    
    console.log('\n🚀 Attempting to initialize Firebase Admin...');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    console.log('✅ Firebase Admin initialized successfully!');
    
    // Test database connection
    const db = admin.firestore();
    console.log('✅ Firestore connection available');
    
    // Test a simple read operation
    const testDoc = await db.collection('test').limit(1).get();
    console.log('✅ Successfully connected to Firestore database');
    
  } else {
    console.log('✅ Firebase Admin already initialized');
  }
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  
  if (error.message.includes('private_key')) {
    console.log('\n💡 Private key issue detected. Common fixes:');
    console.log('1. Ensure private key includes proper newlines');
    console.log('2. Check that private key is properly escaped in environment');
    console.log('3. Verify the private key format is correct');
  }
  
  if (error.message.includes('client_email')) {
    console.log('\n💡 Client email issue detected. Check:');
    console.log('1. Client email format: firebase-adminsdk-xyz@projectid.iam.gserviceaccount.com');
    console.log('2. Ensure no extra spaces or characters');
  }
}

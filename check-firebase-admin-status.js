// Quick Firebase Admin Credentials Checker
const path = require('path');
const fs = require('fs');

console.log('🔍 Checking Firebase Admin Credentials Status...\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found');
  process.exit(1);
}

// Read .env.local
const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

let clientEmail = '';
let privateKey = '';

lines.forEach(line => {
  if (line.startsWith('FIREBASE_CLIENT_EMAIL=')) {
    clientEmail = line.split('=')[1]?.replace(/"/g, '');
  }
  if (line.startsWith('FIREBASE_PRIVATE_KEY=')) {
    privateKey = line.split('=')[1]?.replace(/"/g, '');
  }
});

console.log('📧 Client Email:', clientEmail);
console.log('🔑 Private Key:', privateKey?.substring(0, 50) + '...');
console.log('');

// Check if they're still placeholders
const isClientEmailPlaceholder = clientEmail.includes('your_service_account_email') || clientEmail.includes('your_project');
const isPrivateKeyPlaceholder = privateKey.includes('your_private_key_here');

if (isClientEmailPlaceholder || isPrivateKeyPlaceholder) {
  console.log('⚠️  STATUS: PLACEHOLDER CREDENTIALS DETECTED');
  console.log('');
  console.log('❌ Your Firebase Admin credentials are still using placeholder values.');
  console.log('');
  console.log('🔧 TO FIX THIS:');
  console.log('1. Go to Firebase Console: https://console.firebase.google.com/');
  console.log('2. Select your "forgefit-k1uia" project');
  console.log('3. Click ⚙️ → Project settings → Service accounts tab');
  console.log('4. Click "Generate new private key" button');
  console.log('5. Download the JSON file');
  console.log('6. Extract client_email and private_key from the JSON');
  console.log('7. Update your .env.local file with the real values');
  console.log('');
  console.log('📝 Example format in .env.local:');
  console.log('FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@forgefit-k1uia.iam.gserviceaccount.com"');
  console.log('FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\\n-----END PRIVATE KEY-----"');
  console.log('');
  process.exit(1);
} else {
  console.log('✅ STATUS: REAL CREDENTIALS DETECTED');
  console.log('');
  console.log('🎉 Your Firebase Admin credentials appear to be properly configured!');
  console.log('');
  console.log('🧪 Next step: Test the credentials with:');
  console.log('   node test-firebase-admin.js');
  console.log('');
}

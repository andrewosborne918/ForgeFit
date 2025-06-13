#!/usr/bin/env node

// Check Firebase Admin credentials validity
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Firebase Admin Credentials Check\n');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

console.log('Environment Variables Status:');
console.log('  FIREBASE_PROJECT_ID:', !!projectId ? '✅ Present' : '❌ Missing');
console.log('  FIREBASE_CLIENT_EMAIL:', !!clientEmail ? '✅ Present' : '❌ Missing');
console.log('  FIREBASE_PRIVATE_KEY:', !!privateKey ? '✅ Present' : '❌ Missing');

console.log('\nValues Analysis:');
console.log('  Project ID:', projectId);
console.log('  Client Email:', clientEmail);

// Check if credentials are placeholders
const isPlaceholderEmail = clientEmail && clientEmail.includes('your_service_account_email');
const isPlaceholderKey = privateKey && privateKey.includes('your_private_key_here');

console.log('\nCredential Validity:');
console.log('  Project ID Valid:', projectId && !projectId.includes('your_project') ? '✅ Real' : '❌ Placeholder/Missing');
console.log('  Client Email Valid:', clientEmail && !isPlaceholderEmail ? '✅ Real' : '❌ Placeholder/Missing');
console.log('  Private Key Valid:', privateKey && !isPlaceholderKey ? '✅ Real' : '❌ Placeholder/Missing');

if (isPlaceholderEmail || isPlaceholderKey) {
  console.log('\n🚨 ISSUE FOUND: Firebase Admin credentials are placeholders!');
  console.log('\nTo fix this issue:');
  console.log('1. Go to Firebase Console > Project Settings > Service Accounts');
  console.log('2. Generate a new private key');
  console.log('3. Download the JSON file');
  console.log('4. Update .env.local with the real values from the JSON file');
  console.log('   - FIREBASE_CLIENT_EMAIL should be the "client_email" field');
  console.log('   - FIREBASE_PRIVATE_KEY should be the "private_key" field');
} else {
  console.log('\n✅ Firebase Admin credentials appear to be real values');
}

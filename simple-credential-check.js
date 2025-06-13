#!/usr/bin/env node

// Simple Firebase Admin credentials check
const fs = require('fs');
const path = require('path');

console.log('🔍 Firebase Admin Credentials Check\n');

// Read .env.local file manually
const envPath = path.join(__dirname, '.env.local');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (error) {
  console.log('❌ Could not read .env.local file');
  process.exit(1);
}

// Parse environment variables
const lines = envContent.split('\n');
const envVars = {};
for (const line of lines) {
  if (line.startsWith('#') || !line.includes('=')) continue;
  const [key, ...valueParts] = line.split('=');
  const value = valueParts.join('=').replace(/^"/, '').replace(/"$/, '');
  envVars[key] = value;
}

const projectId = envVars.FIREBASE_PROJECT_ID;
const clientEmail = envVars.FIREBASE_CLIENT_EMAIL;
const privateKey = envVars.FIREBASE_PRIVATE_KEY;

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
  console.log('\nROOT CAUSE: The workout count tracking fails because Firebase Admin SDK');
  console.log('cannot authenticate with Firebase. This allows unlimited workout generation.');
  console.log('\nTo fix this issue:');
  console.log('1. Go to Firebase Console > Project Settings > Service Accounts');
  console.log('2. Click "Generate new private key" button');
  console.log('3. Download the JSON file');
  console.log('4. Update .env.local with the real values from the JSON file:');
  console.log('   - FIREBASE_CLIENT_EMAIL should be the "client_email" field');
  console.log('   - FIREBASE_PRIVATE_KEY should be the "private_key" field');
  console.log('\nAfter fixing, the workout count tracking will work properly and');
  console.log('free users will be limited to 3 workouts as intended.');
} else {
  console.log('\n✅ Firebase Admin credentials appear to be real values');
}

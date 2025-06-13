#!/usr/bin/env node

// Test script for user deletion API
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = 'test-user-123'; // Replace with actual test user ID

async function testUserDeletionAPI() {
  console.log('🧪 Testing User Deletion API');
  console.log('=============================\n');

  // Test 1: Get deletion preview
  console.log('1. Testing deletion preview...');
  try {
    const response = await fetch(`${BASE_URL}/api/delete-user?userId=${TEST_USER_ID}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Preview successful:');
      console.log(`   Confirmation Code: ${data.confirmationCode}`);
      console.log(`   User Email: ${data.userInfo.email}`);
      console.log(`   Data to delete: ${JSON.stringify(data.dataToDelete, null, 2)}`);
    } else {
      console.log(`❌ Preview failed: ${data.error}`);
    }
  } catch (error) {
    console.log(`❌ Preview error: ${error.message}`);
  }

  console.log('\n2. Testing deletion with invalid confirmation...');
  try {
    const response = await fetch(`${BASE_URL}/api/delete-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        confirmationCode: 'INVALID-CODE',
        adminOverride: false
      })
    });
    
    const data = await response.json();
    
    if (response.status === 400) {
      console.log('✅ Correctly rejected invalid confirmation code');
    } else {
      console.log(`❌ Unexpected response: ${data.error || 'Success when should fail'}`);
    }
  } catch (error) {
    console.log(`❌ Test error: ${error.message}`);
  }

  console.log('\n3. Testing deletion with admin override...');
  try {
    const response = await fetch(`${BASE_URL}/api/delete-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        confirmationCode: 'ignored',
        adminOverride: true
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Admin override deletion successful:');
      console.log(`   Success: ${data.success}`);
      console.log(`   Errors: ${data.errors.length}`);
      console.log(`   Deleted data: ${JSON.stringify(data.deletedData, null, 2)}`);
    } else {
      console.log(`❌ Admin deletion failed: ${data.error}`);
    }
  } catch (error) {
    console.log(`❌ Test error: ${error.message}`);
  }

  console.log('\n🎯 Test completed!');
}

// Instructions for running the test
console.log('📋 User Deletion API Test Instructions:');
console.log('=====================================');
console.log('1. Start your development server: npm run dev');
console.log('2. Create a test user or get an existing user ID');
console.log('3. Update TEST_USER_ID in this script');
console.log('4. Run: node test-user-deletion.js\n');

// Uncomment the line below to run the actual test
// testUserDeletionAPI();

console.log('⚠️  Replace TEST_USER_ID with a real user ID to run the test');
console.log('⚠️  Make sure Firebase Admin credentials are configured');
console.log('⚠️  Only run this on test data, not production users!');

module.exports = { testUserDeletionAPI };

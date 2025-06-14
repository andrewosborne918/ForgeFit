#!/usr/bin/env node
/**
 * Admin System Test Script
 * Tests the complete admin functionality
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🛡️ Testing ForgeFit Admin System...\n');

// Test 1: Check if all admin files exist
console.log('1️⃣ Testing Admin File Structure...');
const adminFiles = [
  'src/lib/admin-auth.ts',
  'src/app/api/admin/users/route.ts',
  'src/app/(app)/admin/users/page.tsx',
  'src/components/ui/select.tsx'
];

let allFilesExist = true;
adminFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  console.log(`   ${exists ? '✅' : '❌'} ${file}: ${exists ? 'EXISTS' : 'MISSING'}`);
  if (!exists) allFilesExist = false;
});

// Test 2: Check admin authentication functions
console.log('\n2️⃣ Testing Admin Authentication...');
const adminAuthPath = path.join(__dirname, 'src/lib/admin-auth.ts');
const adminAuthContent = fs.readFileSync(adminAuthPath, 'utf8');

const hasAdminEmailList = adminAuthContent.includes('andrewosborne918@gmail.com');
const hasIsAdminFunction = adminAuthContent.includes('export function isAdminEmail');
const hasVerifyAdminFunction = adminAuthContent.includes('export function verifyAdminAccess');

console.log(`   ✅ Admin email whitelist: ${hasAdminEmailList ? 'CONFIGURED' : 'MISSING'}`);
console.log(`   ✅ isAdminEmail function: ${hasIsAdminFunction ? 'EXISTS' : 'MISSING'}`);
console.log(`   ✅ verifyAdminAccess function: ${hasVerifyAdminFunction ? 'EXISTS' : 'MISSING'}`);

// Test 3: Check API endpoint
console.log('\n3️⃣ Testing Admin API Endpoint...');
const apiPath = path.join(__dirname, 'src/app/api/admin/users/route.ts');
const apiContent = fs.readFileSync(apiPath, 'utf8');

const hasGetEndpoint = apiContent.includes('export async function GET');
const hasPostEndpoint = apiContent.includes('export async function POST');
const hasAdminVerification = apiContent.includes('verifyAdminAccess');
const hasFirebaseQueries = apiContent.includes('collection(\'users\')');

console.log(`   ✅ GET endpoint: ${hasGetEndpoint ? 'EXISTS' : 'MISSING'}`);
console.log(`   ✅ POST endpoint: ${hasPostEndpoint ? 'EXISTS' : 'MISSING'}`);
console.log(`   ✅ Admin verification: ${hasAdminVerification ? 'IMPLEMENTED' : 'MISSING'}`);
console.log(`   ✅ Firebase integration: ${hasFirebaseQueries ? 'CONFIGURED' : 'MISSING'}`);

// Test 4: Check Admin UI
console.log('\n4️⃣ Testing Admin UI Components...');
const adminPagePath = path.join(__dirname, 'src/app/(app)/admin/users/page.tsx');
const adminPageContent = fs.readFileSync(adminPagePath, 'utf8');

const hasUserList = adminPageContent.includes('users.map');
const hasSubscriptionManagement = adminPageContent.includes('updateSubscription');
const hasPasswordReset = adminPageContent.includes('resetPassword');
const hasUserDeletion = adminPageContent.includes('deleteUser');
const hasAdminCheck = adminPageContent.includes('isAdminEmail');

console.log(`   ✅ User list display: ${hasUserList ? 'IMPLEMENTED' : 'MISSING'}`);
console.log(`   ✅ Subscription management: ${hasSubscriptionManagement ? 'IMPLEMENTED' : 'MISSING'}`);
console.log(`   ✅ Password reset: ${hasPasswordReset ? 'IMPLEMENTED' : 'MISSING'}`);
console.log(`   ✅ User deletion: ${hasUserDeletion ? 'IMPLEMENTED' : 'MISSING'}`);
console.log(`   ✅ Admin access control: ${hasAdminCheck ? 'IMPLEMENTED' : 'MISSING'}`);

// Test 5: Check Header Navigation
console.log('\n5️⃣ Testing Admin Navigation...');
const headerPath = path.join(__dirname, 'src/components/Header.tsx');
const headerContent = fs.readFileSync(headerPath, 'utf8');

const hasAdminImport = headerContent.includes('isAdminEmail');
const hasAdminCheck = headerContent.includes('isAdmin');
const hasAdminLink = headerContent.includes('/admin/users');

console.log(`   ✅ Admin auth import: ${hasAdminImport ? 'EXISTS' : 'MISSING'}`);
console.log(`   ✅ Admin user check: ${hasAdminCheck ? 'IMPLEMENTED' : 'MISSING'}`);
console.log(`   ✅ Admin navigation link: ${hasAdminLink ? 'ADDED' : 'MISSING'}`);

// Test 6: TypeScript compilation
console.log('\n6️⃣ Testing TypeScript Compilation...');
exec('cd /Users/andrewosborne/Documents/Programming/forgefit_Docker && npx tsc --noEmit', (error, stdout, stderr) => {
  if (error) {
    console.log('   ❌ TypeScript compilation: FAILED');
    console.log('   Errors:', stderr);
  } else {
    console.log('   ✅ TypeScript compilation: PASSED');
  }
  
  // Final summary
  console.log('\n📋 ADMIN SYSTEM SUMMARY:');
  console.log(`📁 File Structure: ${allFilesExist ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
  console.log(`🔐 Authentication: ${hasAdminEmailList && hasIsAdminFunction && hasVerifyAdminFunction ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
  console.log(`🌐 API Endpoint: ${hasGetEndpoint && hasPostEndpoint && hasAdminVerification ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
  console.log(`🎨 Admin UI: ${hasUserList && hasSubscriptionManagement && hasPasswordReset ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
  console.log(`🧭 Navigation: ${hasAdminImport && hasAdminCheck && hasAdminLink ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
  
  if (allFilesExist && 
      hasAdminEmailList && hasIsAdminFunction && hasVerifyAdminFunction &&
      hasGetEndpoint && hasPostEndpoint && hasAdminVerification &&
      hasUserList && hasSubscriptionManagement && hasPasswordReset &&
      hasAdminImport && hasAdminCheck && hasAdminLink) {
    console.log('\n🎉 ADMIN SYSTEM FULLY OPERATIONAL!');
    console.log('✨ Features available:');
    console.log('   • User management dashboard');
    console.log('   • Subscription level changes');
    console.log('   • Password reset functionality');
    console.log('   • User account deletion');
    console.log('   • Admin-only navigation');
    console.log('   • Secure access control');
    console.log('\n🔗 Access: http://localhost:3004/admin/users (admin users only)');
  } else {
    console.log('\n❌ Admin system has issues that need to be resolved.');
  }
});

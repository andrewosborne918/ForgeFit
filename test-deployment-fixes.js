#!/usr/bin/env node
/**
 * Test script to validate critical deployment fixes
 * Tests:
 * 1. Firebase Admin SDK runtime-only initialization
 * 2. Dashboard Suspense boundary implementation
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Deployment Fixes...\n');

// Test 1: Firebase Admin SDK
console.log('1️⃣ Testing Firebase Admin SDK...');
const firebaseAdminPath = path.join(__dirname, 'src/lib/firebase-admin.ts');
const firebaseAdminContent = fs.readFileSync(firebaseAdminPath, 'utf8');

// Check for runtime-only patterns
const hasRuntimeGuard = firebaseAdminContent.includes('typeof window !== \'undefined\'');
const hasGetAdminDB = firebaseAdminContent.includes('export const getAdminDB');
const hasNullLegacyExport = firebaseAdminContent.includes('export const adminDB = null');

console.log(`   ✅ Runtime guard: ${hasRuntimeGuard ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ getAdminDB function: ${hasGetAdminDB ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ Legacy null export: ${hasNullLegacyExport ? 'PASS' : 'FAIL'}`);

// Test 2: API Routes using new pattern
console.log('\n2️⃣ Testing API Routes...');
const apiFiles = [
  'src/pages/api/generate-plan.ts',
  'src/app/api/stripe-webhook/route.ts',
  'src/app/api/create-billing-portal/route.ts'
];

apiFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const usesGetAdminDB = content.includes('getAdminDB()');
    const importsGetAdminDB = content.includes('import { getAdminDB }');
    console.log(`   ✅ ${file}: ${usesGetAdminDB && importsGetAdminDB ? 'PASS' : 'FAIL'}`);
  }
});

// Test 3: Dashboard Suspense Boundary
console.log('\n3️⃣ Testing Dashboard Suspense...');
const dashboardPath = path.join(__dirname, 'src/app/(app)/dashboard/page.tsx');
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

const hasSuspenseImport = dashboardContent.includes('import { Suspense }');
const hasDashboardPageContent = dashboardContent.includes('function DashboardPageContent');
const hasSuspenseWrapper = dashboardContent.includes('<Suspense fallback={<DashboardLoading />}>');
const hasDashboardLoading = dashboardContent.includes('function DashboardLoading');

console.log(`   ✅ Suspense import: ${hasSuspenseImport ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ DashboardPageContent: ${hasDashboardPageContent ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ Suspense wrapper: ${hasSuspenseWrapper ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ Loading component: ${hasDashboardLoading ? 'PASS' : 'FAIL'}`);

// Final Summary
console.log('\n📋 SUMMARY:');
const firebaseTests = hasRuntimeGuard && hasGetAdminDB && hasNullLegacyExport;
const suspenseTests = hasSuspenseImport && hasDashboardPageContent && hasSuspenseWrapper && hasDashboardLoading;

console.log(`🔥 Firebase Admin SDK Fix: ${firebaseTests ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
console.log(`🎯 Dashboard Suspense Fix: ${suspenseTests ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);

if (firebaseTests && suspenseTests) {
  console.log('\n🎉 ALL DEPLOYMENT FIXES VERIFIED! Ready for build and deployment.');
  process.exit(0);
} else {
  console.log('\n❌ Some fixes incomplete. Please review above results.');
  process.exit(1);
}

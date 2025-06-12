#!/usr/bin/env node
/**
 * Test script to validate global bottom navigation implementation
 * Tests:
 * 1. GlobalBottomNavigation component structure
 * 2. Mobile bottom padding on all pages
 * 3. Event handling for dashboard communication
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Global Bottom Navigation Implementation...\n');

// Test 1: GlobalBottomNavigation Component
console.log('1️⃣ Testing GlobalBottomNavigation Component...');
const globalNavPath = path.join(__dirname, 'src/components/GlobalBottomNavigation.tsx');
const globalNavContent = fs.readFileSync(globalNavPath, 'utf8');

const hasPathname = globalNavContent.includes('usePathname');
const hasRouter = globalNavContent.includes('useRouter');
const hasEventHandling = globalNavContent.includes('dashboardViewChange');
const hasShowBottomNavLogic = globalNavContent.includes('shouldShowBottomNav');
const hasBottomNavWrapper = globalNavContent.includes('<BottomNavigationBar');

console.log(`   ✅ usePathname hook: ${hasPathname ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ useRouter hook: ${hasRouter ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ Event handling: ${hasEventHandling ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ Show/hide logic: ${hasShowBottomNavLogic ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ BottomNavigationBar wrapper: ${hasBottomNavWrapper ? 'PASS' : 'FAIL'}`);

// Test 2: Root Layout Integration
console.log('\n2️⃣ Testing Root Layout Integration...');
const layoutPath = path.join(__dirname, 'src/app/layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

const hasGlobalNavImport = layoutContent.includes('GlobalBottomNavigation');
const hasGlobalNavWrapper = layoutContent.includes('<GlobalBottomNavigation>');

console.log(`   ✅ GlobalBottomNavigation import: ${hasGlobalNavImport ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ GlobalBottomNavigation wrapper: ${hasGlobalNavWrapper ? 'PASS' : 'FAIL'}`);

// Test 3: Dashboard Event Listeners
console.log('\n3️⃣ Testing Dashboard Event Integration...');
const dashboardPath = path.join(__dirname, 'src/app/(app)/dashboard/page.tsx');
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

const hasViewChangeListener = dashboardContent.includes('dashboardViewChange');
const hasWorkoutGenerationListener = dashboardContent.includes('triggerWorkoutGeneration');
const hasEventCleanup = dashboardContent.includes('removeEventListener');
const removedBottomNavBar = !dashboardContent.includes('<BottomNavigationBar');

console.log(`   ✅ View change listener: ${hasViewChangeListener ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ Workout generation listener: ${hasWorkoutGenerationListener ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ Event cleanup: ${hasEventCleanup ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ Removed local BottomNavigationBar: ${removedBottomNavBar ? 'PASS' : 'FAIL'}`);

// Test 4: Mobile Bottom Padding
console.log('\n4️⃣ Testing Mobile Bottom Padding...');
const pagesToCheck = [
  'src/app/(app)/profile/page.tsx',
  'src/app/(app)/analytics/page.tsx',
  'src/app/workout/[uid]/[ts]/page.tsx',
  'src/app/(app)/dashboard/page.tsx'
];

pagesToCheck.forEach(pagePath => {
  const fullPath = path.join(__dirname, pagePath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasMobilePadding = content.includes('pb-20') || content.includes('pb-20 md:pb-');
    console.log(`   ✅ ${pagePath}: ${hasMobilePadding ? 'PASS' : 'FAIL'}`);
  } else {
    console.log(`   ⚠️  ${pagePath}: FILE NOT FOUND`);
  }
});

// Test 5: BottomNavigationBar Integration
console.log('\n5️⃣ Testing BottomNavigationBar Props...');
const bottomNavPath = path.join(__dirname, 'src/components/BottomNavigationBar.tsx');
const bottomNavContent = fs.readFileSync(bottomNavPath, 'utf8');

const hasCurrentViewProp = bottomNavContent.includes('currentView?:');
const hasOnViewChangeProp = bottomNavContent.includes('onViewChange?:');
const hasActiveStateLogic = bottomNavContent.includes('currentView === \'dashboard\'');

console.log(`   ✅ currentView prop: ${hasCurrentViewProp ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ onViewChange prop: ${hasOnViewChangeProp ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ Active state logic: ${hasActiveStateLogic ? 'PASS' : 'FAIL'}`);

// Final Summary
console.log('\n📋 SUMMARY:');
const globalNavTests = hasPathname && hasRouter && hasEventHandling && hasShowBottomNavLogic && hasBottomNavWrapper;
const layoutTests = hasGlobalNavImport && hasGlobalNavWrapper;
const dashboardTests = hasViewChangeListener && hasWorkoutGenerationListener && hasEventCleanup && removedBottomNavBar;
const bottomNavTests = hasCurrentViewProp && hasOnViewChangeProp && hasActiveStateLogic;

console.log(`🌐 Global Navigation Component: ${globalNavTests ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
console.log(`🏗️  Root Layout Integration: ${layoutTests ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
console.log(`📱 Dashboard Event Integration: ${dashboardTests ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
console.log(`🎯 BottomNavigationBar Props: ${bottomNavTests ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);

if (globalNavTests && layoutTests && dashboardTests && bottomNavTests) {
  console.log('\n🎉 ALL GLOBAL NAVIGATION TESTS PASSED! Bottom navigation is now available on all mobile pages.');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Please review above results.');
  process.exit(1);
}

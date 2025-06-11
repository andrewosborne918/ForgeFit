// Debug script to check user data structure
// Run this in browser console while logged in

function debugUserData() {
  // Check what's in the userProfile state
  const userProfile = window.localStorage.getItem('userProfile');
  console.log('📊 Local Storage userProfile:', userProfile);
  
  // Check Firebase user
  const user = window.firebase?.auth?.currentUser;
  console.log('👤 Firebase Auth User:', user?.uid);
  
  // Try to get React state (if accessible)
  console.log('🔍 To check current React state, open React DevTools and look for:');
  console.log('   - userProfile.plan');
  console.log('   - userProfile.workoutsGenerated');
}

console.log('🚀 Debug script loaded. Run debugUserData() to check user data.');

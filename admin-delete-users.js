#!/usr/bin/env node

// Admin script for bulk user deletion (development/testing only)
const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID || "forgefit-k1uia",
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const auth = admin.auth();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function listUsers() {
  console.log('\n📋 All users in the system:');
  console.log('=====================================');
  
  try {
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('No users found.');
      return [];
    }
    
    const users = [];
    usersSnapshot.docs.forEach((doc, index) => {
      const userData = doc.data();
      const user = {
        id: doc.id,
        email: userData.email,
        plan: userData.profile?.plan || 'unknown',
        workouts: userData.profile?.workoutsGenerated || 0,
        createdAt: userData.createdAt?.toDate?.()?.toLocaleDateString() || 'unknown'
      };
      users.push(user);
      
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Plan: ${user.plan} | Workouts: ${user.workouts}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('---');
    });
    
    return users;
  } catch (error) {
    console.error('❌ Error listing users:', error);
    return [];
  }
}

async function deleteUserById(userId, force = false) {
  console.log(`\n🗑️ Deleting user: ${userId}`);
  
  try {
    // Get user data first
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log('❌ User not found in Firestore');
      return false;
    }
    
    const userData = userDoc.data();
    console.log(`   Email: ${userData.email}`);
    console.log(`   Plan: ${userData.profile?.plan}`);
    
    if (!force) {
      const confirm = await askQuestion(`   Are you sure you want to delete ${userData.email}? (yes/no): `);
      if (confirm.toLowerCase() !== 'yes') {
        console.log('❌ Deletion cancelled');
        return false;
      }
    }
    
    // Delete subcollections
    console.log('📁 Deleting subcollections...');
    
    // Delete logs
    const logsSnapshot = await db.collection(`users/${userId}/logs`).get();
    if (!logsSnapshot.empty) {
      const logBatch = db.batch();
      logsSnapshot.docs.forEach(doc => logBatch.delete(doc.ref));
      await logBatch.commit();
      console.log(`   ✅ Deleted ${logsSnapshot.size} workout logs`);
    }
    
    // Delete weekly schedule
    const scheduleSnapshot = await db.collection(`users/${userId}/weeklySchedule`).get();
    if (!scheduleSnapshot.empty) {
      const scheduleBatch = db.batch();
      scheduleSnapshot.docs.forEach(doc => scheduleBatch.delete(doc.ref));
      await scheduleBatch.commit();
      console.log(`   ✅ Deleted ${scheduleSnapshot.size} schedule entries`);
    }
    
    // Delete main user document
    await db.collection('users').doc(userId).delete();
    console.log('   ✅ Deleted user document');
    
    // Delete Firebase Auth user
    try {
      await auth.deleteUser(userId);
      console.log('   ✅ Deleted Firebase Auth user');
    } catch (authError) {
      console.log('   ⚠️ Firebase Auth user not found or already deleted');
    }
    
    // Log deletion
    await db.collection('deletionLogs').add({
      userId,
      userEmail: userData.email,
      deletedAt: new Date(),
      deletedBy: 'admin-script',
      originalUserData: {
        email: userData.email,
        plan: userData.profile?.plan,
        workoutsGenerated: userData.profile?.workoutsGenerated,
      }
    });
    
    console.log('✅ User successfully deleted');
    return true;
    
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    return false;
  }
}

async function deleteAllUsers() {
  console.log('\n🚨 DELETE ALL USERS');
  console.log('==================');
  
  const users = await listUsers();
  if (users.length === 0) {
    console.log('No users to delete.');
    return;
  }
  
  console.log(`\n⚠️  WARNING: This will delete ALL ${users.length} users!`);
  const confirm1 = await askQuestion('Type "DELETE ALL USERS" to continue: ');
  
  if (confirm1 !== 'DELETE ALL USERS') {
    console.log('❌ Deletion cancelled');
    return;
  }
  
  const confirm2 = await askQuestion('Are you absolutely sure? Type "YES DELETE EVERYTHING": ');
  
  if (confirm2 !== 'YES DELETE EVERYTHING') {
    console.log('❌ Deletion cancelled');
    return;
  }
  
  console.log('\n🗑️ Proceeding with mass deletion...');
  
  let deletedCount = 0;
  for (const user of users) {
    console.log(`\nDeleting ${user.email}...`);
    const success = await deleteUserById(user.id, true);
    if (success) {
      deletedCount++;
    }
  }
  
  console.log(`\n✅ Deletion complete. ${deletedCount}/${users.length} users deleted.`);
}

async function deleteUserByEmail(email) {
  try {
    const userQuery = await db.collection('users').where('email', '==', email).get();
    
    if (userQuery.empty) {
      console.log(`❌ No user found with email: ${email}`);
      return false;
    }
    
    const userDoc = userQuery.docs[0];
    return await deleteUserById(userDoc.id);
    
  } catch (error) {
    console.error('❌ Error finding user by email:', error);
    return false;
  }
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function showMenu() {
  console.log('\n🔧 ForgeFit User Management Admin Tool');
  console.log('=====================================');
  console.log('1. List all users');
  console.log('2. Delete user by email');
  console.log('3. Delete user by ID');
  console.log('4. Delete ALL users (⚠️  DANGEROUS)');
  console.log('5. Exit');
  
  const choice = await askQuestion('\nSelect an option (1-5): ');
  
  switch (choice) {
    case '1':
      await listUsers();
      break;
      
    case '2':
      const email = await askQuestion('Enter user email: ');
      await deleteUserByEmail(email);
      break;
      
    case '3':
      const userId = await askQuestion('Enter user ID: ');
      await deleteUserById(userId);
      break;
      
    case '4':
      await deleteAllUsers();
      break;
      
    case '5':
      console.log('👋 Goodbye!');
      rl.close();
      return;
      
    default:
      console.log('❌ Invalid option');
  }
  
  // Show menu again
  await showMenu();
}

// Check credentials
if (!serviceAccount.clientEmail || !serviceAccount.privateKey) {
  console.error('❌ Firebase Admin credentials not configured');
  console.error('Please set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY environment variables');
  process.exit(1);
}

// Start the admin tool
console.log('🚀 Starting ForgeFit User Management Tool...');
showMenu().catch(console.error);

// Migration script for existing users missing subscription fields
const admin = require('firebase-admin');

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

async function migrateExistingUsers() {
  try {
    console.log('🔄 Starting migration of existing users...');
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    let migratedCount = 0;
    let totalUsers = usersSnapshot.docs.length;
    
    console.log(`📊 Found ${totalUsers} users to check`);
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Check if user has profile
      if (!userData.profile) {
        console.log(`⚠️ User ${userId} (${userData.email}) has no profile - skipping`);
        continue;
      }
      
      const profile = userData.profile;
      let needsUpdate = false;
      const updates = {};
      
      // Check if missing 'plan' field
      if (!profile.plan) {
        needsUpdate = true;
        updates['profile.plan'] = 'free';
        console.log(`   Adding plan: 'free'`);
      }
      
      // Check if missing 'workoutsGenerated' field
      if (typeof profile.workoutsGenerated !== 'number') {
        needsUpdate = true;
        updates['profile.workoutsGenerated'] = 0;
        console.log(`   Adding workoutsGenerated: 0`);
      }
      
      if (needsUpdate) {
        console.log(`🔧 Migrating user: ${userId} (${userData.email})`);
        
        await userDoc.ref.update({
          ...updates,
          migratedAt: new Date(),
        });
        
        migratedCount++;
        console.log(`✅ Updated user ${userId}`);
      } else {
        console.log(`✅ User ${userId} (${userData.email}) already has correct structure`);
      }
    }
    
    console.log(`\n🎉 Migration complete!`);
    console.log(`   Total users: ${totalUsers}`);
    console.log(`   Users migrated: ${migratedCount}`);
    console.log(`   Users already correct: ${totalUsers - migratedCount}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    if (error.message.includes('Could not load the default credentials')) {
      console.log('\n🔧 Please set up your Firebase Admin credentials:');
      console.log('1. Go to: https://console.firebase.google.com/project/forgefit-k1uia/settings/serviceaccounts/adminsdk');
      console.log('2. Generate a new private key');
      console.log('3. Set these environment variables:');
      console.log('   export FIREBASE_CLIENT_EMAIL="your-service-account@forgefit-k1uia.iam.gserviceaccount.com"');
      console.log('   export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
      console.log('4. Run the script again: node migrate-existing-users.js');
    }
  }
}

migrateExistingUsers();

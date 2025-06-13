## Quick Fix for Subscription Status

Your subscription payment went through, but the webhook couldn't update your Firebase database because the Firebase Admin SDK credentials are missing.

### **Option 1: Firebase Console Update (Recommended - 2 minutes)**

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: `forgefit-k1uia`
3. **Navigate to Firestore Database**
4. **Find your user document**:
   - Look for a document with your email: `andrewosborne918@gmail.com`
   - Or find it in the `users` collection
5. **Update the following fields**:
   ```json
   {
     "profile.plan": "premium",
     "subscriptionId": "manual_subscription_" + today's date,
     "currentPeriodEnd": "2025-07-12T00:00:00.000Z",
     "updatedAt": "2025-06-12T00:00:00.000Z"
   }
   ```

### **Option 2: Get Firebase Admin SDK Credentials**

To fix the webhook permanently, you need to:

1. **Go to Firebase Console** → Project Settings → Service Accounts
2. **Generate a new private key**
3. **Update your `.env.local` file** with:
   - `FIREBASE_CLIENT_EMAIL`: The email from the downloaded JSON
   - `FIREBASE_PRIVATE_KEY`: The private key from the downloaded JSON
4. **Get your Stripe webhook secret** from Stripe Dashboard → Webhooks

### **Your Current Issue**
The webhook returns "Firebase Admin not configured" because these environment variables are missing:
- ✅ `FIREBASE_PROJECT_ID` (you have this)
- ❌ `FIREBASE_CLIENT_EMAIL` (missing)
- ❌ `FIREBASE_PRIVATE_KEY` (missing)
- ❌ `STRIPE_WEBHOOK_SECRET` (missing)

### **After the Fix**
Once you update your profile manually or fix the environment variables:
1. Restart your development server
2. Your profile page should show "Premium" plan
3. You'll have unlimited workout generations
4. Future payments will work automatically

**The manual database update is the fastest solution to get you back to using the app right now!**

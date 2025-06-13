# 🧪 User Registration Test - Complete Verification

## Test Summary
This test verifies that the user registration fix is working correctly and that new users are getting the required subscription fields.

## What Was Fixed
- **Issue**: New users weren't getting `plan` and `workoutNumber` fields in their Firebase profile
- **Root Cause**: The signup process was only saving basic profile fields but missing subscription tracking fields
- **Solution**: Updated both email/password and Google OAuth signup flows to include initial subscription fields

## Files Modified
1. **`/src/app/auth/signup/page.tsx`** - User registration
2. **`/src/app/(app)/profile/page.tsx`** - Profile completion

## Expected User Document Structure

After registration, new users should have this structure:

```json
{
  "uid": "user_uid_here",
  "email": "user@example.com", 
  "createdAt": "2025-06-13T...",
  "profile": {
    "plan": "free",
    "workoutsGenerated": 0
  }
}
```

After completing profile setup:

```json
{
  "uid": "user_uid_here",
  "email": "user@example.com",
  "createdAt": "2025-06-13T...", 
  "profile": {
    "age": 30,
    "gender": "male",
    "goals": "Build Muscle",
    "experience": "intermediate",
    "plan": "free",
    "workoutsGenerated": 0
  }
}
```

## Testing Steps

### 1. Test New Email/Password Registration
```bash
# 1. Go to http://localhost:3000/auth/signup
# 2. Create account with email/password
# 3. Check Firebase Console -> Firestore -> users collection
# 4. Verify new user has "plan": "free" and "workoutsGenerated": 0
```

### 2. Test New Google OAuth Registration  
```bash
# 1. Go to http://localhost:3000/auth/signup
# 2. Click "Sign up with Google"
# 3. Complete Google OAuth flow
# 4. Check Firebase Console -> user should have subscription fields
```

### 3. Test Profile Completion
```bash
# 1. After registering, complete profile setup
# 2. Check that subscription fields persist: "plan": "free", "workoutsGenerated": 0
```

### 4. Test Existing User Migration
```bash
# Run migration script for existing users:
node migrate-existing-users.js
```

## Success Criteria

✅ **New users get subscription fields immediately upon registration**
✅ **Profile completion preserves subscription fields** 
✅ **Existing users can be migrated with script**
✅ **Subscription system works correctly for all users**

## Verification Commands

### Check specific user in Firebase:
```javascript
// In Firebase Console, run this query:
db.collection('users').where('email', '==', 'test@example.com').get()
```

### Check all users have correct structure:
```bash
node check-user-status.js
```

## Rollback Plan

If there are issues, the changes can be rolled back by:
1. Removing `plan: 'free'` and `workoutsGenerated: 0` from signup functions
2. Existing users will continue working with fallback logic in the API

## Next Steps

1. ✅ **User registration fix is complete**
2. 🔄 **Run migration script for existing users** (optional)
3. 🧪 **Test complete registration flow** 
4. 🚀 **Deploy to production**

---

## Technical Details

### Code Changes Made:

**Email/Password Signup:**
```tsx
await setDoc(doc(db, "users", user.uid), {
  uid: user.uid,
  email: user.email,
  createdAt: serverTimestamp(),
  profile: {
    plan: 'free',           // ✅ NEW
    workoutsGenerated: 0,   // ✅ NEW
  },
})
```

**Google OAuth Signup:**
```tsx  
await setDoc(doc(db, "users", user.uid), {
  uid: user.uid,
  email: user.email,
  createdAt: serverTimestamp(),
  profile: {
    plan: 'free',           // ✅ NEW
    workoutsGenerated: 0,   // ✅ NEW
  },
}, { merge: true })
```

**Profile Save:**
```tsx
await setDoc(doc(db, "users", currentUser.uid), {
  profile: {
    age: parseInt(age),
    gender,
    goals, 
    experience,
    plan: 'free',           // ✅ NEW
    workoutsGenerated: 0,   // ✅ NEW
  },
}, { merge: true })
```

The fix ensures that all new users start with the proper subscription tracking fields from the moment they create their account.

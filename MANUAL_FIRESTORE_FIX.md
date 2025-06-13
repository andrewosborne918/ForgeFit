# 🚀 QUICK FIX: Manual Firebase Console Update

## Your Issue
Your Firestore user document is missing the `plan` and `workoutsGenerated` fields in the profile object.

## 📍 Current Profile Structure:
```json
{
  "profile": {
    "age": 34,
    "experience": "beginner", 
    "gender": "male",
    "goals": "Lose Weight"
    // ❌ Missing: "plan" and "workoutsGenerated"
  }
}
```

## ✅ Required Profile Structure:
```json
{
  "profile": {
    "age": 34,
    "experience": "beginner",
    "gender": "male", 
    "goals": "Lose Weight",
    "plan": "premium",
    "workoutsGenerated": 0
  }
}
```

## 🔧 STEPS TO FIX:

### 1. Open Firebase Console
- Go to: https://console.firebase.google.com/project/forgefit-k1uia/firestore
- Navigate to **Firestore Database**

### 2. Find Your User Document
- Go to the `users` collection
- Find document with ID: `O3S9uHXiqhMVkEI7X0jTgEE3BDX2`
- Or search by email: `andrewosborne918@gmail.com`

### 3. Edit the Profile Field
- Click on the `profile` field (it's a Map)
- Add these two new fields:

**Add Field 1:**
- Field: `plan`
- Type: `string`
- Value: `premium`

**Add Field 2:**
- Field: `workoutsGenerated` 
- Type: `number`
- Value: `0`

### 4. Add Subscription Metadata (Optional)
At the root level of your user document, also add:

**Add Field:**
- Field: `subscriptionId`
- Type: `string` 
- Value: `manual_subscription_june_2025`

**Add Field:**
- Field: `currentPeriodEnd`
- Type: `timestamp`
- Value: `July 12, 2025` (30 days from now)

### 5. Save and Test
- Click **Update**
- Refresh your profile page
- You should now see **Premium Plan** instead of **Free**

## 🎯 Expected Result
After this fix:
- ✅ Profile page shows "Premium Plan"
- ✅ No workout generation limits
- ✅ No more subscription prompts
- ✅ Unlimited workout access

## ⏱️ Time Required: 2 minutes

This is the fastest way to fix your subscription status!

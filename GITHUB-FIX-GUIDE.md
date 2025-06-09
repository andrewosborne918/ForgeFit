# GitHub Push Protection Fix Guide

## The Problem
GitHub detected Stripe API keys in your repository and is blocking the push for security.

## Quick Fix (Try This First)

1. **Make the script executable and run it:**
   ```bash
   cd /Users/andrewosborne/Documents/Programming/forgefit_Docker
   chmod +x fix-github-push.sh
   ./fix-github-push.sh
   ```

2. **If that works, skip to "Deploy to Vercel" section below**

## If Quick Fix Fails - Advanced Cleanup

The secret might be in your Git history. Run this:

```bash
# Option A: Reset and recommit (safest)
git reset --soft HEAD~5  # Go back 5 commits
git add .
git commit -m "Clean commit: Remove all sensitive data"
git push origin main --force-with-lease

# Option B: Use our cleanup script
chmod +x cleanup-secrets.sh
./cleanup-secrets.sh
git push origin main --force-with-lease
```

## If Still Failing - Use GitHub's Bypass

GitHub provided a bypass link in the error:
https://github.com/andrewosborne918/ForgeFit/security/secret-scanning/unblock-secret/2yHGfMle0FpDb9plqy0VfQhgjzr

Click that link and follow GitHub's instructions to allow the push.

## Deploy to Vercel (Once GitHub Push Works)

### Step 1: Go to Vercel
1. Visit https://vercel.com
2. Sign in with your GitHub account
3. Click "New Project"
4. Import "andrewosborne918/ForgeFit"

### Step 2: Configure Environment Variables
In Vercel dashboard, add these variables:

**Firebase:**
- `NEXT_PUBLIC_FIREBASE_API_KEY` = (your Firebase API key)
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` = forgefit-k1uia.firebaseapp.com
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = forgefit-k1uia
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` = forgefit-k1uia.firebasestorage.app
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` = 1074051143809
- `NEXT_PUBLIC_FIREBASE_APP_ID` = (your Firebase App ID)

**Stripe:**
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = (your live Stripe publishable key)
- `STRIPE_SECRET_KEY` = (your live Stripe secret key)
- `STRIPE_PRICE_ID` = (your Stripe price ID)

**Other:**
- `NEXT_PUBLIC_APP_URL` = https://forgefit.pro
- `NEXT_PUBLIC_GEMINI_API_KEY` = (your Gemini API key)

### Step 3: Deploy
1. Click "Deploy" in Vercel
2. Wait for build to complete (~2-3 minutes)

### Step 4: Add Custom Domain
1. Go to Project Settings → Domains
2. Add "forgefit.pro"
3. Add "www.forgefit.pro"
4. Follow DNS instructions Vercel provides

### Step 5: Configure DNS
At your domain registrar, add:
- **A Record**: @ → 76.76.19.61
- **CNAME**: www → cname.vercel-dns.com

### Step 6: Update Firebase
1. Go to Firebase Console
2. Authentication → Settings → Authorized domains
3. Add "forgefit.pro" and "www.forgefit.pro"

## Test Your Deployment
1. Visit https://forgefit.pro
2. Test user registration/login
3. Test workout creation
4. Test Stripe payment flow

You should be live! 🎉

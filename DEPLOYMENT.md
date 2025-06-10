# Deployment Guide for forgefit.pro

## ⚠️ IMPORTANT: Fix GitHub Push Protection Issue First!

Your Git repository contains sensitive API keys that GitHub is blocking. Follow these steps to fix this:

### Step 1: Clean Up Sensitive Data

We've created cleaned versions of your environment files. Now run this script to remove secrets from Git history:

```bash
# Make script executable and run it
chmod +x fix-git-secrets-safe.sh
./fix-git-secrets-safe.sh
```

This script will:
- Remove `.env.local` and `.env.production` from Git tracking
- Clean up your commit history 
- Prepare your repo for GitHub push

### Step 2: Push to GitHub (After Cleanup)

```bash
# If you chose to rewrite history
git push origin main --force

# If you only cleaned current state  
git push origin main
```

If GitHub still blocks the push, you can use the link in the error message to allow the secret through their web interface.

## Option 1: Deploy via Vercel Web Interface (Recommended)

### Step 1: Prepare Git Repository
```bash
git init
git add .
git commit -m "Initial commit for deployment"
```

### Step 2: Push to GitHub
1. Create a new repository on GitHub named "forgefit"
2. Connect your local repo:
```bash
git remote add origin https://github.com/YOUR_USERNAME/forgefit.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy via Vercel Dashboard
1. Go to https://vercel.com
2. Sign up/Login with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. Configure environment variables (see below)
6. Deploy!

### Step 4: Configure Environment Variables in Vercel
Add these in your Vercel project settings (replace with your actual values):

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_PRICE_ID=your_stripe_price_id_here
NEXT_PUBLIC_APP_URL=https://forgefit.pro
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

**Note:** You can find your actual values in your local `.env.local` file.

### Step 5: Configure Custom Domain
1. In Vercel dashboard, go to Project Settings → Domains
2. Add "forgefit.pro" and "www.forgefit.pro"
3. Follow Vercel's DNS configuration instructions

## Option 2: Deploy via CLI (Alternative)

### Install Vercel CLI
```bash
npm install -g vercel
# or
brew install vercel-cli
```

### Login and Deploy
```bash
vercel login
vercel --prod
```

## DNS Configuration for forgefit.pro

Add these records to your domain registrar:

**A Record:**
- Name: @
- Value: 76.76.19.61

**CNAME Record:**
- Name: www
- Value: cname.vercel-dns.com

## Firebase Configuration Update

Make sure your Firebase project allows your new domain:
1. Go to Firebase Console
2. Authentication → Settings → Authorized domains
3. Add "forgefit.pro" and "www.forgefit.pro"

## Final Checklist
- [ ] Repository pushed to GitHub
- [ ] Vercel project created and deployed
- [ ] Environment variables configured
- [ ] Custom domain added
- [ ] DNS records configured
- [ ] Firebase authorized domains updated
- [ ] SSL certificate active (automatic with Vercel)

# Stripe Subscription Setup Guide

This guide will help you set up the complete Stripe subscription system for ForgeFit.

## 🔧 What's Been Implemented

### ✅ API Routes Created:
- `/api/create-checkout-session` - Creates Stripe checkout sessions
- `/api/stripe-webhook` - Handles Stripe webhook events  
- `/api/create-billing-portal` - Creates billing portal sessions
- Updated `/api/generate-plan` - Adds subscription checks

### ✅ Firebase Admin Setup:
- `src/lib/firebase-admin.ts` - Server-side Firestore access
- User subscription tracking in Firestore

### ✅ Frontend Features:
- Subscription limit modal in dashboard
- Automatic redirect to Stripe checkout
- Workout count tracking and limits
- **Profile page subscription management**
  - View subscription status and workout count
  - Access Stripe billing portal for subscribers
  - Subscribe to Premium directly from profile
  - Next billing date display for active subscriptions

## 🚀 Setup Instructions

### 1. Stripe Account Setup

1. **Create a Stripe Account**: Go to [stripe.com](https://stripe.com) and sign up
2. **Get API Keys**: 
   - Navigate to Developers > API keys
   - Copy your Publishable key (pk_test_...) and Secret key (sk_test_...)
3. **Create a Product**:
   - Go to Products > Add product
   - Name: "ForgeFit Premium"
   - Pricing: $9.99/month recurring
   - Copy the Price ID (price_...)

### 2. Firebase Admin Setup

1. **Service Account Key**:
   - Go to Firebase Console > Project Settings > Service accounts
   - Click "Generate new private key"
   - Download the JSON file
   - Extract: `project_id`, `client_email`, and `private_key`

### 3. Environment Variables

Update your `.env.local` file with:

```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID="your_project_id"
FIREBASE_CLIENT_EMAIL="your_service_account_email@your_project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----"

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PRICE_ID=price_your_stripe_price_id_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# App Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 4. Stripe Webhook Setup

1. **Create Webhook**:
   - Go to Stripe Dashboard > Developers > Webhooks
   - Click "Add endpoint"
   - URL: `https://your-domain.com/api/stripe-webhook`
   - Events to send:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

2. **Get Webhook Secret**:
   - Click on your webhook
   - Copy the signing secret (whsec_...)
   - Add to `STRIPE_WEBHOOK_SECRET` in environment variables

### 5. Testing the System

1. **Build and Run**:
   ```bash
   npm run build
   npm run dev
   ```

2. **Test Workflow**:
   - Generate 3 free workouts
   - Try to generate a 4th workout
   - Should see subscription modal
   - Click "Subscribe Now" to test Stripe checkout

## 📋 How It Works

### Subscription Flow:
1. User generates workouts (tracked in Firestore `workoutCount`)
2. After 3 workouts, if not subscribed, API returns 403 error
3. Frontend shows subscription modal
4. User clicks "Subscribe Now" → redirected to Stripe checkout
5. On successful payment, webhook updates Firestore with subscription status

### Profile Page Management:
- **Subscription Status**: Clear display of Free vs Premium plan
- **Usage Tracking**: Shows workout count (with limit for free users)
- **Billing Access**: Direct link to Stripe billing portal for subscribers
- **Upgrade Option**: Easy subscription signup for free users
- **Billing Dates**: Next billing cycle information for active subscribers

### Firestore User Document Structure:
```javascript
{
  // Existing user data...
  isSubscribed: true/false,
  subscriptionId: "sub_...",
  currentPeriodEnd: Date,
  customerId: "cus_...",
  workoutCount: 5,
  lastWorkoutGenerated: Date
}
```

### Security Features:
- ✅ Webhook signature verification
- ✅ Server-side subscription checking
- ✅ Firebase Admin SDK for secure database access
- ✅ User ID validation in API routes

## 🔍 Troubleshooting

### Common Issues:

1. **Webhook 400 Error**: Check webhook secret matches environment variable
2. **Firebase Admin Error**: Ensure service account key is properly formatted
3. **Stripe API Error**: Verify API keys are for the same account (test/live)
4. **Build Errors**: Run `npm install firebase-admin` if missing

### Testing Webhooks Locally:
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward events to local webhook
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

## 🎯 Next Steps

1. **Deploy to Production**:
   - Update environment variables with live Stripe keys
   - Update webhook URL to production domain
   - Test end-to-end subscription flow

2. **Optional Enhancements**:
   - Add billing portal access in user settings
   - Implement trial periods
   - Add usage analytics
   - Email notifications for subscription events

The subscription system is now ready to use! Users will be limited to 3 free workouts before being prompted to subscribe.

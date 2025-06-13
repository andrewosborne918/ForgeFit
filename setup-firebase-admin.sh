#!/bin/bash

echo "🔧 Firebase Admin SDK Setup Guide"
echo "=================================="
echo ""

echo "1. Open Firebase Console:"
echo "   https://console.firebase.google.com/project/forgefit-k1uia/settings/serviceaccounts/adminsdk"
echo ""

echo "2. Click 'Generate new private key'"
echo ""

echo "3. Download the JSON file and look for these values:"
echo "   - client_email"
echo "   - private_key"
echo ""

echo "4. Update your .env.local file with:"
echo "   FIREBASE_CLIENT_EMAIL=\"[client_email from JSON]\""
echo "   FIREBASE_PRIVATE_KEY=\"[private_key from JSON]\""
echo ""

echo "5. Get Stripe webhook secret:"
echo "   https://dashboard.stripe.com/webhooks"
echo "   Click on your webhook → Signing secret"
echo ""

echo "6. Add to .env.local:"
echo "   STRIPE_WEBHOOK_SECRET=\"whsec_...\""
echo ""

echo "7. Restart your development server:"
echo "   npm run dev"
echo ""

echo "✅ This will fix the webhook permanently!"

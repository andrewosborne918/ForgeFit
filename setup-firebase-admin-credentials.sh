#!/bin/bash

# Firebase Admin Setup Script
# This script helps set up Firebase Admin SDK credentials

echo "🔥 Firebase Admin SDK Setup"
echo "=========================="
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found!"
    echo "Please create .env.local file first."
    exit 1
fi

echo "📋 Current Firebase Admin Configuration:"
echo ""

# Check current values
if grep -q "your_service_account_email" .env.local; then
    echo "❌ FIREBASE_CLIENT_EMAIL: Contains placeholder value"
    NEEDS_EMAIL=true
else
    echo "✅ FIREBASE_CLIENT_EMAIL: Appears to be configured"
    NEEDS_EMAIL=false
fi

if grep -q "your_private_key_here" .env.local; then
    echo "❌ FIREBASE_PRIVATE_KEY: Contains placeholder value"
    NEEDS_KEY=true
else
    echo "✅ FIREBASE_PRIVATE_KEY: Appears to be configured"
    NEEDS_KEY=false
fi

if [ "$NEEDS_EMAIL" = true ] || [ "$NEEDS_KEY" = true ]; then
    echo ""
    echo "🚨 PLACEHOLDER CREDENTIALS DETECTED!"
    echo ""
    echo "This is why workout count tracking is broken and users can generate unlimited workouts."
    echo ""
    echo "To fix this issue:"
    echo ""
    echo "1. 🌐 Go to Firebase Console:"
    echo "   https://console.firebase.google.com/project/forgefit-k1uia/settings/serviceaccounts/adminsdk"
    echo ""
    echo "2. 🔑 Generate new private key:"
    echo "   - Click 'Generate new private key'"
    echo "   - Download the JSON file"
    echo ""
    echo "3. 📝 Update .env.local:"
    echo "   - Replace FIREBASE_CLIENT_EMAIL with the 'client_email' from JSON"
    echo "   - Replace FIREBASE_PRIVATE_KEY with the 'private_key' from JSON"
    echo ""
    echo "4. 🧪 Test the fix:"
    echo "   npm run dev"
    echo "   curl http://localhost:3000/api/test-firebase-admin"
    echo ""
    echo "Example of what the credentials should look like:"
    echo ""
    echo 'FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@forgefit-k1uia.iam.gserviceaccount.com"'
    echo 'FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG...\n-----END PRIVATE KEY-----"'
    echo ""
    echo "⚠️  IMPORTANT: Keep the quotes and \\n characters in the private key!"
else
    echo ""
    echo "✅ Firebase Admin credentials appear to be properly configured!"
    echo ""
    echo "If you're still having issues, test the connection:"
    echo "npm run dev"
    echo "curl http://localhost:3000/api/test-firebase-admin"
fi

echo ""
echo "📚 More help: See FIREBASE_ADMIN_CREDENTIALS_FIX.md"

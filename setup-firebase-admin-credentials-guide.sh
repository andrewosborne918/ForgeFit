#!/bin/bash

# Firebase Admin Service Account Setup Guide
# ========================================

echo "🔥 Firebase Admin Service Account Setup Guide"
echo "=============================================="
echo ""

echo "📋 Step 1: Go to Firebase Console"
echo "   → Visit: https://console.firebase.google.com/"
echo "   → Select your 'forgefit-k1uia' project"
echo ""

echo "🔧 Step 2: Navigate to Service Accounts"
echo "   → Click the gear icon (⚙️) → Project settings"
echo "   → Go to 'Service accounts' tab"
echo "   → Click 'Generate new private key'"
echo ""

echo "💾 Step 3: Download the JSON file"
echo "   → Save the downloaded JSON file (it contains your credentials)"
echo "   → The file will look like: forgefit-k1uia-firebase-adminsdk-xxxxx.json"
echo ""

echo "📝 Step 4: Extract the credentials from the JSON"
echo "   You need these two values from the JSON file:"
echo "   • 'client_email' field"
echo "   • 'private_key' field"
echo ""

echo "🔄 Step 5: Update .env.local"
echo "   Replace these lines in your .env.local file:"
echo "   FIREBASE_CLIENT_EMAIL=\"your_service_account_email@your_project.iam.gserviceaccount.com\""
echo "   FIREBASE_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----\\nyour_private_key_here\\n-----END PRIVATE KEY-----\""
echo ""
echo "   With the actual values from your downloaded JSON:"
echo "   FIREBASE_CLIENT_EMAIL=\"firebase-adminsdk-xxxxx@forgefit-k1uia.iam.gserviceaccount.com\""
echo "   FIREBASE_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\\n-----END PRIVATE KEY-----\""
echo ""

echo "⚠️  IMPORTANT NOTES:"
echo "   • Keep the \\n characters in the private key"
echo "   • Don't share these credentials publicly"
echo "   • Add the JSON file to .gitignore if you download it"
echo ""

echo "🧪 Step 6: Test the configuration"
echo "   Run: node test-firebase-admin.js"
echo "   This will verify your credentials work correctly"
echo ""

echo "🚀 Step 7: Deploy to Vercel"
echo "   Once credentials are working locally, deploy to Vercel"
echo "   Make sure to set the same environment variables in Vercel dashboard"
echo ""

echo "✅ That's it! Your Firebase Admin SDK will be properly configured."

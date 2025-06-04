#!/bin/bash

echo "🚀 ForgeFit Production Deployment Script"
echo "========================================"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo "📋 Pre-deployment checklist:"
echo "✅ Firebase configuration updated"
echo "✅ Environment variables prepared"
echo "✅ Domain: forgefit.pro"
echo ""

echo "🔧 Setting up Vercel environment variables..."
echo "You'll need to run these commands in Vercel CLI or dashboard:"
echo ""
echo "vercel env add NEXT_PUBLIC_FIREBASE_API_KEY"
echo "vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
echo "vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID"
echo "vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
echo "vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
echo "vercel env add NEXT_PUBLIC_FIREBASE_APP_ID"
echo "vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
echo "vercel env add STRIPE_SECRET_KEY"
echo "vercel env add STRIPE_PRICE_ID"
echo "vercel env add NEXT_PUBLIC_GEMINI_API_KEY"
echo ""

echo "🚀 Starting deployment..."
echo "Run: vercel --prod"
echo ""
echo "🌐 After deployment, configure your domain in Vercel dashboard:"
echo "1. Go to your project settings"
echo "2. Add forgefit.pro as a custom domain"
echo "3. Configure DNS records as instructed"
echo ""

# Optional: Start the deployment process
read -p "Start deployment now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Deploying to production..."
    vercel --prod
fi

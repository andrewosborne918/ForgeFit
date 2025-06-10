#!/bin/bash

# Vercel Environment Variables Setup Script
# Run this after installing Vercel CLI: npm install -g vercel

echo "Setting up Vercel environment variables..."
echo "You'll be prompted to enter each value. Get them from your .env file."

# Firebase Configuration
echo "Setting up Firebase environment variables..."
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production

# Gemini API Key
echo "Setting up Gemini API key..."
vercel env add NEXT_PUBLIC_GEMINI_API_KEY production

# Stripe Configuration
echo "Setting up Stripe environment variables..."
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_PRICE_ID production

# App URL
echo "Setting up app URL..."
vercel env add NEXT_PUBLIC_APP_URL production

echo "Environment variables setup complete!"
echo "Remember to also add these variables for 'preview' and 'development' environments if needed."
echo ""
echo "Variable values can be found in your .env file:"
echo "- Firebase config values"
echo "- Gemini API key (get a new one from Google AI Studio if needed)"
echo "- Stripe keys and price ID"
echo "- App URL: https://forgefit.pro"

#!/bin/bash
# Complete GitHub Push Protection Fix Script
# Run this to clean up secrets and push to GitHub

echo "🔒 ForgeFit GitHub Push Protection Fix"
echo "======================================"

# Step 1: Navigate to project directory
cd /Users/andrewosborne/Documents/Programming/forgefit_Docker

# Step 2: Check current status
echo "📋 Current Git status:"
git status

# Step 3: Remove any sensitive files from staging
echo "🧹 Removing sensitive files from staging..."
git reset HEAD .env.local .env.production 2>/dev/null || true

# Step 4: Ensure sensitive files are in .gitignore
echo "🔐 Checking .gitignore..."
if ! grep -q "\.env\*" .gitignore; then
    echo "# Environment files" >> .gitignore
    echo ".env*" >> .gitignore
    echo "!.env.example" >> .gitignore
fi

# Step 5: Remove sensitive files from tracking
echo "🗑️  Removing sensitive files from Git tracking..."
git rm --cached .env.local .env.production 2>/dev/null || true

# Step 6: Create a clean commit
echo "📦 Creating clean commit..."
git add .
git commit -m "Fix: Remove sensitive API keys and add deployment scripts

- Remove .env files with live API keys from tracking
- Add comprehensive deployment scripts for Vercel
- Add Git cleanup utilities
- Prepare for secure production deployment to forgefit.pro"

# Step 7: Try to push
echo "🚀 Attempting to push to GitHub..."
git push origin main

echo ""
echo "✅ If push succeeded, you're ready for deployment!"
echo "❌ If push failed, run the advanced cleanup script:"
echo "   ./cleanup-secrets.sh"
echo ""
echo "Next steps:"
echo "1. Go to https://vercel.com"
echo "2. Import your GitHub repository"
echo "3. Add environment variables"
echo "4. Deploy to forgefit.pro"

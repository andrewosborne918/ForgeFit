#!/bin/bash

# ForgeFit Git Cleanup Script
# This script removes sensitive data from Git history and prepares for GitHub push

echo "🔧 ForgeFit Git Cleanup Script"
echo "==============================="

# Navigate to project directory
cd /Users/andrewosborne/Documents/Programming/forgefit_Docker

echo "📍 Current directory: $(pwd)"

# Check git status
echo "📊 Checking Git status..."
git status

# Remove sensitive files from Git cache (but keep them locally)
echo "🗑️ Removing sensitive files from Git tracking..."
git rm --cached .env.local .env.production 2>/dev/null || echo "Files may not be in cache"

# Add the cleaned files
echo "➕ Adding cleaned environment files..."
git add .env.local .env.production

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo "✅ No changes to commit"
else
    echo "📝 Committing cleaned environment files..."
    git commit -m "Remove sensitive API keys from environment files

- Replace live Stripe keys with placeholders
- Replace live Firebase keys with placeholders  
- Replace live Gemini API keys with placeholders
- Keep .env files as templates for deployment"
fi

# Now we need to clean the history to remove the sensitive data
echo "🧹 Cleaning Git history to remove sensitive data..."

# Use git filter-branch to remove sensitive data from all commits
echo "⚠️  This will rewrite Git history. Make sure you have a backup!"
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted by user"
    exit 1
fi

# Remove sensitive data from all commits
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env.local .env.production' \
  --prune-empty --tag-name-filter cat -- --all

# Clean up
echo "🧽 Cleaning up Git references..."
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "✅ Git history cleaned!"
echo "📤 Ready to push to GitHub"

# Show final status
echo "📊 Final Git status:"
git status

echo ""
echo "🚀 Next steps:"
echo "1. Push to GitHub: git push -u origin main --force"
echo "2. Set up Vercel deployment"
echo "3. Configure environment variables in Vercel"
echo "4. Set up custom domain forgefit.pro"

#!/bin/bash

# ForgeFit Git Cleanup Script - Alternative Method
# This script uses a safer approach to remove sensitive data

echo "🔧 ForgeFit Git Cleanup Script (Safe Method)"
echo "============================================="

# Navigate to project directory
cd /Users/andrewosborne/Documents/Programming/forgefit_Docker

echo "📍 Current directory: $(pwd)"

# Create a list of sensitive strings to remove
echo "📝 Creating list of sensitive patterns..."
cat > sensitive-patterns.txt << 'EOF'
sk_live_51RQeiQIuAapgCNhC*
pk_live_51RQeiQIuAapgCNhC*
AIzaSyABUmSVEWngBS-RPkrqJB1wvpyywdM2xjc
AIzaSyAlVd-8KdKlkLFtqoW7toUvCkR_G3Kxb4Y
price_1RQflrIuAapgCNhC*
EOF

# Method 1: Remove files from current index and commit
echo "🗑️ Method 1: Clean current state..."

# Remove from tracking but keep locally
git rm --cached .env.local .env.production 2>/dev/null || echo "Files not in cache"

# Commit the removal
git add -A
git commit -m "Remove sensitive environment files from tracking

- Remove .env.local and .env.production from Git
- Files remain locally for development
- Use .env.example as template for new environments"

echo "✅ Current state cleaned"

# Method 2: Rewrite history (DANGEROUS - creates new commit hashes)
echo ""
echo "⚠️  WARNING: The next step rewrites Git history!"
echo "   This will change all commit hashes and may cause issues"
echo "   if others have cloned this repository."
echo ""
read -p "Do you want to rewrite history to remove secrets? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 Rewriting Git history..."
    
    # Use git filter-repo if available, otherwise filter-branch
    if command -v git-filter-repo &> /dev/null; then
        echo "Using git-filter-repo (recommended)..."
        git filter-repo --invert-paths --path .env.local --path .env.production --force
    else
        echo "Using git filter-branch..."
        git filter-branch --force --index-filter \
            'git rm --cached --ignore-unmatch .env.local .env.production' \
            --prune-empty --tag-name-filter cat -- --all
        
        # Clean up
        rm -rf .git/refs/original/
        git reflog expire --expire=now --all
        git gc --prune=now --aggressive
    fi
    
    echo "✅ History rewritten"
    echo "⚠️  You'll need to force push: git push origin main --force"
else
    echo "ℹ️  Skipped history rewrite"
    echo "   You can push normally, but GitHub may still detect secrets in history"
fi

# Clean up
rm -f sensitive-patterns.txt

echo ""
echo "📊 Final status:"
git log --oneline -5
git status

echo ""
echo "🚀 Next Steps:"
echo "1. If you rewrote history: git push origin main --force"
echo "2. If you didn't rewrite history: git push origin main"
echo "3. If GitHub still blocks, use their web interface to allow the push"
echo "4. Then proceed with Vercel deployment"

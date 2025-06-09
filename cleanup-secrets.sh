#!/bin/bash

echo "🔒 Cleaning up secrets from Git history..."

# First, let's find which file contains the secret
echo "Finding the file with the secret..."
git rev-list --objects --all | grep 6906dd97d3cd336c737dd04091e8d7cd02d751a5

# Remove the .env.local and .env.production files from Git history
echo "Removing sensitive files from Git history..."

# Use git filter-branch to remove files from history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env.local .env.production' \
  --prune-empty --tag-name-filter cat -- --all

# Clean up the backup refs
echo "Cleaning up backup references..."
git for-each-ref --format='delete %(refname)' refs/original | git update-ref --stdin

# Force garbage collection
echo "Running garbage collection..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "✅ Git history cleaned!"
echo "⚠️  You may need to force push: git push --force-with-lease origin main"
echo "🔥 WARNING: This rewrites Git history. Make sure no one else has cloned this repo!"

#!/bin/bash

echo "🔒 Safe cleanup of secrets from Git history using BFG..."

# First check if BFG is installed
if ! command -v bfg &> /dev/null; then
    echo "Installing BFG Repo-Cleaner..."
    if command -v brew &> /dev/null; then
        brew install bfg
    else
        echo "Please install BFG manually: https://rtyley.github.io/bfg-repo-cleaner/"
        echo "Or use the manual cleanup script: ./cleanup-secrets.sh"
        exit 1
    fi
fi

# Create a patterns file for secrets to remove
echo "Creating patterns file..."
cat > secrets-patterns.txt << EOF
sk_live_*
pk_live_*
sk_test_*
pk_test_*
EOF

# Clone a fresh copy for cleaning
echo "Creating backup and cleaning..."
cd ..
git clone --mirror forgefit_Docker forgefit_Docker-backup

# Clean the backup
cd forgefit_Docker-backup
bfg --replace-text ../forgefit_Docker/secrets-patterns.txt

# Clean up
git reflog expire --expire=now --all && git gc --prune=now --aggressive

echo "✅ Cleaned repository is in ../forgefit_Docker-backup"
echo "📝 Review the changes, then replace your original repo with the cleaned one"

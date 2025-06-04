#!/bin/bash

echo "🚀 ForgeFit Deployment Script"
echo "=============================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Initializing..."
    git init
    git add .
    git commit -m "Initial commit - ForgeFit application ready for deployment"
else
    echo "✅ Git repository found"
fi

# Check if remote is set
if ! git remote get-url origin > /dev/null 2>&1; then
    echo ""
    echo "📋 NEXT STEPS:"
    echo "1. Create a new repository on GitHub named 'forgefit'"
    echo "2. Run: git remote add origin https://github.com/YOUR_USERNAME/forgefit.git"
    echo "3. Run: git branch -M main"
    echo "4. Run: git push -u origin main"
    echo ""
    echo "🌐 VERCEL DEPLOYMENT:"
    echo "5. Go to https://vercel.com"
    echo "6. Sign up/Login with GitHub"
    echo "7. Click 'New Project'"
    echo "8. Import your GitHub repository"
    echo "9. Add environment variables (see DEPLOYMENT.md)"
    echo "10. Deploy!"
    echo ""
    echo "🔧 DOMAIN SETUP:"
    echo "11. In Vercel dashboard: Project Settings → Domains"
    echo "12. Add 'forgefit.pro' and 'www.forgefit.pro'"
    echo "13. Update DNS records as instructed by Vercel"
    echo ""
    echo "🔥 FIREBASE SETUP:"
    echo "14. Firebase Console → Authentication → Settings → Authorized domains"
    echo "15. Add 'forgefit.pro' and 'www.forgefit.pro'"
else
    echo "✅ Git remote configured"
    echo "📤 Pushing to repository..."
    git add .
    git commit -m "Update for production deployment" || echo "No changes to commit"
    git push
fi

echo ""
echo "✅ Deployment preparation complete!"
echo "📖 See DEPLOYMENT.md for detailed instructions"

#!/bin/bash

echo "🔨 Building ForgeFit for deployment test..."
echo "========================================"

cd /Users/andrewosborne/Documents/Programming/forgefit_Docker

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm ci

# Run TypeScript check
echo "🔍 Running TypeScript check..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ TypeScript check passed!"
else
    echo "❌ TypeScript errors found. Please fix them before deployment."
    exit 1
fi

# Run build
echo "🚀 Running Next.js build..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🎉 Your app is ready for Vercel deployment!"
    echo ""
    echo "Next steps:"
    echo "1. Push to GitHub: git push origin main"
    echo "2. Go to https://vercel.com"
    echo "3. Import your GitHub repository"
    echo "4. Add environment variables"
    echo "5. Deploy to forgefit.pro"
else
    echo "❌ Build failed. Check the errors above."
    exit 1
fi

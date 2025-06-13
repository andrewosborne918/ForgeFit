#!/bin/bash

echo "🔍 Testing Anti-Abuse System Build"
echo "==================================="

cd /Users/andrewosborne/Documents/Programming/forgefit_Docker

# Check if all required files exist
echo "1. Checking file structure..."
files=(
  "src/components/AccountDeletion.tsx"
  "src/components/ui/alert.tsx" 
  "src/app/auth/signup/page.tsx"
  "src/app/api/validate-registration/route.ts"
  "src/app/api/record-device-registration/route.ts"
  "src/utils/deviceFingerprint.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file MISSING"
  fi
done

echo ""
echo "2. Testing TypeScript compilation..."
if npx tsc --noEmit --skipLibCheck > /dev/null 2>&1; then
  echo "  ✅ TypeScript compilation successful"
else
  echo "  ❌ TypeScript compilation failed"
  npx tsc --noEmit --skipLibCheck
fi

echo ""
echo "3. Testing Next.js build..."
if npm run build > build.log 2>&1; then
  echo "  ✅ Next.js build successful"
  rm -f build.log
else
  echo "  ❌ Next.js build failed - check build.log"
  tail -20 build.log
fi

echo ""
echo "4. Key components check..."
if grep -q "DeviceFingerprint" src/app/auth/signup/page.tsx; then
  echo "  ✅ Anti-abuse integration in signup"
else
  echo "  ❌ Anti-abuse not integrated in signup"
fi

if grep -q "validate-registration" src/app/auth/signup/page.tsx; then
  echo "  ✅ Registration validation integrated"
else
  echo "  ❌ Registration validation not integrated"
fi

echo ""
echo "Build test completed!"

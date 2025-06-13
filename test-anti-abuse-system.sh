#!/bin/bash

echo "🛡️ Testing ForgeFit Anti-Abuse System"
echo "===================================="
echo ""

# Check if development server is running
echo "1. Checking if development server is running..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Development server is running"
else
    echo "❌ Development server is not running"
    echo "   Please run: npm run dev"
    exit 1
fi

# Test API endpoints
echo ""
echo "2. Testing API endpoints..."

# Test registration validation endpoint
echo "Testing registration validation..."
curl -s -X POST http://localhost:3000/api/validate-registration \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","deviceFingerprint":"test-fingerprint-123"}' \
  | jq '.' || echo "❌ Validation endpoint failed"

# Test anti-abuse stats endpoint
echo ""
echo "Testing anti-abuse stats..."
curl -s http://localhost:3000/api/anti-abuse-stats?days=7 \
  | jq '.' || echo "❌ Stats endpoint failed"

# Test email availability check
echo ""
echo "Testing email availability..."
curl -s -X POST http://localhost:3000/api/check-email-availability \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}' \
  | jq '.' || echo "❌ Email check endpoint failed"

echo ""
echo "3. Testing Firebase Admin connection..."
curl -s http://localhost:3000/api/test-firebase-admin \
  | jq '.' || echo "❌ Firebase Admin test failed"

echo ""
echo "4. Manual Testing Steps:"
echo "   📱 Open http://localhost:3000/auth/signup"
echo "   🔍 Try registering with the same email twice"
echo "   📊 Check http://localhost:3000/admin/anti-abuse for stats"
echo "   🗑️ Test account deletion from profile page"
echo "   🚫 Try registering with a deleted email"

echo ""
echo "5. Expected Behavior:"
echo "   ✅ First registration should work normally"
echo "   ❌ Second registration with same email should be blocked"
echo "   ❌ Registration with deleted email should be blocked"
echo "   📈 Stats should show tracking data"
echo "   🎯 Device fingerprinting should identify repeat devices"

echo ""
echo "🎯 Anti-abuse system test completed!"
echo "Check the browser console for detailed validation logs."

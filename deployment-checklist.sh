#!/bin/bash

echo "🚀 ForgeFit Anti-Abuse System - Production Deployment Checklist"
echo "=============================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_passed=0
check_failed=0

# Function to check status
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        ((check_passed++))
    else
        echo -e "${RED}❌ $2${NC}"
        ((check_failed++))
    fi
}

echo "📋 DEPLOYMENT CHECKLIST"
echo "======================="
echo ""

# 1. Environment Variables
echo "1. Environment Variables:"
if [ -f ".env.local" ]; then
    check_status 0 ".env.local file exists"
    
    # Check for required variables
    if grep -q "FIREBASE_CLIENT_EMAIL" .env.local && ! grep -q "your_service_account_email" .env.local; then
        check_status 0 "Firebase Admin credentials configured"
    else
        check_status 1 "Firebase Admin credentials missing or using placeholders"
    fi
    
    if grep -q "STRIPE_SECRET_KEY" .env.local; then
        check_status 0 "Stripe credentials configured"
    else
        check_status 1 "Stripe credentials missing"
    fi
else
    check_status 1 ".env.local file missing"
fi

echo ""

# 2. API Endpoints
echo "2. API Endpoint Tests:"

# Test if server is running
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    check_status 0 "Development server is running"
    
    # Test Firebase Admin
    response=$(curl -s http://localhost:3000/api/test-firebase-admin)
    if echo "$response" | grep -q '"success":true'; then
        check_status 0 "Firebase Admin SDK working"
    else
        check_status 1 "Firebase Admin SDK not working"
    fi
    
    # Test validation endpoint
    response=$(curl -s -X POST http://localhost:3000/api/validate-registration \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","deviceFingerprint":"test"}' 2>/dev/null)
    if echo "$response" | grep -q '"allowed"'; then
        check_status 0 "Registration validation API working"
    else
        check_status 1 "Registration validation API not working"
    fi
    
    # Test stats endpoint
    response=$(curl -s http://localhost:3000/api/anti-abuse-stats 2>/dev/null)
    if echo "$response" | grep -q '"summary"'; then
        check_status 0 "Anti-abuse stats API working"
    else
        check_status 1 "Anti-abuse stats API not working"
    fi
else
    check_status 1 "Development server not running"
    echo -e "${YELLOW}   Please run: npm run dev${NC}"
fi

echo ""

# 3. File Structure
echo "3. File Structure:"

required_files=(
    "src/app/auth/signup/page.tsx"
    "src/app/api/validate-registration/route.ts"
    "src/app/api/record-device-registration/route.ts"
    "src/app/api/anti-abuse-stats/route.ts"
    "src/app/api/delete-user/route.ts"
    "src/app/api/check-email-availability/route.ts"
    "src/utils/deviceFingerprint.ts"
    "src/components/AccountDeletion.tsx"
    "src/app/(app)/admin/anti-abuse/page.tsx"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        check_status 0 "$file exists"
    else
        check_status 1 "$file missing"
    fi
done

echo ""

# 4. TypeScript Compilation
echo "4. TypeScript Compilation:"
if npm run build > /dev/null 2>&1; then
    check_status 0 "TypeScript compilation successful"
else
    check_status 1 "TypeScript compilation failed"
fi

echo ""

# 5. Security Checks
echo "5. Security Checks:"

# Check for hardcoded secrets
if grep -r "sk_live_" src/ > /dev/null 2>&1; then
    check_status 1 "Hardcoded Stripe live keys found"
else
    check_status 0 "No hardcoded Stripe live keys"
fi

if grep -r "AIzaSy" src/ > /dev/null 2>&1; then
    check_status 1 "Hardcoded Firebase API keys in source"
else
    check_status 0 "No hardcoded Firebase keys in source"
fi

echo ""

# 6. Production Readiness
echo "6. Production Readiness:"

# Check if using development URLs
if grep -r "localhost:3000" src/ > /dev/null 2>&1; then
    check_status 1 "Localhost URLs found in source code"
else
    check_status 0 "No localhost URLs in source code"
fi

# Check for console.log statements (optional warning)
console_logs=$(grep -r "console\.log" src/ | wc -l)
if [ $console_logs -gt 10 ]; then
    echo -e "${YELLOW}⚠️ Many console.log statements found ($console_logs) - consider removing for production${NC}"
else
    check_status 0 "Minimal console.log usage"
fi

echo ""
echo "📊 SUMMARY"
echo "=========="
echo -e "Passed: ${GREEN}$check_passed${NC}"
echo -e "Failed: ${RED}$check_failed${NC}"
echo ""

if [ $check_failed -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSED - READY FOR DEPLOYMENT!${NC}"
    echo ""
    echo "🚀 Next Steps:"
    echo "1. Commit and push changes to repository"
    echo "2. Deploy to production environment"
    echo "3. Update environment variables in production"
    echo "4. Test production deployment"
    echo "5. Monitor anti-abuse dashboard"
else
    echo -e "${RED}⚠️ DEPLOYMENT BLOCKED - $check_failed ISSUES FOUND${NC}"
    echo ""
    echo "🔧 Required Fixes:"
    echo "1. Address all failed checks above"
    echo "2. Re-run this checklist"
    echo "3. Ensure all APIs are working correctly"
fi

echo ""
echo "📖 Additional Resources:"
echo "- Anti-Abuse Documentation: ./ANTI_ABUSE_SYSTEM_COMPLETE.md"
echo "- Testing Guide: ./test-anti-abuse-system.sh"
echo "- Admin Dashboard: http://localhost:3000/admin/anti-abuse"

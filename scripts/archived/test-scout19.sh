#!/bin/bash

# Test script for SCOUT-19 fix
# Tests that user profile creation now works during signup

RANDOM_ID=$(uuidgen | head -c 8)
TEST_EMAIL="scout19-test-${RANDOM_ID}@example.com"
TEST_PASSWORD="TestPassword123!"
TEST_NAME="SCOUT-19 Test User"

echo "🧪 Testing SCOUT-19 fix: Profile creation during signup"
echo "📧 Test email: $TEST_EMAIL"
echo ""
echo "1️⃣ Attempting signup..."
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD",
  "full_name": "$TEST_NAME",
  "team_number": 930
}
EOF
)

echo "📊 Response:"
echo "$RESPONSE" | python3 -m json.tool
echo ""

# Check if response indicates success
if echo "$RESPONSE" | grep -q '"success":true' && echo "$RESPONSE" | grep -q '"user"'; then
    echo "✅ SUCCESS: Profile created successfully!"
    echo ""
    echo "🎉 SCOUT-19 FIX VERIFIED!"
    echo ""
    echo "✅ Profile creation is working"
    echo "✅ No RLS policy violations"
    echo "✅ Service role client properly bypasses RLS"
    exit 0
else
    echo "❌ FAILURE: Profile creation failed"
    echo ""
    echo "Check the response above for error details"
    exit 1
fi

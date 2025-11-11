#!/bin/bash
# Test CORS configuration for BloodHound API

API_HOST="${1:-192.168.1.7}"
API_PORT="${2:-5000}"
API_URL="http://${API_HOST}:${API_PORT}"

echo "========================================="
echo "Testing CORS Configuration"
echo "API URL: ${API_URL}"
echo "========================================="
echo ""

# Test 1: OPTIONS request (preflight)
echo "Test 1: Preflight OPTIONS Request"
echo "---------------------------------"
curl -X OPTIONS "${API_URL}/api/stats" \
  -H "Origin: http://localhost:8000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: X-API-Key" \
  -v 2>&1 | grep -i "access-control"

echo ""
echo ""

# Test 2: Actual GET request with Origin header
echo "Test 2: GET Request with Origin Header"
echo "---------------------------------------"
curl -X GET "${API_URL}/api/stats" \
  -H "Origin: http://localhost:8000" \
  -H "X-API-Key: change_me_in_production" \
  -v 2>&1 | grep -i "access-control"

echo ""
echo ""

# Test 3: Health check
echo "Test 3: Health Check (No CORS headers needed)"
echo "----------------------------------------------"
curl -X GET "${API_URL}/health" \
  -H "X-API-Key: change_me_in_production" \
  -s | python3 -m json.tool 2>/dev/null || echo "Health endpoint response received"

echo ""
echo ""

# Test 4: Full response headers
echo "Test 4: Full Response Headers"
echo "------------------------------"
curl -X GET "${API_URL}/api/stats" \
  -H "Origin: http://localhost:8000" \
  -H "X-API-Key: change_me_in_production" \
  -I 2>&1

echo ""
echo "========================================="
echo "CORS Test Complete"
echo "========================================="
echo ""
echo "Expected Headers:"
echo "  - Access-Control-Allow-Origin: *"
echo "  - Access-Control-Allow-Methods: GET, POST, OPTIONS"
echo "  - Access-Control-Allow-Headers: Content-Type, X-API-Key"
echo ""
echo "If you don't see these headers, CORS is not configured correctly."
echo "See docs/CORS_CONFIGURATION.md for setup instructions."

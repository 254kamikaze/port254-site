#!/bin/bash
# Enable CORS on BloodHound API
# Run this script on your Ubuntu server (192.168.1.7)

set -e

echo "========================================="
echo "BloodHound API - CORS Configuration"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Find API container
echo -e "${YELLOW}Step 1: Locating API container...${NC}"
API_CONTAINER=$(docker ps --filter "name=api" --format "{{.Names}}" | head -1)

if [ -z "$API_CONTAINER" ]; then
    echo -e "${RED}✗ API container not found${NC}"
    echo "Available containers:"
    docker ps --format "{{.Names}}"
    exit 1
fi

echo -e "${GREEN}✓ Found API container: $API_CONTAINER${NC}"
echo ""

# Step 2: Install flask-cors
echo -e "${YELLOW}Step 2: Installing flask-cors...${NC}"
docker exec $API_CONTAINER pip install flask-cors

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ flask-cors installed successfully${NC}"
else
    echo -e "${RED}✗ Failed to install flask-cors${NC}"
    exit 1
fi
echo ""

# Step 3: Backup current app.py
echo -e "${YELLOW}Step 3: Backing up app.py...${NC}"
docker exec $API_CONTAINER cp /app/app.py /app/app.py.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✓ Backup created${NC}"
echo ""

# Step 4: Check if CORS is already configured
echo -e "${YELLOW}Step 4: Checking current CORS configuration...${NC}"
HAS_CORS=$(docker exec $API_CONTAINER grep -c "flask_cors" /app/app.py || echo "0")

if [ "$HAS_CORS" -gt "0" ]; then
    echo -e "${YELLOW}⚠ CORS appears to be already configured${NC}"
    echo "Checking if it's working properly..."
    echo ""
fi

# Step 5: Add CORS configuration
echo -e "${YELLOW}Step 5: Configuring CORS...${NC}"

# Create a Python script to add CORS
cat > /tmp/add_cors.py << 'PYTHON_SCRIPT'
import sys

# Read the original file
with open('/app/app.py', 'r') as f:
    content = f.read()

# Check if CORS is already imported
if 'from flask_cors import CORS' in content:
    print("CORS already configured")
    sys.exit(0)

# Find where to insert CORS import
lines = content.split('\n')
flask_import_line = -1
for i, line in enumerate(lines):
    if 'from flask import' in line or 'import flask' in line:
        flask_import_line = i
        break

if flask_import_line == -1:
    print("Could not find Flask import")
    sys.exit(1)

# Insert CORS import after Flask import
lines.insert(flask_import_line + 1, 'from flask_cors import CORS')

# Find where app is created
app_creation_line = -1
for i, line in enumerate(lines):
    if 'app = Flask(' in line:
        app_creation_line = i
        break

if app_creation_line == -1:
    print("Could not find app creation")
    sys.exit(1)

# Insert CORS configuration after app creation
cors_config = '''
# Configure CORS for cross-origin requests
CORS(app, resources={
    r"/api/*": {
        "origins": "*",  # Allow all origins (development)
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-API-Key"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": False
    }
})
'''

lines.insert(app_creation_line + 1, cors_config)

# Write back
with open('/app/app.py', 'w') as f:
    f.write('\n'.join(lines))

print("CORS configuration added successfully")
PYTHON_SCRIPT

# Copy script to container and run it
docker cp /tmp/add_cors.py $API_CONTAINER:/tmp/add_cors.py
docker exec $API_CONTAINER python3 /tmp/add_cors.py

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ CORS configuration added${NC}"
else
    echo -e "${RED}✗ Failed to add CORS configuration${NC}"
    echo "You may need to edit app.py manually"
    exit 1
fi
echo ""

# Step 6: Restart container
echo -e "${YELLOW}Step 6: Restarting API container...${NC}"
docker restart $API_CONTAINER

echo -e "${GREEN}✓ Container restarted${NC}"
echo ""

# Step 7: Wait for API to come back up
echo -e "${YELLOW}Step 7: Waiting for API to start...${NC}"
sleep 5

# Step 8: Test CORS
echo -e "${YELLOW}Step 8: Testing CORS configuration...${NC}"
CORS_TEST=$(curl -s -I http://localhost:5000/api/stats | grep -i "access-control" || echo "")

if [ -z "$CORS_TEST" ]; then
    echo -e "${RED}✗ CORS headers not found${NC}"
    echo "API might still be starting up. Try manually:"
    echo "  curl -I http://localhost:5000/api/stats | grep -i access-control"
else
    echo -e "${GREEN}✓ CORS is working!${NC}"
    echo "$CORS_TEST"
fi
echo ""

echo "========================================="
echo "Configuration Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Test from Kali: curl -I http://192.168.1.7:5000/api/stats | grep access-control"
echo "2. Open browser: http://localhost:8000/bloodhound.html"
echo "3. You should see live data loading!"
echo ""
echo "If issues persist, check logs:"
echo "  docker logs $API_CONTAINER"
echo ""

#!/bin/bash
# BloodHound Multi-User Upload System - Quick Deployment Script
# Run this on Ubuntu server (192.168.1.7)

set -e

echo "=========================================="
echo "BloodHound Multi-User System Deployment"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
API_CONTAINER=$(docker ps --filter "name=api" --format "{{.Names}}" | head -1)

if [ -z "$API_CONTAINER" ]; then
    echo -e "${RED}✗ API container not found${NC}"
    echo "Available containers:"
    docker ps --format "{{.Names}}"
    exit 1
fi

echo -e "${GREEN}✓ Found API container: $API_CONTAINER${NC}"
echo ""

# Step 1: Backup existing API
echo -e "${YELLOW}Step 1: Backing up existing API...${NC}"
docker exec $API_CONTAINER cp /app/app.py /app/app.py.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo "No existing app.py to backup"
echo -e "${GREEN}✓ Backup complete${NC}"
echo ""

# Step 2: Copy import script
echo -e "${YELLOW}Step 2: Copying multi-database import script...${NC}"
if [ ! -f "/tmp/import_bloodhound_multi_db.py" ]; then
    echo -e "${RED}✗ Import script not found at /tmp/import_bloodhound_multi_db.py${NC}"
    echo "Please copy the file from Kali first:"
    echo "  scp /tmp/import_bloodhound_multi_db.py port254@192.168.1.7:/tmp/"
    exit 1
fi

docker cp /tmp/import_bloodhound_multi_db.py $API_CONTAINER:/app/import_bloodhound_multi_db.py
docker exec $API_CONTAINER chmod +x /app/import_bloodhound_multi_db.py
echo -e "${GREEN}✓ Import script installed${NC}"
echo ""

# Step 3: Install dependencies
echo -e "${YELLOW}Step 3: Installing Python dependencies...${NC}"
docker exec $API_CONTAINER pip install werkzeug 2>&1 | grep -E "(Successfully installed|Requirement already satisfied)" || true
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 4: Create data directories
echo -e "${YELLOW}Step 4: Creating data directories...${NC}"
docker exec $API_CONTAINER mkdir -p /app/data
docker exec $API_CONTAINER mkdir -p /tmp/bloodhound_uploads
docker exec $API_CONTAINER chmod 777 /app/data
docker exec $API_CONTAINER chmod 777 /tmp/bloodhound_uploads
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Step 5: Check if API extensions need to be added
echo -e "${YELLOW}Step 5: Checking API extensions...${NC}"
HAS_UPLOAD=$(docker exec $API_CONTAINER grep -c "/api/upload" /app/app.py 2>/dev/null || echo "0")

if [ "$HAS_UPLOAD" -eq "0" ]; then
    echo -e "${YELLOW}⚠ API extensions NOT found${NC}"
    echo ""
    echo "You need to manually add the API endpoints to app.py:"
    echo "1. Copy /tmp/api_extensions.py from Kali to Ubuntu"
    echo "2. Edit the API container's app.py:"
    echo "   docker exec -it $API_CONTAINER nano /app/app.py"
    echo "3. Add the endpoint code from api_extensions.py"
    echo "4. Save and restart the container"
    echo ""
    read -p "Press Enter when you've added the API extensions..."
else
    echo -e "${GREEN}✓ API extensions already present${NC}"
fi
echo ""

# Step 6: Restart API
echo -e "${YELLOW}Step 6: Restarting API container...${NC}"
docker restart $API_CONTAINER
echo "Waiting for API to start..."
sleep 10
echo -e "${GREEN}✓ API restarted${NC}"
echo ""

# Step 7: Test API
echo -e "${YELLOW}Step 7: Testing API endpoints...${NC}"

# Test basic API
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/stats 2>/dev/null || echo "000")
if [ "$API_RESPONSE" == "401" ] || [ "$API_RESPONSE" == "200" ]; then
    echo -e "${GREEN}✓ API responding (HTTP $API_RESPONSE)${NC}"
else
    echo -e "${RED}✗ API not responding properly (HTTP $API_RESPONSE)${NC}"
fi

# Test databases endpoint
DB_RESPONSE=$(curl -s -H "X-API-Key: change_me_in_production" http://localhost:5000/api/databases 2>/dev/null || echo '{"error":"failed"}')
if echo "$DB_RESPONSE" | grep -q "databases"; then
    echo -e "${GREEN}✓ Databases endpoint working${NC}"
else
    echo -e "${YELLOW}⚠ Databases endpoint may need configuration${NC}"
fi
echo ""

# Step 8: Summary
echo "=========================================="
echo "Deployment Summary"
echo "=========================================="
echo ""
echo -e "${GREEN}✓ Multi-database import script installed${NC}"
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo -e "${GREEN}✓ Data directories created${NC}"
echo -e "${GREEN}✓ API container restarted${NC}"
echo ""
echo "Next Steps:"
echo ""
echo "1. Update Frontend (on Kali):"
echo "   - Add upload UI to bloodhound.html"
echo "   - Copy contents from /tmp/bloodhound_upload_ui.html"
echo ""
echo "2. Test the system:"
echo "   a. Upload a test file via browser"
echo "   b. Verify database appears in selector"
echo "   c. Run queries on uploaded data"
echo ""
echo "3. Security (IMPORTANT):"
echo "   - Change API key from 'change_me_in_production'"
echo "   - Restrict CORS origins"
echo "   - Enable HTTPS"
echo ""
echo "4. Read full documentation:"
echo "   /home/kali/port254-site/docs/BLOODHOUND_MULTI_USER_SETUP.md"
echo ""
echo "Test URL: http://192.168.1.128:8000/bloodhound.html"
echo ""
echo "=========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=========================================="

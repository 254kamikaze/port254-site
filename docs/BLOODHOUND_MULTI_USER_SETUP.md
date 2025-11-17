# BloodHound Multi-User Upload System - Deployment Guide

Complete guide to enable multiple users to upload and analyze separate BloodHound datasets simultaneously.

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│  Browser (bloodhound.html)                   │
│  • Upload Zone                               │
│  • Database Selector                         │
│  • Query Browser                             │
└──────────────┬──────────────────────────────┘
               │ HTTP/REST
               ▼
┌─────────────────────────────────────────────┐
│  Flask API (192.168.1.7:5000)               │
│  • /api/upload                               │
│  • /api/databases                            │
│  • /api/custom-query?database=xxx           │
└──────────────┬──────────────────────────────┘
               │ Bolt Protocol
               ▼
┌─────────────────────────────────────────────┐
│  Neo4j 4.4.30 (Multi-Database)              │
│  ├── bh_contoso_20250811_abc123            │
│  ├── bh_jijistudio_20250907_def456         │
│  └── bh_acme_20250810_ghi789               │
└─────────────────────────────────────────────┘
```

## Features

✅ **Multi-User Support** - Multiple people can upload different domains
✅ **Isolated Databases** - Each upload gets its own Neo4j database
✅ **Legacy Format Support** - Works with SharpHound v1.x
✅ **Modern Format Support** - Works with SharpHound v2.x+ (future)
✅ **Complete ACL Import** - 769+ ACL relationships per domain
✅ **Drag & Drop UI** - User-friendly upload interface
✅ **Database Management** - List, select, and delete databases
✅ **Shared Access** - All users can see and analyze all uploads

## Files Created

1. `/tmp/import_bloodhound_multi_db.py` - Multi-database import script
2. `/tmp/api_extensions.py` - Flask API endpoints to add
3. `/tmp/bloodhound_upload_ui.html` - Frontend upload UI
4. This guide

## Deployment Steps

### Step 1: Deploy Import Script to API Container

```bash
# On Ubuntu server (192.168.1.7)
# SSH into the server
ssh port254@192.168.1.7

# Find the API container
API_CONTAINER=$(docker ps --filter "name=api" --format "{{.Names}}" | head -1)
echo "API Container: $API_CONTAINER"

# Copy the import script from Kali to API container
# First copy to Ubuntu server from Kali
# On Kali:
scp /tmp/import_bloodhound_multi_db.py port254@192.168.1.7:/tmp/

# Back on Ubuntu:
docker cp /tmp/import_bloodhound_multi_db.py $API_CONTAINER:/app/import_bloodhound_multi_db.py

# Verify
docker exec $API_CONTAINER ls -lh /app/import_bloodhound_multi_db.py
```

### Step 2: Update Flask API

```bash
# On Ubuntu server (192.168.1.7)

# Backup current API
docker exec $API_CONTAINER cp /app/app.py /app/app.py.backup.$(date +%Y%m%d)

# Copy API extensions from Kali
# On Kali:
scp /tmp/api_extensions.py port254@192.168.1.7:/tmp/

# On Ubuntu - extract the API code and add to app.py
docker exec $API_CONTAINER bash -c "cat /tmp/api_extensions.py >> /app/app.py"

# OR manually edit app.py to integrate the endpoints
docker exec -it $API_CONTAINER nano /app/app.py
# Then copy the endpoint code from api_extensions.py
```

### Step 3: Install Python Dependencies

```bash
# On Ubuntu server - install required packages in API container

docker exec $API_CONTAINER pip install werkzeug

# Verify neo4j driver is installed
docker exec $API_CONTAINER pip list | grep neo4j
```

### Step 4: Create Data Directory for Metadata

```bash
# On Ubuntu server - create directory for storing database metadata

docker exec $API_CONTAINER mkdir -p /app/data
docker exec $API_CONTAINER chmod 777 /app/data
```

### Step 5: Restart API Container

```bash
# On Ubuntu server

docker restart $API_CONTAINER

# Wait for it to come back up
sleep 10

# Check logs for errors
docker logs $API_CONTAINER --tail 50
```

### Step 6: Update Frontend (bloodhound.html)

```bash
# On Kali - in your port254-site repo

# Open bloodhound.html
nano /home/kali/port254-site/bloodhound.html

# Add the upload UI section from bloodhound_upload_ui.html
# Insert it BEFORE the existing query browser section (around line 200)
# Copy the entire contents of /tmp/bloodhound_upload_ui.html
```

The UI should be inserted here:
```html
<!-- After the navigation and before the query browser -->
<main>
    <div class="container">
        <h1>BloodHound Query Browser</h1>

        <!-- INSERT UPLOAD UI HERE -->
        [Contents of bloodhound_upload_ui.html]

        <!-- Existing query browser continues below -->
        <div class="query-section">
        ...
```

### Step 7: Test the Upload System

```bash
# On Kali - test the API endpoints

# 1. List databases (should be empty initially)
curl -s -H "X-API-Key: change_me_in_production" \
  http://192.168.1.7:5000/api/databases | python3 -m json.tool

# 2. Test with a sample upload (command line)
python3 /tmp/import_bloodhound_multi_db.py \
  /var/run/vmblock-fuse/blockdir/1cJyil/20240907182802_BloodHound.zip \
  bh_test_jijistudio_20250811_test1

# 3. Verify database was created
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: change_me_in_production" \
  -d '{"query":"MATCH (n) RETURN count(n) as nodes", "database":"bh_test_jijistudio_20250811_test1"}' \
  http://192.168.1.7:5000/api/custom-query
```

### Step 8: Test Frontend Upload

```bash
# 1. Open browser to http://192.168.1.128:8000/bloodhound.html

# 2. You should see:
#    - Database selector dropdown at the top
#    - Upload zone with drag & drop

# 3. Test upload flow:
#    a. Drag a BloodHound ZIP file to the upload zone
#    b. Enter engagement name (e.g., "CONTOSO Corp")
#    c. Click "Upload & Import"
#    d. Wait for import to complete
#    e. Verify database appears in selector dropdown
#    f. Select database from dropdown
#    g. Run queries to verify data loaded
```

## Usage Workflow

### For Users - Uploading New Data

1. **Open Dashboard**: Navigate to http://192.168.1.128:8000/bloodhound.html
2. **Upload File**: Drag & drop your BloodHound ZIP file
3. **Name Engagement**: Enter a descriptive name (e.g., "ACME Corp Q4 2024")
4. **Add Description**: Optionally add details about the assessment
5. **Upload**: Click "Upload & Import" and wait for completion
6. **Analyze**: Database auto-selected, start running queries

### For Users - Switching Databases

1. Use the **Database Selector** dropdown at the top
2. Select any previously uploaded engagement
3. Dashboard automatically switches to that data
4. All queries now run against the selected database

### For Admins - Managing Databases

```bash
# List all databases
curl -H "X-API-Key: change_me_in_production" \
  http://192.168.1.7:5000/api/databases

# Get specific database info
curl -H "X-API-Key: change_me_in_production" \
  http://192.168.1.7:5000/api/databases/{DATABASE_ID}

# Delete a database
curl -X DELETE \
  -H "X-API-Key: change_me_in_production" \
  http://192.168.1.7:5000/api/databases/{DATABASE_ID}

# Or use the "Delete" button in the web UI
```

## Database Naming Convention

Format: `bh_{sanitized_name}_{timestamp}_{unique_id}`

Examples:
- `bh_contoso_corp_20250811_143022_a1b2c3d4`
- `bh_jijistudio_20250907_091533_e5f6g7h8`
- `bh_acme_corp_20250810_120045_i9j0k1l2`

## What Gets Imported

For each upload, the system imports:

### Node Types
- ✅ Users (19 properties including SPNs, passwords, logon times)
- ✅ Computers (OS, delegation, LAPS status)
- ✅ Groups (with membership relationships)
- ✅ Domains (functional level, trust info)
- ✅ GPOs (with GUID for linking)
- ✅ OUs (organizational structure)
- ✅ Containers (builtin containers)

### Relationship Types
- ✅ MemberOf (group memberships)
- ✅ GenericAll (117 per domain avg)
- ✅ WriteDacl (87 per domain avg)
- ✅ WriteOwner (87 per domain avg)
- ✅ Owns (58 per domain avg)
- ✅ AdminTo (local admin rights)
- ✅ CanRDP (RDP access)
- ✅ ExecuteDCOM (DCOM rights)
- ✅ CanPSRemote (PSRemoting)
- ✅ AllowedToDelegate (delegation)
- ✅ GpLink (GPO links)
- ✅ Contains (OU/Container hierarchy)

### Typical Import Stats
```
Domains:      1
Users:        19
Computers:    8
Groups:       64
GPOs:         2
OUs:          4
Containers:   22
Memberships:  41
ACLs:         769
Sessions:     0 (if collected)
Delegations:  0 (if present)
```

## Storage Considerations

### Disk Space Per Domain
- **Small domain** (< 100 users): ~50-100MB
- **Medium domain** (100-1000 users): ~100-500MB
- **Large domain** (1000+ users): ~500MB-2GB
- **ZIP file**: Typically 1-50MB

### Cleanup Recommendations

**Manual Cleanup:**
```bash
# List all databases
docker exec -it <neo4j_container> cypher-shell -u neo4j -p bloodhound \
  "SHOW DATABASES"

# Drop old database
docker exec -it <neo4j_container> cypher-shell -u neo4j -p bloodhound \
  "DROP DATABASE bh_old_database_name"
```

**Automated Cleanup (Future Enhancement):**
- Auto-delete databases older than 30 days
- Set storage quota per user
- Archive old databases

## Security Considerations

### Current Security Posture

⚠️ **Development Mode** - The following are NOT secure for production:

1. **API Key**: `change_me_in_production` - CHANGE THIS!
2. **CORS**: Allows all origins (`*`) - RESTRICT THIS!
3. **File Validation**: Basic ZIP check only - ADD MALWARE SCANNING!
4. **No Authentication**: Anyone with API key can upload - ADD USER AUTH!
5. **No Rate Limiting**: Unlimited uploads - ADD RATE LIMITS!

### Production Hardening Checklist

```bash
# 1. Change API key
docker exec $API_CONTAINER bash -c \
  "sed -i 's/change_me_in_production/$(openssl rand -hex 32)/' /app/app.py"

# 2. Restrict CORS (in docker-compose.yml)
CORS_ORIGINS=http://192.168.1.128:8000,http://yourprod.domain.com

# 3. Enable HTTPS
# - Add nginx reverse proxy with SSL
# - Update all http:// to https:// in frontend

# 4. Add file size limits (already in code: 500MB)

# 5. Add malware scanning
docker exec $API_CONTAINER apt-get install clamav
# Scan uploads before importing

# 6. Add user authentication
# - Integrate with existing auth system
# - Track who uploaded what
# - Per-user access control
```

## Troubleshooting

### Problem: Upload fails with "Database creation failed"

**Solution:**
```bash
# Check Neo4j permissions
docker logs <neo4j_container> --tail 100

# Verify multi-database is enabled (4.x+)
curl -u neo4j:bloodhound http://192.168.1.7:7474/
# Check version is 4.4.30

# Try manual database creation
docker exec -it <neo4j_container> cypher-shell -u neo4j -p bloodhound
CREATE DATABASE test_db
```

### Problem: "Import failed: No module named 'neo4j'"

**Solution:**
```bash
# Install neo4j driver in API container
docker exec $API_CONTAINER pip install neo4j
docker restart $API_CONTAINER
```

### Problem: Upload succeeds but database not in list

**Solution:**
```bash
# Check metadata file
docker exec $API_CONTAINER cat /app/data/databases.json

# Verify file permissions
docker exec $API_CONTAINER ls -l /app/data/

# Check API logs
docker logs $API_CONTAINER --tail 100 | grep "database"
```

### Problem: Queries return empty results

**Solution:**
```bash
# Verify database has data
curl -X POST -H "Content-Type: application/json" \
  -H "X-API-Key: change_me_in_production" \
  -d '{"query":"MATCH (n) RETURN count(n)", "database":"your_db_name"}' \
  http://192.168.1.7:5000/api/custom-query

# Check if correct database is selected in UI
# Look in browser console for JavaScript errors
```

### Problem: "Access to fetch blocked by CORS"

**Solution:**
```bash
# Verify CORS is enabled in API
docker exec $API_CONTAINER grep -i "cors" /app/app.py

# Check docker-compose CORS settings
docker exec $API_CONTAINER env | grep CORS

# Update bloodhound.html CSP header if needed
```

## Testing Checklist

Before deploying to production, test:

- [ ] Upload legacy v1.x SharpHound data
- [ ] Upload modern v2.x+ SharpHound data
- [ ] Multiple concurrent uploads
- [ ] Switch between databases
- [ ] Run queries on each database
- [ ] Delete a database
- [ ] Verify isolation (queries don't cross databases)
- [ ] Test with 500MB file
- [ ] Test with malformed ZIP
- [ ] Test API key validation
- [ ] Test without API key (should fail)

## Next Steps / Enhancements

### Phase 2 Features
- [ ] User authentication & authorization
- [ ] Per-user database visibility
- [ ] Search/filter databases
- [ ] Export database back to ZIP
- [ ] Comparison view (diff two domains)
- [ ] Scheduled auto-cleanup
- [ ] Email notifications on upload complete
- [ ] REST API documentation (Swagger)

### Performance Optimizations
- [ ] Import progress streaming (WebSocket)
- [ ] Parallel ACL import
- [ ] Database indexing optimization
- [ ] Query result caching
- [ ] Chunked file upload (for huge files)

## Support

For issues or questions:
1. Check this guide's Troubleshooting section
2. Review API logs: `docker logs <api_container>`
3. Review Neo4j logs: `docker logs <neo4j_container>`
4. Check browser console for JavaScript errors

## Changelog

**2025-01-11** - Initial multi-user upload system
- Multi-database support
- Upload UI with drag & drop
- Database selector
- Legacy v1.x import with full ACL support
- Shared access model

---

🎉 **You now have a fully functional multi-user BloodHound upload system!**

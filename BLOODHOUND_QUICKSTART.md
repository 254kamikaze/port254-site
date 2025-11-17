# BloodHound Integration - Quick Start

## 🚀 Quick Deployment (5 Minutes)

### Step 1: Configure CORS on API

SSH to your BloodHound server:

```bash
ssh user@192.168.1.7

# Quick CORS fix (development):
docker exec -it $(docker ps | grep api | awk '{print $1}') pip install flask-cors

# Edit api/app.py and add at the top:
# from flask_cors import CORS
# CORS(app)

# Restart API:
docker-compose restart api

# Verify CORS is working:
curl -I http://192.168.1.7:5000/api/stats | grep -i access-control
```

### Step 2: Deploy Port254 Site

Option A - Test Locally:
```bash
cd /home/kali/port254-site
python3 -m http.server 8000
```

Option B - Deploy to Server:
```bash
# Copy to web server
scp -r /home/kali/port254-site/* user@192.168.1.7:/var/www/html/
```

### Step 3: Access & Verify

1. Open browser: `http://192.168.1.7:8000/bloodhound.html` (or your server)
2. Connection status should show "Connected" (green)
3. Statistics should populate with numbers
4. Data cards should show AD objects

### Step 4: Import Sample Data (Optional)

If you don't have AD data yet:

```bash
# Generate sample data
python3 scripts/generate_sample_data.py

# Import via BloodHound CE UI at http://192.168.1.7:8080/ui
```

## ✅ Verification

Run the test script:

```bash
cd /home/kali/port254-site
./docs/test_cors.sh 192.168.1.7 5000
```

You should see:
- Access-Control-Allow-Origin: *
- Access-Control-Allow-Methods: GET, POST, OPTIONS
- Access-Control-Allow-Headers: Content-Type, X-API-Key

## 🐛 Troubleshooting

**Problem**: "Connection Error" shown on page

**Solution**:
```bash
# Test API directly
curl http://192.168.1.7:5000/health

# Test CORS
curl -I http://192.168.1.7:5000/api/stats | grep -i access

# If no CORS headers, follow Step 1 again
```

**Problem**: Stats show "-" and don't load

**Solution**:
- Check browser console (F12) for errors
- Verify API key matches: `change_me_in_production`
- Import BloodHound data via UI

## 📚 Full Documentation

See `docs/BLOODHOUND_INTEGRATION_GUIDE.md` for complete details.

## 🔒 Security Notes

For production:
1. Change API key from default
2. Restrict CORS to specific domains
3. Use HTTPS
4. Don't expose API key in client code

## 📁 Files Overview

- `bloodhound.html` - Main BloodHound page
- `js/bloodhound-widget.js` - Widget JavaScript
- `css/bloodhound-widget.css` - Widget styles
- `docs/CORS_CONFIGURATION.md` - CORS setup guide
- `docs/BLOODHOUND_INTEGRATION_GUIDE.md` - Complete integration guide
- `docs/test_cors.sh` - CORS testing script

## 🎯 Next Steps

1. Configure production API key
2. Set up HTTPS
3. Restrict CORS origins
4. Import real BloodHound data
5. Customize refresh interval if needed

---

**Support**: See full documentation or open an issue on GitHub

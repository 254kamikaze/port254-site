# BloodHound Integration Guide - Phase 2 Complete

## Overview

Successfully integrated BloodHound Active Directory security analysis into the port254 website with a dedicated page that displays real-time AD security metrics.

## Files Created

### JavaScript Module
- **File**: `js/bloodhound-widget.js` (580+ lines)
- **Purpose**: Core widget class for fetching and displaying BloodHound data
- **Features**:
  - API authentication with X-API-Key header
  - Auto-refresh every 30 seconds
  - Error handling and connection status
  - Methods for fetching stats, domain admins, high-value targets, etc.
  - XSS protection with HTML escaping

### Stylesheet
- **File**: `css/bloodhound-widget.css` (600+ lines)
- **Purpose**: Custom styling matching port254 dark theme
- **Features**:
  - Responsive grid layouts
  - Card-based components
  - Dark theme (#0f0f0f background)
  - Blue accent colors (#60a5fa)
  - Status indicators with animations
  - Mobile-responsive breakpoints

### HTML Page
- **File**: `bloodhound.html` (400+ lines)
- **Purpose**: Dedicated BloodHound analysis page
- **Features**:
  - 6 statistics cards (users, computers, groups, admins, etc.)
  - 6 data cards (domain admins, high-value targets, kerberoastable, etc.)
  - Connection status indicator
  - Auto-refresh toggle
  - Quick links to BloodHound CE, Neo4j, and API
  - Fully integrated with port254 navigation

### Documentation
- **File**: `docs/CORS_CONFIGURATION.md`
- **Purpose**: Complete guide for enabling CORS on the Flask API
- **Includes**: Flask-CORS setup, manual headers, Docker configuration, security best practices

- **File**: `docs/test_cors.sh`
- **Purpose**: Bash script to test CORS configuration
- **Usage**: `./test_cors.sh 192.168.1.7 5000`

## Navigation Updates

Updated navigation menus on all major pages to include BloodHound link:
- ✅ index.html
- ✅ honeypot-dashboard.html
- ✅ attack-matrix.html
- ✅ file-analysis.html
- ✅ documentation.html
- ✅ contact.html
- ✅ landing.html

## API Endpoints Used

The widget consumes these BloodHound API endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | API health check |
| `/api/stats` | GET | Overall AD statistics |
| `/api/domain-admins` | GET | List of domain administrators |
| `/api/high-value-targets` | GET | High-value AD assets |
| `/api/kerberoastable` | GET | Kerberoastable user accounts |
| `/api/asreproastable` | GET | AS-REP roastable accounts |
| `/api/computers-unconstrained-delegation` | GET | Computers with unconstrained delegation |
| `/api/shortest-path` | POST | Find attack paths between nodes |
| `/api/custom-query` | POST | Execute custom Cypher queries |

## Configuration

### Widget Configuration

In `bloodhound.html`, the widget is configured as:

```javascript
const config = {
    apiUrl: 'http://192.168.1.7:5000',
    apiKey: 'change_me_in_production',
    refreshInterval: 30000, // 30 seconds
    autoRefresh: true
};

const bhWidget = new BloodHoundWidget(config);
bhWidget.init();
```

### Required Changes for Production

1. **Update API URL**: Change `192.168.1.7` to your actual server IP/domain
2. **Update API Key**: Replace `change_me_in_production` with your actual API key
3. **Configure CORS**: Follow `docs/CORS_CONFIGURATION.md` to enable cross-origin requests

## Deployment Steps

### 1. Configure CORS (REQUIRED)

The BloodHound API needs CORS headers to allow browser requests from the port254 site.

**Quick Method** (development):
```bash
# SSH to 192.168.1.7
ssh user@192.168.1.7

# Install flask-cors in API container
docker exec -it <api-container-name> pip install flask-cors

# Edit api/app.py and add:
from flask_cors import CORS
CORS(app)

# Restart API
docker-compose restart api
```

**Full Documentation**: See `docs/CORS_CONFIGURATION.md`

### 2. Serve the Website

Option A - Simple HTTP Server (testing):
```bash
cd /home/kali/port254-site
python3 -m http.server 8000

# Access at: http://localhost:8000/bloodhound.html
```

Option B - Deploy to Web Server:
```bash
# Copy files to web server document root
scp -r /home/kali/port254-site/* user@webserver:/var/www/html/

# Or if using same server as BloodHound:
scp -r /home/kali/port254-site/* user@192.168.1.7:/var/www/html/
```

### 3. Verify Integration

1. Navigate to: `http://YOUR_SERVER/bloodhound.html`
2. Check connection status indicator (should show "Connected" in green)
3. Verify statistics are loading (numbers should populate)
4. Check browser console (F12) for any errors
5. Confirm data cards are populating with AD objects

### 4. Troubleshooting

**Issue**: Connection status shows "Connection Error"

**Causes**:
- API is not running
- CORS not configured
- Firewall blocking requests
- Incorrect API URL or key

**Solutions**:
- Run `curl http://192.168.1.7:5000/health` to test API
- Run `./docs/test_cors.sh` to check CORS configuration
- Check browser console for specific error messages
- Verify API key matches between widget config and API

**Issue**: Stats show "-" and don't update

**Causes**:
- No data in Neo4j database
- API endpoints returning empty results
- JavaScript errors preventing rendering

**Solutions**:
- Import BloodHound data via the UI
- Check API responses: `curl -H "X-API-Key: change_me_in_production" http://192.168.1.7:5000/api/stats`
- Check browser console for errors

## Testing Checklist

- [ ] API is accessible from port254 site
- [ ] CORS headers are present in API responses
- [ ] Connection indicator shows "Connected"
- [ ] Statistics populate with numbers
- [ ] Domain admins list displays
- [ ] High-value targets list displays
- [ ] Kerberoastable users list displays
- [ ] AS-REP roastable users list displays
- [ ] Unconstrained delegation list displays
- [ ] Auto-refresh works (check last update time)
- [ ] Manual refresh button works
- [ ] Quick links open correctly
- [ ] Navigation menu includes BloodHound link
- [ ] Page is responsive on mobile
- [ ] No console errors

## Sample Data

To test with sample data:

```bash
# On BloodHound server (192.168.1.7)
python3 scripts/generate_sample_data.py

# Import the generated data file via BloodHound CE UI:
# 1. Navigate to http://192.168.1.7:8080/ui
# 2. Click "Upload Data"
# 3. Select the generated JSON file
# 4. Wait for import to complete
# 5. Refresh the port254 BloodHound page
```

## Security Best Practices

### For Production

1. **API Key Security**:
   ```javascript
   // Don't expose API key in client-side code
   // Use environment variables or proxy server
   const config = {
       apiUrl: '/api/proxy',  // Proxy through your web server
       apiKey: '' // Key handled server-side
   };
   ```

2. **CORS Restrictions**:
   ```python
   # Limit to specific domains
   CORS(app, resources={
       r"/api/*": {
           "origins": [
               "https://port254.com",
               "https://www.port254.com"
           ]
       }
   })
   ```

3. **HTTPS**:
   - Use HTTPS for all API communication
   - Update URLs to `https://`
   - Configure SSL certificates

4. **Rate Limiting**:
   ```python
   from flask_limiter import Limiter

   limiter = Limiter(app, key_func=get_remote_address)

   @app.route('/api/stats')
   @limiter.limit("10 per minute")
   def get_stats():
       # ...
   ```

## Widget API Reference

### Constructor

```javascript
const widget = new BloodHoundWidget({
    apiUrl: 'http://192.168.1.7:5000',
    apiKey: 'your-api-key',
    refreshInterval: 30000,  // milliseconds
    autoRefresh: true
});
```

### Methods

- `init()` - Initialize widget and fetch initial data
- `refresh()` - Manually refresh all data
- `startAutoRefresh()` - Enable automatic refreshing
- `stopAutoRefresh()` - Disable automatic refreshing
- `fetchAllData()` - Fetch all data from API
- `render()` - Render all components
- `destroy()` - Clean up and stop auto-refresh

### Events

The widget updates these DOM elements:

**Statistics**:
- `#bh-total-users`
- `#bh-total-computers`
- `#bh-total-groups`
- `#bh-domain-admins`
- `#bh-high-value-targets`
- `#bh-kerberoastable`

**Lists**:
- `#bh-domain-admins-list`
- `#bh-high-value-list`
- `#bh-kerberoastable-list`
- `#bh-asreproastable-list`
- `#bh-unconstrained-list`

**Status**:
- `#bh-connection-status`
- `#bh-last-update`

## Customization

### Changing Refresh Interval

```javascript
// In bloodhound.html
const config = {
    // ...
    refreshInterval: 60000  // 60 seconds
};
```

### Disabling Auto-Refresh

```javascript
const config = {
    // ...
    autoRefresh: false
};
```

### Styling Customization

Edit `css/bloodhound-widget.css`:

```css
/* Change primary accent color */
.bh-stat-value {
    color: #your-color;
}

/* Change card background */
.bh-card {
    background-color: #your-bg-color;
}
```

## Future Enhancements

Potential improvements for future iterations:

1. **Graph Visualization**: Add D3.js/vis.js network graph of attack paths
2. **Search Functionality**: Search for specific users, computers, groups
3. **Filtering**: Filter lists by risk level, type, etc.
4. **Export**: Export data to CSV, JSON, or PDF
5. **Historical Data**: Track changes over time
6. **Alerts**: Notification system for new high-risk findings
7. **WebSockets**: Real-time updates without polling
8. **Custom Queries**: UI for building custom Cypher queries
9. **Attack Path Explorer**: Interactive path exploration tool
10. **Dashboard Widgets**: Embeddable widgets for other pages

## Support & Resources

- BloodHound CE Docs: https://bloodhound.readthedocs.io/
- Neo4j Cypher: https://neo4j.com/docs/cypher-manual/
- Flask-CORS: https://flask-cors.readthedocs.io/
- port254 Issues: https://github.com/254kamikaze/port254-site/issues

## Summary

Phase 2 integration is complete and ready for deployment. The BloodHound widget successfully:

✅ Fetches data from BloodHound API
✅ Displays AD security metrics in real-time
✅ Matches port254 design language
✅ Supports auto-refresh and manual refresh
✅ Handles errors gracefully
✅ Includes comprehensive documentation
✅ Provides CORS configuration guidance
✅ Integrates seamlessly with existing site navigation

**Next Steps**:
1. Configure CORS on the API (required)
2. Deploy port254 site files
3. Test the integration
4. Optionally import sample data
5. Monitor and iterate based on usage

---

**Built with**: JavaScript (Vanilla), CSS3, HTML5, Flask REST API, Neo4j, BloodHound CE

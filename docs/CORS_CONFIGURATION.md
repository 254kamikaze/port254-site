# CORS Configuration for BloodHound API

## Overview
To allow the port254 website to access the BloodHound API from a different origin, you need to enable Cross-Origin Resource Sharing (CORS) on the Flask API.

## Required Changes

### 1. Install Flask-CORS

SSH into your Ubuntu VM (192.168.1.7) and install the Flask-CORS package:

```bash
# If using Docker, exec into the API container
docker exec -it <api-container-name> bash

# Install flask-cors
pip install flask-cors

# Or add to requirements.txt
echo "flask-cors==4.0.0" >> api/requirements.txt
```

### 2. Update Flask Application (api/app.py)

Add CORS configuration to your Flask application. Add these lines near the top of your `api/app.py`:

```python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

# Configure CORS
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost",
            "http://localhost:8000",
            "http://localhost:3000",
            "http://192.168.1.7",
            "http://192.168.1.7:8000",
            "http://192.168.1.7:80",
            "file://",  # Allow local file access
            "*"  # Allow all origins (development only)
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-API-Key"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": False
    }
})
```

### 3. Alternative: Manual CORS Headers

If you don't want to use Flask-CORS, you can add CORS headers manually:

```python
from flask import Flask, jsonify, request

app = Flask(__name__)

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,X-API-Key')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

# Handle OPTIONS requests
@app.route('/api/<path:path>', methods=['OPTIONS'])
def options_handler(path):
    response = jsonify({'status': 'ok'})
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,X-API-Key')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response
```

### 4. Update docker-compose.yml (if using Docker)

Update the API service in `docker-compose.yml` to rebuild with new requirements:

```yaml
services:
  api:
    build: ./api
    environment:
      - FLASK_ENV=development
      - CORS_ALLOWED_ORIGINS=*
    ports:
      - "5000:5000"
    depends_on:
      - neo4j
    restart: unless-stopped
```

### 5. Rebuild and Restart

```bash
# Stop the API container
docker-compose stop api

# Rebuild with new dependencies
docker-compose build api

# Start the API container
docker-compose up -d api

# Check logs
docker-compose logs -f api
```

## Testing CORS Configuration

Test that CORS is working correctly:

```bash
# Test from command line
curl -X OPTIONS http://192.168.1.7:5000/api/stats \
  -H "Origin: http://localhost:8000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: X-API-Key" \
  -v

# Should see these headers in response:
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Methods: GET,POST,OPTIONS
# Access-Control-Allow-Headers: Content-Type,X-API-Key
```

## Security Considerations

### For Production:

1. **Restrict Origins**: Replace `*` with specific allowed domains:
   ```python
   "origins": [
       "https://port254.com",
       "https://www.port254.com"
   ]
   ```

2. **Use Environment Variables**:
   ```python
   import os

   allowed_origins = os.getenv('CORS_ALLOWED_ORIGINS', '').split(',')

   CORS(app, resources={
       r"/api/*": {
           "origins": allowed_origins,
           # ...
       }
   })
   ```

3. **Keep API Key Secret**: Don't expose the API key in client-side code. Consider:
   - Using a proxy server
   - Implementing OAuth2/JWT authentication
   - Using environment-specific API keys

## Quick Fix (Development Only)

For quick testing, you can use this one-liner in your Flask app:

```python
from flask_cors import CORS
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
```

## Verification

Once CORS is configured, verify it's working:

1. Open browser DevTools (F12)
2. Navigate to http://192.168.1.7/bloodhound.html (or wherever you're serving the site)
3. Check the Console tab for any CORS errors
4. Check the Network tab and look at the response headers for API requests
5. You should see `Access-Control-Allow-Origin` in the response headers

## Troubleshooting

### Error: "CORS policy: No 'Access-Control-Allow-Origin' header"

- CORS is not configured on the API
- API server didn't restart after changes
- Firewall blocking preflight OPTIONS requests

### Error: "CORS policy: Request header field X-API-Key is not allowed"

- Need to add `X-API-Key` to `Access-Control-Allow-Headers`

### Error: "CORS policy: Credentials mode is include"

- Set `supports_credentials: True` in CORS config
- Or remove credentials from fetch requests

## Nginx Proxy Alternative

If you're using Nginx as a reverse proxy, you can add CORS headers there instead:

```nginx
location /api/ {
    proxy_pass http://localhost:5000/api/;

    # CORS headers
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, X-API-Key' always;

    if ($request_method = 'OPTIONS') {
        return 204;
    }
}
```

## Complete Example

Here's a complete minimal Flask API with CORS:

```python
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)

# Enable CORS
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-API-Key"]
    }
})

@app.route('/api/stats')
def get_stats():
    return jsonify({
        'total_users': 150,
        'total_computers': 50,
        'total_groups': 30
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

## Next Steps

1. Apply CORS configuration to your API
2. Restart the API service
3. Test the BloodHound dashboard at http://192.168.1.7/bloodhound.html
4. Check browser console for any remaining errors
5. For production: Lock down CORS to specific origins

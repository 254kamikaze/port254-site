# Quick Deploy - Multi-User BloodHound Upload (Manual Steps)

## ✅ What's Already Done on Ubuntu

Your Ubuntu server (192.168.1.7) already has:
- ✓ Multi-database import script installed (`/app/import_bloodhound_multi_db.py`)
- ✓ Python dependencies installed (werkzeug)
- ✓ Data directories created (`/app/data`, `/tmp/bloodhound_uploads`)

## 🚀 Finish Setup in 2 Minutes

### Step 1: Add API Endpoints (on Ubuntu)

SSH into Ubuntu:
```bash
ssh port254@192.168.1.7
# Password: Mandazi457!
```

Run this ONE command:
```bash
docker exec bloodhound-api bash -c 'cat >> /app/app.py << '\''EOF'\''

# Multi-User Upload System
import os, json, uuid
from datetime import datetime
from werkzeug.utils import secure_filename

UPLOAD_FOLDER = "/tmp/bloodhound_uploads"
METADATA_FILE = "/app/data/databases.json"

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() == "zip"

def load_metadata():
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, "r") as f:
            return json.load(f)
    return []

def save_metadata(metadata):
    with open(METADATA_FILE, "w") as f:
        json.dump(metadata, f, indent=2)

@app.route("/api/upload", methods=["POST"])
def upload_bloodhound():
    api_key = request.headers.get("X-API-Key")
    if not api_key or api_key != API_KEY:
        return jsonify({"error": "Unauthorized"}), 401
    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400
    file = request.files["file"]
    if not file.filename or not allowed_file(file.filename):
        return jsonify({"error": "Invalid file"}), 400
    engagement_name = request.form.get("name", "").strip()
    if not engagement_name:
        return jsonify({"error": "Name required"}), 400
    description = request.form.get("description", "").strip()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    db_id = str(uuid.uuid4())[:8]
    sanitized = "".join(c if c.isalnum() else "_" for c in engagement_name.lower())
    database_name = f"bh_{sanitized}_{timestamp}_{db_id}"
    filename = secure_filename(file.filename)
    upload_id = str(uuid.uuid4())
    upload_path = os.path.join(UPLOAD_FOLDER, f"{upload_id}_{filename}")
    try:
        file.save(upload_path)
        file_size = os.path.getsize(upload_path)
        if file_size > 500*1024*1024:
            os.remove(upload_path)
            return jsonify({"error": "File too large"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    try:
        import sys
        sys.path.insert(0, "/app")
        from import_bloodhound_multi_db import import_from_zip
        result = import_from_zip(upload_path, os.getenv("NEO4J_URI", "bolt://neo4j:7687"), os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASS", "bloodhound"), database_name)
        if not result["success"]:
            os.remove(upload_path)
            return jsonify({"error": "Import failed", "details": result.get("error")}), 500
        metadata = load_metadata()
        metadata.append({"id": upload_id, "database_name": database_name, "engagement_name": engagement_name, "description": description, "uploaded_at": datetime.now().isoformat(), "file_size": file_size, "stats": result["stats"], "original_filename": filename})
        save_metadata(metadata)
        os.remove(upload_path)
        return jsonify({"success": True, "database": database_name, "id": upload_id, "stats": result["stats"]}), 200
    except Exception as e:
        if os.path.exists(upload_path):
            os.remove(upload_path)
        import traceback
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

@app.route("/api/databases", methods=["GET"])
def list_databases():
    api_key = request.headers.get("X-API-Key")
    if not api_key or api_key != API_KEY:
        return jsonify({"error": "Unauthorized"}), 401
    metadata = load_metadata()
    metadata.sort(key=lambda x: x.get("uploaded_at", ""), reverse=True)
    return jsonify({"databases": metadata}), 200

@app.route("/api/databases/<database_id>", methods=["DELETE"])
def delete_database(database_id):
    api_key = request.headers.get("X-API-Key")
    if not api_key or api_key != API_KEY:
        return jsonify({"error": "Unauthorized"}), 401
    metadata = load_metadata()
    db = next((d for d in metadata if d["id"] == database_id), None)
    if not db:
        return jsonify({"error": "Not found"}), 404
    try:
        from neo4j import GraphDatabase
        driver = GraphDatabase.driver(os.getenv("NEO4J_URI", "bolt://neo4j:7687"), auth=(os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASS", "bloodhound")))
        with driver.session(database="system") as session:
            session.run(f"DROP DATABASE `{db['\''database_name'\'']}` IF EXISTS")
        driver.close()
        metadata = [d for d in metadata if d["id"] != database_id]
        save_metadata(metadata)
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

EOF
'
```

Restart API:
```bash
docker restart bloodhound-api
sleep 10
```

Test it:
```bash
curl -H "X-API-Key: change_me_in_production" http://localhost:5000/api/databases
```

You should see: `{"databases":[]}`

**Done on Ubuntu!**  Exit SSH.

---

### Step 2: Update Frontend (on Kali)

The upload UI is ready at: `/tmp/bloodhound_upload_ui.html`

I'll add it to your bloodhound.html now...

EOF


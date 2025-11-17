#!/bin/bash
# COPY THIS ENTIRE SCRIPT AND PASTE IT ON UBUNTU SERVER
# SSH to: port254@192.168.1.7
# Then paste this entire thing and press Enter

echo "===== Adding BloodHound Upload Endpoints ====="
echo ""

# Add the API endpoints to app.py
docker exec bloodhound-api bash -c 'cat >> /app/app.py << '\''ENDPOINTS'\''

# Multi-User Upload System
import os, json, uuid
from datetime import datetime
from werkzeug.utils import secure_filename

UPLOAD_FOLDER = "/tmp/bloodhound_uploads"
METADATA_FILE = "/app/data/databases.json"

def allowed_file(f):
    return "." in f and f.rsplit(".", 1)[1].lower() == "zip"

def load_metadata():
    return json.load(open(METADATA_FILE)) if os.path.exists(METADATA_FILE) else []

def save_metadata(m):
    json.dump(m, open(METADATA_FILE, "w"), indent=2)

@app.route("/api/upload", methods=["POST"])
def upload_bloodhound():
    if request.headers.get("X-API-Key") != API_KEY:
        return jsonify({"error": "Unauthorized"}), 401
    if "file" not in request.files or not (file := request.files["file"]).filename:
        return jsonify({"error": "No file"}), 400
    if not allowed_file(file.filename) or not (name := request.form.get("name", "").strip()):
        return jsonify({"error": "Invalid"}), 400
    ts, db_id = datetime.now().strftime("%Y%m%d_%H%M%S"), str(uuid.uuid4())[:8]
    db_name = f"bh_{''.join(c if c.isalnum() else '_' for c in name.lower())}_{ts}_{db_id}"
    uid = str(uuid.uuid4())
    path = os.path.join(UPLOAD_FOLDER, f"{uid}_{secure_filename(file.filename)}")
    try:
        file.save(path)
        if os.path.getsize(path) > 500*1024*1024:
            os.remove(path)
            return jsonify({"error": "Too large"}), 400
        import sys
        sys.path.insert(0, "/app")
        from import_bloodhound_multi_db import import_from_zip
        result = import_from_zip(path, os.getenv("NEO4J_URI", "bolt://neo4j:7687"), os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASS", "bloodhound"), db_name)
        if not result["success"]:
            os.remove(path)
            return jsonify({"error": result.get("error")}), 500
        m = load_metadata()
        m.append({"id": uid, "database_name": db_name, "engagement_name": name, "description": request.form.get("description", ""), "uploaded_at": datetime.now().isoformat(), "file_size": os.path.getsize(path), "stats": result["stats"], "original_filename": file.filename})
        save_metadata(m)
        os.remove(path)
        return jsonify({"success": True, "database": db_name, "id": uid, "stats": result["stats"]}), 200
    except Exception as e:
        if os.path.exists(path):
            os.remove(path)
        import traceback
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

@app.route("/api/databases", methods=["GET"])
def list_databases():
    if request.headers.get("X-API-Key") != API_KEY:
        return jsonify({"error": "Unauthorized"}), 401
    m = load_metadata()
    m.sort(key=lambda x: x.get("uploaded_at", ""), reverse=True)
    return jsonify({"databases": m}), 200

@app.route("/api/databases/<db_id>", methods=["DELETE"])
def delete_database(db_id):
    if request.headers.get("X-API-Key") != API_KEY:
        return jsonify({"error": "Unauthorized"}), 401
    m = load_metadata()
    if not (db := next((d for d in m if d["id"] == db_id), None)):
        return jsonify({"error": "Not found"}), 404
    try:
        from neo4j import GraphDatabase
        driver = GraphDatabase.driver(os.getenv("NEO4J_URI", "bolt://neo4j:7687"), auth=(os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASS", "bloodhound")))
        with driver.session(database="system") as s:
            s.run(f"DROP DATABASE `{db['\''database_name'\'']}` IF EXISTS")
        driver.close()
        save_metadata([d for d in m if d["id"] != db_id])
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

ENDPOINTS
'

echo ""
echo "✓ Endpoints added to app.py"
echo ""
echo "Restarting API container..."
docker restart bloodhound-api

echo ""
echo "Waiting 15 seconds for API to start..."
sleep 15

echo ""
echo "Testing endpoints..."
curl -s -H "X-API-Key: change_me_in_production" http://localhost:5000/api/databases

echo ""
echo ""
echo "===== DONE ====="
echo ""
echo "If you see {\"databases\":[]}, it's working!"
echo "Now test in browser: http://192.168.1.128:8000/bloodhound.html"

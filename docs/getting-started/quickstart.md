# Quick Start

Get CodeAtlas running in under 2 minutes.

## 1. Start the Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

## 2. Start the Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

## 3. Analyze a Repository

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Option A: GitHub URL

1. Paste a public GitHub repository URL into the input field
2. Click **Parse**
3. Wait for the analysis to complete

### Option B: ZIP Upload

1. Drag and drop a `.zip` file onto the upload area (or click to browse)
2. Wait for the analysis to complete

## 4. Explore the Graph

Once analysis completes, you'll see an interactive graph:

- **Blue rectangles** — Modules (files)
- **Green diamonds** — Classes
- **Orange circles** — Functions
- **Gray rectangles** (dashed) — External dependencies

**Interactions:**

- **Click** a node to see its file path and line number
- **Scroll** to zoom in/out
- **Drag** to pan the view
- **Drag a node** to reposition it

## Using the API Directly

You can also interact with the backend API without the frontend:

```bash
# Analyze a GitHub repo
curl -X POST http://localhost:8000/api/ingest/github \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/pallets/click"}'

# Response:
# {"project_id": "abc-123", "status": "ready", "node_count": 45, "edge_count": 67}

# Fetch the graph
curl http://localhost:8000/api/graph/abc-123
```

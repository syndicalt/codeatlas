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
3. Wait for the progress bar to complete (processing happens in the background)

### Option B: ZIP Upload

1. Drag and drop a `.zip` file onto the upload area (or click to browse)
2. Wait for processing to complete

### Option C: Demo Project

1. Click **Try Demo Project** to load a pre-built sample
2. Instantly explore a small Python project graph

## 4. Explore the Graph

Once analysis completes, you'll see the dashboard with a graph canvas and detail panel:

**Node Types:**

- **Blue rectangles** — Modules (files)
- **Green diamonds** — Classes
- **Orange circles** — Functions
- **Gray rectangles** (dashed) — External dependencies

**Edge Types:**

- **Gray solid** — Contains (module → class/function)
- **Blue dashed** — Imports
- **Purple solid** — Inherits
- **Pink dotted** — Calls

**Interactions:**

- **Click** a node to see details in the right panel (file, line, connections)
- **Scroll** to zoom in/out
- **Drag** to pan the view or reposition nodes
- **Search** by name in the toolbar — matching nodes highlight, others dim
- **Filter** by type (module/class/function/external) via the dropdown
- **Scope** toggle (All/Internal/External) to filter dependencies
- **Export** as PNG or JSON using the toolbar buttons
- **Hide/Show** the detail panel with the panel toggle

## 5. Using the API Directly

```bash
# Analyze a GitHub repo (returns immediately, processes in background)
curl -X POST http://localhost:8000/api/ingest/github \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/pallets/click"}'

# Response:
# {"project_id": "abc-123", "status": "processing"}

# Poll for completion
curl http://localhost:8000/api/ingest/status/abc-123

# Fetch the graph
curl http://localhost:8000/api/graph/abc-123

# Search for nodes
curl "http://localhost:8000/api/graph/abc-123/search?q=parse&type=function"

# Filter to internal dependencies only
curl "http://localhost:8000/api/graph/abc-123/filter?scope=internal"

# Get call chain for a function
curl "http://localhost:8000/api/graph/abc-123/callchain/func:src/main.py:run?direction=callees&depth=5"

# Load demo project
curl -X POST http://localhost:8000/api/ingest/demo
```

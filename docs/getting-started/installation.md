# Installation

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.10+ | Backend server |
| Node.js | 18+ | Frontend dev server |
| Git | 2.x | Cloning repositories |

## Clone the Repository

```bash
git clone https://github.com/codeatlas/codeatlas.git
cd codeatlas
```

## Backend Setup

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

=== "Linux / macOS"

    ```bash
    source .venv/bin/activate
    ```

=== "Windows"

    ```bash
    .venv\Scripts\activate
    ```

Install dependencies:

```bash
pip install -r requirements.txt
```

### Verify Installation

```bash
python -m uvicorn app.main:app --reload
```

Visit [http://localhost:8000/docs](http://localhost:8000/docs) to see the auto-generated API documentation.

## Frontend Setup

```bash
cd frontend
npm install
```

### Start the Dev Server

```bash
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) to open CodeAtlas.

## Troubleshooting

### `uvicorn: command not found`

Use `python -m uvicorn` instead. This happens when pip installs scripts to a directory not on your system PATH.

### Tree-sitter compatibility errors

CodeAtlas requires `tree-sitter <0.23` for compatibility with `tree-sitter-languages`. If you see `TypeError: __init__() takes exactly 1 argument`, run:

```bash
pip install "tree-sitter>=0.21,<0.23"
```

### CORS errors in browser

Make sure the backend is running on port 8000. The Vite dev server proxies `/api` requests to `http://localhost:8000` automatically.

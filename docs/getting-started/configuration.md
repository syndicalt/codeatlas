# Configuration

CodeAtlas is configured via environment variables prefixed with `CODEATLAS_`.

## Backend Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `CODEATLAS_UPLOAD_DIR` | `tmp/uploads` | Directory for cloned repos and extracted ZIPs |
| `CODEATLAS_MAX_UPLOAD_SIZE_MB` | `500` | Maximum upload file size in megabytes |
| `CODEATLAS_MAX_FILE_COUNT` | `2000` | Maximum number of source files to parse per project |
| `CODEATLAS_CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed CORS origins (JSON array) |

### Setting Variables

=== "Shell"

    ```bash
    export CODEATLAS_UPLOAD_DIR=/tmp/codeatlas
    export CODEATLAS_MAX_FILE_COUNT=5000
    python -m uvicorn app.main:app --reload
    ```

=== ".env file"

    Create a `.env` file in the `backend/` directory:

    ```env
    CODEATLAS_UPLOAD_DIR=/tmp/codeatlas
    CODEATLAS_MAX_FILE_COUNT=5000
    ```

## Supported Languages

| Language | Extensions | Parser |
|----------|------------|--------|
| Python | `.py` | `python_parser.py` |
| JavaScript | `.js`, `.jsx` | `js_ts_parser.py` |
| TypeScript | `.ts`, `.tsx` | `js_ts_parser.py` |
| Java | `.java` | `java_parser.py` |

Additional languages can be added by implementing a new parser in `backend/app/services/parsers/`. See the [Contributing Guide](../development/contributing.md) for details.

## Skipped Directories

The following directories are automatically excluded from parsing:

`node_modules`, `.git`, `__pycache__`, `venv`, `.venv`, `dist`, `build`, `.tox`, `.mypy_cache`, `.pytest_cache`, `env`, `.env`

## Frontend Configuration

The frontend uses Vite's proxy to forward API calls. In production, set the API base URL:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` (proxied) | Backend API base URL |

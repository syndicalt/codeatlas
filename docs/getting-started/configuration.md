# Configuration

CodeAtlas is configured via environment variables prefixed with `CODEATLAS_`. Copy `.env.example` to `backend/.env` to get started.

## Environment Variables

### Core Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `CODEATLAS_UPLOAD_DIR` | `tmp/uploads` | Directory for cloned repos and extracted ZIPs |
| `CODEATLAS_MAX_UPLOAD_SIZE_MB` | `500` | Maximum upload file size in megabytes |
| `CODEATLAS_MAX_FILE_COUNT` | `2000` | Maximum number of source files to parse per project |
| `CODEATLAS_CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed CORS origins (JSON array) |
| `CODEATLAS_DATABASE_PATH` | `codeatlas.db` | SQLite database file path |

### Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `CODEATLAS_GITHUB_CLIENT_ID` | | GitHub OAuth app client ID |
| `CODEATLAS_GITHUB_CLIENT_SECRET` | | GitHub OAuth app client secret |
| `CODEATLAS_GOOGLE_CLIENT_ID` | | Google OAuth app client ID |
| `CODEATLAS_GOOGLE_CLIENT_SECRET` | | Google OAuth app client secret |
| `CODEATLAS_JWT_SECRET` | (auto-generated) | Secret for signing JWT tokens |
| `CODEATLAS_JWT_EXPIRY_HOURS` | `168` (7 days) | JWT token expiry duration |
| `CODEATLAS_ENCRYPTION_KEY` | (auto-generated) | Fernet key for encrypting stored API keys |
| `CODEATLAS_FRONTEND_URL` | `http://localhost:5173` | Frontend URL for OAuth callback redirects |

**Important:** If `JWT_SECRET` or `ENCRYPTION_KEY` are left empty, they are auto-generated on startup. This means stored API keys become unreadable after a backend restart. For production, generate stable values and persist them in `.env`.

### AI / LLM

| Variable | Default | Description |
|----------|---------|-------------|
| `CODEATLAS_ANTHROPIC_API_KEY` | | Server-level fallback API key (optional) |
| `CODEATLAS_RAG_LLM_MODEL` | `claude-sonnet-4-20250514` | Default model when using server key |
| `CODEATLAS_EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Sentence-transformers model for vector embeddings |

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `CODEATLAS_RATE_LIMIT_DEFAULT` | `60/minute` | Default rate limit |
| `CODEATLAS_RATE_LIMIT_INGEST` | `10/minute` | Rate limit for ingestion endpoints |
| `CODEATLAS_RATE_LIMIT_RAG` | `20/minute` | Rate limit for AI query endpoints |

### Neo4j (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `CODEATLAS_USE_NEO4J` | `false` | Enable Neo4j for persistent graph storage |
| `CODEATLAS_NEO4J_URI` | `bolt://localhost:7687` | Neo4j connection URI |
| `CODEATLAS_NEO4J_USER` | `neo4j` | Neo4j username |
| `CODEATLAS_NEO4J_PASSWORD` | | Neo4j password |

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
    CODEATLAS_GITHUB_CLIENT_ID=your-id
    CODEATLAS_GITHUB_CLIENT_SECRET=your-secret
    CODEATLAS_ENCRYPTION_KEY=your-fernet-key
    CODEATLAS_JWT_SECRET=your-jwt-secret
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

The frontend uses Vite's proxy to forward API calls to the backend during development. In a Docker/production deploy, the backend serves the built frontend as static files.

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` (proxied) | Backend API base URL |

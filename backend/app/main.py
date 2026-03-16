import shutil
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.middleware.rate_limit import limiter
from app.routers import auth, graph, history, ingest, rag, share, user, ws
from app.services.database import close_db, init_db
from app.services.graph_store import close_graph_store, init_graph_store
from app.services.plugin_registry import registry


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    await init_db()
    await init_graph_store()

    # Discover parser plugins
    plugin_path = Path(settings.plugin_dir)
    if not plugin_path.is_absolute():
        plugin_path = Path(__file__).parent / settings.plugin_dir
    registry.discover_plugins(plugin_path)

    yield
    await close_graph_store()
    await close_db()
    if settings.upload_dir.exists():
        shutil.rmtree(settings.upload_dir, ignore_errors=True)


app = FastAPI(title="CodeAtlas", version="0.1.0", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router, prefix="/api/ingest", tags=["ingest"])
app.include_router(graph.router, prefix="/api/graph", tags=["graph"])
app.include_router(history.router, prefix="/api/history", tags=["history"])
app.include_router(rag.router, prefix="/api/rag", tags=["rag"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(user.router, prefix="/api/user", tags=["user"])
app.include_router(ws.router, prefix="/api", tags=["websocket"])
app.include_router(share.router, prefix="/api/share", tags=["share"])


@app.get("/health")
async def health():
    return {"status": "ok"}


# Serve frontend static files if the `static` directory exists (combined Docker deploy)
_static_dir = Path(__file__).parent.parent / "static"
if _static_dir.is_dir():
    app.mount("/assets", StaticFiles(directory=_static_dir / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        """Serve the frontend SPA for any non-API route."""
        file_path = _static_dir / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(_static_dir / "index.html")

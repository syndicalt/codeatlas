import shutil
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, graph, history, ingest, rag, user
from app.services.database import close_db, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    await init_db()
    yield
    await close_db()
    if settings.upload_dir.exists():
        shutil.rmtree(settings.upload_dir, ignore_errors=True)


app = FastAPI(title="CodeAtlas", version="0.1.0", lifespan=lifespan)

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


@app.get("/health")
async def health():
    return {"status": "ok"}

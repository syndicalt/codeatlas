import tempfile
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    upload_dir: Path = Path(tempfile.gettempdir()) / "codeatlas_uploads"
    max_upload_size_mb: int = 500
    max_file_count: int = 2000
    allowed_extensions: set[str] = {".py", ".js", ".ts", ".tsx", ".jsx", ".java"}
    skip_dirs: set[str] = {
        "node_modules", ".git", "__pycache__", "venv", ".venv",
        "dist", "build", ".tox", ".mypy_cache", ".pytest_cache",
        "env", ".env",
    }
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = {"env_prefix": "CODEATLAS_"}


settings = Settings()

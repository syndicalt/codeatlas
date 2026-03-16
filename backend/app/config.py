import secrets
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

    # RAG Agent settings
    anthropic_api_key: str = ""
    embedding_model: str = "all-MiniLM-L6-v2"
    rag_max_context_chunks: int = 10
    rag_llm_model: str = "claude-sonnet-4-20250514"

    # OAuth settings
    github_client_id: str = ""
    github_client_secret: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""

    # JWT settings
    jwt_secret: str = ""
    jwt_expiry_hours: int = 168  # 7 days

    # Encryption for stored API keys
    encryption_key: str = ""

    # Frontend URL for OAuth redirects
    frontend_url: str = "http://localhost:5173"

    # Database
    database_path: str = "codeatlas.db"

    model_config = {"env_prefix": "CODEATLAS_", "env_file": ".env", "env_file_encoding": "utf-8"}

    def get_jwt_secret(self) -> str:
        """Return jwt_secret, auto-generating one if empty."""
        if not self.jwt_secret:
            self.jwt_secret = secrets.token_urlsafe(32)
        return self.jwt_secret

    def get_encryption_key(self) -> str:
        """Return encryption_key, auto-generating one if empty."""
        if not self.encryption_key:
            from cryptography.fernet import Fernet
            self.encryption_key = Fernet.generate_key().decode()
        return self.encryption_key


settings = Settings()
